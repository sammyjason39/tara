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

  async receivePayment(tenantId: string, companyId: string, dto: CreatePaymentDto): Promise<IArPayment> {
    // Idempotency
    if (dto.idempotencyKey) {
      const existing = await this.paymentRepo.findByIdempotencyKey(tenantId, companyId, dto.idempotencyKey);
      if (existing) return existing;
    }

    // 1. Resolve Open Fiscal Period
    const currentPeriodId = await this.fiscalPeriodService.validatePeriodOpenForPosting(
      tenantId, 
      companyId, 
      'SYS_AUTO', 
      'SYS_USER'
    );

    const payment = await this.paymentRepo.create(tenantId, companyId, dto);

    // 2. Resolve Accounting Mapping
    const mapping = await this.mappingService.resolveAccounts(
        tenantId,
        companyId,
        SubledgerEntryType.AR_PAYMENT,
        'PAYMENT'
    );

    const postingRequestId = uuid();

    // 3. Create AR Subledger Entry (VALIDATED)

    // 4. Enqueue for Ledger (POSTING)
    await this.ledgerPostingService.enqueuePosting(
      tenantId,
      companyId,
      AR_EVENT_TYPES.PAYMENT_RECEIVED,
      `ar-payment-${payment.id}`,
      {
        paymentId: payment.id,
        amount: payment.amount,
        customerId: payment.customerId,
        postingRequestId,
        fiscalPeriodId: currentPeriodId,
        debitAccountId: mapping.debitAccountId,
        creditAccountId: mapping.creditAccountId,
        branchId: 'BRANCH_AUTO',
        locationId: 'LOC_AUTO',
      }
    );

    return payment;
  }

  async allocatePayment(tenantId: string, companyId: string, dto: AllocatePaymentDto): Promise<void> {
    // AREA 4: Idempotency Enforcement
    if (dto.idempotencyKey) {
      const existing = await this.paymentRepo.findAllocationByIdempotencyKey(tenantId, companyId, dto.idempotencyKey);
      if (existing) return;
    }

    const payment = await this.paymentRepo.findById(tenantId, companyId, dto.paymentId);
    if (!payment) throw new NotFoundException('Payment not found');

    const invoice = await this.invoiceRepo.findById(tenantId, companyId, dto.invoiceId);
    if (!invoice) throw new NotFoundException('Invoice not found');

    if (dto.amount.gt(invoice.outstandingAmount)) {
      throw new BadRequestException('Allocation amount cannot exceed invoice outstanding amount');
    }

    // Create allocation
    await this.paymentRepo.createAllocation(tenantId, companyId, dto);

    // Update invoice balance
    const newOutstanding = invoice.outstandingAmount.minus(dto.amount);
    const newStatus = newOutstanding.lte(0) ? ArInvoiceStatus.PAID : ArInvoiceStatus.PARTIALLY_PAID;

    await this.invoiceRepo.updateStatus(tenantId, companyId, invoice.id, newStatus, newOutstanding);

    // Phase 6: AR Overpayment Support (Architectural Fix: ALLOCATION/CREDIT_BALANCE types)
    if (dto.amount.lt(payment.amount)) {
      const remaining = payment.amount.minus(dto.amount);
      
      if (remaining.gt(0)) {
        this.logger.log(`Surplus payment detected for customer ${payment.customerId}. Storing ${remaining} as credit.`);
        
        // 1. Create CREDIT_BALANCE Subledger Entry
        const creditMapping = await this.mappingService.resolveAccounts(
            tenantId,
            companyId,
            SubledgerEntryType.AR_CREDIT_BALANCE,
            'PAYMENT'
        );
        
        await this.ledgerPostingService.enqueuePosting(
            tenantId,
            companyId,
            'AR_CREDIT_RECOGNIZED',
            `ar-credit-${payment.id}`,
            {
                customerId: payment.customerId,
                amount: remaining,
                debitAccountId: creditMapping.debitAccountId,
                creditAccountId: creditMapping.creditAccountId,
            }
        );

        await this.creditRepo.updateCreditBalance(tenantId, companyId, payment.customerId, remaining);
      }
    }

    // 2. Trigger ALLOCATION subledger movement
    const allocMapping = await this.mappingService.resolveAccounts(
        tenantId,
        companyId,
        SubledgerEntryType.AR_ALLOCATION,
        'ALLOCATION'
    );

    await this.ledgerPostingService.enqueuePosting(
        tenantId,
        companyId,
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

  private async getTotalAllocated(tenantId: string, companyId: string, paymentId: string): Promise<Prisma.Decimal> {
    const allocations = await this.paymentRepo.findAllocationsByPayment(tenantId, companyId, paymentId);
    return allocations.reduce((sum: Prisma.Decimal, a: IArPaymentAllocation) => sum.add(a.amountAllocated), new Prisma.Decimal(0));
  }

  async refundPayment(tenantId: string, companyId: string, paymentId: string, amount: Prisma.Decimal | number): Promise<void> {
    const payment = await this.paymentRepo.findById(tenantId, companyId, paymentId);
    if (!payment) throw new NotFoundException('Payment not found');

    const totalAllocated = await this.getTotalAllocated(tenantId, companyId, paymentId);
    const availableToRefund = new Prisma.Decimal(payment.amount).minus(totalAllocated);

    const refundAmount = new Prisma.Decimal(amount);
    if (refundAmount.gt(availableToRefund)) {
      throw new BadRequestException(`Refund amount ${refundAmount} exceeds available unallocated amount ${availableToRefund}`);
    }

    // Guard: Fiscal Period must be open
    await this.fiscalPeriodService.validatePeriodOpenForPosting(tenantId, companyId, 'SYS_AUTO', 'SYS_USER');

    // Create refund event
    await this.ledgerPostingService.enqueuePosting(
      tenantId,
      companyId,
      AR_EVENT_TYPES.PAYMENT_REFUND,
      `ar-refund-${payment.id}-${Date.now()}`,
      {
        paymentId: payment.id,
        amount,
        customerId: payment.customerId,
      }
    );
  }
}
