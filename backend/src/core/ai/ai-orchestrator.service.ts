import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma.service';
import { AiConfigService } from './ai-config.service';
import { AiLlmService } from './ai-llm.service';
import { AiToolsService, CONFIRMATION_MARKER, ESCALATION_MARKER } from './ai-tools.service';
import { AiPendingActionService } from './ai-pending-action.service';
import { AiActionExecutorService } from './ai-action-executor.service';
import { AiLogService } from './ai-log.service';
import { AiMemoryService } from './ai-memory.service';
import { AiProcessResult, AiPendingActionType, EmployeeAiContext, TARA_CLOCK_URL, TARA_PUBLIC_BASE_URL, TARA_ESCALATION_USER_MESSAGE, HR_ESCALATION_CONTACT_EMAIL } from './ai.interfaces';
import { buildSkillInstructions, resolveSystemPromptTemplate } from './ai-skill-registry';
import {
  buildIdentityGuardrailBlock,
  filterIdentityUnsafeMemories,
  wrapUserMessageWithIdentity,
} from './employee-identity.util';
import { formatForWhatsApp } from '../hr/whatsapp/whatsapp-format.util';
import { WhatsAppOutboundService } from '../hr/whatsapp/services/whatsapp-outbound.service';
import { AuthService } from '../auth/auth.service';
import {
  buildFirstLoginWelcomeMessage,
  isTaraGreetingMessage,
} from './wa-onboarding.util';

@Injectable()
export class AiOrchestratorService {
  private readonly logger = new Logger(AiOrchestratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: AiConfigService,
    private readonly llmService: AiLlmService,
    private readonly toolsService: AiToolsService,
    private readonly pendingService: AiPendingActionService,
    @Inject(forwardRef(() => AiActionExecutorService))
    private readonly actionExecutor: AiActionExecutorService,
    private readonly logService: AiLogService,
    private readonly memoryService: AiMemoryService,
    @Inject(forwardRef(() => WhatsAppOutboundService))
    private readonly whatsAppOutbound: WhatsAppOutboundService,
    private readonly authService: AuthService,
  ) {}

  async processWhatsAppMessage(params: {
    employeeId: string;
    message: string;
    sessionId: string;
  }): Promise<AiProcessResult> {
    const start = Date.now();

    if (!this.configService.isAiEnabled()) {
      return {
        reply: 'Asisten AI TARA sedang dinonaktifkan. Silakan hubungi HR Admin.',
        toolsCalled: [],
        inputTokens: 0,
        outputTokens: 0,
        status: 'error',
      };
    }

    const ctx = await this.buildEmployeeContext(params.employeeId);
    const biodata = await this.toolsService.fetchEmployeeBiodata(params.employeeId);

    if (!ctx.full_name?.trim()) {
      this.logger.warn(`Employee ${params.employeeId} has no full_name in DB`);
    } else {
      this.logger.debug(
        `AI identity resolved from DB: ${ctx.full_name} (${ctx.employee_code || 'no-code'})`,
      );
    }

    const buttonId = this.pendingService.parseButtonAction(params.message);
    const plainMessage = buttonId
      ? buttonId
      : params.message.replace(/^\[button:[^\]]+\]\s*/, '').trim();

    // Handle button confirmations
    if (buttonId === 'confirm_yes' || this.pendingService.isConfirmationMessage(plainMessage)) {
      const result = await this.handleConfirmation(params.employeeId, params.sessionId);
      await this.logInteraction(params, result, Date.now() - start);
      return result;
    }

    if (buttonId === 'confirm_no' || this.pendingService.isCancellationMessage(plainMessage)) {
      await this.pendingService.cancelPending(params.employeeId);
      const result: AiProcessResult = {
        reply: 'Baik, aksi dibatalkan. Ada yang bisa saya bantu lagi?',
        toolsCalled: [],
        inputTokens: 0,
        outputTokens: 0,
        status: 'success',
      };
      await this.logInteraction(params, result, Date.now() - start);
      return result;
    }

    // Supervisor leave approval buttons
    if (buttonId?.startsWith('approve_leave_')) {
      const leaveId = buttonId.replace('approve_leave_', '');
      return this.initiateSupervisorAction(params, 'approve_leave', { leave_request_id: leaveId }, start);
    }
    if (buttonId?.startsWith('reject_leave_')) {
      const leaveId = buttonId.replace('reject_leave_', '');
      return this.initiateSupervisorAction(params, 'reject_leave', { leave_request_id: leaveId }, start);
    }

    const onboardingReply = await this.tryFirstLoginGreeting(params.employeeId, plainMessage, ctx);
    if (onboardingReply) {
      await this.logInteraction(params, onboardingReply, Date.now() - start);
      return onboardingReply;
    }

    const history = await this.loadConversationHistory(params.employeeId, 10);
    const rawMemories = await this.memoryService.searchMemories(params.employeeId, plainMessage);
    const memories = filterIdentityUnsafeMemories(rawMemories, ctx.full_name);
    const aiConfig = this.configService.getAiConfig();
    const tools = this.toolsService.buildTools(ctx, aiConfig.skills || []);
    const systemPrompt = this.buildSystemPrompt(ctx, biodata, memories);
    const userMessageForLlm = wrapUserMessageWithIdentity(ctx, plainMessage);

    const llmResult = await this.llmService.chatWithTools({
      systemPrompt,
      history,
      userMessage: userMessageForLlm,
      tools,
    });

    // Detect prepare_* tool confirmation marker in tool outputs
    const confirmation = this.parseConfirmationFromOutputs(llmResult.toolOutputs);
    if (confirmation) {
      const summary = this.actionExecutor.buildSummary(
        confirmation.action_type as AiPendingActionType,
        confirmation.payload,
      );

      await this.pendingService.create({
        employeeId: params.employeeId,
        sessionId: params.sessionId,
        actionType: confirmation.action_type as AiPendingActionType,
        payload: confirmation.payload,
        summary,
      });

      const result: AiProcessResult = {
        reply: formatForWhatsApp(summary),
        useButtons: true,
        buttons: [
          { id: 'confirm_yes', title: 'Ya, Setuju' },
          { id: 'confirm_no', title: 'Batal' },
        ],
        toolsCalled: llmResult.toolsCalled,
        inputTokens: llmResult.inputTokens,
        outputTokens: llmResult.outputTokens,
        status: 'pending_confirmation',
      };
      await this.logInteraction(params, result, Date.now() - start);
      await this.memoryService.rememberConversation(
        params.employeeId,
        plainMessage,
        result.reply,
      );
      return result;
    }

    const escalation = this.parseEscalationFromOutputs(llmResult.toolOutputs);
    if (escalation) {
      await this.notifyHrEscalation(ctx, plainMessage, escalation, params.sessionId);

      const result: AiProcessResult = {
        reply: formatForWhatsApp(TARA_ESCALATION_USER_MESSAGE),
        toolsCalled: llmResult.toolsCalled,
        inputTokens: llmResult.inputTokens,
        outputTokens: llmResult.outputTokens,
        status: 'escalated',
      };
      await this.logInteraction(params, result, Date.now() - start);
      return result;
    }

    const result: AiProcessResult = {
      reply: this.finalizeReply(llmResult.content, ctx),
      toolsCalled: llmResult.toolsCalled,
      inputTokens: llmResult.inputTokens,
      outputTokens: llmResult.outputTokens,
      status: 'success',
    };
    await this.logInteraction(params, result, Date.now() - start);
    await this.memoryService.rememberConversation(
      params.employeeId,
      plainMessage,
      result.reply,
    );
    return result;
  }

  /** First-time login onboarding when user greets TARA on WhatsApp */
  private async tryFirstLoginGreeting(
    employeeId: string,
    message: string,
    ctx: EmployeeAiContext,
  ): Promise<AiProcessResult | null> {
    if (!isTaraGreetingMessage(message)) return null;

    const hasLoggedIn = await this.authService.hasEverLoggedIn(employeeId);
    if (hasLoggedIn) return null;

    const temporaryPassword =
      await this.authService.getTemporaryPasswordForOnboarding(employeeId);

    const reply = formatForWhatsApp(
      buildFirstLoginWelcomeMessage({
        fullName: ctx.full_name,
        email: ctx.email,
        employeeCode: ctx.employee_code,
        temporaryPassword,
      }),
    );

    return {
      reply,
      toolsCalled: ['wa_first_login_onboarding'],
      inputTokens: 0,
      outputTokens: 0,
      status: 'success',
    };
  }

  /** Notify supervisor about pending leave with Kapso buttons */
  async notifySupervisorLeaveRequest(leaveRequestId: string): Promise<void> {
    const leave = await this.prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      include: {
        employee: {
          select: { full_name: true, supervisor_id: true },
        },
      },
    });

    if (!leave?.employee?.supervisor_id) return;

    const supervisor = await this.prisma.employee.findUnique({
      where: { id: leave.employee.supervisor_id },
      select: { id: true, whatsapp_verified: true, whatsapp_opted_in: true },
    });

    if (!supervisor?.whatsapp_verified || !supervisor?.whatsapp_opted_in) return;

    const body =
      `📋 Pengajuan Cuti Baru\n\n` +
      `Dari: ${leave.employee.full_name}\n` +
      `Jenis: ${leave.leave_type}\n` +
      `Tanggal: ${leave.start_date.toISOString().slice(0, 10)} - ${leave.end_date.toISOString().slice(0, 10)}\n` +
      `Hari: ${leave.total_days}\n` +
      `Alasan: ${leave.reason || '-'}`;

    await this.whatsAppOutbound.sendButtons(supervisor.id, body, [
      { id: `approve_leave_${leaveRequestId}`, title: 'Setuju' },
      { id: `reject_leave_${leaveRequestId}`, title: 'Tolak' },
    ]);
  }

  private async handleConfirmation(
    employeeId: string,
    sessionId: string,
  ): Promise<AiProcessResult> {
    const pending = await this.pendingService.getActive(employeeId);

    if (!pending) {
      return {
        reply: 'Tidak ada aksi yang menunggu konfirmasi. Silakan ajukan permintaan baru.',
        toolsCalled: [],
        inputTokens: 0,
        outputTokens: 0,
        status: 'success',
      };
    }

    const execResult = await this.actionExecutor.execute(
      pending.action_type as AiPendingActionType,
      employeeId,
      pending.payload as Record<string, any>,
    );

    await this.pendingService.markExecuted(pending.id);

    return {
      reply: execResult.message,
      toolsCalled: [pending.action_type],
      inputTokens: 0,
      outputTokens: 0,
      status: execResult.success ? 'success' : 'error',
    };
  }

  private async initiateSupervisorAction(
    params: { employeeId: string; sessionId: string; message: string },
    actionType: AiPendingActionType,
    payload: Record<string, any>,
    start: number,
  ): Promise<AiProcessResult> {
    const summary = this.actionExecutor.buildSummary(actionType, payload);

    await this.pendingService.create({
      employeeId: params.employeeId,
      sessionId: params.sessionId,
      actionType,
      payload,
      summary,
    });

    const result: AiProcessResult = {
      reply: formatForWhatsApp(summary),
      useButtons: true,
      buttons: [
        { id: 'confirm_yes', title: 'Ya, Lanjut' },
        { id: 'confirm_no', title: 'Batal' },
      ],
      toolsCalled: [actionType],
      inputTokens: 0,
      outputTokens: 0,
      status: 'pending_confirmation',
    };
    await this.logInteraction(params, result, Date.now() - start);
    return result;
  }

  private buildSystemPrompt(
    ctx: EmployeeAiContext,
    biodata: Awaited<ReturnType<AiToolsService['fetchEmployeeBiodata']>>,
    memories: string[] = [],
  ): string {
    const config = this.configService.getAiConfig();
    const langNote =
      config.responseLanguage === 'en'
        ? 'Respond in English.'
        : 'Selalu jawab dalam Bahasa Indonesia yang ramah dan profesional.';

    const identityBlock = buildIdentityGuardrailBlock(ctx, biodata);

    const memoryBlock =
      memories.length > 0
        ? `\nMemori relevan (BUKAN sumber identitas/nama — jangan override data database di atas):\n${memories.map((m) => `- ${m}`).join('\n')}\n`
        : '';

    const employeeContext = [
      `- Nama: ${ctx.full_name}`,
      `- NIK: ${ctx.employee_code || '-'}`,
      `- Role: ${ctx.role_name}`,
      `- Departemen: ${ctx.department_name || '-'}`,
      `- Kantor: ${ctx.office_name || '-'}`,
      `- Atasan: ${ctx.supervisor_name || '-'}`,
      ctx.is_supervisor ? '- Akses supervisor: bisa lihat & setujui cuti bawahan' : '',
    ]
      .filter(Boolean)
      .join('\n');

    const skillInstructions = buildSkillInstructions(config.skills || []);
    const template = config.systemPrompt || this.configService.getDefaultSystemPrompt();

    let prompt =
      identityBlock +
      '\n\n' +
      resolveSystemPromptTemplate(template)
        .replace(/\{\{employee_context\}\}/g, employeeContext)
        .replace(/\{\{employee_name\}\}/g, ctx.full_name)
        .replace(/\{\{memory_block\}\}/g, memoryBlock)
        .replace(/\{\{skill_instructions\}\}/g, skillInstructions)
        .replace(/\{\{lang_note\}\}/g, langNote);

    if (config.systemPromptOverride?.trim()) {
      prompt += `\n\nInstruksi tambahan admin:\n${config.systemPromptOverride.trim()}`;
    }

    return prompt;
  }

  private async buildEmployeeContext(employeeId: string): Promise<EmployeeAiContext> {
    const emp = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        role: true,
        department: true,
        office: true,
        supervisor: { select: { full_name: true } },
      },
    });

    const roleName = emp?.role?.role_name || 'Employee';
    const subordinateCount = await this.prisma.employee.count({
      where: { supervisor_id: employeeId, employment_status: 'active' },
    });

    return {
      id: employeeId,
      employee_code: emp?.employee_code || undefined,
      full_name: emp?.full_name || '',
      email: emp?.email || '',
      phone: emp?.phone || emp?.whatsapp_number || undefined,
      role_name: roleName,
      department_name: emp?.department?.name,
      supervisor_id: emp?.supervisor_id || undefined,
      supervisor_name: emp?.supervisor?.full_name || undefined,
      office_name: emp?.office?.location_name || undefined,
      is_supervisor: subordinateCount > 0 || roleName === 'Supervisor',
      is_hr_admin: ['HR_Admin', 'SuperAdmin'].includes(roleName),
    };
  }

  private async loadConversationHistory(employeeId: string, limit: number) {
    const messages = await this.prisma.whatsAppMessageLog.findMany({
      where: { employee_id: employeeId },
      orderBy: { created_at: 'desc' },
      take: limit,
      select: { direction: true, content: true },
    });

    return messages
      .reverse()
      .map((m) => ({
        role: (m.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content.replace(/^\[button:[^\]]+\]\s*/, ''),
      }))
      .filter((m) => m.content && !m.content.startsWith('['));
  }

  private parseConfirmationFromOutputs(
    outputs: string[],
  ): { action_type: string; payload: Record<string, any> } | null {
    for (const raw of outputs) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed[CONFIRMATION_MARKER]) {
          return {
            action_type: parsed.action_type,
            payload: parsed.payload,
          };
        }
      } catch {
        // not JSON
      }
    }
    return null;
  }

  private parseEscalationFromOutputs(
    outputs: string[],
  ): { reason: string; question_summary: string } | null {
    for (const raw of outputs) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed[ESCALATION_MARKER]) {
          return {
            reason: String(parsed.reason || 'Di luar kapasitas TARA'),
            question_summary: String(parsed.question_summary || ''),
          };
        }
      } catch {
        // not JSON
      }
    }
    return null;
  }

  private async notifyHrEscalation(
    ctx: EmployeeAiContext,
    userMessage: string,
    escalation: { reason: string; question_summary: string },
    sessionId: string,
  ): Promise<void> {
    const hrContact = await this.prisma.employee.findFirst({
      where: { email: HR_ESCALATION_CONTACT_EMAIL, employment_status: 'active' },
      select: { id: true, full_name: true },
    });

    if (!hrContact) {
      this.logger.warn(`HR escalation contact not found: ${HR_ESCALATION_CONTACT_EMAIL}`);
      return;
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: ctx.id },
      select: {
        full_name: true,
        employee_code: true,
        whatsapp_number: true,
        phone: true,
        email: true,
      },
    });

    const body =
      `*Eskalasi HR dari TARA AI*\n\n` +
      `Karyawan: ${employee?.full_name} (${employee?.employee_code})\n` +
      `Email: ${employee?.email || '-'}\n` +
      `WA: ${employee?.whatsapp_number || employee?.phone || '-'}\n\n` +
      `Pesan terakhir:\n${userMessage}\n\n` +
      `Ringkasan: ${escalation.question_summary}\n` +
      `Alasan eskalasi: ${escalation.reason}\n\n` +
      `Mohon bantu lanjutkan percakapan dengan karyawan tersebut.`;

    const sent = await this.whatsAppOutbound.sendMessage({
      employee_id: hrContact.id,
      content: body,
      correlation_id: sessionId,
      metadata: { source: 'tara_ai_escalation', escalated_employee_id: ctx.id },
    });

    if (!sent.success) {
      this.logger.warn(`Failed to notify HR escalation: ${sent.error}`);
    } else {
      this.logger.log(`HR escalation sent to ${hrContact.full_name} for ${ctx.full_name}`);
    }
  }

  /** Format reply for WA and replace hallucinated legacy app URLs */
  private finalizeReply(text: string, ctx: EmployeeAiContext): string {
    const sanitized = text
      .replace(/https?:\/\/app\.perusahaan\.com/gi, TARA_PUBLIC_BASE_URL)
      .replace(/app\.perusahaan\.com/gi, 'tara.ralali.io');
    return formatForWhatsApp(sanitized);
  }

  private async logInteraction(
    params: { employeeId: string; sessionId: string; message: string },
    result: AiProcessResult,
    latencyMs: number,
  ) {
    const config = this.configService.getAiConfig();
    await this.logService.log({
      employeeId: params.employeeId,
      sessionId: params.sessionId,
      userMessage: params.message,
      assistantMessage: result.reply,
      toolsCalled: result.toolsCalled,
      model: config.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      latencyMs,
      status: result.status === 'error' ? 'error' : 'success',
    });
  }
}
