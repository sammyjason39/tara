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
import { formatForWhatsApp } from '../hr/whatsapp/whatsapp-format.util';
import { WhatsAppOutboundService } from '../hr/whatsapp/services/whatsapp-outbound.service';

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

    const history = await this.loadConversationHistory(params.employeeId, 10);
    const memories = await this.memoryService.searchMemories(params.employeeId, plainMessage);
    const tools = this.toolsService.buildTools(ctx);
    const systemPrompt = this.buildSystemPrompt(ctx, memories);

    const llmResult = await this.llmService.chatWithTools({
      systemPrompt,
      history,
      userMessage: plainMessage,
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
      reply: this.finalizeReply(llmResult.content),
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

  private buildSystemPrompt(ctx: EmployeeAiContext, memories: string[] = []): string {
    const config = this.configService.getAiConfig();
    const langNote =
      config.responseLanguage === 'en'
        ? 'Respond in English.'
        : 'Selalu jawab dalam Bahasa Indonesia yang ramah dan profesional.';

    const memoryBlock =
      memories.length > 0
        ? `\nMemori relevan tentang karyawan ini (dari percakapan sebelumnya):\n${memories.map((m) => `- ${m}`).join('\n')}\n`
        : '';

    const base = `Kamu adalah asisten HR TARA (Total Assistance for Resources & Administration) untuk perusahaan Ralali.

Karyawan yang chat (data resmi sistem — MUTLAK, jangan diubah atau ditawari untuk diubah):
- Nama: ${ctx.full_name}
- Role: ${ctx.role_name}
- Departemen: ${ctx.department_name || '-'}
${ctx.is_supervisor ? '- Akses supervisor: bisa lihat & setujui cuti bawahan' : ''}
${memoryBlock}
Identitas & data karyawan (WAJIB):
- Nama, role, departemen, jabatan, dan profil lain dari sistem di atas adalah data resmi yang tercatat di TARA
- Jika user bilang "saya bukan ${ctx.full_name}" atau menyebut nama lain: jawab dengan sopan bahwa sesuai data sistem saat ini akun WhatsApp ini terdaftar atas nama tersebut. JANGAN menawarkan mengubah data, JANGAN memanggil nama lain, JANGAN bertanya "siapa nama asli Anda"
- Pembaruan data profil hanya melalui Divisi HRGA — arahkan ke HRGA jika user merasa data salah
- Memori percakapan TIDAK boleh mengoverride profil resmi di atas

Ruang lingkup (WAJIB):
- Hanya jawab topik HR Ralali/TARA: cuti, absensi, jadwal, pinjaman, SOP perusahaan, dan layanan HR terkait
- JANGAN jawab pertanyaan di luar konteks (politik, hiburan, coding, cuaca, perusahaan lain, dll.)
- Jika tidak tahu, tidak yakin, atau di luar kapasitas: WAJIB panggil tool escalate_to_hr — jangan mengarang jawaban

Aturan:
- ${langNote}
- Format WhatsApp (WAJIB — bukan markdown biasa):
  • Tebal: *kata* (SATU asterisk di kiri-kanan). JANGAN pakai **bold** markdown
  • Miring: _kata_
  • Coret: ~kata~
  • JANGAN pakai tabel markdown (| kolom |), heading #, atau ---
  • Gunakan teks biasa + bullet • atau baris terpisah untuk daftar data
  • Contoh saldo cuti yang benar:
    *Saldo Cuti 2026*
    • Total jatah: 12 hari
    • Sudah dipakai: 0 hari
    • Sisa: 12 hari
- Gunakan tools untuk mengambil data — jangan mengarang angka atau tanggal
- Untuk ajukan cuti/pinjaman/setujui cuti, WAJIB gunakan tool prepare_* (sistem otomatis kirim tombol Setuju/Batal di bawah pesan)
- Jangan minta user ketik YA/BATAL manual jika sudah pakai tool prepare_*
- Absensi (WAJIB — bedakan 2 jenis pertanyaan):
  • Cara absen / mau absen / clock-in-out / login absensi → JANGAN pakai tool absensi. Jawab singkat: suruh login di ${TARA_PUBLIC_BASE_URL} lalu absen di ${TARA_CLOCK_URL} (butuh GPS). Jangan jelaskan panjang.
  • Data absensi PRIBADI (sudah masuk hari ini?, pernah telat?, bolos bulan ini?, riwayat kehadiran) → pakai tool get_my_attendance_today atau get_my_attendance_history, lalu jawab berdasarkan hasil tool. Jika belum ada data, katakan belum ada record — tetap arahkan absen ke ${TARA_CLOCK_URL}
- Link aplikasi: HANYA gunakan ${TARA_PUBLIC_BASE_URL} dan ${TARA_CLOCK_URL}. JANGAN pakai app.perusahaan.com atau URL lain yang dibuat-buat
- Untuk pertanyaan SOP/prosedur, gunakan search_sop
- Jawab singkat, maksimal 3 paragraf
- Eskalasi HR: jika perlu escalate_to_hr, sistem otomatis kirim pesan ke staff HR — jangan tulis pesan eskalasi manual ke user, cukup panggil tool`;

    return config.systemPromptOverride
      ? `${base}\n\nInstruksi tambahan admin:\n${config.systemPromptOverride}`
      : base;
  }

  private async buildEmployeeContext(employeeId: string): Promise<EmployeeAiContext> {
    const emp = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        role: true,
        department: true,
      },
    });

    const roleName = emp?.role?.role_name || 'Employee';
    const subordinateCount = await this.prisma.employee.count({
      where: { supervisor_id: employeeId, employment_status: 'active' },
    });

    return {
      id: employeeId,
      full_name: emp?.full_name || '',
      email: emp?.email || '',
      role_name: roleName,
      department_name: emp?.department?.name,
      supervisor_id: emp?.supervisor_id || undefined,
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
  private finalizeReply(text: string): string {
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
