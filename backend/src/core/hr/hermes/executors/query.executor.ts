import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../persistence/prisma.service';
import { HermesQueryType } from '../hermes.interfaces';

/**
 * Query Executor for Hermes
 *
 * Handles the `query_data` action: reads TARA data and returns structured
 * responses for the LLM to reason about.
 *
 * All queries are read-only and available to `read_only` authority agents.
 */
@Injectable()
export class HermesQueryExecutor {
  private readonly logger = new Logger(HermesQueryExecutor.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Route a query to the appropriate handler.
   */
  async execute(queryType: HermesQueryType, params: Record<string, any>): Promise<any> {
    switch (queryType) {
      case 'employee_info':
        return this.getEmployeeInfo(params.employee_id);
      case 'attendance_status':
        return this.getAttendanceStatus(params.employee_id, params.date);
      case 'attendance_history':
        return this.getAttendanceHistory(params.employee_id, params.start_date, params.end_date);
      case 'leave_balance':
        return this.getLeaveBalance(params.employee_id);
      case 'pending_leave_requests':
        return this.getPendingLeaveRequests(params.employee_id, params.department_id);
      case 'department_summary':
        return this.getDepartmentSummary(params.department_id);
      case 'notification_history':
        return this.getNotificationHistory(params.employee_id);
      case 'onboarding_status':
        return this.getOnboardingStatus(params.employee_id);
      case 'weekly_checkin_status':
        return this.getWeeklyCheckinStatus(params.employee_id, params.date);
      case 'whatsapp_conversation_history':
        return this.getWhatsAppConversation(params.employee_id, params.limit);
      case 'whatsapp_session_status':
        return this.getWhatsAppSessionStatus(params.employee_id);
      case 'agent_health':
        return this.getAgentHealth();
      default:
        throw new BadRequestException(`Unknown query_type: ${queryType}`);
    }
  }

  // ===========================================================================
  // Query implementations
  // ===========================================================================

  private async getEmployeeInfo(employeeId: string) {
    if (!employeeId) throw new BadRequestException('employee_id is required for employee_info query');

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        employee_code: true,
        full_name: true,
        email: true,
        phone: true,
        hire_date: true,
        employment_status: true,
        language_preference: true,
        department: { select: { id: true, name: true } },
        role: { select: { id: true, role_name: true } },
        supervisor: { select: { id: true, full_name: true, email: true } },
        office: { select: { id: true, location_name: true } },
      },
    });

    if (!employee) throw new BadRequestException(`Employee not found: ${employeeId}`);
    return employee;
  }

  private async getAttendanceStatus(employeeId?: string, date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const where: any = { attendance_date: targetDate };
    if (employeeId) where.employee_id = employeeId;

    const records = await this.prisma.attendance.findMany({
      where,
      include: {
        employee: { select: { id: true, full_name: true, department_id: true } },
      },
      orderBy: { clock_in_time: 'asc' },
      take: 200,
    });

    const totalEmployees = await this.prisma.employee.count({
      where: { employment_status: 'active' },
    });

    return {
      date: targetDate.toISOString().slice(0, 10),
      total_active_employees: totalEmployees,
      clocked_in: records.filter((r) => r.clock_in_time).length,
      clocked_out: records.filter((r) => r.clock_out_time).length,
      tardy: records.filter((r) => r.is_tardy).length,
      absent: totalEmployees - records.length,
      records: records.map((r) => ({
        employee_id: r.employee_id,
        employee_name: r.employee.full_name,
        clock_in: r.clock_in_time,
        clock_out: r.clock_out_time,
        is_tardy: r.is_tardy,
        tardiness_minutes: r.tardiness_minutes,
      })),
    };
  }

  private async getAttendanceHistory(employeeId: string, startDate?: string, endDate?: string) {
    if (!employeeId) throw new BadRequestException('employee_id is required for attendance_history');

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const records = await this.prisma.attendance.findMany({
      where: {
        employee_id: employeeId,
        attendance_date: { gte: start, lte: end },
      },
      orderBy: { attendance_date: 'desc' },
      take: 60,
    });

    return {
      employee_id: employeeId,
      period: { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) },
      total_records: records.length,
      tardy_days: records.filter((r) => r.is_tardy).length,
      records: records.map((r) => ({
        date: r.attendance_date,
        clock_in: r.clock_in_time,
        clock_out: r.clock_out_time,
        is_tardy: r.is_tardy,
        tardiness_minutes: r.tardiness_minutes,
      })),
    };
  }

  private async getLeaveBalance(employeeId: string) {
    if (!employeeId) throw new BadRequestException('employee_id is required for leave_balance');

    const balance = await this.prisma.leaveBalance.findFirst({
      where: { employee_id: employeeId },
      orderBy: { year: 'desc' },
    });

    const upcomingLeaves = await this.prisma.leaveRequest.findMany({
      where: {
        employee_id: employeeId,
        status: 'approved',
        start_date: { gte: new Date() },
      },
      orderBy: { start_date: 'asc' },
      take: 5,
    });

    return {
      employee_id: employeeId,
      balance: balance
        ? {
            year: balance.year,
            total_entitlement: balance.total_entitlement,
            used_days: balance.used_days,
            remaining_days: balance.remaining_days,
            carryover_days: balance.carryover_days,
            carryover_expiry_date: balance.carryover_expiry_date,
          }
        : null,
      upcoming_approved_leaves: upcomingLeaves.map((l) => ({
        id: l.id,
        leave_type: l.leave_type,
        start_date: l.start_date,
        end_date: l.end_date,
        total_days: l.total_days,
      })),
    };
  }

  private async getPendingLeaveRequests(employeeId?: string, departmentId?: string) {
    const where: any = { status: 'pending' };
    if (employeeId) where.employee_id = employeeId;

    const requests = await this.prisma.leaveRequest.findMany({
      where,
      include: {
        employee: {
          select: { id: true, full_name: true, department_id: true, supervisor_id: true },
        },
      },
      orderBy: { submitted_at: 'asc' },
      take: 50,
    });

    // Filter by department if specified
    let filtered = requests;
    if (departmentId) {
      filtered = requests.filter((r) => r.employee.department_id === departmentId);
    }

    return {
      total_pending: filtered.length,
      requests: filtered.map((r) => ({
        id: r.id,
        employee_id: r.employee_id,
        employee_name: r.employee.full_name,
        supervisor_id: r.employee.supervisor_id,
        leave_type: r.leave_type,
        start_date: r.start_date,
        end_date: r.end_date,
        total_days: r.total_days,
        reason: r.reason,
        submitted_at: r.submitted_at,
        days_waiting: Math.floor((Date.now() - r.submitted_at.getTime()) / (1000 * 60 * 60 * 24)),
      })),
    };
  }

  private async getDepartmentSummary(departmentId?: string) {
    const where: any = { employment_status: 'active' };
    if (departmentId) where.department_id = departmentId;

    const employees = await this.prisma.employee.findMany({
      where,
      select: {
        id: true,
        full_name: true,
        department: { select: { id: true, name: true } },
        employment_status: true,
      },
    });

    // Group by department
    const grouped = employees.reduce((acc, emp) => {
      const deptName = emp.department?.name || 'Unassigned';
      if (!acc[deptName]) acc[deptName] = { department_id: emp.department?.id, count: 0 };
      acc[deptName].count++;
      return acc;
    }, {} as Record<string, { department_id: string | undefined; count: number }>);

    return {
      total_active_employees: employees.length,
      departments: Object.entries(grouped).map(([name, data]) => ({
        department_name: name,
        department_id: data.department_id,
        employee_count: data.count,
      })),
    };
  }

  private async getNotificationHistory(employeeId: string) {
    if (!employeeId) throw new BadRequestException('employee_id is required for notification_history');

    const notifications = await this.prisma.notification.findMany({
      where: { recipient_id: employeeId },
      orderBy: { created_at: 'desc' },
      take: 20,
      select: {
        id: true,
        notification_type: true,
        title: true,
        is_read: true,
        created_at: true,
        metadata: true,
      },
    });

    const unreadCount = await this.prisma.notification.count({
      where: { recipient_id: employeeId, is_read: false },
    });

    return {
      employee_id: employeeId,
      unread_count: unreadCount,
      recent_notifications: notifications,
    };
  }

  private async getOnboardingStatus(employeeId: string) {
    if (!employeeId) throw new BadRequestException('employee_id is required for onboarding_status');

    const steps = await this.prisma.onboardingStatus.findMany({
      where: { employee_id: employeeId },
      orderBy: { step_number: 'asc' },
    });

    return {
      employee_id: employeeId,
      total_steps: 7,
      completed_steps: steps.filter((s) => s.status === 'completed').length,
      steps: steps.map((s) => ({
        step_number: s.step_number,
        step_name: s.step_name,
        status: s.status,
        started_at: s.started_at,
        completed_at: s.completed_at,
        failure_reason: s.failure_reason,
      })),
    };
  }

  private async getWeeklyCheckinStatus(employeeId?: string, date?: string) {
    const weekStart = date ? new Date(date) : this.getCurrentWeekStart();

    const where: any = { week_start_date: weekStart };
    if (employeeId) where.employee_id = employeeId;

    const checkins = await this.prisma.weeklyCheckin.findMany({
      where,
      include: { employee: { select: { id: true, full_name: true } } },
      take: 100,
    });

    const totalActive = await this.prisma.employee.count({ where: { employment_status: 'active' } });

    return {
      week_start: weekStart.toISOString().slice(0, 10),
      total_active_employees: totalActive,
      submitted_count: checkins.length,
      pending_count: totalActive - checkins.length,
      submissions: checkins.map((c) => ({
        employee_id: c.employee_id,
        employee_name: c.employee.full_name,
        submitted_at: c.submitted_at,
      })),
    };
  }

  private async getAgentHealth() {
    const configs = await this.prisma.agentConfig.findMany({
      orderBy: { agent_name: 'asc' },
    });

    return {
      agents: configs.map((c) => ({
        agent_name: c.agent_name,
        is_enabled: c.is_enabled,
        health_status: c.health_status,
        last_heartbeat_at: c.last_heartbeat_at,
        error_message: c.error_message,
      })),
    };
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  private getCurrentWeekStart(): Date {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  // ===========================================================================
  // WhatsApp Queries
  // ===========================================================================

  private async getWhatsAppConversation(employeeId: string, limit?: number) {
    if (!employeeId) throw new BadRequestException('employee_id is required for whatsapp_conversation_history');

    const messages = await this.prisma.whatsAppMessageLog.findMany({
      where: { employee_id: employeeId },
      orderBy: { created_at: 'desc' },
      take: limit || 20,
      select: {
        id: true,
        direction: true,
        message_type: true,
        content: true,
        wa_status: true,
        hermes_agent_id: true,
        session_id: true,
        created_at: true,
      },
    });

    return {
      employee_id: employeeId,
      message_count: messages.length,
      messages: messages.reverse().map((m) => ({
        id: m.id,
        role: m.direction === 'inbound' ? 'user' : 'assistant',
        content: m.content,
        type: m.message_type,
        status: m.wa_status,
        agent_id: m.hermes_agent_id,
        timestamp: m.created_at,
      })),
    };
  }

  private async getWhatsAppSessionStatus(employeeId: string) {
    if (!employeeId) throw new BadRequestException('employee_id is required for whatsapp_session_status');

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        whatsapp_number: true,
        whatsapp_opted_in: true,
        whatsapp_verified: true,
        whatsapp_verified_at: true,
      },
    });

    const activeSession = await this.prisma.whatsAppSession.findFirst({
      where: { employee_id: employeeId, status: 'active' },
      orderBy: { last_activity_at: 'desc' },
    });

    const totalMessages = await this.prisma.whatsAppMessageLog.count({
      where: { employee_id: employeeId },
    });

    return {
      employee_id: employeeId,
      whatsapp_configured: !!employee?.whatsapp_number,
      opted_in: employee?.whatsapp_opted_in || false,
      verified: employee?.whatsapp_verified || false,
      verified_at: employee?.whatsapp_verified_at,
      active_session: activeSession ? {
        session_id: activeSession.id,
        started_at: activeSession.started_at,
        last_activity_at: activeSession.last_activity_at,
        message_count: activeSession.message_count,
      } : null,
      total_messages: totalMessages,
    };
  }
}
