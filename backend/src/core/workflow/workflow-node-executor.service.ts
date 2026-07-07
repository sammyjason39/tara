import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma.service';
import { NotificationService } from '../hr/services/notification.service';
import { WhatsAppOutboundService } from '../hr/whatsapp/services/whatsapp-outbound.service';
import { HR_ESCALATION_CONTACT_EMAIL } from '../ai/ai.interfaces';
import type {
  WorkflowActionType,
  WorkflowExecutionContext,
  WorkflowNode,
} from './workflow.types';
import { renderTemplate, getPathValue } from './workflow-expression.util';

@Injectable()
export class WorkflowNodeExecutorService {
  private readonly logger = new Logger(WorkflowNodeExecutorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly whatsappOutbound: WhatsAppOutboundService,
  ) {}

  async executeAction(
    node: WorkflowNode,
    context: WorkflowExecutionContext,
    exprContext: Record<string, unknown>,
  ): Promise<string> {
    const actionType = node.data.actionType as WorkflowActionType | undefined;
    if (!actionType) {
      throw new Error(`Node ${node.id} missing actionType`);
    }

    const templateContext = {
      ...exprContext,
      variables: context.variables,
    };

    switch (actionType) {
      case 'send_notification':
        return this.sendNotification(node, templateContext);
      case 'send_whatsapp':
        return this.sendWhatsApp(node, templateContext);
      case 'escalate_hr':
        return this.escalateHr(node, templateContext);
      case 'notify_by_role':
        return this.notifyByRole(node, templateContext);
      case 'log':
        this.logger.log(
          `[workflow-log] ${renderTemplate(String(node.data.config?.message ?? node.data.label), templateContext)}`,
        );
        return 'logged';
      default:
        throw new Error(`Unsupported action type: ${actionType}`);
    }
  }

  private async sendNotification(
    node: WorkflowNode,
    templateContext: Record<string, unknown>,
  ): Promise<string> {
    const config = node.data.config ?? {};
    const recipientIds = await this.resolveRecipientIds(templateContext, config);
    if (recipientIds.length === 0) {
      return 'skipped: no recipient';
    }

    const title = renderTemplate(String(config.title ?? 'Notifikasi TARA'), templateContext);
    const content = renderTemplate(String(config.content ?? ''), templateContext);

    for (const recipientId of recipientIds) {
      await this.notificationService.sendNotification({
        recipient_id: recipientId,
        type: String(config.notification_type ?? 'general_notification'),
        visibility: (config.visibility as 'private' | 'public') ?? 'private',
        title,
        content,
        metadata: {
          source: 'workflow_engine',
          workflow_node: node.id,
        },
      });
    }

    return `notification sent to ${recipientIds.length} recipient(s)`;
  }

  private async sendWhatsApp(
    node: WorkflowNode,
    templateContext: Record<string, unknown>,
  ): Promise<string> {
    const config = node.data.config ?? {};
    const recipientIds = await this.resolveRecipientIds(templateContext, config);
    if (recipientIds.length === 0) {
      return 'skipped: no recipient';
    }

    const content = renderTemplate(String(config.message ?? ''), templateContext);
    if (!content.trim()) {
      return 'skipped: empty message';
    }

    let sent = 0;
    for (const recipientId of recipientIds) {
      const result = await this.whatsappOutbound.sendMessage({
        employee_id: recipientId,
        content,
        message_type: 'workflow_automation',
        metadata: { workflow_node: node.id },
      });
      if (result.success) sent++;
    }

    if (sent === 0) {
      throw new Error('WhatsApp send failed for all recipients');
    }

    return `whatsapp sent to ${sent} recipient(s)`;
  }

  private async notifyByRole(
    node: WorkflowNode,
    templateContext: Record<string, unknown>,
  ): Promise<string> {
    const config = { ...node.data.config, recipient_mode: 'role' };
    return this.sendNotification({ ...node, data: { ...node.data, config } }, templateContext);
  }

  private async escalateHr(
    node: WorkflowNode,
    templateContext: Record<string, unknown>,
  ): Promise<string> {
    const config = node.data.config ?? {};
    const hrEmail = String(config.hr_email ?? HR_ESCALATION_CONTACT_EMAIL);

    const hrContact = await this.prisma.employee.findFirst({
      where: { email: hrEmail, employment_status: 'active' },
      select: { id: true, full_name: true },
    });

    if (!hrContact) {
      return `skipped: HR contact not found (${hrEmail})`;
    }

    const employeeName = renderTemplate(
      String(config.employee_name_field ?? '{{employee.full_name}}'),
      templateContext,
    );
    const reason = renderTemplate(String(config.reason ?? 'Eskalasi dari workflow otomasi'), templateContext);
    const summary = renderTemplate(
      String(config.summary ?? '{{payload.content}}'),
      templateContext,
    );

    const title = renderTemplate(
      String(config.title ?? 'Eskalasi HR — {{employee.full_name}}'),
      templateContext,
    );
    const content =
      `Karyawan: ${employeeName}\n` +
      `Ringkasan: ${summary}\n` +
      `Alasan: ${reason}\n` +
      `Event: ${String((templateContext.event as { event_type?: string })?.event_type ?? '')}`;

    await this.notificationService.sendNotification({
      recipient_id: hrContact.id,
      type: 'general_notification',
      visibility: 'private',
      title,
      content,
      metadata: {
        source: 'workflow_escalation',
        workflow_node: node.id,
      },
    });

    const notifyEmployee = config.notify_employee !== false;
    const employeeId = getPathValue(templateContext, 'employee.id') as string | undefined;
    if (notifyEmployee && employeeId) {
      const waMessage = renderTemplate(
        String(
          config.employee_message ??
            'Permintaan Anda telah diteruskan ke tim HR. Kami akan menghubungi Anda segera.',
        ),
        templateContext,
      );
      await this.whatsappOutbound.sendMessage({
        employee_id: employeeId,
        content: waMessage,
        message_type: 'workflow_escalation_ack',
      });
    }

    return `escalated to ${hrContact.full_name}`;
  }

  private async resolveRecipientIds(
    templateContext: Record<string, unknown>,
    config: Record<string, unknown>,
  ): Promise<string[]> {
    const mode = String(
      config.recipient_mode ??
        (config.recipient_role === 'supervisor' ? 'supervisor' : 'field'),
    );

    switch (mode) {
      case 'employee': {
        const id = getPathValue(templateContext, 'employee.id');
        return id ? [String(id)] : [];
      }
      case 'actor': {
        const id = getPathValue(templateContext, 'actor_employee.id') ?? getPathValue(templateContext, 'actor.id');
        return id ? [String(id)] : [];
      }
      case 'supervisor': {
        const id = getPathValue(templateContext, 'supervisor.id') ?? getPathValue(templateContext, 'employee.supervisor_id');
        return id ? [String(id)] : [];
      }
      case 'role': {
        const roleName = renderTemplate(String(config.role ?? config.role_name ?? 'HR_Admin'), templateContext);
        const rows = await this.prisma.employee.findMany({
          where: {
            employment_status: 'active',
            role: { role_name: roleName },
          },
          select: { id: true },
          take: 50,
        });
        return rows.map((r) => r.id);
      }
      case 'department': {
        const dept = renderTemplate(
          String(config.department ?? '{{employee.department}}'),
          templateContext,
        );
        if (!dept) return [];
        const rows = await this.prisma.employee.findMany({
          where: {
            employment_status: 'active',
            department: { name: dept },
          },
          select: { id: true },
          take: 100,
        });
        return rows.map((r) => r.id);
      }
      case 'field':
      default: {
        const field = String(config.recipient_field ?? 'employee.id');
        const id = getPathValue(templateContext, field.replace(/^\{\{\s*|\s*\}\}$/g, ''));
        return id ? [String(id)] : [];
      }
    }
  }
}
