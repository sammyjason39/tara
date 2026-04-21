import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { IPaymentRepository } from "./repositories/payment.repository.interface";
import { PaymentService } from "./payment.service";

@Injectable()
export class PaymentReconciliationService {
  private readonly logger = new Logger(PaymentReconciliationService.name);

  constructor(
    private readonly repository: IPaymentRepository,
    private readonly paymentService: PaymentService,
  ) {}

  /**
   * Synchronize all PENDING transactions with their respective gateways.
   * Runs every 30 minutes to capture missed webhooks.
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async reconcilePendingPayments() {
    this.logger.log("Starting payment reconciliation scan with exponential backoff...");

    const pendingTxs = await this.repository.findPendingTransactions();
    const now = new Date();

    for (const tx of pendingTxs) {
      if (!tx.provider || !tx.externalRef) continue;

      // HARDENED: Exponential Backoff Logic
      const retryCount = tx.retryCount || 0;
      const lastChecked = tx.lastCheckedAt;
      
      if (lastChecked && retryCount > 0) {
        const hoursToWait = Math.pow(2, Math.min(retryCount, 6)); // Max wait 64 hours
        const nextCheckAllowed = new Date(lastChecked.getTime() + hoursToWait * 60 * 60 * 1000);
        
        if (now < nextCheckAllowed) {
          continue; // Skip this check for now
        }
      }

      try {
        const adapter = this.paymentService.getAdapter(tx.provider);
        const status = await adapter.checkStatus(tx.externalRef);

        if (status.status !== "PENDING") {
          this.logger.log(
            `Transaction ${tx.id} status changed from PENDING to ${status.status}. Resetting retry count.`,
          );

          await this.paymentService.syncTransactionStatus(
            tx.tenant_id,
            tx.id,
            {
              status: status.status as any,
              gateway_fee: status.fee,
              net_amount: status.net_amount,
              retry_count: 0, // Reset on success
              last_checked_at: now,
            },
            tx.provider,
            "reconciliation-job",
          );
        } else {
          // Still pending, just update last checked
          await this.repository.updateTransactionStatus(
            tx.tenant_id,
            tx.id,
            { status: "PENDING", last_checked_at: now, retry_count: retryCount },
            "reconciliation-job"
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to reconcile transaction ${tx.id}: ${error.message}. Incrementing backoff.`,
        );
        
        // Update backoff counters
        await this.repository.updateTransactionStatus(
          tx.tenant_id,
          tx.id,
          { 
            status: "PENDING", 
            retry_count: retryCount + 1, 
            last_checked_at: now 
          },
          "reconciliation-job"
        );
      }
    }

    this.logger.log("Payment reconciliation scan completed.");
  }
}
