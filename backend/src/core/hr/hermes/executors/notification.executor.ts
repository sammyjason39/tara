import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../persistence/prisma.service';
import { HERMES_NOTIFICATION_SERVICE } from '../hermes.tokens';

/**
 * Minimal interface the host's notification service must satisfy.
 */
export interface IHermesNotificationAdapter {
  sendNotification(payload: {
    recipient_id: string;
    type: string;
    visibility: string;
    title: string;
    content: string;
    metadata?: Record<string, any>;
  }): Promise<{ id: string } | null>;
  sendBulkNotification(payload: {
    recipient_ids: string[];
    type: string;
    visibility: string;
    title: string;
    content: string;
    metadata?: Record<string, any>;
  }): Promise<any>;
}

/**
 * Standard notification type constant (replaces the TaraNotificationType enum import).
 * The host's notification service should accept this string or map it appropriately.
 */
const NOTIFICATION_TYPE_GENERAL = 'general_notification';

/**
 * Notification Executor for Hermes
 *
 * Handles all safe notification-based actions:
 * - send_reminder
 * - send_encouragement
 * - send_deadline_notice
 * - send_notification
 * - send_bulk_reminder
 *
 * All notifications sent by Hermes are tagged with source: 'hermes'
 * in metadata for audit trail and filtering.
 */
@Injectable()
export class HermesNotificationExecutor {
  private readonly logger = new Logger(HermesNotificationExecutor.name);

  constructor(
    @Inject(HERMES_NOTIFICATION_SERVICE) private readonly notificationService: IHermesNotificationAdapter,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Send a reminder to a single employee.
   */
  async sendReminder(agentId: string, params: {
    recipient_id: string;
    title: string;
    message: string;
    context_entity_id?: string;
    context_entity_type?: string;
    deadline?: string;
  }) {
    await this.validateRecipientExists(params.recipient_id);

    const result = await this.notificationService.sendNotification({
      recipient_id: params.recipient_id,
      type: NOTIFICATION_TYPE_GENERAL,
      visibility: 'private',
      title: params.title,
      content: params.message,
      metadata: {
        source: 'hermes',
        hermes_agent_id: agentId,
        action_type: 'reminder',
        context_entity_id: params.context_entity_id,
        context_entity_type: params.context_entity_type,
        deadline: params.deadline,
      },
    });

    return {
      notification_id: result?.id,
      recipient_id: params.recipient_id,
      delivered: true,
    };
  }

  /**
   * Send an encouragement/positive message to an employee.
   */
  async sendEncouragement(agentId: string, params: {
    recipient_id: string;
    title: string;
    message: string;
    encouragement_type?: string;
  }) {
    await this.validateRecipientExists(params.recipient_id);

    const result = await this.notificationService.sendNotification({
      recipient_id: params.recipient_id,
      type: NOTIFICATION_TYPE_GENERAL,
      visibility: 'private',
      title: params.title,
      content: params.message,
      metadata: {
        source: 'hermes',
        hermes_agent_id: agentId,
        action_type: 'encouragement',
        encouragement_type: params.encouragement_type || 'general',
      },
    });

    return {
      notification_id: result?.id,
      recipient_id: params.recipient_id,
      delivered: true,
    };
  }

  /**
   * Send a deadline notice to an employee.
   */
  async sendDeadlineNotice(agentId: string, params: {
    recipient_id: string;
    title: string;
    message: string;
    deadline: string;
    context_entity_id?: string;
    context_entity_type?: string;
    urgency?: string;
  }) {
    await this.validateRecipientExists(params.recipient_id);

    const result = await this.notificationService.sendNotification({
      recipient_id: params.recipient_id,
      type: NOTIFICATION_TYPE_GENERAL,
      visibility: 'private',
      title: params.title,
      content: params.message,
      metadata: {
        source: 'hermes',
        hermes_agent_id: agentId,
        action_type: 'deadline_notice',
        deadline: params.deadline,
        urgency: params.urgency || 'medium',
        context_entity_id: params.context_entity_id,
        context_entity_type: params.context_entity_type,
      },
    });

    return {
      notification_id: result?.id,
      recipient_id: params.recipient_id,
      deadline: params.deadline,
      delivered: true,
    };
  }

  /**
   * Send a general notification to an employee.
   */
  async sendNotification(agentId: string, params: {
    recipient_id: string;
    title: string;
    message: string;
    notification_type?: string;
  }) {
    await this.validateRecipientExists(params.recipient_id);

    const result = await this.notificationService.sendNotification({
      recipient_id: params.recipient_id,
      type: NOTIFICATION_TYPE_GENERAL,
      visibility: 'private',
      title: params.title,
      content: params.message,
      metadata: {
        source: 'hermes',
        hermes_agent_id: agentId,
        action_type: 'notification',
        notification_type: params.notification_type,
      },
    });

    return {
      notification_id: result?.id,
      recipient_id: params.recipient_id,
      delivered: true,
    };
  }

  /**
   * Send a bulk reminder to multiple employees.
   */
  async sendBulkReminder(agentId: string, params: {
    recipient_ids: string[];
    title: string;
    message: string;
    context_entity_type?: string;
    deadline?: string;
  }) {
    if (!Array.isArray(params.recipient_ids) || params.recipient_ids.length === 0) {
      throw new BadRequestException('recipient_ids must be a non-empty array');
    }

    if (params.recipient_ids.length > 50) {
      throw new BadRequestException('Cannot send bulk reminder to more than 50 recipients at once');
    }

    // Validate all recipients exist
    const employees = await this.prisma.employee.findMany({
      where: { id: { in: params.recipient_ids }, employment_status: 'active' },
      select: { id: true },
    });
    const validIds = employees.map((e) => e.id);
    const invalidIds = params.recipient_ids.filter((id) => !validIds.includes(id));

    if (invalidIds.length > 0) {
      this.logger.warn(`Skipping ${invalidIds.length} invalid/inactive recipient IDs in bulk reminder`);
    }

    if (validIds.length === 0) {
      throw new BadRequestException('No valid active recipients found');
    }

    const result = await this.notificationService.sendBulkNotification({
      recipient_ids: validIds,
      type: NOTIFICATION_TYPE_GENERAL,
      visibility: 'private',
      title: params.title,
      content: params.message,
      metadata: {
        source: 'hermes',
        hermes_agent_id: agentId,
        action_type: 'bulk_reminder',
        context_entity_type: params.context_entity_type,
        deadline: params.deadline,
      },
    });

    return {
      sent_count: validIds.length,
      skipped_count: invalidIds.length,
      delivered: true,
    };
  }

  // ===========================================================================
  // Private helpers
  // ===========================================================================

  private async validateRecipientExists(recipientId: string): Promise<void> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: recipientId },
      select: { id: true, employment_status: true },
    });

    if (!employee) {
      throw new BadRequestException(`Employee not found: ${recipientId}`);
    }
    if (employee.employment_status !== 'active') {
      throw new BadRequestException(
        `Employee ${recipientId} is not active (status: ${employee.employment_status})`,
      );
    }
  }
}
