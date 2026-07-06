import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtGuard } from '../../auth/guards/jwt.guard';
import { RolesGuard, Roles } from '../../auth/guards/roles.guard';
import { PrismaService } from '../../../persistence/prisma.service';
import { CompanyBrandingService } from '../services/company-branding.service';
import { FeatureFlagsService } from '../services/feature-flags.service';
import { LeaveService } from '../services/leave.service';
import { NotificationService } from '../services/notification.service';
import { AttendancePhotoService } from '../services/attendance-photo.service';
import { TaraAttendanceService } from '../services/tara-attendance.service';
import { AuthService } from '../../auth/auth.service';
import { normalizeWhatsAppPhone } from '../whatsapp/utils/phone-normalize.util';
import { createLogoMulterOptions } from '../services/company-logo-upload.config';

/**
 * Frontend-compatible REST routes (previously served by DemoModule).
 * Maps the paths expected by the React web UI to real database data.
 */
@Controller()
@UseGuards(JwtGuard)
export class WebApiController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly brandingService: CompanyBrandingService,
    private readonly featureFlags: FeatureFlagsService,
    private readonly leaveService: LeaveService,
    private readonly notificationService: NotificationService,
    private readonly attendancePhotoService: AttendancePhotoService,
    private readonly taraAttendanceService: TaraAttendanceService,
    private readonly authService: AuthService,
  ) {}

  @Get('dashboard/stats')
  @UseGuards(RolesGuard)
  @Roles('SuperAdmin', 'HR_Admin', 'Supervisor')
  async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalEmployees, attendanceToday, pendingLeave, lateToday] =
      await Promise.all([
        this.prisma.employee.count({ where: { employment_status: 'active' } }),
        this.prisma.attendance.count({
          where: { attendance_date: today, clock_in_time: { not: null } },
        }),
        this.prisma.leaveRequest.count({ where: { status: 'pending' } }),
        this.prisma.attendance.count({
          where: { attendance_date: today, is_tardy: true },
        }),
      ]);

    return {
      success: true,
      data: {
        total_employees: totalEmployees,
        present_today: attendanceToday,
        pending_leave: pendingLeave,
        late_today: lateToday,
      },
    };
  }

  @Get('employees')
  @UseGuards(RolesGuard)
  @Roles('SuperAdmin', 'HR_Admin', 'Supervisor')
  async getEmployees() {
    const employees = await this.prisma.employee.findMany({
      where: { employment_status: 'active' },
      include: {
        role: true,
        department: true,
        office: true,
        supervisor: { select: { id: true, full_name: true } },
      },
      orderBy: { full_name: 'asc' },
    });

    return {
      success: true,
      data: employees.map((e) => this.formatEmployee(e)),
    };
  }

  @Get('employees/me')
  async getMyProfile(@Req() req: any) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: req.user.sub },
      include: { role: true, department: true, office: true },
    });

    return { success: true, data: employee ? this.formatEmployee(employee) : null };
  }

  @Put('employees/me')
  async updateMyProfile(@Req() req: any, @Body() body: any) {
    const data: Record<string, unknown> = {};
    if (body.full_name !== undefined) data.full_name = body.full_name;
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.language_preference !== undefined) {
      data.language_preference = body.language_preference;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Tidak ada field yang diperbarui');
    }

    const employee = await this.prisma.employee.update({
      where: { id: req.user.sub },
      data,
      include: { role: true, department: true, office: true },
    });

    return { success: true, data: this.formatEmployee(employee) };
  }

  @Get('employees/check-email')
  @UseGuards(RolesGuard)
  @Roles('SuperAdmin', 'HR_Admin')
  async checkEmailAvailability(
    @Query('email') email: string,
    @Query('exclude_id') excludeId?: string,
  ) {
    const result = await this.lookupEmailAvailability(email, excludeId);
    return { success: true, data: result };
  }

  @Get('employees/:id')
  @UseGuards(RolesGuard)
  @Roles('SuperAdmin', 'HR_Admin', 'Supervisor')
  async getEmployeeById(@Param('id') id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        role: true,
        department: true,
        office: true,
        supervisor: { select: { id: true, full_name: true } },
      },
    });

    if (!employee || employee.employment_status === 'deleted') {
      return { success: false, message: 'Employee not found' };
    }

    return { success: true, data: this.formatEmployee(employee) };
  }

  @Get('employees/:id/leave-balance')
  @UseGuards(RolesGuard)
  @Roles('SuperAdmin', 'HR_Admin', 'Supervisor')
  async getEmployeeLeaveBalance(@Param('id') id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      select: { id: true, employment_status: true },
    });
    if (!employee || employee.employment_status === 'deleted') {
      throw new NotFoundException('Karyawan tidak ditemukan');
    }

    const balance = await this.leaveService.getLeaveBalance(id);
    return { success: true, data: this.formatLeaveBalance(balance) };
  }

  @Get('employees/:id/leave-requests')
  @UseGuards(RolesGuard)
  @Roles('SuperAdmin', 'HR_Admin', 'Supervisor')
  async getEmployeeLeaveRequests(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      select: { id: true, employment_status: true },
    });
    if (!employee || employee.employment_status === 'deleted') {
      throw new NotFoundException('Karyawan tidak ditemukan');
    }

    const parsedLimit = limit ? parseInt(limit, 10) : 5;
    const requests = await this.leaveService.getLeaveRequests(id, {
      limit: Number.isFinite(parsedLimit) ? parsedLimit : 5,
    });

    return {
      success: true,
      data: requests.map((r) => this.formatLeaveRequest(r)),
    };
  }

  @Post('employees')
  @UseGuards(RolesGuard)
  @Roles('SuperAdmin', 'HR_Admin')
  async createEmployee(@Body() body: any) {
    const email = String(body.email || '').trim().toLowerCase();
    if (!email) {
      throw new BadRequestException('Email wajib diisi');
    }
    if (!body.full_name?.trim()) {
      throw new BadRequestException('Nama lengkap wajib diisi');
    }

    await this.assertEmailAvailable(email);

    const role = body.role
      ? await this.prisma.role.findFirst({ where: { role_name: body.role } })
      : null;
    const department = body.department
      ? await this.resolveDepartmentId(body.department)
      : null;

    if (body.supervisor_id) {
      await this.assertSupervisorExists(body.supervisor_id);
    }

    let whatsappNumber: string | null = null;
    if (body.whatsapp_number) {
      whatsappNumber = normalizeWhatsAppPhone(String(body.whatsapp_number));
      if (!this.isValidWhatsAppNumber(whatsappNumber)) {
        throw new BadRequestException(
          'Format nomor WhatsApp tidak valid. Gunakan format internasional (contoh: 6281234567890)',
        );
      }
      const taken = await this.prisma.employee.findFirst({
        where: { whatsapp_number: whatsappNumber },
        select: { id: true },
      });
      if (taken) {
        throw new BadRequestException('Nomor WhatsApp sudah dipakai karyawan lain');
      }
    }

    let employeeCode = `EMP-${Date.now()}`;
    if (body.employee_code) {
      employeeCode = this.normalizeEmployeeCode(String(body.employee_code));
      await this.assertEmployeeCodeAvailable(employeeCode);
    }

    const password_hash = await this.authService.hashDefaultEmployeePassword();

    let employee;
    try {
      employee = await this.prisma.employee.create({
        data: {
          employee_code: employeeCode,
          full_name: body.full_name.trim(),
          email,
          phone: whatsappNumber || body.phone || '',
          whatsapp_number: whatsappNumber,
          whatsapp_verified: !!whatsappNumber,
          whatsapp_opted_in: !!whatsappNumber,
          whatsapp_verified_at: whatsappNumber ? new Date() : null,
          role_id: role?.id,
          department_id: department,
          supervisor_id: body.supervisor_id || null,
          employment_status: 'active',
          hire_date: new Date(),
          password_hash,
          must_change_password: true,
        },
        include: {
          role: true,
          department: true,
          office: true,
          supervisor: { select: { id: true, full_name: true } },
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        const target = error?.meta?.target;
        if (Array.isArray(target) && target.includes('employee_code')) {
          throw new BadRequestException('ID karyawan sudah dipakai');
        }
        throw new BadRequestException('Email sudah dipakai karyawan lain');
      }
      throw error;
    }

    return { success: true, data: this.formatEmployee(employee) };
  }

  @Put('employees/:id')
  @UseGuards(RolesGuard)
  @Roles('SuperAdmin', 'HR_Admin')
  async updateEmployee(@Param('id') id: string, @Body() body: any) {
    const existing = await this.prisma.employee.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Karyawan tidak ditemukan');
    }

    const data: Record<string, unknown> = {};

    if (body.full_name !== undefined) {
      const name = String(body.full_name).trim();
      if (!name) {
        throw new BadRequestException('Nama lengkap tidak boleh kosong');
      }
      data.full_name = name;
    }

    if (body.employee_code !== undefined) {
      const code = this.normalizeEmployeeCode(String(body.employee_code));
      await this.assertEmployeeCodeAvailable(code, id);
      data.employee_code = code;
    }

    if (body.email !== undefined) {
      const email = String(body.email).trim().toLowerCase();
      if (!email) {
        throw new BadRequestException('Email tidak boleh kosong');
      }
      if (email !== existing.email.toLowerCase()) {
        await this.assertEmailAvailable(email, id);
        data.email = email;
      }
    }

    if (body.phone !== undefined) data.phone = body.phone;
    if (body.employment_status !== undefined) {
      data.employment_status = body.employment_status;
    }

    if (body.whatsapp_number !== undefined) {
      const wa = body.whatsapp_number
        ? normalizeWhatsAppPhone(String(body.whatsapp_number))
        : null;
      if (wa) {
        if (!this.isValidWhatsAppNumber(wa)) {
          throw new BadRequestException(
            'Format nomor WhatsApp tidak valid. Gunakan format internasional (contoh: 6281234567890)',
          );
        }
        const taken = await this.prisma.employee.findFirst({
          where: { whatsapp_number: wa, id: { not: id } },
          select: { full_name: true },
        });
        if (taken) {
          throw new BadRequestException(
            `Nomor WhatsApp sudah dipakai oleh ${taken.full_name}`,
          );
        }
        data.whatsapp_number = wa;
        data.whatsapp_verified = true;
        data.whatsapp_opted_in = true;
        data.whatsapp_verified_at = new Date();
        data.phone = wa;
      } else {
        data.whatsapp_number = null;
        data.whatsapp_verified = false;
        data.whatsapp_opted_in = false;
        data.whatsapp_verified_at = null;
      }
    }

    if (body.role !== undefined) {
      const role = body.role
        ? await this.prisma.role.findFirst({ where: { role_name: body.role } })
        : null;
      data.role_id = role?.id ?? null;
    }

    if (body.department !== undefined) {
      data.department_id = await this.resolveDepartmentId(body.department);
    }

    // supervisor_id: string to assign, null/'' to clear
    if (body.supervisor_id !== undefined) {
      if (body.supervisor_id) {
        if (body.supervisor_id === id) {
          throw new BadRequestException('Karyawan tidak bisa menjadi atasan dirinya sendiri');
        }
        await this.assertSupervisorExists(body.supervisor_id);
        data.supervisor_id = body.supervisor_id;
      } else {
        data.supervisor_id = null;
      }
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Tidak ada field yang diperbarui');
    }

    let employee;
    try {
      employee = await this.prisma.employee.update({
        where: { id },
        data,
        include: {
          role: true,
          department: true,
          office: true,
          supervisor: { select: { id: true, full_name: true } },
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        const target = error?.meta?.target;
        if (Array.isArray(target) && target.includes('email')) {
          throw new BadRequestException('Email sudah dipakai karyawan lain');
        }
        if (Array.isArray(target) && target.includes('employee_code')) {
          throw new BadRequestException('ID karyawan sudah dipakai');
        }
      }
      throw error;
    }

    return { success: true, data: this.formatEmployee(employee) };
  }

  @Delete('employees/:id')
  @UseGuards(RolesGuard)
  @Roles('SuperAdmin', 'HR_Admin')
  async deleteEmployee(@Param('id') id: string, @Req() req: any) {
    const existing = await this.prisma.employee.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Karyawan tidak ditemukan');
    }
    if (existing.employment_status === 'deleted') {
      throw new BadRequestException('Karyawan sudah dihapus');
    }
    if (req.user?.sub === id) {
      throw new BadRequestException('Tidak bisa menghapus akun sendiri');
    }

    await this.prisma.$transaction([
      this.prisma.employee.updateMany({
        where: { supervisor_id: id },
        data: { supervisor_id: null, updated_at: new Date() },
      }),
      this.prisma.employee.update({
        where: { id },
        data: {
          employment_status: 'deleted',
          supervisor_id: null,
          updated_at: new Date(),
          updated_by: req.user?.sub ?? null,
        },
      }),
    ]);

    return { success: true, message: 'Karyawan berhasil dihapus' };
  }

  private async assertSupervisorExists(supervisorId: string): Promise<void> {
    const supervisor = await this.prisma.employee.findUnique({
      where: { id: supervisorId },
      select: { id: true, employment_status: true },
    });
    if (!supervisor || supervisor.employment_status !== 'active') {
      throw new BadRequestException('Atasan yang dipilih tidak valid atau tidak aktif');
    }
  }

  private async resolveDepartmentId(name: string | null | undefined): Promise<string | null> {
    const trimmed = name?.trim();
    if (!trimmed) return null;

    const existing = await this.prisma.department.findFirst({
      where: { name: trimmed },
      select: { id: true },
    });
    if (existing) return existing.id;

    const created = await this.prisma.department.create({
      data: { name: trimmed },
      select: { id: true },
    });
    return created.id;
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private async lookupEmailAvailability(
    email: string,
    excludeId?: string,
  ): Promise<{ available: boolean; message?: string }> {
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized) {
      return { available: false, message: 'Email wajib diisi' };
    }
    if (!this.isValidEmail(normalized)) {
      return { available: false, message: 'Format email tidak valid' };
    }

    const taken = await this.prisma.employee.findFirst({
      where: {
        email: normalized,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { full_name: true, employment_status: true },
    });

    if (!taken) {
      return { available: true };
    }
    if (taken.employment_status === 'deleted') {
      return {
        available: false,
        message: `Email sudah pernah dipakai oleh karyawan yang dihapus (${taken.full_name})`,
      };
    }
    return { available: false, message: 'Email sudah dipakai karyawan lain' };
  }

  private async assertEmailAvailable(email: string, excludeId?: string): Promise<void> {
    const result = await this.lookupEmailAvailability(email, excludeId);
    if (!result.available) {
      throw new BadRequestException(result.message || 'Email tidak tersedia');
    }
  }

  private isValidWhatsAppNumber(phone: string): boolean {
    return /^\d{10,15}$/.test(phone);
  }

  private normalizeEmployeeCode(code: string): string {
    const trimmed = code.trim().toUpperCase();
    if (!/^[\w-]{2,50}$/.test(trimmed)) {
      throw new BadRequestException(
        'Format ID karyawan tidak valid (2–50 karakter: huruf, angka, underscore, tanda hubung)',
      );
    }
    return trimmed;
  }

  private async assertEmployeeCodeAvailable(code: string, excludeId?: string): Promise<void> {
    const taken = await this.prisma.employee.findFirst({
      where: {
        employee_code: code,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { full_name: true },
    });
    if (taken) {
      throw new BadRequestException(`ID karyawan "${code}" sudah dipakai oleh ${taken.full_name}`);
    }
  }

  @Get('attendance/my-monthly-tardiness')
  async getMyMonthlyTardiness(@Req() req: any) {
    const data = await this.taraAttendanceService.getMonthlyTardinessSummary(req.user.sub);
    return { success: true, data };
  }

  @Get('attendance/my-today')
  async getMyTodayAttendance(@Req() req: any) {
    const record = await this.taraAttendanceService.getTodayAttendanceForEmployee(req.user.sub);
    if (!record) {
      return {
        success: true,
        data: {
          clock_in_time: null,
          clock_out_time: null,
          is_tardy: false,
          tardiness_minutes: 0,
          can_clock_in: true,
          can_clock_out: false,
        },
      };
    }

    const hasClockIn = !!record.clock_in_time;
    const hasClockOut = !!record.clock_out_time;

    return {
      success: true,
      data: {
        id: record.id,
        clock_in_time: record.clock_in_time?.toISOString() ?? null,
        clock_out_time: record.clock_out_time?.toISOString() ?? null,
        is_tardy: record.is_tardy,
        tardiness_minutes: record.tardiness_minutes ?? 0,
        can_clock_in: !hasClockIn,
        can_clock_out: hasClockIn && !hasClockOut,
      },
    };
  }

  @Get('attendance/monthly-tardiness')
  @UseGuards(RolesGuard)
  @Roles('SuperAdmin', 'HR_Admin', 'Supervisor')
  async getMonthlyTardiness(
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const data = await this.taraAttendanceService.getMonthlyTardinessForAll(
      year ? parseInt(year, 10) : undefined,
      month ? parseInt(month, 10) : undefined,
    );
    return { success: true, data };
  }

  @Get('attendance/dashboard')
  @UseGuards(RolesGuard)
  @Roles('SuperAdmin', 'HR_Admin', 'Supervisor')
  async getAttendanceDashboard(@Query('date') date?: string) {
    const target = date ? new Date(date) : new Date();
    target.setHours(0, 0, 0, 0);

    const [totalEmployees, records] = await Promise.all([
      this.prisma.employee.count({ where: { employment_status: 'active' } }),
      this.prisma.attendance.findMany({
        where: { attendance_date: target },
        include: {
          employee: {
            select: { id: true, full_name: true, employee_code: true },
          },
          office_location: {
            select: { location_name: true },
          },
        },
        orderBy: { clock_in_time: 'asc' },
      }),
    ]);

    const clockedIn = records.filter((r) => r.clock_in_time).length;
    const tardy = records.filter((r) => r.is_tardy).length;
    const absent = Math.max(0, totalEmployees - clockedIn);

    return {
      success: true,
      data: {
        total_employees: totalEmployees,
        clocked_in: clockedIn,
        tardy,
        absent,
        clocked_out: records.filter((r) => r.clock_out_time).length,
        records: records.map((r) => this.formatAttendanceRecord(r)),
      },
    };
  }

  @Get('attendance/:id')
  @UseGuards(RolesGuard)
  @Roles('SuperAdmin', 'HR_Admin', 'Supervisor')
  async getAttendanceDetail(@Param('id') id: string) {
    const record = await this.prisma.attendance.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            full_name: true,
            employee_code: true,
            department: { select: { name: true } },
          },
        },
        office_location: { select: { location_name: true } },
      },
    });

    if (!record) {
      throw new NotFoundException('Data absensi tidak ditemukan');
    }

    return { success: true, data: this.formatAttendanceRecord(record) };
  }

  @Get('attendance/:id/photo/:type')
  @UseGuards(RolesGuard)
  @Roles('SuperAdmin', 'HR_Admin', 'Supervisor')
  async getAttendancePhoto(
    @Param('id') id: string,
    @Param('type') type: string,
    @Res() res: Response,
  ) {
    if (type !== 'in' && type !== 'out') {
      throw new BadRequestException('Tipe foto tidak valid');
    }

    const record = await this.prisma.attendance.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException('Data absensi tidak ditemukan');
    }

    const relativePath =
      type === 'in' ? record.clock_in_photo_path : record.clock_out_photo_path;
    if (!relativePath) {
      throw new NotFoundException('Foto tidak tersedia');
    }

    const { buffer, mimeType } =
      await this.attendancePhotoService.readPhoto(relativePath);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(buffer);
  }

  @Get('leaves/pending')
  @UseGuards(RolesGuard)
  @Roles('SuperAdmin', 'HR_Admin', 'Supervisor')
  async getPendingLeaves(@Query('status') status?: string) {
    const where = status ? { status } : {};
    const leaves = await this.prisma.leaveRequest.findMany({
      where,
      include: {
        employee: {
          select: { id: true, full_name: true, employee_code: true, email: true },
        },
      },
      orderBy: { submitted_at: 'desc' },
    });

    return {
      success: true,
      data: leaves.map((l) => ({
        id: l.id,
        employee_id: l.employee_id,
        employee_name: l.employee.full_name,
        employee_code: l.employee.employee_code,
        leave_type: l.leave_type,
        start_date: l.start_date,
        end_date: l.end_date,
        total_days: l.total_days,
        reason: l.reason,
        status: l.status,
        submitted_at: l.submitted_at,
      })),
    };
  }

  @Get('leaves/my-balance')
  async getMyLeaveBalance(@Req() req: any) {
    const balance = await this.leaveService.getLeaveBalance(req.user.sub);
    return { success: true, data: this.formatLeaveBalance(balance) };
  }

  @Get('leaves/my-requests')
  async getMyLeaveRequests(@Req() req: any, @Query('status') status?: string) {
    const requests = await this.leaveService.getLeaveRequests(req.user.sub, {
      status,
    });
    return {
      success: true,
      data: requests.map((r) => ({
        id: r.id,
        employee_id: r.employee_id,
        leave_type: r.leave_type,
        start_date: r.start_date,
        end_date: r.end_date,
        total_days: Number(r.total_days),
        reason: r.reason,
        status: r.status,
        submitted_at: r.submitted_at,
      })),
    };
  }

  @Post('leaves/request')
  @HttpCode(HttpStatus.CREATED)
  async submitLeaveRequest(@Req() req: any, @Body() body: any) {
    if (!body.leave_type || !body.start_date || !body.end_date) {
      throw new BadRequestException(
        'Jenis cuti, tanggal mulai, dan tanggal selesai wajib diisi',
      );
    }

    const startDate = new Date(body.start_date);
    const endDate = new Date(body.end_date);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('Format tanggal tidak valid');
    }

    const leaveRequest = await this.leaveService.submitLeaveRequest({
      employee_id: req.user.sub,
      leave_type: body.leave_type,
      start_date: startDate,
      end_date: endDate,
      reason: body.reason,
      half_day: !!body.half_day,
    });

    return {
      success: true,
      message: 'Pengajuan cuti berhasil dikirim',
      data: {
        ...leaveRequest,
        total_days: Number(leaveRequest.total_days),
      },
    };
  }

  @Put('leaves/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('SuperAdmin', 'HR_Admin', 'Supervisor')
  async approveLeave(@Param('id') id: string, @Req() req: any) {
    const data = await this.leaveService.approveLeaveRequest(id, req.user.sub);
    return { success: true, data };
  }

  @Put('leaves/:id/reject')
  @UseGuards(RolesGuard)
  @Roles('SuperAdmin', 'HR_Admin', 'Supervisor')
  async rejectLeave(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { rejection_reason?: string },
  ) {
    const data = await this.leaveService.rejectLeaveRequest(
      id,
      req.user.sub,
      body?.rejection_reason?.trim() || 'Ditolak oleh atasan',
    );
    return { success: true, data };
  }

  @Get('notifications/my-notifications')
  async getMyNotifications(@Req() req: any) {
    const notifications = await this.prisma.notification.findMany({
      where: { recipient_id: req.user.sub },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    return { success: true, data: notifications };
  }

  @Put('notifications/mark-all-read')
  async markAllNotificationsRead(@Req() req: any) {
    const count = await this.notificationService.markAllAsRead(req.user.sub);
    return {
      success: true,
      message: 'Semua notifikasi ditandai sudah dibaca',
      count,
    };
  }

  @Get('settings/public-holidays')
  async getPublicHolidays() {
    const rows = await this.prisma.publicHoliday.findMany({
      where: { is_active: true },
      orderBy: { holiday_date: 'asc' },
    });
    return { success: true, data: rows };
  }

  @Post('settings/public-holidays')
  @UseGuards(RolesGuard)
  @Roles('SuperAdmin', 'HR_Admin')
  async createPublicHoliday(
    @Body() body: { holiday_name: string; holiday_date: string },
  ) {
    if (!body.holiday_name?.trim() || !body.holiday_date) {
      throw new BadRequestException('Nama dan tanggal hari libur wajib diisi');
    }
    const row = await this.prisma.publicHoliday.create({
      data: {
        holiday_name: body.holiday_name.trim(),
        holiday_date: new Date(body.holiday_date),
      },
    });
    return { success: true, data: row };
  }

  @Get('settings/company')
  async getCompanySettings() {
    const totalEmployees = await this.prisma.employee.count({
      where: { employment_status: 'active' },
    });

    const settings = await this.brandingService.getCompanySettingsMap();
    const publicBranding = await this.brandingService.getPublicBranding();

    return {
      success: true,
      data: {
        company_name: publicBranding.company_name,
        legal_name: publicBranding.legal_name || '',
        industry: settings['company.industry'] || 'Teknologi Informasi',
        tax_id: settings['company.tax_id'] || '',
        email: settings['company.email'] || '',
        phone: settings['company.phone'] || '',
        website: settings['company.website'] || '',
        address: settings['company.address'] || '',
        founded_year: settings['company.founded_year'] || '',
        total_employees: totalEmployees,
        logo_url: publicBranding.logo_url,
        logo_updated_at: publicBranding.logo_updated_at,
        branding: publicBranding.branding,
      },
    };
  }

  @Put('settings/company')
  @UseGuards(RolesGuard)
  @Roles('SuperAdmin', 'HR_Admin')
  async updateCompanySettings(@Body() body: any, @Req() req: any) {
    const mapping: Record<string, string> = {
      company_name: 'company.name',
      legal_name: 'company.legal_name',
      industry: 'company.industry',
      tax_id: 'company.tax_id',
      email: 'company.email',
      phone: 'company.phone',
      website: 'company.website',
      address: 'company.address',
      founded_year: 'company.founded_year',
    };

    for (const [field, key] of Object.entries(mapping)) {
      if (body[field] !== undefined) {
        await this.prisma.systemSettings.upsert({
          where: { setting_key: key },
          update: {
            setting_value: body[field],
            last_modified_by: req.user.sub,
          },
          create: {
            setting_key: key,
            setting_value: body[field],
            setting_category: 'company',
            last_modified_by: req.user.sub,
          },
        });
      }
    }

    return this.getCompanySettings();
  }

  @Put('settings/company/branding')
  @UseGuards(RolesGuard)
  @Roles('SuperAdmin', 'HR_Admin')
  async updateCompanyBranding(@Body() body: any, @Req() req: any) {
    const branding = await this.brandingService.saveBranding(body, req.user.sub);
    return { success: true, data: branding };
  }

  @Post('settings/company/logo')
  @UseGuards(RolesGuard)
  @Roles('SuperAdmin', 'HR_Admin')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('logo', createLogoMulterOptions()))
  async uploadCompanyLogo(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    const result = await this.brandingService.saveLogo(file, req.user.sub);
    return { success: true, data: result };
  }

  @Delete('settings/company/logo')
  @UseGuards(RolesGuard)
  @Roles('SuperAdmin', 'HR_Admin')
  async deleteCompanyLogo(@Req() req: any) {
    await this.brandingService.deleteLogo(req.user.sub);
    return { success: true, message: 'Logo dihapus' };
  }

  @Get('settings/features')
  @UseGuards(RolesGuard)
  @Roles('SuperAdmin', 'HR_Admin')
  async getFeatureSettings() {
    const data = await this.featureFlags.getAdminSettings();
    return { success: true, data };
  }

  @Put('settings/features')
  @UseGuards(RolesGuard)
  @Roles('SuperAdmin', 'HR_Admin')
  async updateFeatureSettings(@Body() body: any, @Req() req: any) {
    const modules = this.featureFlags.validateModules(body?.modules ?? body);
    const saved = await this.featureFlags.saveModules(modules, req.user.sub);
    return { success: true, data: { modules: saved, definitions: (await this.featureFlags.getAdminSettings()).definitions } };
  }

  @Get('admin/users')
  @UseGuards(RolesGuard)
  @Roles('SuperAdmin', 'HR_Admin')
  async getAdminUsers() {
    const employees = await this.prisma.employee.findMany({
      where: { employment_status: 'active' },
      include: { role: true, department: true, office: true },
      orderBy: { full_name: 'asc' },
    });

    return { success: true, data: employees.map((e) => this.formatEmployee(e)) };
  }

  private formatAttendanceRecord(r: any) {
    return {
      id: r.id,
      employee_id: r.employee_id,
      employee_name: r.employee?.full_name ?? null,
      employee_code: r.employee?.employee_code ?? null,
      department_name: r.employee?.department?.name ?? null,
      attendance_date: r.attendance_date,
      clock_in_time: r.clock_in_time,
      clock_out_time: r.clock_out_time,
      clock_in_source: r.clock_in_source,
      clock_out_source: r.clock_out_source,
      is_tardy: r.is_tardy,
      tardiness_minutes: r.tardiness_minutes,
      office_name: r.office_location?.location_name ?? null,
      has_clock_in_photo: !!r.clock_in_photo_path,
      has_clock_out_photo: !!r.clock_out_photo_path,
    };
  }

  private formatEmployee(e: any) {
    return {
      id: e.id,
      employee_code: e.employee_code,
      full_name: e.full_name,
      email: e.email,
      phone: e.phone,
      whatsapp_number: e.whatsapp_number,
      whatsapp_verified: e.whatsapp_verified ?? false,
      role: e.role?.role_name || 'Employee',
      role_id: e.role_id ?? e.role?.id ?? null,
      department: e.department?.name || null,
      department_id: e.department_id ?? e.department?.id ?? null,
      office: e.office?.location_name || null,
      employment_status: e.employment_status,
      hire_date: e.hire_date,
      language_preference: e.language_preference,
      supervisor_id: e.supervisor_id ?? e.supervisor?.id ?? null,
      supervisor_name: e.supervisor?.full_name ?? null,
    };
  }

  private formatLeaveBalance(balance: any) {
    if (!balance) {
      return {
        remaining_days: 0,
        total_entitlement: 0,
        used_days: 0,
        year: new Date().getFullYear(),
      };
    }
    return {
      remaining_days: Number(balance.remaining_days),
      total_entitlement: Number(balance.total_entitlement),
      used_days: Number(balance.used_days),
      carryover_days: Number(balance.carryover_days ?? 0),
      year: balance.year,
    };
  }

  private formatLeaveRequest(r: any) {
    return {
      id: r.id,
      leave_type: r.leave_type,
      start_date: r.start_date,
      end_date: r.end_date,
      total_days: Number(r.total_days),
      reason: r.reason,
      status: r.status,
      submitted_at: r.submitted_at,
      approver_name: r.approver?.full_name ?? null,
    };
  }
}
