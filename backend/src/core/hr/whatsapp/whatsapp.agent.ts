import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../persistence/prisma.service';
import { EventBusService, TaraEvent } from '../services/event-bus.service';
import { WhatsAppOutboundService } from './services/whatsapp-outbound.service';
import { WhatsAppAuditService } from './services/whatsapp-audit.service';
import { WhatsAppSessionService } from './services/whatsapp-session.service';

/**
 * WhatsApp Agent — autonomous event-driven agent for WhatsApp channel.
 *
 * Responsibilities:
 * 1. Listen to Hermes 'send_whatsapp_reply' actions and deliver via WhatsApp
 * 2. Forward relevant system notifications to opted-in users via WhatsApp
 * 3. Handle session lifecycle events
 * 4. Run daily cleanup for message retention (90 days)
 *
 * This agent bridges the Hermes AI layer with the WhatsApp delivery channel.
 * It does NOT make LLM decisions — it's a delivery/routing agent.
 *
 * Hermes flow:
 *   Event Bus (whatsapp.message.inbound) → Hermes LLM processes → 
 *   POST /api/hermes/actions { action: 'send_whatsapp_reply' } →
 *   HermesNotificationExecutor → WhatsAppAgent.handleHermesReply()
 */
@Injectable()
export class WhatsAppAgent {
  private readonly logger = new Logger(WhatsAppAgent.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBusService: EventBusService,
    private readonly outboundService: WhatsAppOutboundService,
    private readonly auditService: WhatsAppAuditService,
    private readonly sessionService: WhatsAppSessionService,
  ) {
    this.logger.log('WhatsApp Agent initialized');
  }

  // ==========================================================================
  // Event Listeners
  // ==========================================================================

  /**
   * Handle Hermes reply action — sends a WhatsApp message to an employee.
   * Triggered when Hermes calls 'send_whatsapp_reply' action.
   */
  @OnEvent('hermes.whatsapp.reply')
  async handleHermesReply(event: TaraEvent | any): Promise<void> {
    const payload = event?.payload || event;

    const { employee_id, content, hermes_agent_id, hermes_action_log_id, correlation_id } = payload;

    if (!employee_id || !content) {
      this.logger.warn('[WA_AGENT] Invalid hermes.whatsapp.reply — missing employee_id or content');
      return;
    }

    this.logger.log(`[WA_AGENT] Delivering Hermes reply to employee ${employee_id}`);

    const result = await this.outboundService.sendMessage({
      employee_id,
      content,
      message_type: 'text',
      hermes_agent_id,
      hermes_action_log_id,
      correlation_id,
      metadata: { source: 'hermes_reply' },
    });

    if (!result.success) {
      this.logger.error(
        `[WA_AGENT] Failed to deliver Hermes reply to ${employee_id}: ${result.error}`,
      );
    }
  }

  /**
   * Forward relevant notifications to opted-in employees via WhatsApp.
   * Listens to notification events and checks if the recipient has WA enabled.
   */
  @OnEvent('notification.sent')
  async handleNotificationForward(event: TaraEvent | any): Promise<void> {
    const payload = event?.payload || event;
    const recipientId = payload?.recipient_id;
    const content = payload?.content || payload?.title;

    if (!recipientId || !content) return;

    // Check if employee has WhatsApp enabled
    const employee = await this.prisma.employee.findUnique({
      where: { id: recipientId },
      select: {
        id: true,
        whatsapp_number: true,
        whatsapp_opted_in: true,
        whatsapp_verified: true,
      },
    });

    if (!employee?.whatsapp_opted_in || !employee?.whatsapp_verified) {
      return; // Not opted in, skip
    }

    // Forward important notifications to WhatsApp
    const forwardableTypes = [
      'leave_approval',
      'leave_rejection',
      'warning_letter',
      'deadline_notice',
      'attendance.tardiness_detected',
    ];

    const notificationType = payload?.type || payload?.notification_type;
    if (!forwardableTypes.includes(notificationType)) {
      return; // Not a forwardable notification type
    }

    const title = payload?.title || '';
    const message = `📋 *${title}*\n\n${content}`;

    await this.outboundService.sendMessage({
      employee_id: recipientId,
      content: message.substring(0, 4096),
      message_type: 'text',
      metadata: { source: 'notification_forward', notification_type: notificationType },
    });

    this.logger.debug(`[WA_AGENT] Forwarded notification (${notificationType}) to ${recipientId}`);
  }

  /**
   * Handle WhatsApp session closed events (for analytics).
   */
  @OnEvent('whatsapp.session.closed')
  async handleSessionClosed(event: TaraEvent | any): Promise<void> {
    const payload = event?.payload || event;
    this.logger.debug(`[WA_AGENT] Session closed: ${payload?.session_id}`);
  }

  // ==========================================================================
  // Hermes Action Integration
  // ==========================================================================

  /**
   * Execute a WhatsApp reply action (called by HermesNotificationExecutor).
   * This is the programmatic entry point for Hermes to send WhatsApp messages.
   */
  async executeReply(params: {
    employee_id: string;
    message: string;
    hermes_agent_id: string;
    hermes_action_log_id?: string;
    buttons?: { id: string; title: string }[];
  }): Promise<{ success: boolean; wa_message_id?: string; error?: string }> {
    if (params.buttons && params.buttons.length > 0) {
      const result = await this.outboundService.sendButtons(
        params.employee_id,
        params.message,
        params.buttons,
        params.hermes_agent_id,
      );
      return { success: result.success, wa_message_id: result.wa_message_id, error: result.error };
    }

    const result = await this.outboundService.sendMessage({
      employee_id: params.employee_id,
      content: params.message,
      hermes_agent_id: params.hermes_agent_id,
      hermes_action_log_id: params.hermes_action_log_id,
      metadata: { source: 'hermes_action' },
    });

    return { success: result.success, wa_message_id: result.wa_message_id, error: result.error };
  }

  /**
   * Get conversation context for Hermes (recent messages for an employee).
   */
  async getConversationContext(
    employeeId: string,
    limit = 20,
  ): Promise<Array<{ role: string; content: string; timestamp: Date }>> {
    const messages = await this.auditService.getMessageHistory(employeeId, { limit });

    return messages.reverse().map((msg) => ({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.content,
      timestamp: msg.created_at,
    }));
  }

  // ==========================================================================
  // Scheduled Tasks
  // ==========================================================================

  /**
   * Daily cleanup: remove messages older than 90 days.
   * Runs at 2:00 AM WIB daily.
   */
  @Cron('0 2 * * *')
  async handleDailyCleanup(): Promise<void> {
    this.logger.log('[WA_AGENT] Running daily message retention cleanup');
    const deleted = await this.auditService.cleanupOldMessages();
    this.logger.log(`[WA_AGENT] Cleanup complete: ${deleted} messages removed`);
  }
}
