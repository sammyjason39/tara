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



  async createInvoice(tenantId: string, companyId: string, dto: CreateInvoiceDto): Promise<IArInvoice> {
    // AREA 4: Idempotency Enforcement
    if (dto.idempotencyKey) {
      const existing = await this.invoiceRepo.findByIdempotencyKey(tenantId, companyId, dto.idempotencyKey);
      if (existing) return existing;
    }

    const existingByNumber = await this.invoiceRepo.findByNumber(tenantId, companyId, dto.invoiceNumber);
    if (existingByNumber) throw new BadRequestException('Invoice number already exists');
    
    return this.invoiceRepo.create(tenantId, companyId, dto);
  }

  async listInvoices(tenantId: string, companyId: string, customerId?: string): Promise<IArInvoice[]> {
    return this.invoiceRepo.findAll(tenantId, companyId, customerId);
  }

  /**
   * Issues an invoice and triggers financial posting.
   * Standardized Lifecycle: PENDING -> VALIDATED -> POSTING -> POSTED
   */
  async issueInvoice(tenantId: string, companyId: string, invoiceId: string): Promise<IArInvoice> {
    const invoice = await this.invoiceRepo.findById(tenantId, companyId, invoiceId);
    if (!invoice) throw new NotFoundException('Invoice not found');
    
    if (invoice.status !== ArInvoiceStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT invoices can be issued');
    }

    // 1. Resolve Open Fiscal Period & VALIDATE
    const currentPeriodId = await this.fiscalPeriodService.validatePeriodOpenForPosting(
      tenantId, 
      companyId, 
      'SYS_AUTO', 
      'SYS_USER'
    );

    // 2. Resolve Accounting Mapping
    const mapping = await this.mappingService.resolveAccounts(
        tenantId,
        companyId,
        SubledgerEntryType.AR_REVENUE,
        'INVOICE'
    );

    const postingRequestId = uuid();

    // 3. Create AR Subledger Entry (State: VALIDATED)
    // Micro-Hardened with Source Module, Direction, and FX context
    const subledgerEntry: Partial<FinanceSubledgerEntry> = {
        id: uuid(),
        tenantId,
        companyId,
        sourceModule: 'ACCOUNTS_RECEIVABLE',
        referenceType: 'INVOICE',
        referenceId: invoice.id,
        postingRequestId,
        entryType: SubledgerEntryType.AR_REVENUE,
        status: SubledgerEntryStatus.VALIDATED,
        direction: AccountingDirection.DEBIT, // Debit AR Asset
        amount: invoice.totalAmount,
        currency: 'USD', // Simplified
        baseAmount: invoice.totalAmount,
        baseCurrency: 'USD',
        exchangeRate: new Prisma.Decimal(1.0),
        debitAccountId: mapping.debitAccountId,
        creditAccountId: mapping.creditAccountId,
        accountingPeriodId: currentPeriodId,
        effectiveDate: new Date(), // Business date (Audit Hardening)
        createdAt: new Date(),
    };

    // 4. Update status and Enqueue for Ledger (ATOMIC TRANSACTION)
    const updatedInvoice = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 4.05 Calculate Tax inside transaction (Atomicity Boundary)
      const taxResults = await this.taxEngineService.calculateTax(
        tenantId,
        'BRANCH_AUTO',
        'ID',
        invoice.totalAmount,
        'AR_INVOICE'
      );

      // 4.1 Update status locally
      const updated = await this.invoiceRepo.updateStatus(tenantId, companyId, invoiceId, ArInvoiceStatus.ISSUED, undefined, tx);

      // 4.15 Persist AR Subledger Entry (Unit-of-Record persistence)
      await tx.financeSubledgerEntry.create({
          data: {
              id: subledgerEntry.id!,
              tenantId,
              companyId,
              sourceModule: subledgerEntry.sourceModule!,
              referenceType: subledgerEntry.referenceType!,
              referenceId: subledgerEntry.referenceId!,
              sourceEventId: `ar-invoice-${invoice.id}`, // Traceability link
              postingRequestId: subledgerEntry.postingRequestId!,
              entryType: subledgerEntry.entryType!,
              status: subledgerEntry.status!,
              accountingPeriodId: subledgerEntry.accountingPeriodId!,
              direction: subledgerEntry.direction!,
              effectiveDate: subledgerEntry.effectiveDate!,
              amount: subledgerEntry.amount!,
              currency: subledgerEntry.currency!,
              baseAmount: subledgerEntry.baseAmount!,
              baseCurrency: subledgerEntry.baseCurrency!,
              exchangeRate: subledgerEntry.exchangeRate!,
              debitAccountId: mapping.debitAccountId,
              creditAccountId: mapping.creditAccountId,
          }
      });

      // 4.2 Enqueue for Ledger (State: POSTING)
      await this.ledgerPostingService.enqueuePosting(
        tenantId,
        companyId,
        AR_EVENT_TYPES.INVOICE_ISSUED,
        `ar-invoice-${invoice.id}`,
        {
          invoiceId: invoice.id,
          amount: invoice.totalAmount,
          customerId: invoice.customerId,
          postingRequestId,
          fiscalPeriodId: currentPeriodId,
          sourceModule: subledgerEntry.sourceModule,
          direction: subledgerEntry.direction,
          debitAccountId: mapping.debitAccountId,
          creditAccountId: mapping.creditAccountId,
          branchId: 'BRANCH_AUTO',
          locationId: 'LOC_AUTO',
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
  async voidInvoice(tenantId: string, companyId: string, invoiceId: string): Promise<IArInvoice> {
    const invoice = await this.invoiceRepo.findById(tenantId, companyId, invoiceId);
    if (!invoice) throw new NotFoundException('Invoice not found');

    if (invoice.status === ArInvoiceStatus.ISSUED || invoice.status === ArInvoiceStatus.PAID || invoice.status === ArInvoiceStatus.VOID) {
      throw new BadRequestException(`Direct mutation of invoice in ${invoice.status} status is blocked. Please use the Reversal workflow.`);
    }

    // Mark as VOIDED opertional level
    const updated = await this.invoiceRepo.updateStatus(tenantId, companyId, invoiceId, ArInvoiceStatus.VOID);
    this.logger.log(`Invoice ${invoiceId} marked as VOIDED (Operational level).`);
    return updated;
  }
}
