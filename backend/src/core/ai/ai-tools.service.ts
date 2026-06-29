import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { PrismaService } from '../../persistence/prisma.service';
import { AiRagService } from './ai-rag.service';
import { EmployeeAiContext, TARA_CLOCK_URL } from './ai.interfaces';

/** Marker returned by prepare_* tools to trigger confirmation flow */
export const CONFIRMATION_MARKER = '__TARA_CONFIRM__';

@Injectable()
export class AiToolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ragService: AiRagService,
  ) {}

  buildTools(ctx: EmployeeAiContext): DynamicStructuredTool[] {
    const tools: DynamicStructuredTool[] = [
      this.tool('get_my_profile', 'Ambil profil karyawan yang sedang chat', z.object({}), async () =>
        JSON.stringify(await this.getMyProfile(ctx.id)),
      ),

      this.tool(
        'get_my_leave_balance',
        'Cek saldo cuti karyawan yang sedang chat',
        z.object({}),
        async () => JSON.stringify(await this.getLeaveBalance(ctx.id)),
      ),

      this.tool(
        'get_my_attendance_today',
        'HANYA untuk cek data absensi PRIBADI hari ini (sudah clock-in/out belum). JANGAN dipakai jika user hanya tanya cara absen.',
        z.object({}),
        async () => JSON.stringify(await this.getAttendanceToday(ctx.id)),
      ),

      this.tool(
        'get_my_attendance_history',
        'HANYA untuk cek riwayat absensi PRIBADI (telat, bolos, riwayat N hari). JANGAN dipakai jika user hanya tanya cara absen.',
        z.object({ days: z.number().optional().describe('Jumlah hari, default 30') }),
        async ({ days }) =>
          JSON.stringify(await this.getAttendanceHistory(ctx.id, days || 30)),
      ),

      this.tool(
        'get_my_pending_leaves',
        'Daftar pengajuan cuti saya yang masih pending',
        z.object({}),
        async () => JSON.stringify(await this.getMyPendingLeaves(ctx.id)),
      ),

      this.tool(
        'get_my_schedule',
        'Jadwal kerja saya saat ini',
        z.object({}),
        async () => JSON.stringify(await this.getMySchedule(ctx.id)),
      ),

      this.tool(
        'get_my_loans',
        'Info pinjaman/kasbon saya',
        z.object({}),
        async () => JSON.stringify(await this.getMyLoans(ctx.id)),
      ),

      this.tool(
        'list_sop_documents',
        'Daftar semua dokumen SOP perusahaan',
        z.object({}),
        async () => JSON.stringify(await this.listSops()),
      ),

      this.tool(
        'search_sop',
        'Cari isi prosedur/SOP perusahaan berdasarkan pertanyaan',
        z.object({ query: z.string().describe('Pertanyaan atau kata kunci pencarian SOP') }),
        async ({ query }) => {
          const results = await this.ragService.search(query, 5);
          return JSON.stringify({
            context: this.ragService.formatContextForPrompt(results),
            sources: results.map((r) => ({
              title: r.documentTitle,
              relevance: r.score,
            })),
          });
        },
      ),

      this.tool(
        'prepare_submit_leave',
        'Siapkan pengajuan cuti (memerlukan konfirmasi user). Validasi dulu sebelum konfirmasi.',
        z.object({
          leave_type: z.enum(['annual', 'sick', 'emergency', 'unpaid']).describe('Jenis cuti'),
          start_date: z.string().describe('Tanggal mulai YYYY-MM-DD'),
          end_date: z.string().describe('Tanggal selesai YYYY-MM-DD'),
          reason: z.string().optional().describe('Alasan cuti'),
        }),
        async (args) => this.prepareConfirmation('submit_leave', ctx.id, args),
      ),

      this.tool(
        'prepare_submit_loan',
        'Siapkan pengajuan pinjaman/kasbon (memerlukan konfirmasi)',
        z.object({
          amount: z.number().describe('Jumlah pinjaman dalam IDR'),
          loan_type: z.string().default('kasbon').describe('Jenis pinjaman'),
          installment_count: z.number().optional().describe('Jumlah cicilan'),
          reason: z.string().optional(),
        }),
        async (args) => this.prepareConfirmation('submit_loan', ctx.id, args),
      ),
    ];

    if (ctx.is_supervisor || ctx.is_hr_admin) {
      tools.push(
        this.tool(
          'get_team_pending_leaves',
          'Daftar pengajuan cuti pending dari bawahan (supervisor/HR)',
          z.object({}),
          async () => JSON.stringify(await this.getTeamPendingLeaves(ctx.id, ctx.is_hr_admin)),
        ),

        this.tool(
          'prepare_approve_leave',
          'Siapkan persetujuan cuti (memerlukan konfirmasi supervisor)',
          z.object({ leave_request_id: z.string().describe('ID pengajuan cuti') }),
          async (args) => this.prepareConfirmation('approve_leave', ctx.id, args),
        ),

        this.tool(
          'prepare_reject_leave',
          'Siapkan penolakan cuti (memerlukan konfirmasi supervisor)',
          z.object({
            leave_request_id: z.string(),
            rejection_reason: z.string().optional(),
          }),
          async (args) => this.prepareConfirmation('reject_leave', ctx.id, args),
        ),
      );
    }

    return tools;
  }

  private tool(
    name: string,
    description: string,
    schema: z.ZodObject<any>,
    fn: (args: any) => Promise<string>,
  ): DynamicStructuredTool {
    return new DynamicStructuredTool({
      name,
      description,
      schema,
      func: fn,
    });
  }

  private prepareConfirmation(actionType: string, employeeId: string, payload: Record<string, any>): string {
    return JSON.stringify({
      [CONFIRMATION_MARKER]: true,
      action_type: actionType,
      employee_id: employeeId,
      payload,
    });
  }

  private async getMyProfile(employeeId: string) {
    return this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        employee_code: true,
        full_name: true,
        email: true,
        phone: true,
        hire_date: true,
        employment_status: true,
        department: { select: { name: true } },
        role: { select: { role_name: true } },
        supervisor: { select: { full_name: true } },
        office: { select: { location_name: true } },
      },
    });
  }

  private async getLeaveBalance(employeeId: string) {
    const balance = await this.prisma.leaveBalance.findFirst({
      where: { employee_id: employeeId },
      orderBy: { year: 'desc' },
    });
    return balance;
  }

  private async getAttendanceToday(employeeId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const record = await this.prisma.attendance.findFirst({
      where: { employee_id: employeeId, attendance_date: today },
    });

    if (!record) {
      return {
        status: 'belum_ada_record',
        message: 'Belum ada record absensi hari ini di TARA.',
        clock_in_url: TARA_CLOCK_URL,
      };
    }

    return record;
  }

  private async getAttendanceHistory(employeeId: string, days: number) {
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const records = await this.prisma.attendance.findMany({
      where: { employee_id: employeeId, attendance_date: { gte: start } },
      orderBy: { attendance_date: 'desc' },
      take: days,
    });

    return {
      days_requested: days,
      record_count: records.length,
      records,
      clock_in_url: TARA_CLOCK_URL,
      note:
        records.length === 0
          ? 'Belum ada riwayat absensi dalam periode ini di TARA.'
          : undefined,
    };
  }

  private async getMyPendingLeaves(employeeId: string) {
    return this.prisma.leaveRequest.findMany({
      where: { employee_id: employeeId, status: 'pending' },
      orderBy: { submitted_at: 'desc' },
    });
  }

  private async getMySchedule(employeeId: string) {
    return this.prisma.scheduleAssignment.findMany({
      where: {
        employee_id: employeeId,
        OR: [{ effective_to: null }, { effective_to: { gte: new Date() } }],
      },
      include: { schedule: true },
    });
  }

  private async getMyLoans(employeeId: string) {
    return this.prisma.loan.findMany({
      where: { employee_id: employeeId },
      orderBy: { request_date: 'desc' },
      take: 10,
    });
  }

  private async listSops() {
    return this.prisma.sopDocument.findMany({
      where: { is_active: true },
      select: { id: true, title: true, description: true, category: true },
      orderBy: { title: 'asc' },
    });
  }

  private async getTeamPendingLeaves(supervisorId: string, isHrAdmin: boolean) {
    if (isHrAdmin) {
      return this.prisma.leaveRequest.findMany({
        where: { status: 'pending' },
        include: { employee: { select: { full_name: true, employee_code: true } } },
        take: 20,
      });
    }

    const subordinates = await this.prisma.employee.findMany({
      where: { supervisor_id: supervisorId },
      select: { id: true },
    });
    const ids = subordinates.map((s) => s.id);

    return this.prisma.leaveRequest.findMany({
      where: { status: 'pending', employee_id: { in: ids } },
      include: { employee: { select: { full_name: true, employee_code: true } } },
    });
  }
}
