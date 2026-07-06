import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../persistence/prisma.service';

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(private readonly prisma: PrismaService) {}

  // === Work Schedules ===

  async getSchedules() {
    return this.prisma.workSchedule.findMany({
      where: { is_active: true },
      include: { assignments: { include: { employee: { select: { id: true, full_name: true } } } } },
      orderBy: { schedule_name: 'asc' },
    });
  }

  async createSchedule(data: {
    schedule_name: string;
    start_time: string;
    end_time: string;
    grace_minutes?: number;
    break_start?: string;
    break_end?: string;
    work_days: number[];
    daily_breaks?: Record<string, { break_start: string; break_end: string }> | null;
    is_default?: boolean;
  }) {
    return this.prisma.workSchedule.create({
      data: {
        schedule_name: data.schedule_name,
        start_time: data.start_time,
        end_time: data.end_time,
        grace_minutes: data.grace_minutes ?? 0,
        break_start: data.break_start,
        break_end: data.break_end,
        work_days: data.work_days,
        daily_breaks: data.daily_breaks ?? undefined,
        is_default: data.is_default ?? false,
      },
    });
  }

  async updateSchedule(id: string, data: any) {
    const allowed: Record<string, unknown> = {};
    const fields = [
      'schedule_name',
      'start_time',
      'end_time',
      'grace_minutes',
      'break_start',
      'break_end',
      'work_days',
      'daily_breaks',
      'is_default',
      'is_active',
    ] as const;
    for (const key of fields) {
      if (data[key] !== undefined) allowed[key] = data[key];
    }
    return this.prisma.workSchedule.update({
      where: { id },
      data: { ...allowed, updated_at: new Date() },
    });
  }

  async deleteSchedule(id: string) {
    return this.prisma.workSchedule.update({ where: { id }, data: { is_active: false } });
  }

  async getScheduleById(id: string) {
    return this.prisma.workSchedule.findUnique({
      where: { id },
      include: {
        assignments: {
          include: {
            employee: { select: { id: true, full_name: true, department: true, department_id: true } },
          },
          where: {
            OR: [{ effective_to: null }, { effective_to: { gte: new Date() } }],
          },
        },
      },
    });
  }

  // === Assignments ===

  async getAllAssignments(filters?: { departmentId?: string; scheduleId?: string }) {
    const where: any = {
      OR: [{ effective_to: null }, { effective_to: { gte: new Date() } }],
    };
    if (filters?.scheduleId) where.schedule_id = filters.scheduleId;
    if (filters?.departmentId) where.employee = { department_id: filters.departmentId };

    return this.prisma.scheduleAssignment.findMany({
      where,
      include: {
        employee: { select: { id: true, full_name: true, department: true, department_id: true } },
        schedule: true,
      },
      orderBy: { effective_from: 'desc' },
    });
  }

  async assignSchedule(data: { employee_id: string; schedule_id: string; effective_from: Date | string; effective_to?: Date | string; assigned_by?: string }) {
    return this.prisma.scheduleAssignment.create({
      data: {
        employee_id: data.employee_id,
        schedule_id: data.schedule_id,
        effective_from: new Date(data.effective_from),
        effective_to: data.effective_to ? new Date(data.effective_to) : null,
        assigned_by: data.assigned_by,
      },
    });
  }

  async bulkAssignSchedule(data: {
    schedule_id: string;
    employee_ids?: string[];
    apply_to_all?: boolean;
    department_ids?: string[];
    role_ids?: string[];
    effective_from: string;
    effective_to?: string;
    assigned_by?: string;
  }) {
    let employeeIds = data.employee_ids || [];

    if (data.apply_to_all) {
      const employees = await this.prisma.employee.findMany({
        where: { employment_status: 'active' },
        select: { id: true },
      });
      employeeIds = employees.map((e) => e.id);
    } else if ((data.department_ids?.length ?? 0) > 0 || (data.role_ids?.length ?? 0) > 0) {
      const where: any = { employment_status: 'active' };
      if (data.department_ids?.length) {
        where.department_id = { in: data.department_ids };
      }
      if (data.role_ids?.length) {
        where.role_id = { in: data.role_ids };
      }
      const employees = await this.prisma.employee.findMany({
        where,
        select: { id: true },
      });
      employeeIds = employees.map((e) => e.id);
    }

    if (employeeIds.length === 0) {
      throw new BadRequestException('Tidak ada karyawan yang cocok dengan filter penugasan');
    }

    const result = await this.prisma.scheduleAssignment.createMany({
      data: employeeIds.map((employee_id) => ({
        employee_id,
        schedule_id: data.schedule_id,
        effective_from: new Date(data.effective_from),
        effective_to: data.effective_to ? new Date(data.effective_to) : null,
        assigned_by: data.assigned_by,
      })),
    });

    return { count: result.count };
  }

  async removeAssignment(id: string) {
    return this.prisma.scheduleAssignment.delete({ where: { id } });
  }

  async getEmployeeSchedule(employeeId: string) {
    const now = new Date();
    return this.prisma.scheduleAssignment.findFirst({
      where: {
        employee_id: employeeId,
        effective_from: { lte: now },
        OR: [{ effective_to: null }, { effective_to: { gte: now } }],
      },
      include: { schedule: true },
      orderBy: { effective_from: 'desc' },
    });
  }

  async getDepartmentSchedules(departmentId: string) {
    return this.prisma.scheduleAssignment.findMany({
      where: {
        employee: { department_id: departmentId },
        OR: [{ effective_to: null }, { effective_to: { gte: new Date() } }],
      },
      include: { employee: { select: { id: true, full_name: true } }, schedule: true },
    });
  }

  // === Absence Records ===

  async recordAbsence(data: { employee_id: string; absence_date: Date; absence_type: string; reason?: string; reported_by?: string }) {
    return this.prisma.absenceRecord.create({ data });
  }

  async getAbsences(filters?: { employee_id?: string; date_from?: Date; date_to?: Date; absence_type?: string }) {
    const where: any = {};
    if (filters?.employee_id) where.employee_id = filters.employee_id;
    if (filters?.absence_type) where.absence_type = filters.absence_type;
    if (filters?.date_from || filters?.date_to) {
      where.absence_date = {};
      if (filters.date_from) where.absence_date.gte = filters.date_from;
      if (filters.date_to) where.absence_date.lte = filters.date_to;
    }

    return this.prisma.absenceRecord.findMany({
      where,
      include: { employee: { select: { id: true, full_name: true, department: true } } },
      orderBy: { absence_date: 'desc' },
    });
  }

  async resolveAbsence(id: string, resolution_note: string) {
    return this.prisma.absenceRecord.update({
      where: { id },
      data: { resolved: true, resolved_at: new Date(), resolution_note, updated_at: new Date() },
    });
  }

  // === Company Holidays ===

  async getCompanyHolidays() {
    return this.prisma.companyHoliday.findMany({
      where: { is_active: true },
      orderBy: { holiday_date: 'asc' },
    });
  }

  async createCompanyHoliday(data: { holiday_date: Date; holiday_name: string; description?: string; is_recurring?: boolean }) {
    return this.prisma.companyHoliday.create({ data });
  }

  async deleteCompanyHoliday(id: string) {
    return this.prisma.companyHoliday.delete({ where: { id } });
  }
}
