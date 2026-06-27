import { Injectable, Logger, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma.service';
import { LeaveService } from '../hr/services/leave.service';
import { LoanService } from '../hr/services/loan.service';
import { AiOrchestratorService } from './ai-orchestrator.service';
import { AiPendingActionType } from './ai.interfaces';

@Injectable()
export class AiActionExecutorService {
  private readonly logger = new Logger(AiActionExecutorService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => LeaveService))
    private readonly leaveService: LeaveService,
    @Inject(forwardRef(() => LoanService))
    private readonly loanService: LoanService,
    @Inject(forwardRef(() => AiOrchestratorService))
    private readonly orchestrator: AiOrchestratorService,
  ) {}

  async execute(
    actionType: AiPendingActionType,
    actorId: string,
    payload: Record<string, any>,
  ): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      switch (actionType) {
        case 'submit_leave':
          return await this.submitLeave(actorId, payload);
        case 'submit_loan':
          return await this.submitLoan(actorId, payload);
        case 'approve_leave':
          return await this.approveLeave(actorId, payload);
        case 'reject_leave':
          return await this.rejectLeave(actorId, payload);
        default:
          return { success: false, message: `Aksi tidak dikenal: ${actionType}` };
      }
    } catch (err) {
      this.logger.error(`Action ${actionType} failed: ${err.message}`);
      return { success: false, message: err.message || 'Gagal mengeksekusi aksi' };
    }
  }

  buildSummary(actionType: AiPendingActionType, payload: Record<string, any>): string {
    switch (actionType) {
      case 'submit_leave':
        return `📋 Konfirmasi Pengajuan Cuti\n\nJenis: ${payload.leave_type}\nTanggal: ${payload.start_date} s/d ${payload.end_date}\nAlasan: ${payload.reason || '-'}\n\nBalas YA untuk melanjutkan, atau TIDAK untuk membatalkan.`;
      case 'submit_loan':
        return `💳 Konfirmasi Pengajuan Pinjaman\n\nJumlah: Rp ${Number(payload.amount).toLocaleString('id-ID')}\nJenis: ${payload.loan_type}\nCicilan: ${payload.installment_count || 1}x\nAlasan: ${payload.reason || '-'}\n\nBalas YA untuk melanjutkan.`;
      case 'approve_leave':
        return `✅ Konfirmasi Setujui Cuti\n\nID Pengajuan: ${payload.leave_request_id}\n\nBalas YA untuk menyetujui.`;
      case 'reject_leave':
        return `❌ Konfirmasi Tolak Cuti\n\nID Pengajuan: ${payload.leave_request_id}\nAlasan: ${payload.rejection_reason || '-'}\n\nBalas YA untuk menolak.`;
      default:
        return `Konfirmasi aksi: ${actionType}\n\nBalas YA untuk melanjutkan.`;
    }
  }

  private async submitLeave(employeeId: string, payload: Record<string, any>) {
    const result = await this.leaveService.submitLeaveRequest({
      employee_id: employeeId,
      leave_type: payload.leave_type,
      start_date: new Date(payload.start_date),
      end_date: new Date(payload.end_date),
      reason: payload.reason,
    });

    await this.orchestrator.notifySupervisorLeaveRequest(result.id).catch(() => {});

    return {
      success: true,
      message: `✅ Cuti berhasil diajukan!\n\nID: ${result.id}\nStatus: Menunggu persetujuan supervisor.\nAnda akan menerima notifikasi setelah diproses.`,
      data: result,
    };
  }

  private async submitLoan(employeeId: string, payload: Record<string, any>) {
    const result = await this.loanService.requestLoan({
      employee_id: employeeId,
      loan_type: payload.loan_type || 'kasbon',
      amount: payload.amount,
      installment_count: payload.installment_count,
      reason: payload.reason,
    });

    return {
      success: true,
      message: `✅ Pinjaman berhasil diajukan!\n\nID: ${result.id}\nJumlah: Rp ${Number(payload.amount).toLocaleString('id-ID')}\nStatus: Menunggu persetujuan HR.`,
      data: result,
    };
  }

  private async approveLeave(supervisorId: string, payload: Record<string, any>) {
    const leaveId = payload.leave_request_id;
    const leave = await this.prisma.leaveRequest.findUnique({
      where: { id: leaveId },
      include: { employee: { select: { full_name: true, supervisor_id: true } } },
    });

    if (!leave) throw new BadRequestException('Pengajuan cuti tidak ditemukan');

    const supervisor = await this.prisma.employee.findUnique({
      where: { id: supervisorId },
      include: { role: true },
    });

    const isHr = ['HR_Admin', 'SuperAdmin'].includes(supervisor?.role?.role_name || '');
    if (!isHr && leave.employee.supervisor_id !== supervisorId) {
      throw new BadRequestException('Anda tidak berwenang menyetujui cuti ini');
    }

    await this.leaveService.approveLeaveRequest(leaveId, supervisorId);

    return {
      success: true,
      message: `✅ Cuti ${leave.employee.full_name} telah DISETUJUI.`,
    };
  }

  private async rejectLeave(supervisorId: string, payload: Record<string, any>) {
    const leaveId = payload.leave_request_id;
    await this.leaveService.rejectLeaveRequest(
      leaveId,
      supervisorId,
      payload.rejection_reason || 'Ditolak via WhatsApp AI',
    );

    return {
      success: true,
      message: `❌ Pengajuan cuti telah DITOLAK.`,
    };
  }
}
