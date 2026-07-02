import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
    break_start?: string;
    break_end?: string;
    work_days: number[];
    is_default?: boolean;
  }) {
    return this.prisma.workSchedule.create({ data: { ...data, work_days: data.work_days } });
  }

  async updateSchedule(id: string, data: any) {
    return this.prisma.workSchedule.update({ where: { id }, data: { ...data, updated_at: new Date() } });
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

  async bulkAssignSchedule(data: { schedule_id: string; employee_ids?: string[]; apply_to_all?: boolean; effective_from: string; effective_to?: string; assigned_by?: string }) {
    let employeeIds = data.employee_ids || [];
    if (data.apply_to_all) {
      const employees = await this.prisma.employee.findMany({
        where: { employment_status: 'active' },
        select: { id: true },
      });
      employeeIds = employees.map((e) => e.id);
    }

    const results = [];
    for (const employee_id of employeeIds) {
      const assignment = await this.prisma.scheduleAssignment.create({
        data: {
          employee_id,
          schedule_id: data.schedule_id,
          effective_from: new Date(data.effective_from),
          effective_to: data.effective_to ? new Date(data.effective_to) : null,
          assigned_by: data.assigned_by,
        },
      });
      results.push(assignment);
    }
    return { count: results.length, assignments: results };
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
