import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { IPaymentRepository } from "./repositories/payment.repository.interface";
import { PaymentService } from "./payment.service";

@Injectable()
export class PaymentExpiryJob {
  private readonly logger = new Logger(PaymentExpiryJob.name);

  constructor(
    private readonly repository: IPaymentRepository,
    private readonly paymentService: PaymentService,
  ) {}

  /**
   * Expire stale PENDING transactions.
   * Runs every hour.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async expireStalePayments() {
    this.logger.log("Starting stale payment expiry scan...");

    const pendingTxs = await this.repository.findPendingTransactions();
    const now = new Date();
    const expiryThresholdHours = 24;

    let expiredCount = 0;

    for (const tx of pendingTxs) {
      if (tx.method !== "GATEWAY") continue;

      const txDate = new Date(tx.created_at);
      const diffMs = now.getTime() - txDate.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours >= expiryThresholdHours) {
        try {
          this.logger.log(`Expiring stale transaction ${tx.id} for tenant ${tx.tenant_id}.`);

          await this.paymentService.syncTransactionStatus(
            tx.tenant_id,
            tx.id,
            { status: "FAILED" },
            tx.provider || "SYSTEM",
            "expiry-job",
          );

          expiredCount++;
        } catch (error) {
          this.logger.error(
            `Failed to expire transaction ${tx.id} for tenant ${tx.tenant_id}: ${error.message}`,
          );
        }
      }
    }

    this.logger.log(`Stale payment expiry scan completed. Expired ${expiredCount} transactions.`);
  }
}
