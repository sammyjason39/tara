import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { IPaymentRepository } from "./repositories/payment.repository.interface";
import { PaymentService } from "./payment.service";
import { TenantContext } from "../../gateway/tenant-context.interface";
import { AsyncRejectionService } from "../shared/async";

@Injectable()
export class PaymentReconciliationService {
  private readonly logger = new Logger(PaymentReconciliationService.name);

  constructor(
    private readonly repository: IPaymentRepository,
    private readonly paymentService: PaymentService,
    private readonly asyncRejection: AsyncRejectionService,
  ) {}

  /**
   * Synchronize all PENDING transactions with their respective gateways.
   * Runs every 30 minutes to capture missed webhooks.
   *
   * The scan is driven through {@link AsyncRejectionService.runBatch} so a
   * rejection handler is attached before each item executes and a per-transaction
   * failure is recorded in the Integration_Log with the failure timestamp, the
   * operation id, and the cause, while the run continues over the remaining
   * transactions instead of aborting the whole job (Requirements 7.1, 7.2, 7.4,
   * 7.5).
   *
   * Per-item backoff bookkeeping (incrementing the retry counter on failure) is
   * still applied inside each item handler so a transient gateway failure is
   * retried with exponential backoff on subsequent runs.
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async reconcilePendingPayments() {
    this.logger.log("Starting payment reconciliation scan with exponential backoff...");

    const pendingTxs = await this.repository.findPendingTransactions();
    const now = new Date();

    // Only transactions with a provider + external reference that are due for a
    // check (per the exponential-backoff schedule) are reconcilable candidates.
    const dueTxs = pendingTxs.filter((tx) => {
      if (!tx.provider || !tx.externalRef) return false;

      const retryCount = tx.retryCount || 0;
      const lastChecked = tx.lastCheckedAt;

      if (lastChecked && retryCount > 0) {
        const hoursToWait = Math.pow(2, Math.min(retryCount, 6)); // Max wait 64 hours
        const nextCheckAllowed = new Date(
          lastChecked.getTime() + hoursToWait * 60 * 60 * 1000,
        );
        if (now < nextCheckAllowed) {
          return false; // Not due yet
        }
      }
      return true;
    });

    const result = await this.asyncRejection.runBatch(
      {
        module: "PAYMENT",
        operation: "payment.reconciliation.cron",
      },
      dueTxs,
      async (tx) => {
        const retryCount = tx.retryCount || 0;
        const ctx: TenantContext = {
          tenant_id: tx.tenant_id,
          company_id: tx.company_id,
          branch_id: tx.branch_id,
          ecommerce_id: tx.ecommerce_id,
        } as TenantContext;

        try {
          const adapter = this.paymentService.getAdapter(tx.provider!);
          const status = await adapter.checkStatus(tx.externalRef!);

          if (status.status !== "PENDING") {
            this.logger.log(
              `Transaction ${tx.id} status changed from PENDING to ${status.status}. Resetting retry count.`,
            );

            await this.paymentService.syncTransactionStatus(
              ctx,
              tx.id,
              {
                status: status.status as any,
                gateway_fee: status.fee,
                net_amount: status.net_amount,
                retry_count: 0, // Reset on success
                last_checked_at: now,
              },
              tx.provider!,
              "reconciliation-job",
            );
          } else {
            // Still pending, just update last checked
            await this.repository.updateTransactionStatus(
              ctx,
              tx.id,
              { status: "PENDING", last_checked_at: now, retry_count: retryCount },
              "reconciliation-job",
            );
          }
        } catch (error) {
          // Persist the incremented backoff counter so the next run waits longer,
          // then rethrow so the async-rejection helper records the failure in the
          // Integration_Log and the run continues with the remaining items.
          this.logger.error(
            `Failed to reconcile transaction ${tx.id}: ${(error as Error).message}. Incrementing backoff.`,
          );

          await this.repository.updateTransactionStatus(
            ctx,
            tx.id,
            {
              status: "PENDING",
              retry_count: retryCount + 1,
              last_checked_at: now,
            },
            "reconciliation-job",
          );

          throw error;
        }
      },
    );

    this.logger.log(
      `Payment reconciliation scan completed. Reconciled ${result.succeeded} of ${result.total} ` +
        `due transactions (${result.failed} failed and were logged).`,
    );
  }
}
