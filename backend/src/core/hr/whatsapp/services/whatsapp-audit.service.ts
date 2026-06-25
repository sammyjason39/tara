import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../persistence/prisma.service';

export interface LogMessageParams {
  employee_id: string;
  direction: 'inbound' | 'outbound';
  message_type?: string;
  content: string;
  wa_message_id?: string;
  wa_status?: string;
  hermes_agent_id?: string;
  hermes_action_log_id?: string;
  session_id?: string;
  correlation_id?: string;
  metadata?: Record<string, any>;
  error_message?: string;
}

/**
 * WhatsApp Audit Service — handles all message logging and retention.
 *
 * Every WhatsApp message (inbound & outbound) is persisted in the
 * `whatsapp_message_logs` table with full context for audit, replay,
 * and compliance.
 *
 * Retention: 90 days (configurable via cleanupOldMessages).
 */
@Injectable()
export class WhatsAppAuditService {
  private readonly logger = new Logger(WhatsAppAuditService.name);
  private readonly RETENTION_DAYS = 90;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log a WhatsApp message (inbound or outbound).
   */
  async logMessage(params: LogMessageParams) {
    try {
      const log = await this.prisma.whatsAppMessageLog.create({
        data: {
          employee_id: params.employee_id,
          direction: params.direction,
          message_type: params.message_type || 'text',
          content: params.content,
          wa_message_id: params.wa_message_id,
          wa_status: params.wa_status || (params.direction === 'outbound' ? 'sent' : 'delivered'),
          hermes_agent_id: params.hermes_agent_id,
          hermes_action_log_id: params.hermes_action_log_id,
          session_id: params.session_id,
          correlation_id: params.correlation_id,
          metadata: params.metadata as any,
          error_message: params.error_message,
        },
      });

      this.logger.debug(
        `[AUDIT] ${params.direction} message logged: ${log.id} (employee: ${params.employee_id})`,
      );

      return log;
    } catch (error) {
      this.logger.error(`[AUDIT] Failed to log message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update message delivery status (from webhook status callback).
   */
  async updateMessageStatus(
    waMessageId: string,
    status: 'sent' | 'delivered' | 'read' | 'failed',
    errorMessage?: string,
  ) {
    try {
      const updated = await this.prisma.whatsAppMessageLog.updateMany({
        where: { wa_message_id: waMessageId },
        data: {
          wa_status: status,
          ...(errorMessage && { error_message: errorMessage }),
        },
      });

      if (updated.count > 0) {
        this.logger.debug(`[AUDIT] Status updated for ${waMessageId} → ${status}`);
      }

      return updated;
    } catch (error) {
      this.logger.error(`[AUDIT] Failed to update status for ${waMessageId}: ${error.message}`);
    }
  }

  /**
   * Get message history for an employee (for Hermes context).
   */
  async getMessageHistory(
    employeeId: string,
    options?: { limit?: number; sessionId?: string; since?: Date },
  ) {
    const where: any = { employee_id: employeeId };

    if (options?.sessionId) {
      where.session_id = options.sessionId;
    }

    if (options?.since) {
      where.created_at = { gte: options.since };
    }

    return this.prisma.whatsAppMessageLog.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: options?.limit || 50,
    });
  }

  /**
   * Get message by WhatsApp message ID.
   */
  async getByWaMessageId(waMessageId: string) {
    return this.prisma.whatsAppMessageLog.findFirst({
      where: { wa_message_id: waMessageId },
    });
  }

  /**
   * Get conversation statistics for an employee.
   */
  async getEmployeeStats(employeeId: string) {
    const [totalMessages, last30Days] = await Promise.all([
      this.prisma.whatsAppMessageLog.count({
        where: { employee_id: employeeId },
      }),
      this.prisma.whatsAppMessageLog.count({
        where: {
          employee_id: employeeId,
          created_at: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return { totalMessages, last30Days };
  }

  /**
   * Cleanup messages older than 90 days (retention policy).
   * Called by scheduled task.
   */
  async cleanupOldMessages(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);

    try {
      const result = await this.prisma.whatsAppMessageLog.deleteMany({
        where: { created_at: { lt: cutoffDate } },
      });

      this.logger.log(
        `[RETENTION] Cleaned up ${result.count} WhatsApp messages older than ${this.RETENTION_DAYS} days`,
      );

      return result.count;
    } catch (error) {
      this.logger.error(`[RETENTION] Cleanup failed: ${error.message}`);
      return 0;
    }
  }
}
