import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { IPaymentRepository } from "./repositories/payment.repository.interface";
import { PaymentService } from "./payment.service";
import { TenantContext } from "../../gateway/tenant-context.interface";
import { AsyncRejectionService } from "../shared/async";

@Injectable()
export class PaymentExpiryJob {
  private readonly logger = new Logger(PaymentExpiryJob.name);

  constructor(
    private readonly repository: IPaymentRepository,
    private readonly paymentService: PaymentService,
    private readonly asyncRejection: AsyncRejectionService,
  ) {}

  /**
   * Expire stale PENDING transactions.
   * Runs every hour.
   *
   * The scan is driven through {@link AsyncRejectionService.runBatch} so a
   * rejection handler is attached before each item executes, a per-transaction
   * failure is recorded in the Integration_Log with the failure timestamp, the
   * operation id, and the cause, and the run continues over the remaining
   * transactions instead of aborting the whole job (Requirements 7.1, 7.2, 7.4,
   * 7.5).
   */
  @Cron(CronExpression.EVERY_HOUR)
  async expireStalePayments() {
    this.logger.log("Starting stale payment expiry scan...");

    const pendingTxs = await this.repository.findPendingTransactions();
    const now = new Date();
    const expiryThresholdHours = 24;

    // Only gateway transactions older than the expiry threshold are candidates.
    const staleTxs = pendingTxs.filter((tx) => {
      if (tx.method !== "GATEWAY") return false;
      const diffMs = now.getTime() - new Date(tx.created_at).getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      return diffHours >= expiryThresholdHours;
    });

    const result = await this.asyncRejection.runBatch(
      {
        module: "PAYMENT",
        operation: "payment.expiry.cron",
      },
      staleTxs,
      async (tx) => {
        this.logger.log(`Expiring stale transaction ${tx.id} for tenant ${tx.tenant_id}.`);

        const ctx: TenantContext = {
          tenant_id: tx.tenant_id,
          company_id: tx.company_id,
          branch_id: tx.branch_id,
          ecommerce_id: tx.ecommerce_id,
        } as TenantContext;

        await this.paymentService.syncTransactionStatus(
          ctx,
          tx.id,
          { status: "FAILED" },
          tx.provider || "SYSTEM",
          "expiry-job",
        );
      },
    );

    this.logger.log(
      `Stale payment expiry scan completed. Expired ${result.succeeded} of ${result.total} ` +
        `candidate transactions (${result.failed} failed and were logged).`,
    );
  }
}
