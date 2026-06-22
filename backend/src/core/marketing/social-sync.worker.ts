import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../persistence/prisma.service";
import { SocialSyncService } from "./social-sync.service";
import { AsyncRejectionService } from "../shared/async";

@Injectable()
export class SocialSyncWorker {
  private readonly logger = new Logger(SocialSyncWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly socialSync: SocialSyncService,
    private readonly asyncRejection: AsyncRejectionService,
  ) {}

  /**
   * Sync Ads data for all connected accounts every 4 hours.
   *
   * The run is driven through {@link AsyncRejectionService.runBatch} so a
   * rejection handler is attached before each item executes, a per-account
   * failure is recorded in the Integration_Log with a timestamp, the operation
   * id, and the cause, and the run continues with the remaining accounts instead
   * of aborting — never emitting an unhandled rejection (Req 7.1, 7.2, 7.4, 7.5,
   * 11.10).
   */
  @Cron(CronExpression.EVERY_4_HOURS)
  async handleAdsSync() {
    this.logger.log("Starting scheduled Ads synchronization...");

    const accounts = await this.prisma.marketing_accounts.findMany({
      where: { status: "CONNECTED" },
    });

    const result = await this.asyncRejection.runBatch(
      {
        module: "MARKETING",
        operation: "marketing.social.sync.cron",
      },
      accounts,
      (account) =>
        this.socialSync.syncAccount(
          { tenant_id: account.tenant_id } as any,
          account.id,
          "system",
        ),
    );

    this.logger.log(
      `Ads sync completed for ${result.total} accounts ` +
        `(${result.succeeded} succeeded, ${result.failed} failed).`,
    );
  }
}
