import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../persistence/prisma.service';
import { HERMES_NOTIFICATION_SERVICE } from './hermes.tokens';
import { IHermesNotificationAdapter } from './executors/notification.executor';

/** Standard notification type constant for follow-ups */
const NOTIFICATION_TYPE_GENERAL = 'general_notification';

/**
 * Hermes Follow-Up Processor
 *
 * Scheduled cron job that picks up pending follow-up reminders
 * (created via `set_follow_up` action) and delivers them via
 * the NotificationService when their scheduled time arrives.
 *
 * Runs every 5 minutes to check for due follow-ups.
 */
@Injectable()
export class HermesFollowUpProcessor {
  private readonly logger = new Logger(HermesFollowUpProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(HERMES_NOTIFICATION_SERVICE) @Optional() private readonly notificationService: IHermesNotificationAdapter | null,
  ) {}

  /**
   * Process due follow-ups every 5 minutes.
   */
  @Cron('*/5 * * * *') // Every 5 minutes
  async processDueFollowUps(): Promise<void> {
    if (!this.notificationService) {
      return; // Notification service not configured — skip
    }

    const now = new Date();

    const dueFollowUps = await this.prisma.hermesFollowUp.findMany({
      where: {
        status: 'pending',
        scheduled_at: { lte: now },
      },
      take: 20, // Process in batches
    });

    if (dueFollowUps.length === 0) return;

    this.logger.log(`[HERMES] Processing ${dueFollowUps.length} due follow-up(s)`);

    for (const followUp of dueFollowUps) {
      try {
        // Verify recipient is still active
        const employee = await this.prisma.employee.findUnique({
          where: { id: followUp.recipient_id },
          select: { employment_status: true },
        });

        if (!employee || employee.employment_status !== 'active') {
          await this.markFollowUp(followUp.id, 'cancelled');
          this.logger.warn(`[HERMES] Follow-up ${followUp.id} cancelled — recipient no longer active`);
          continue;
        }

        // Send the notification
        await this.notificationService.sendNotification({
          recipient_id: followUp.recipient_id,
          type: NOTIFICATION_TYPE_GENERAL,
          visibility: 'private',
          title: followUp.title,
          content: followUp.message,
          metadata: {
            source: 'hermes',
            hermes_agent_id: followUp.agent_id,
            action_type: 'follow_up',
            follow_up_id: followUp.id,
            context_entity_id: followUp.context_entity_id,
            context_entity_type: followUp.context_entity_type,
          },
        });

        await this.markFollowUp(followUp.id, 'delivered');
        this.logger.log(`[HERMES] Follow-up ${followUp.id} delivered to ${followUp.recipient_id}`);
      } catch (err) {
        this.logger.error(`[HERMES] Follow-up ${followUp.id} failed: ${err.message}`);
        await this.markFollowUp(followUp.id, 'failed');
      }
    }
  }

  private async markFollowUp(id: string, status: string): Promise<void> {
    await this.prisma.hermesFollowUp.update({
      where: { id },
      data: { status, delivered_at: status === 'delivered' ? new Date() : undefined },
    });
  }
}
