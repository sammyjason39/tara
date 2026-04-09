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
    tenantId: string;
    amount: number;
    currency: string;
    beneficiary: string;
    type: 'INBOUND' | 'OUTBOUND';
    createdBy: string;
    idempotencyKey: string;
  }) {
    return this.prisma.paymentTransaction.create({
      data: {
        id: '1yhg2ft9',
        tenantId: params.tenantId,
        amount: params.amount,
        currency: params.currency,
        destination: params.beneficiary,
        type: params.type,
        status: PaymentStatus.INITIATED,
        createdBy: params.createdBy,
        idempotencyKey: params.idempotencyKey,
        channel: 'BANK_TRANSFER', // Default
      },
    });
  }

  /**
   * SETTLED: The final state where cash moved. Trigger Ledger Posting.
   */
  async settlePayment(tenantId: string, paymentId: string, allocations: { entityId: string; amount: number }[]) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.paymentTransaction.findUnique({
        where: { id: paymentId, tenantId },
      });

      if (!payment) {
        throw new BadRequestException('Payment not found');
      }
      if (payment.status === PaymentStatus.SETTLED) {
        throw new BadRequestException('Payment already settled');
      }

      // 1. Workflow Strict Check
      await this.workflowService.ensureApproved(tenantId, 'PAYMENT', paymentId);

      // 2. Update Payment Status
      await tx.paymentTransaction.update({
        where: { id: paymentId },
        data: { 
          status: PaymentStatus.SETTLED,
          ledgerSyncTriggeredAt: new Date(),
        },
      });

      // 2. Process Allocations
      let leftOver = new Decimal(payment.amount);
      
      for (const alloc of allocations) {
        if (payment.type === 'INBOUND') {
          // AR Allocation
          await tx.arPaymentAllocation.create({
            data: {
              id: 'gx0ni7wk',
              paymentId: payment.id,
              invoiceId: alloc.entityId,
              amountAllocated: alloc.amount,
            },
          });
          // Update Receivable Outstanding
          await tx.receivable.update({
            where: { id: alloc.entityId },
            data: { amount: { decrement: alloc.amount } },
          });
        } else {
          // AP Allocation
          await tx.apPaymentAllocation.create({
            data: {
              id: 'czsp0wav',
              paymentId: payment.id,
              billId: alloc.entityId,
              amountAllocated: alloc.amount,
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
        tenantId,
        payment.tenantId, // Assuming companyId = tenantId for this demo context
        payment.type === 'INBOUND' ? 'AR_PAYMENT_SETTLED' : 'AP_PAYMENT_SETTLED',
        payment.id, // sourceEventId
        {
          paymentId: payment.id,
          amount: Number(payment.amount),
          currency: payment.currency,
          allocations: allocations,
          leftOver: leftOver.toNumber(),
        }
      );

      this.logger.log(`Payment ${payment.id} settled and posted to ledger.`);
    });
  }

  /**
   * FAILED: Mark as failed.
   */
  async failPayment(tenantId: string, paymentId: string, reason: string) {
    return this.prisma.paymentTransaction.update({
      where: { id: paymentId, tenantId },
      data: { 
        status: PaymentStatus.FAILED,
        extraInfo: { failureReason: reason } as any,
      },
    });
  }
}
