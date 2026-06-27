import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AiLogService } from './ai-log.service';
import { AiPendingActionService } from './ai-pending-action.service';

@Injectable()
export class AiCleanupScheduler {
  private readonly logger = new Logger(AiCleanupScheduler.name);

  constructor(
    private readonly logService: AiLogService,
    private readonly pendingService: AiPendingActionService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupLogs() {
    const deleted = await this.logService.cleanup(90);
    this.logger.log(`AI log cleanup: removed ${deleted} records`);
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async expirePendingActions() {
    await this.pendingService.expireStale();
  }
}
