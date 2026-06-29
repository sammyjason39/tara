import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../../../persistence/prisma.service';
import { EventBusService } from '../../services/event-bus.service';
import { WhatsAppAuditService } from './whatsapp-audit.service';
import { WhatsAppSessionService } from './whatsapp-session.service';
import { WhatsAppClientService } from './whatsapp-client.service';
import { WhatsAppOutboundService } from './whatsapp-outbound.service';
import { AiOrchestratorService } from '../../../ai/ai-orchestrator.service';
import { AiConfigService } from '../../../ai/ai-config.service';
import { formatForWhatsApp } from '../whatsapp-format.util';

export interface InboundMessage {
  from: string; // sender phone number
  messageId: string; // WhatsApp message ID (wamid)
  timestamp: string;
  type: 'text' | 'interactive' | 'image' | 'document' | 'audio' | 'video';
  text?: { body: string };
  interactive?: { type: string; button_reply?: { id: string; title: string }; list_reply?: { id: string; title: string } };
}

export interface WebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: { display_phone_number: string; phone_number_id: string };
        contacts?: Array<{ profile: { name: string }; wa_id: string }>;
        messages?: InboundMessage[];
        statuses?: Array<{
          id: string;
          status: 'sent' | 'delivered' | 'read' | 'failed';
          timestamp: string;
          errors?: Array<{ code: number; title: string }>;
        }>;
      };
      field: string;
    }>;
  }>;
}

/**
 * WhatsApp Inbound Service — processes incoming webhook messages.
 *
 * Responsibilities:
 * 1. Parse webhook payload from Kapso
 * 2. Identify the employee by phone number
 * 3. Log the inbound message (audit)
 * 4. Manage session
 * 5. Emit event to Event Bus → Hermes consumes it
 * 6. Handle delivery status updates
 */
@Injectable()
export class WhatsAppInboundService {
  private readonly logger = new Logger(WhatsAppInboundService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBusService: EventBusService,
    private readonly auditService: WhatsAppAuditService,
    private readonly sessionService: WhatsAppSessionService,
    private readonly clientService: WhatsAppClientService,
    private readonly outboundService: WhatsAppOutboundService,
    @Inject(forwardRef(() => AiOrchestratorService))
    private readonly aiOrchestrator: AiOrchestratorService,
    private readonly aiConfigService: AiConfigService,
  ) {}

  /**
   * Process incoming webhook payload from Kapso (v2 events) or Meta format.
   */
  async processWebhook(payload: Record<string, unknown>, webhookEvent?: string): Promise<void> {
    if (payload?.entry) {
      await this.processMetaWebhook(payload as unknown as WebhookPayload);
      return;
    }

    const event =
      (payload?.event as string) ||
      (payload?.type as string) ||
      webhookEvent;

    if (event?.startsWith('whatsapp.')) {
      await this.processKapsoV2Webhook(payload, event);
      return;
    }

    this.logger.warn(
      `[WEBHOOK] Unhandled payload format (event=${event || 'none'}, keys=${Object.keys(payload).join(',')})`,
    );
  }

  private async processMetaWebhook(payload: WebhookPayload): Promise<void> {
    if (!payload?.entry) return;

    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        const value = change.value;

        if (value.statuses && value.statuses.length > 0) {
          await this.handleStatusUpdates(value.statuses);
        }

        if (value.messages && value.messages.length > 0) {
          for (const message of value.messages) {
            await this.handleInboundMessage(
              this.normalizeInboundMessage(message),
              value.contacts?.[0],
            );
          }
        }
      }
    }
  }

  private async processKapsoV2Webhook(payload: Record<string, unknown>, event: string): Promise<void> {
    if (event === 'whatsapp.message.received') {
      const extracted = this.extractKapsoInboundMessages(payload);

      if (extracted.length === 0) {
        this.logger.warn(
          `[WEBHOOK] message.received but no processable messages (batch=${payload.batch === true}, keys=${Object.keys(payload).join(',')})`,
        );
        return;
      }

      for (const { message, contact } of extracted) {
        await this.handleInboundMessage(message, contact);
      }
      return;
    }

    if (
      event === 'whatsapp.message.delivered' ||
      event === 'whatsapp.message.read' ||
      event === 'whatsapp.message.failed'
    ) {
      const data = payload.data as Record<string, unknown> | undefined;
      const messageId = (data?.message_id || data?.id) as string | undefined;
      if (!messageId) return;

      const statusMap: Record<string, 'delivered' | 'read' | 'failed'> = {
        'whatsapp.message.delivered': 'delivered',
        'whatsapp.message.read': 'read',
        'whatsapp.message.failed': 'failed',
      };

      await this.handleStatusUpdates([
        {
          id: messageId,
          status: statusMap[event],
          timestamp: String(data?.timestamp || Date.now()),
          errors: event === 'whatsapp.message.failed'
            ? [{ code: 0, title: String(data?.error || 'delivery failed') }]
            : undefined,
        },
      ]);
    }
  }

  private extractKapsoInboundMessages(payload: Record<string, unknown>): Array<{
    message: InboundMessage;
    contact?: { profile: { name: string }; wa_id: string };
  }> {
    const data = payload.data;
    const items: Record<string, unknown>[] = [];

    if (Array.isArray(data)) {
      items.push(...(data as Record<string, unknown>[]));
    } else if (data && typeof data === 'object') {
      const record = data as Record<string, unknown>;
      if (Array.isArray(record.messages)) {
        items.push(...(record.messages as Record<string, unknown>[]));
      } else {
        items.push(record);
      }
    } else if (payload.message) {
      // Kapso v2 flat payload: { message, conversation, phone_number_id, ... }
      items.push(payload);
    }

    const results: Array<{
      message: InboundMessage;
      contact?: { profile: { name: string }; wa_id: string };
    }> = [];

    for (const record of items) {
      const msgWrapper = (record.message as Record<string, unknown>) || record;
      const inner =
        (msgWrapper.message as Record<string, unknown>) || msgWrapper;

      const conversation = record.conversation as Record<string, unknown> | undefined;
      const contactRaw = record.contact || record.contacts || msgWrapper.contacts;
      const contact = Array.isArray(contactRaw)
        ? (contactRaw[0] as { profile: { name: string }; wa_id: string })
        : (contactRaw as { profile: { name: string }; wa_id: string } | undefined);

      const from =
        inner.from ||
        msgWrapper.from ||
        conversation?.phone_number ||
        record.phone_number ||
        payload.phone_number ||
        contact?.wa_id;

      if (!from) {
        this.logger.warn(
          `[WEBHOOK] Skipping item — no sender (keys=${Object.keys(record).join(',')})`,
        );
        continue;
      }

      results.push({
        message: this.normalizeInboundMessage({ ...inner, from }),
        contact,
      });
    }

    return results;
  }

  private normalizeInboundMessage(
    message: InboundMessage | Record<string, unknown>,
  ): InboundMessage {
    const msg = message as Record<string, unknown>;
    const textRaw = msg.text;
    let text: InboundMessage['text'];
    if (textRaw && typeof textRaw === 'object' && 'body' in (textRaw as object)) {
      text = textRaw as InboundMessage['text'];
    } else if (typeof textRaw === 'string') {
      text = { body: textRaw };
    } else if (typeof msg.body === 'string') {
      text = { body: msg.body };
    } else if (typeof msg.content === 'string') {
      text = { body: msg.content };
    }

    return {
      from: String(msg.from || '').replace(/^\+/, ''),
      messageId: String(msg.id || msg.message_id || msg.messageId || ''),
      timestamp: String(msg.timestamp || Math.floor(Date.now() / 1000)),
      type: (msg.type as InboundMessage['type']) || 'text',
      text,
      interactive: msg.interactive as InboundMessage['interactive'],
    };
  }

  /**
   * Handle a single inbound message.
   */
  private async handleInboundMessage(
    message: InboundMessage,
    contact?: { profile: { name: string }; wa_id: string },
  ): Promise<void> {
    const senderPhone = message.from;
    const messageContent = this.extractContent(message);

    this.logger.log(
      `[INBOUND] Message from ${senderPhone}: "${messageContent.substring(0, 50)}..."`,
    );

    // Mark as read (show blue ticks)
    if (message.messageId) {
      await this.clientService.markRead(message.messageId);
    }

    // Identify employee by WhatsApp number
    const employee = await this.findEmployeeByPhone(senderPhone);
    if (!employee) {
      this.logger.warn(`[INBOUND] Unknown sender ${senderPhone} — cannot route to employee`);
      // Optionally send a "not registered" reply
      await this.clientService.sendText(
        senderPhone,
        '⚠️ Nomor Anda belum terdaftar di sistem TARA. Silakan atur nomor WhatsApp Anda di profil aplikasi.',
      );
      return;
    }

    if (!employee.whatsapp_opted_in || !employee.whatsapp_verified) {
      this.logger.warn(
        `[INBOUND] Employee ${employee.id} (${employee.full_name}) not opted-in or not verified`,
      );
      return;
    }

    // Get or create session
    const sessionId = await this.sessionService.getOrCreateSession(employee.id);
    await this.sessionService.recordActivity(sessionId);

    // Log the inbound message
    const logEntry = await this.auditService.logMessage({
      employee_id: employee.id,
      direction: 'inbound',
      message_type: message.type,
      content: messageContent,
      wa_message_id: message.messageId,
      wa_status: 'delivered',
      session_id: sessionId,
      correlation_id: sessionId, // group by session
      metadata: {
        sender_name: contact?.profile?.name,
        sender_wa_id: contact?.wa_id || senderPhone,
        raw_type: message.type,
      },
    });

    // Emit to Event Bus (for other agents / audit)
    await this.eventBusService.emit({
      event_type: 'whatsapp.message.inbound',
      event_version: '1.0',
      actor: { id: employee.id, type: 'employee' },
      entity: { id: logEntry.id, type: 'whatsapp_message' },
      payload: {
        employee_id: employee.id,
        employee_name: employee.full_name,
        message_id: logEntry.id,
        wa_message_id: message.messageId,
        session_id: sessionId,
        message_type: message.type,
        content: messageContent,
        sender_phone: senderPhone,
        timestamp: message.timestamp,
      },
    });

    // Route to TARA AI Assistant
    if (this.aiConfigService.isAiEnabled()) {
      const quickReply =
        messageContent.startsWith('[button:') ||
        /^(ya|setuju|ok|batal|tidak|no)$/i.test(messageContent.trim());

      const ACK_DELAY_MS = 30_000;
      let processingComplete = false;
      const ackTimer = !quickReply
        ? setTimeout(async () => {
            if (processingComplete) return;
            try {
              await this.outboundService.sendMessage({
                employee_id: employee.id,
                content: '⏳ Sebentar ya, TARA sedang memproses permintaan Anda...',
                correlation_id: sessionId,
                metadata: { source: 'tara_ai_ack', delayed: true },
              });
            } catch (err) {
              this.logger.warn(`[INBOUND] Delayed ack failed: ${err.message}`);
            }
          }, ACK_DELAY_MS)
        : undefined;

      try {
        const aiResult = await this.aiOrchestrator.processWhatsAppMessage({
          employeeId: employee.id,
          message: messageContent,
          sessionId,
        });

        if (aiResult.useButtons && aiResult.buttons?.length) {
          const buttonResult = await this.outboundService.sendButtons(
            employee.id,
            aiResult.reply,
            aiResult.buttons,
          );
          if (!buttonResult.success) {
            const fallback = formatForWhatsApp(
              `${aiResult.reply}\n\nBalas *YA* untuk setuju atau *BATAL* untuk batal.`,
            );
            await this.outboundService.sendMessage({
              employee_id: employee.id,
              content: fallback,
              correlation_id: sessionId,
              metadata: { source: 'tara_ai', buttons_fallback: true },
            });
          }
        } else {
          await this.outboundService.sendMessage({
            employee_id: employee.id,
            content: aiResult.reply,
            correlation_id: sessionId,
            metadata: { source: 'tara_ai' },
          });
        }
      } catch (err) {
        this.logger.error(`[INBOUND] AI processing failed: ${err.message}`, err.stack);
        await this.outboundService.sendMessage({
          employee_id: employee.id,
          content: 'Maaf, asisten AI sedang mengalami gangguan. Silakan coba lagi nanti atau hubungi HR.',
          correlation_id: sessionId,
        });
      } finally {
        processingComplete = true;
        if (ackTimer) clearTimeout(ackTimer);
      }
    }

    this.logger.log(
      `[INBOUND] Processed message from ${employee.full_name} (session: ${sessionId})`,
    );
  }

  /**
   * Handle delivery status updates from Kapso webhook.
   */
  private async handleStatusUpdates(
    statuses: Array<{ id: string; status: string; timestamp: string; errors?: Array<{ code: number; title: string }> }>,
  ): Promise<void> {
    for (const status of statuses) {
      const errorMsg = status.errors?.[0]?.title;
      await this.auditService.updateMessageStatus(
        status.id,
        status.status as 'sent' | 'delivered' | 'read' | 'failed',
        errorMsg,
      );

      // Emit delivery status event
      if (status.status === 'failed') {
        const existingLog = await this.auditService.getByWaMessageId(status.id);
        if (existingLog) {
          await this.eventBusService.emit({
            event_type: 'whatsapp.delivery.failed',
            event_version: '1.0',
            actor: { id: 'system', type: 'system' },
            entity: { id: existingLog.id, type: 'whatsapp_message' },
            payload: {
              wa_message_id: status.id,
              employee_id: existingLog.employee_id,
              error: errorMsg,
            },
          });
        }
      }
    }
  }

  /**
   * Find employee by their registered WhatsApp number.
   * Searches with multiple format variations.
   */
  private async findEmployeeByPhone(phone: string) {
    // Normalize the incoming phone: remove '+' prefix if present
    const normalized = phone.startsWith('+') ? phone.substring(1) : phone;

    // Search by whatsapp_number (primary) or fallback to phone field
    const employee = await this.prisma.employee.findFirst({
      where: {
        OR: [
          { whatsapp_number: normalized },
          { whatsapp_number: `+${normalized}` },
          { whatsapp_number: phone },
          // Fallback: match on phone field if whatsapp_number not set
          { phone: normalized, whatsapp_opted_in: true },
          { phone: `+${normalized}`, whatsapp_opted_in: true },
        ],
        employment_status: 'active',
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        whatsapp_number: true,
        whatsapp_opted_in: true,
        whatsapp_verified: true,
        language_preference: true,
        role: { select: { role_name: true } },
      },
    });

    return employee;
  }

  /**
   * Extract text content from various message types.
   */
  private extractContent(message: InboundMessage): string {
    switch (message.type) {
      case 'text':
        return message.text?.body || '';
      case 'interactive':
        if (message.interactive?.button_reply) {
          return `[button:${message.interactive.button_reply.id}] ${message.interactive.button_reply.title}`;
        }
        if (message.interactive?.list_reply) {
          return `[list:${message.interactive.list_reply.id}] ${message.interactive.list_reply.title}`;
        }
        return '[interactive]';
      case 'image':
        return '[image]';
      case 'document':
        return '[document]';
      case 'audio':
        return '[audio]';
      case 'video':
        return '[video]';
      default:
        return `[${message.type}]`;
    }
  }
}
