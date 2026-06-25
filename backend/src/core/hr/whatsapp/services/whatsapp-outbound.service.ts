import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../persistence/prisma.service';
import { EventBusService } from '../../services/event-bus.service';
import { WhatsAppClientService } from './whatsapp-client.service';
import { WhatsAppAuditService } from './whatsapp-audit.service';
import { WhatsAppSessionService } from './whatsapp-session.service';

export interface SendMessageParams {
  employee_id: string;
  content: string;
  message_type?: string;
  hermes_agent_id?: string;
  hermes_action_log_id?: string;
  correlation_id?: string;
  metadata?: Record<string, any>;
}

export interface SendMessageResult {
  success: boolean;
  message_log_id?: string;
  wa_message_id?: string;
  error?: string;
}

/**
 * WhatsApp Outbound Service — handles sending messages to employees.
 *
 * Safety checks:
 * - Employee must have whatsapp_opted_in = true
 * - Employee must have whatsapp_verified = true
 * - Rate limit: max 10 outbound messages per employee per hour
 * - Message length: max 4096 chars (WhatsApp limit)
 *
 * All outbound messages are logged and emitted as events.
 */
@Injectable()
export class WhatsAppOutboundService {
  private readonly logger = new Logger(WhatsAppOutboundService.name);
  private readonly MAX_MESSAGES_PER_HOUR = 10;
  private readonly MAX_MESSAGE_LENGTH = 4096;

  constructor(
    private readonly prisma: PrismaService,
    private readonly clientService: WhatsAppClientService,
    private readonly auditService: WhatsAppAuditService,
    private readonly sessionService: WhatsAppSessionService,
    private readonly eventBusService: EventBusService,
  ) {}

  /**
   * Send a text message to an employee via WhatsApp.
   * Validates opt-in, verification, and rate limits before sending.
   */
  async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    // Validate client availability
    if (!this.clientService.isAvailable()) {
      return { success: false, error: 'WhatsApp client not configured' };
    }

    // Get employee and validate
    const employee = await this.prisma.employee.findUnique({
      where: { id: params.employee_id },
      select: {
        id: true,
        full_name: true,
        whatsapp_number: true,
        whatsapp_opted_in: true,
        whatsapp_verified: true,
        employment_status: true,
      },
    });

    if (!employee) {
      return { success: false, error: `Employee not found: ${params.employee_id}` };
    }

    if (employee.employment_status !== 'active') {
      return { success: false, error: `Employee not active: ${employee.employment_status}` };
    }

    if (!employee.whatsapp_opted_in) {
      return { success: false, error: 'Employee has not opted in to WhatsApp' };
    }

    if (!employee.whatsapp_verified) {
      return { success: false, error: 'Employee WhatsApp number not verified' };
    }

    if (!employee.whatsapp_number) {
      return { success: false, error: 'Employee has no WhatsApp number' };
    }

    // Validate message length
    if (params.content.length > this.MAX_MESSAGE_LENGTH) {
      return { success: false, error: `Message exceeds ${this.MAX_MESSAGE_LENGTH} character limit` };
    }

    // Check rate limit
    const isRateLimited = await this.checkRateLimit(params.employee_id);
    if (isRateLimited) {
      return { success: false, error: 'Rate limit exceeded (max 10 messages per hour)' };
    }

    // Get or create session
    const sessionId = await this.sessionService.getOrCreateSession(
      params.employee_id,
      params.hermes_agent_id,
    );

    // Send via Kapso SDK
    const result = await this.clientService.sendText(employee.whatsapp_number, params.content);

    // Log the message
    const logEntry = await this.auditService.logMessage({
      employee_id: params.employee_id,
      direction: 'outbound',
      message_type: params.message_type || 'text',
      content: params.content,
      wa_message_id: result.messageId,
      wa_status: result.success ? 'sent' : 'failed',
      hermes_agent_id: params.hermes_agent_id,
      hermes_action_log_id: params.hermes_action_log_id,
      session_id: sessionId,
      correlation_id: params.correlation_id || sessionId,
      metadata: params.metadata,
      error_message: result.success ? undefined : 'Send failed',
    });

    // Record session activity
    await this.sessionService.recordActivity(sessionId);

    // Emit event
    await this.eventBusService.emit({
      event_type: 'whatsapp.message.outbound',
      event_version: '1.0',
      actor: {
        id: params.hermes_agent_id || 'system',
        type: params.hermes_agent_id ? 'agent' : 'system',
      },
      entity: { id: logEntry.id, type: 'whatsapp_message' },
      payload: {
        employee_id: params.employee_id,
        message_log_id: logEntry.id,
        wa_message_id: result.messageId,
        session_id: sessionId,
        content_preview: params.content.substring(0, 100),
        success: result.success,
      },
    });

    if (!result.success) {
      this.logger.error(`[OUTBOUND] Failed to send to ${employee.full_name}`);
      return { success: false, message_log_id: logEntry.id, error: 'Delivery failed' };
    }

    this.logger.log(
      `[OUTBOUND] Sent to ${employee.full_name} (wamid: ${result.messageId})`,
    );

    return {
      success: true,
      message_log_id: logEntry.id,
      wa_message_id: result.messageId,
    };
  }

  /**
   * Send interactive buttons to an employee.
   */
  async sendButtons(
    employeeId: string,
    body: string,
    buttons: { id: string; title: string }[],
    hermesAgentId?: string,
  ): Promise<SendMessageResult> {
    if (!this.clientService.isAvailable()) {
      return { success: false, error: 'WhatsApp client not configured' };
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        whatsapp_number: true,
        whatsapp_opted_in: true,
        whatsapp_verified: true,
      },
    });

    if (!employee?.whatsapp_opted_in || !employee?.whatsapp_verified || !employee?.whatsapp_number) {
      return { success: false, error: 'Employee not eligible for WhatsApp' };
    }

    const result = await this.clientService.sendButtons(employee.whatsapp_number, body, buttons);

    const sessionId = await this.sessionService.getOrCreateSession(employeeId, hermesAgentId);

    await this.auditService.logMessage({
      employee_id: employeeId,
      direction: 'outbound',
      message_type: 'interactive',
      content: `${body} [buttons: ${buttons.map((b) => b.title).join(', ')}]`,
      wa_message_id: result.messageId,
      wa_status: result.success ? 'sent' : 'failed',
      hermes_agent_id: hermesAgentId,
      session_id: sessionId,
      correlation_id: sessionId,
      metadata: { buttons },
    });

    await this.sessionService.recordActivity(sessionId);

    return {
      success: result.success,
      wa_message_id: result.messageId,
    };
  }

  /**
   * Check rate limit: max 10 outbound messages per employee per hour.
   */
  private async checkRateLimit(employeeId: string): Promise<boolean> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const count = await this.prisma.whatsAppMessageLog.count({
      where: {
        employee_id: employeeId,
        direction: 'outbound',
        created_at: { gte: oneHourAgo },
      },
    });

    return count >= this.MAX_MESSAGES_PER_HOUR;
  }
}
