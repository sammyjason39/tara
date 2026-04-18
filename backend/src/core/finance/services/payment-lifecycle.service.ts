import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../persistence/prisma.service';
import { LedgerPostingService } from './ledger-posting.service';
import { Decimal } from '@prisma/client/runtime/library';
import { WorkflowIntegrationService } from './workflow-integration.service';


export enum PaymentStatus {
  INITIATED = 'INITIATED',
  AUTHORIZED = 'AUTHORIZED',
  PROCESSING = 'PROCESSING',
  SETTLED = 'SETTLED',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED',
}

@Injectable()
export class PaymentLifecycleService {
  private readonly logger = new Logger(PaymentLifecycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerPostingService: LedgerPostingService,
    private readonly workflowService: WorkflowIntegrationService,
  ) {}


  /**
   * INITIATED: Start the payment process.
   */
  async initiatePayment(params: {
    tenant_id: string;
    amount: number;
    currency: string;
    beneficiary: string;
    type: 'INBOUND' | 'OUTBOUND';
    createdBy: string;
    idempotency_key: string;
  }) {
    return this.prisma.payment_transactions.create({
      data: {
        id: '1yhg2ft9',
        tenant_id: params.tenant_id,
        amount: params.amount,
        currency: params.currency,
        destination: params.beneficiary,
        type: params.type,
        status: PaymentStatus.INITIATED,
        created_by: params.createdBy,
        idempotency_key: params.idempotency_key,
        channel: 'BANK_TRANSFER', // Default
      },
    });
  }

  /**
   * SETTLED: The final state where cash moved. Trigger Ledger Posting.
   */
  async settlePayment(tenant_id: string, paymentId: string, allocation: { entity_id: string; amount: number }[]) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment_transactions.findUnique({
        where: { id: paymentId, tenant_id: tenant_id },
      });

      if (!payment) {
        throw new BadRequestException('Payment not found');
      }
      if (payment.status === PaymentStatus.SETTLED) {
        throw new BadRequestException('Payment already settled');
      }

      // 1. Workflow Strict Check
      await this.workflowService.ensureApproved(tenant_id, 'PAYMENT', paymentId);

      // 2. Update Payment Status
      await tx.payment_transactions.update({
        where: { id: paymentId },
        data: { 
          status: PaymentStatus.SETTLED,
          ledger_sync_triggered_at: new Date(),
        },
      });

      // 2. Process Allocations
      let leftOver = new Decimal(payment.amount);
      
      for (const alloc of allocation) {
        if (payment.type === 'INBOUND') {
          // AR Allocation
          await tx.finance_ar_payment_allocations.create({
            data: {
              id: require('crypto').randomUUID(),
              payment_id: payment.id,
              invoice_id: alloc.entity_id,
              amount_allocated: alloc.amount,
            },
          });
          // Update Receivable Outstanding
          await tx.receivables.update({
            where: { id: alloc.entity_id },
            data: { amount: { decrement: alloc.amount } },
          });
        } else {
          // AP Allocation
          await tx.finance_ap_payment_allocations.create({
            data: {
              id: require('crypto').randomUUID(),
              payment_id: payment.id,
              bill_id: alloc.entity_id,
              amount_allocated: alloc.amount,
            },
          });
          // Note: Payable model update would go here if we had an outstandingAmount field
        }
        leftOver = leftOver.minus(alloc.amount);
      }

      // 3. Trigger Ledger Posting (Double-Entry)
      // For simplicity in this patch, we call ledgerPostingService directly
      // In a full event-driven system, this would be an event.
      await this.ledgerPostingService.enqueuePosting(
        tenant_id,
        payment.tenant_id, // Assuming company_id = tenant_id for this demo context
        payment.type === 'INBOUND' ? 'AR_PAYMENT_SETTLED' : 'AP_PAYMENT_SETTLED',
        payment.id, // sourceEventId
        {
          paymentId: payment.id,
          amount: Number(payment.amount),
          currency: payment.currency,
          allocation: allocation,
          leftOver: leftOver.toNumber(),
        }
      );

      this.logger.log(`Payment ${payment.id} settled and posted to ledger.`);
    });
  }

  /**
   * FAILED: Mark as failed.
   */
  async failPayment(tenant_id: string, paymentId: string, reason: string) {
    return this.prisma.payment_transactions.update({
      where: { id: paymentId, tenant_id: tenant_id },
      data: { 
        status: PaymentStatus.FAILED,
        extra_info: { failureReason: reason } as any,
      },
    });
  }
}
