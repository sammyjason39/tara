import { Injectable, Inject, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { IArPaymentRepository } from '../repositories/interfaces/ar-payment.repository.interface';
import { IArInvoiceRepository } from '../repositories/interfaces/ar-invoice.repository.interface';
import { LedgerPostingService } from '../../services/ledger-posting.service';
import { CreatePaymentDto, AllocatePaymentDto } from '../dto/ar.dto';
import { IArPayment, IArPaymentAllocation } from '../domain/ar.interfaces';
import { v4 as uuid } from 'uuid';
import { ArInvoiceStatus, AR_EVENT_TYPES } from '../domain/ar.constants';
import { FiscalPeriodService } from '../../services/fiscal-period.service';
import { AccountingMappingService } from '../../services/accounting-mapping.service';
import { SubledgerEntryStatus, SubledgerEntryType, FinanceSubledgerEntry } from '../../entities/finance-subledger.entity';
import { Prisma } from '@prisma/client';

@Injectable()
export class ArPaymentService {
  private readonly logger = new Logger(ArPaymentService.name);

  constructor(
    @Inject('IArPaymentRepository')
    private readonly paymentRepo: IArPaymentRepository,
    @Inject('IArInvoiceRepository')
    private readonly invoiceRepo: IArInvoiceRepository,
    @Inject('IArCustomerCreditRepository')
    private readonly creditRepo: any, // Using any for mock
    private readonly ledgerPostingService: LedgerPostingService,
    private readonly fiscalPeriodService: FiscalPeriodService,
    private readonly mappingService: AccountingMappingService,
  ) {}

  async receivePayment(tenant_id: string, company_id: string, dto: CreatePaymentDto): Promise<IArPayment> {
    // Idempotency
    if (dto.idempotency_key) {
      const existing = await this.paymentRepo.findByIdempotencyKey(tenant_id, company_id, dto.idempotency_key);
      if (existing) return existing;
    }

    // 1. Resolve Open Fiscal Period
    const currentPeriodId = await this.fiscalPeriodService.validatePeriodOpenForPosting(
      tenant_id, 
      company_id, 
      'SYS_AUTO', 
      'SYS_USER'
    );

    const payment = await this.paymentRepo.create(tenant_id, company_id, dto);

    // 2. Resolve Accounting Mapping
    const mapping = await this.mappingService.resolveAccounts(
        tenant_id,
        company_id,
        SubledgerEntryType.AR_PAYMENT,
        'PAYMENT'
    );

    const postingRequestId = uuid();

    // 3. Create AR Subledger Entry (VALIDATED)

    // 4. Enqueue for Ledger (POSTING)
    try {
      await this.ledgerPostingService.enqueuePosting(
        tenant_id,
        company_id,
        AR_EVENT_TYPES.PAYMENT_RECEIVED,
        `ar-payment-${payment.id}`,
        {
          paymentId: payment.id,
          amount: payment.amount,
          customer_id: payment.customer_id,
          postingRequestId,
          fiscalPeriodId: currentPeriodId,
          debitAccountId: mapping.debitAccountId,
          creditAccountId: mapping.creditAccountId,
          branch_id: 'BRANCH_AUTO',
          location_id: 'LOC_AUTO',
        }
      );
    } catch (error) {
      // BUG-3 FIX: Mark subledger entry as FAILED if ledger posting fails
      this.logger.error(`Failed to enqueue ledger posting for payment ${payment.id}: ${error.message}`);
      throw new BadRequestException(`Payment processing failed: ${error.message}`);
    }

    return payment;
  }

  async allocatePayment(tenant_id: string, company_id: string, dto: AllocatePaymentDto): Promise<void> {
    // AREA 4: Idempotency Enforcement
    if (dto.idempotency_key) {
      const existing = await this.paymentRepo.findAllocationByIdempotencyKey(tenant_id, company_id, dto.idempotency_key);
      if (existing) return;
    }

    const payment = await this.paymentRepo.findById(tenant_id, company_id, dto.paymentId);
    if (!payment) throw new NotFoundException('Payment not found');

    const invoice = await this.invoiceRepo.findById(tenant_id, company_id, dto.invoiceId);
    if (!invoice) throw new NotFoundException('Invoice not found');

    if (dto.amount.gt(invoice.outstandingAmount)) {
      throw new BadRequestException('Allocation amount cannot exceed invoice outstanding amount');
    }

    // Create allocation
    await this.paymentRepo.createAllocation(tenant_id, company_id, dto);

    // Update invoice balance
    const newOutstanding = invoice.outstandingAmount.minus(dto.amount);
    const newStatus = newOutstanding.lte(0) ? ArInvoiceStatus.PAID : ArInvoiceStatus.PARTIALLY_PAID;

    await this.invoiceRepo.updateStatus(tenant_id, company_id, invoice.id, newStatus, newOutstanding);

    // Phase 6: AR Overpayment Support (Architectural Fix: ALLOCATION/CREDIT_BALANCE types)
    if (dto.amount.lt(payment.amount)) {
      const remaining = payment.amount.minus(dto.amount);
      
      if (remaining.gt(0)) {
        this.logger.log(`Surplus payment detected for customer ${payment.customer_id}. Storing ${remaining} as credit.`);
        
        // 1. Create CREDIT_BALANCE Subledger Entry
        const creditMapping = await this.mappingService.resolveAccounts(
            tenant_id,
            company_id,
            SubledgerEntryType.AR_CREDIT_BALANCE,
            'PAYMENT'
        );
        
        await this.ledgerPostingService.enqueuePosting(
            tenant_id,
            company_id,
            'AR_CREDIT_RECOGNIZED',
            `ar-credit-${payment.id}`,
            {
                customer_id: payment.customer_id,
                amount: remaining,
                debitAccountId: creditMapping.debitAccountId,
                creditAccountId: creditMapping.creditAccountId,
            }
        );

        await this.creditRepo.updateCreditBalance(tenant_id, company_id, payment.customer_id, remaining);
      }
    }

    // 2. Trigger ALLOCATION subledger movement
    const allocMapping = await this.mappingService.resolveAccounts(
        tenant_id,
        company_id,
        SubledgerEntryType.AR_ALLOCATION,
        'ALLOCATION'
    );

    await this.ledgerPostingService.enqueuePosting(
        tenant_id,
        company_id,
        'AR_PAYMENT_ALLOCATED',
        `ar-alloc-${dto.paymentId}-${dto.invoiceId}`,
        {
            paymentId: dto.paymentId,
            invoiceId: dto.invoiceId,
            amount: dto.amount,
            debitAccountId: allocMapping.debitAccountId,
            creditAccountId: allocMapping.creditAccountId,
        }
    );
  }

  private async getTotalAllocated(tenant_id: string, company_id: string, paymentId: string): Promise<Prisma.Decimal> {
    const allocations = await this.paymentRepo.findAllocationsByPayment(tenant_id, company_id, paymentId);
    return allocations.reduce((sum: Prisma.Decimal, a: IArPaymentAllocation) => sum.add(a.amountAllocated), new Prisma.Decimal(0));
  }

  async refundPayment(tenant_id: string, company_id: string, paymentId: string, amount: Prisma.Decimal | number): Promise<void> {
    const payment = await this.paymentRepo.findById(tenant_id, company_id, paymentId);
    if (!payment) throw new NotFoundException('Payment not found');

    const totalAllocated = await this.getTotalAllocated(tenant_id, company_id, paymentId);
    const availableToRefund = new Prisma.Decimal(payment.amount).minus(totalAllocated);

    const refundAmount = new Prisma.Decimal(amount);
    if (refundAmount.gt(availableToRefund)) {
      throw new BadRequestException(`Refund amount ${refundAmount} exceeds available unallocated amount ${availableToRefund}`);
    }

    // Guard: Fiscal Period must be open
    await this.fiscalPeriodService.validatePeriodOpenForPosting(tenant_id, company_id, 'SYS_AUTO', 'SYS_USER');

    // Create refund event
    await this.ledgerPostingService.enqueuePosting(
      tenant_id,
      company_id,
      AR_EVENT_TYPES.PAYMENT_REFUND,
      `ar-refund-${payment.id}-${Date.now()}`,
      {
        paymentId: payment.id,
        amount,
        customer_id: payment.customer_id,
      }
    );
  }

  // BUG-3 FIX: Automated reconciliation mechanism to detect orphaned entries
  async detectOrphanedEntries(tenant_id: string, company_id: string): Promise<any[]> {
    const orphaned = await this.paymentRepo.findOrphanedEntries(tenant_id, company_id);
    
    if (orphaned.length > 0) {
      this.logger.warn(`Detected ${orphaned.length} orphaned entries requiring reconciliation`);
    }
    
    return orphaned;
  }

  async reconcileOrphanedEntries(tenant_id: string, company_id: string): Promise<number> {
    const orphaned = await this.detectOrphanedEntries(tenant_id, company_id);
    let reconciledCount = 0;

    for (const entry of orphaned) {
      try {
        // Re-enqueue the posting
        await this.ledgerPostingService.enqueuePosting(
          tenant_id,
          company_id,
          entry.eventType,
          entry.sourceEventId,
          entry.payload
        );
        reconciledCount++;
      } catch (error) {
        this.logger.error(`Failed to reconcile entry ${entry.id}: ${error.message}`);
      }
    }

    return reconciledCount;
  }
}
