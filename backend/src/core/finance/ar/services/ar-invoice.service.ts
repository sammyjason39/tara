import { ArInvoiceStatus, AR_EVENT_TYPES } from '../domain/ar.constants';
import { FiscalPeriodService } from '../../services/fiscal-period.service';
import { AccountingMappingService } from '../../services/accounting-mapping.service';
import { SubledgerEntryStatus, SubledgerEntryType, FinanceSubledgerEntry, AccountingDirection } from '../../entities/finance-subledger.entity';
import { v4 as uuid } from 'uuid';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../persistence/prisma.service';
import { Injectable, Inject, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { IArInvoiceRepository } from '../repositories/interfaces/ar-invoice.repository.interface';
import { LedgerPostingService } from '../../services/ledger-posting.service';
import { CreateInvoiceDto } from '../dto/ar.dto';
import { IArInvoice } from '../domain/ar.interfaces';
import { TaxEngineService } from '../../services/tax-engine.service';
import { WorkflowIntegrationService } from '../../services/workflow-integration.service';



@Injectable()
export class ArInvoiceService {
  private readonly logger = new Logger(ArInvoiceService.name);

  constructor(
    @Inject('IArInvoiceRepository')
    private readonly invoiceRepo: IArInvoiceRepository,
    private readonly ledgerPostingService: LedgerPostingService,
    private readonly fiscalPeriodService: FiscalPeriodService,
    private readonly mappingService: AccountingMappingService,
    private readonly taxEngineService: TaxEngineService,
    private readonly workflowService: WorkflowIntegrationService,
    private readonly prisma: PrismaService,
  ) {}



  async createInvoice(tenant_id: string, company_id: string, dto: CreateInvoiceDto): Promise<IArInvoice> {
    // AREA 4: Idempotency Enforcement
    if (dto.idempotency_key) {
      const existing = await this.invoiceRepo.findByIdempotencyKey(tenant_id, company_id, dto.idempotency_key);
      if (existing) return existing;
    }

    const existingByNumber = await this.invoiceRepo.findByNumber(tenant_id, company_id, dto.invoiceNumber);
    if (existingByNumber) throw new BadRequestException('Invoice number already exists');
    
    return this.invoiceRepo.create(tenant_id, company_id, dto);
  }

  async listInvoices(tenant_id: string, company_id: string, customer_id?: string): Promise<IArInvoice[]> {
    return this.invoiceRepo.findAll(tenant_id, company_id, customer_id);
  }

  /**
   * Issues an invoice and triggers financial posting.
   * Standardized Lifecycle: PENDING -> VALIDATED -> POSTING -> POSTED
   */
  async issueInvoice(tenant_id: string, company_id: string, invoiceId: string): Promise<IArInvoice> {
    const invoice = await this.invoiceRepo.findById(tenant_id, company_id, invoiceId);
    if (!invoice) throw new NotFoundException('Invoice not found');
    
    if (invoice.status !== ArInvoiceStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT invoices can be issued');
    }

    // 1. Resolve Open Fiscal Period & VALIDATE
    const currentPeriodId = await this.fiscalPeriodService.validatePeriodOpenForPosting(
      tenant_id, 
      company_id, 
      'SYS_AUTO', 
      'SYS_USER'
    );

    // 2. Resolve Accounting Mapping
    const mapping = await this.mappingService.resolveAccounts(
        tenant_id,
        company_id,
        SubledgerEntryType.AR_REVENUE,
        'INVOICE'
    );

    const postingRequestId = uuid();

    // 3. Create AR Subledger Entry (State: VALIDATED)
    // Micro-Hardened with Source Module, Direction, and FX context
    const subledgerEntry: Partial<FinanceSubledgerEntry> = {
        id: uuid(),
        tenant_id,
        company_id,
        source_module: 'ACCOUNTS_RECEIVABLE',
        referenceType: 'INVOICE',
        referenceId: invoice.id,
        postingRequestId,
        entryType: SubledgerEntryType.AR_REVENUE,
        status: SubledgerEntryStatus.VALIDATED,
        direction: AccountingDirection.DEBIT, // Debit AR Asset
        amount: invoice.total_amount,
        currency: 'USD', // Simplified
        baseAmount: invoice.total_amount,
        baseCurrency: 'USD',
        exchangeRate: new Prisma.Decimal(1.0),
        debitAccountId: mapping.debitAccountId,
        creditAccountId: mapping.creditAccountId,
        accountingPeriodId: currentPeriodId,
        effectiveDate: new Date(), // Business date (Audit Hardening)
        created_at: new Date(),
    };

    // 4. Update status and Enqueue for Ledger (ATOMIC TRANSACTION)
    const updatedInvoice = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 4.05 Calculate Tax inside transaction (Atomicity Boundary)
      const taxResults = await this.taxEngineService.calculateTax(
        tenant_id,
        'BRANCH_AUTO',
        'ID',
        invoice.total_amount,
        'AR_INVOICE'
      );

      // 4.1 Update status locally
      const updated = await this.invoiceRepo.updateStatus(tenant_id, company_id, invoiceId, ArInvoiceStatus.ISSUED, undefined, tx);

      // 4.15 Persist AR Subledger Entry (Unit-of-Record persistence)
      await tx.inventory_subledger_entries.create({
          data: {
              id: subledgerEntry.id!,
              tenant_id: tenant_id,
              source_event_id: `ar-invoice-${invoice.id}`, // Traceability link
              entry_type: subledgerEntry.entryType!,
              status: subledgerEntry.status!,
              updated_at: new Date(),
              metadata: {
                  source_module: subledgerEntry.source_module,
                  referenceType: subledgerEntry.referenceType,
                  referenceId: subledgerEntry.referenceId,
                  postingRequestId: subledgerEntry.postingRequestId,
                  accountingPeriodId: subledgerEntry.accountingPeriodId,
                  direction: subledgerEntry.direction,
                  effectiveDate: subledgerEntry.effectiveDate,
                  amount: subledgerEntry.amount,
                  currency: subledgerEntry.currency,
                  baseAmount: subledgerEntry.baseAmount,
                  baseCurrency: subledgerEntry.baseCurrency,
                  exchangeRate: subledgerEntry.exchangeRate,
                  debitAccountId: mapping.debitAccountId,
                  creditAccountId: mapping.creditAccountId,
                  taxResults,
              } as any
          }
      });

      // 4.2 Enqueue for Ledger (State: POSTING)
      await this.ledgerPostingService.enqueuePosting(
        tenant_id,
        company_id,
        AR_EVENT_TYPES.INVOICE_ISSUED,
        `ar-invoice-${invoice.id}`,
        {
          invoiceId: invoice.id,
          amount: invoice.total_amount,
          customer_id: invoice.customer_id,
          postingRequestId,
          fiscalPeriodId: currentPeriodId,
          source_module: subledgerEntry.source_module,
          direction: subledgerEntry.direction,
          debitAccountId: mapping.debitAccountId,
          creditAccountId: mapping.creditAccountId,
          branch_id: 'BRANCH_AUTO',
          location_id: 'LOC_AUTO',
          taxLines: taxResults,
        },
        undefined,
        undefined,
        tx
      );

      return updated;
    });

    return updatedInvoice;
  }

  /**
   * VOID Logic: Allowed ONLY before POSTED
   */
  async voidInvoice(tenant_id: string, company_id: string, invoiceId: string): Promise<IArInvoice> {
    const invoice = await this.invoiceRepo.findById(tenant_id, company_id, invoiceId);
    if (!invoice) throw new NotFoundException('Invoice not found');

    if (invoice.status === ArInvoiceStatus.ISSUED || invoice.status === ArInvoiceStatus.PAID || invoice.status === ArInvoiceStatus.VOID) {
      throw new BadRequestException(`Direct mutation of invoice in ${invoice.status} status is blocked. Please use the Reversal workflow.`);
    }

    // Mark as VOIDED opertional level
    const updated = await this.invoiceRepo.updateStatus(tenant_id, company_id, invoiceId, ArInvoiceStatus.VOID);
    this.logger.log(`Invoice ${invoiceId} marked as VOIDED (Operational level).`);
    return updated;
  }
}
