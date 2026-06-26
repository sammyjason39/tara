import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { HermesQueryExecutor } from './executors/query.executor';
import { WhatsAppAgent } from '../whatsapp/whatsapp.agent';

interface WhatsAppInboundEvent {
  event_id?: string;
  event_type?: string;
  payload?: {
    employee_id?: string;
    employee_name?: string;
    content?: string;
    session_id?: string;
  };
}

/**
 * Local MVP bridge for WhatsApp inbound messages.
 *
 * This gives TARA a working local read-only WA assistant before the full
 * external Hermes LLM event consumer is wired in production.
 */
@Injectable()
export class HermesWhatsAppBridgeAgent {
  private readonly logger = new Logger(HermesWhatsAppBridgeAgent.name);
  private readonly agentId = 'tara-wa-local-mvp';

  constructor(
    private readonly queryExecutor: HermesQueryExecutor,
    private readonly whatsAppAgent: WhatsAppAgent,
  ) {}

  @OnEvent('whatsapp.message.inbound')
  async handleInboundWhatsAppMessage(event: WhatsAppInboundEvent): Promise<void> {
    if (process.env.HERMES_WA_LOCAL_MVP_ENABLED !== 'true') {
      return;
    }

    const payload = event?.payload || {};
    const employeeId = payload.employee_id;
    const content = payload.content || '';

    if (!employeeId || !content.trim()) {
      this.logger.warn('[WA_BRIDGE] Ignoring inbound event without employee_id or content');
      return;
    }

    const message = await this.buildReply(employeeId, content);

    await this.whatsAppAgent.executeReply({
      employee_id: employeeId,
      message,
      hermes_agent_id: this.agentId,
      hermes_action_log_id: event.event_id,
    });
  }

  private async buildReply(employeeId: string, content: string): Promise<string> {
    const normalized = content.toLowerCase();

    if (this.isLeaveBalanceQuestion(normalized)) {
      const result = await this.queryExecutor.execute('leave_balance', { employee_id: employeeId });
      return this.formatLeaveBalanceReply(result);
    }

    return [
      'Halo, aku Tara HR Assistant.',
      'Untuk MVP local sekarang aku sudah bisa bantu cek sisa cuti.',
      'Coba tanya: “Sisa cuti saya berapa?”',
    ].join('\n');
  }

  private isLeaveBalanceQuestion(message: string): boolean {
    const asksAboutLeave = message.includes('cuti') || message.includes('leave');
    const asksAboutBalance =
      message.includes('sisa') ||
      message.includes('saldo') ||
      message.includes('balance') ||
      message.includes('berapa');

    return asksAboutLeave && asksAboutBalance;
  }

  private formatLeaveBalanceReply(result: any): string {
    const balance = result?.balance;

    if (!balance) {
      return 'Data saldo cuti kamu belum tersedia di TARA. Hubungi HR untuk pengecekan manual.';
    }

    const year = balance.year || new Date().getFullYear();
    const remaining = balance.remaining_days ?? 0;
    const used = balance.used_days ?? 0;
    const total = balance.total_entitlement ?? 0;
    const carryover = balance.carryover_days ?? 0;

    const lines = [
      `Sisa cuti kamu ${remaining} hari untuk ${year}.`,
      `Terpakai: ${used} hari dari total ${total} hari.`,
    ];

    if (carryover > 0) {
      lines.push(`Carryover: ${carryover} hari.`);
    }

    const upcoming = Array.isArray(result.upcoming_approved_leaves)
      ? result.upcoming_approved_leaves
      : [];

    if (upcoming.length > 0) {
      lines.push(`Cuti approved terdekat: ${upcoming[0].total_days} hari mulai ${this.formatDate(upcoming[0].start_date)}.`);
    }

    return lines.join('\n');
  }

  private formatDate(value: string | Date): string {
    if (!value) return '-';
    return new Date(value).toISOString().slice(0, 10);
  }
}
