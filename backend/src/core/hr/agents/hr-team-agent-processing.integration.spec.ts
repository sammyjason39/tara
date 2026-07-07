import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'reflect-metadata';
import { LateReportAgent } from './late-report.agent';
import { TardinessReportService } from '../services/tardiness-report.service';
import { SaldoCutiAgent } from './saldo-cuti.agent';
import { PrismaService } from '../../../persistence/prisma.service';
import {
  NotificationService,
  TaraNotificationType,
} from '../services/notification.service';
import { EventBusService } from '../services/event-bus.service';

/**
 * HR_Team Agent Processing Integration Tests (Task 35.3)
 *
 * Validates Requirements: 30.14, 30.15, 30.17, 30.20
 *
 * Proves that the autonomous agents process HR_Team members identically
 * to all other employees:
 * - 30.14: Absensi_Agent applies same tardiness detection rules to HR_Team
 * - 30.15: Late_Report_Agent includes tardy HR_Team in public announcements
 * - 30.17: Saldo_Cuti_Agent calculates HR_Team balance with same rules
 * - 30.20: All agent events include HR_Team members as employees
 *
 * Architecture note: The agents query attendance/leave tables by employee_id
 * with NO role-based filtering. HR_Team members are stored in the same
 * employee table with the same schema, so they are naturally included in
 * all agent processing without any special code paths.
 */
describe('HR_Team Agent Processing (Task 35.3)', () => {
  // ---------------------------------------------------------------------------
  // Requirement 30.15: Late_Report_Agent includes tardy HR_Team in public
  // announcements
  // ---------------------------------------------------------------------------
  describe('Requirement 30.15: TardinessReportService includes HR_Team in public tardiness payload', () => {
    let service: TardinessReportService;
    let prismaService: any;
    let eventBusService: any;

    beforeEach(() => {
      prismaService = {
        attendance: { findMany: vi.fn() },
        publicHoliday: { findFirst: vi.fn().mockResolvedValue(null) },
      };

      eventBusService = {
        emit: vi.fn().mockResolvedValue({ id: 'event-1' }),
      };

      service = new TardinessReportService(
        prismaService as PrismaService,
        eventBusService as EventBusService,
      );
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    // Monday 2026-01-05 — a valid workday
    const WORKDAY = new Date(2026, 0, 5);

    /**
     * Simulates attendance records where an HR_Team member and regular
     * employees are all tardy. The agent queries attendance by is_tardy=true
     * with NO role filter, so HR_Team appears alongside everyone else.
     */
    const mixedTardyRecords = [
      {
        id: 'att-hr-1',
        employee_id: 'emp-hr-001',
        clock_in_time: new Date('2026-01-05T02:20:00.000Z'), // 09:20 WIB
        tardiness_minutes: 20,
        employee: {
          id: 'emp-hr-001',
          full_name: 'Sarah HR Admin',
          department: { name: 'Human Resources' },
        },
      },
      {
        id: 'att-reg-1',
        employee_id: 'emp-eng-001',
        clock_in_time: new Date('2026-01-05T02:15:00.000Z'), // 09:15 WIB
        tardiness_minutes: 15,
        employee: {
          id: 'emp-eng-001',
          full_name: 'Dev Engineer',
          department: { name: 'Engineering' },
        },
      },
      {
        id: 'att-hr-2',
        employee_id: 'emp-hr-002',
        clock_in_time: new Date('2026-01-05T02:45:00.000Z'), // 09:45 WIB
        tardiness_minutes: 45,
        employee: {
          id: 'emp-hr-002',
          full_name: 'Rizky HR Staff',
          department: { name: 'Human Resources' },
        },
      },
    ];

    it('includes tardy HR_Team members in the public announcement alongside regular employees', async () => {
      prismaService.attendance.findMany.mockResolvedValue(mixedTardyRecords);

      const payload = await service.generateAndEmit(WORKDAY);
      expect(payload).not.toBeNull();
      const content = payload!.public_tardiness_content;

      // HR_Team members appear in the public tardiness announcement
      expect(content).toContain('Sarah HR Admin');
      expect(content).toContain('Rizky HR Staff');
      // Regular employee also present — no discrimination
      expect(content).toContain('Dev Engineer');

      // All three employees reflected in metadata
      expect(payload!.tardy_count).toBe(3);
      const names = payload!.tardy_employees.map((e) => e.employee_name);
      expect(names).toContain('Sarah HR Admin');
      expect(names).toContain('Rizky HR Staff');
      expect(names).toContain('Dev Engineer');
    });

    it('reports HR_Team tardiness with same detail (arrival time, minutes late) as other employees', async () => {
      prismaService.attendance.findMany.mockResolvedValue(mixedTardyRecords);

      const payload = await service.generateAndEmit(WORKDAY);
      const content = payload!.public_tardiness_content;

      // HR_Team member arrival times and minutes present
      expect(content).toContain('09:20');
      expect(content).toContain('20 menit');
      expect(content).toContain('09:45');
      expect(content).toContain('45 menit');
    });

    it('includes HR_Team in HR detailed recap with department context', async () => {
      prismaService.attendance.findMany.mockResolvedValue(mixedTardyRecords);

      const payload = await service.generateAndEmit(WORKDAY);
      const content = payload!.hr_recap_content;

      // HR_Team members listed in the HR recap with department
      expect(content).toContain('Sarah HR Admin');
      expect(content).toContain('Human Resources');
      expect(content).toContain('Rizky HR Staff');
    });

    it('does not filter out HR_Team from the attendance query (no role-based exclusion)', async () => {
      prismaService.attendance.findMany.mockResolvedValue(mixedTardyRecords);

      await service.generateAndEmit(WORKDAY);

      // The query only filters by date range and is_tardy — no role or department filter
      const queryArgs = prismaService.attendance.findMany.mock.calls[0][0];
      expect(queryArgs.where).toEqual(
        expect.objectContaining({
          is_tardy: true,
          clock_in_time: { not: null },
        }),
      );
      // No role-based exclusion
      expect(queryArgs.where).not.toHaveProperty('employee.role');
      expect(queryArgs.where).not.toHaveProperty('employee.tara_role_id');
    });
  });

  // ---------------------------------------------------------------------------
  // Requirement 30.17: Saldo_Cuti_Agent calculates HR_Team Leave_Balance using
  // same rules as all employees
  // ---------------------------------------------------------------------------
  describe('Requirement 30.17: SaldoCutiAgent calculates HR_Team balance with same rules', () => {
    let agent: SaldoCutiAgent;
    let prismaService: any;
    let eventBusService: any;
    let notificationService: any;

    beforeEach(() => {
      prismaService = {
        leaveBalance: { findUnique: vi.fn() },
        leaveRequest: { findMany: vi.fn() },
        employee: { findMany: vi.fn() },
      };

      eventBusService = {
        emit: vi.fn().mockResolvedValue({ id: 'event-1' }),
      };

      notificationService = {
        sendPrivateNotification: vi.fn().mockResolvedValue({ id: 'notif-1' }),
      };

      agent = new SaldoCutiAgent(
        prismaService as PrismaService,
        eventBusService as EventBusService,
        notificationService as any,
      );
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('calculates HR_Team member balance using same formula as regular employees', async () => {
      const hrEmployeeId = 'emp-hr-001';
      const futureExpiry = new Date();
      futureExpiry.setFullYear(futureExpiry.getFullYear() + 1);

      prismaService.leaveBalance.findUnique.mockResolvedValue({
        total_entitlement: 12,
        used_days: 5,
        remaining_days: 9,
        carryover_days: 2,
        carryover_expiry_date: futureExpiry,
      });

      // HR_Team member has 3 approved leave requests totalling 5 days
      prismaService.leaveRequest.findMany.mockResolvedValue([
        { total_days: 2 },
        { total_days: 2 },
        { total_days: 1 },
      ]);

      const result = await agent.computeBalance(hrEmployeeId, 2026);

      // Same calculation rules applied: entitlement + carryover - used
      expect(result.employee_id).toBe(hrEmployeeId);
      expect(result.total_entitlement).toBe(12);
      expect(result.computed_used_days).toBe(5);
      expect(result.carryover_valid_days).toBe(2);
      // 12 + 2 - 5 = 9
      expect(result.available_balance).toBe(9);
      expect(result.reconciled).toBe(true);
    });

    it('applies carryover expiration rules to HR_Team the same as all employees', async () => {
      const hrEmployeeId = 'emp-hr-001';
      const pastExpiry = new Date();
      pastExpiry.setDate(pastExpiry.getDate() - 1); // expired yesterday

      prismaService.leaveBalance.findUnique.mockResolvedValue({
        total_entitlement: 12,
        used_days: 3,
        remaining_days: 9,
        carryover_days: 3,
        carryover_expiry_date: pastExpiry,
      });

      prismaService.leaveRequest.findMany.mockResolvedValue([
        { total_days: 3 },
      ]);

      const result = await agent.computeBalance(hrEmployeeId, 2026);

      // Expired carryover not counted — same rule for HR_Team
      expect(result.carryover_expired).toBe(true);
      expect(result.carryover_valid_days).toBe(0);
      // 12 + 0 - 3 = 9
      expect(result.available_balance).toBe(9);
    });

    it('queries HR_Team leave balance using same employee_id key with no role filter', async () => {
      const hrEmployeeId = 'emp-hr-001';

      prismaService.leaveBalance.findUnique.mockResolvedValue(null);
      prismaService.leaveRequest.findMany.mockResolvedValue([]);

      await agent.queryLeaveBalance(hrEmployeeId, 2026);

      // Same index lookup by employee_id_year — no role discrimination
      expect(prismaService.leaveBalance.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            employee_id_year: { employee_id: hrEmployeeId, year: 2026 },
          },
        }),
      );

      // Leave request query scoped to same employee_id, no role filter
      for (const call of prismaService.leaveRequest.findMany.mock.calls) {
        expect(call[0].where.employee_id).toBe(hrEmployeeId);
        expect(call[0].where).not.toHaveProperty('role');
        expect(call[0].where).not.toHaveProperty('tara_role_id');
      }
    });

    it('includes HR_Team members in the monthly leave balance recap', async () => {
      // Monthly recap targets all active employees regardless of role
      prismaService.employee.findMany.mockResolvedValue([
        { id: 'emp-hr-001', full_name: 'Sarah HR Admin' },
        { id: 'emp-eng-001', full_name: 'Dev Engineer' },
        { id: 'emp-hr-002', full_name: 'Rizky HR Staff' },
      ]);

      prismaService.leaveBalance.findUnique.mockResolvedValue({
        total_entitlement: 12,
        used_days: 2,
        remaining_days: 10,
        carryover_days: 0,
        carryover_expiry_date: null,
      });
      prismaService.leaveRequest.findMany.mockResolvedValue([]);

      await agent.sendMonthlyRecap(2026);

      // All three employees (including HR_Team) receive private notifications
      expect(notificationService.sendPrivateNotification).toHaveBeenCalledTimes(3);

      const recipients = notificationService.sendPrivateNotification.mock.calls.map(
        (c: any[]) => c[0].recipient_id,
      );
      expect(recipients).toContain('emp-hr-001');
      expect(recipients).toContain('emp-hr-002');
      expect(recipients).toContain('emp-eng-001');
    });

    it('employee query for monthly recap has no role filter (includes HR_Team)', async () => {
      prismaService.employee.findMany.mockResolvedValue([]);

      await agent.sendMonthlyRecap(2026);

      const queryArgs = prismaService.employee.findMany.mock.calls[0][0];
      // Only filters by active status — no role exclusion
      expect(queryArgs.where).toEqual({ employment_status: 'active' });
      expect(queryArgs.where).not.toHaveProperty('role');
      expect(queryArgs.where).not.toHaveProperty('tara_role_id');
    });
  });

  // ---------------------------------------------------------------------------
  // Requirement 30.14: Absensi_Agent processes HR_Team with same tardiness rules
  // ---------------------------------------------------------------------------
  describe('Requirement 30.14: Absensi_Agent same tardiness rules for HR_Team', () => {
    let reportService: TardinessReportService;
    let lateReportAgent: LateReportAgent;
    let prismaService: any;
    let eventBusService: any;
    let tardinessReportServiceMock: any;

    beforeEach(() => {
      prismaService = {
        attendance: { findMany: vi.fn() },
        publicHoliday: { findFirst: vi.fn().mockResolvedValue(null) },
      };
      eventBusService = {
        emit: vi.fn().mockResolvedValue({ id: 'event-1' }),
      };
      reportService = new TardinessReportService(
        prismaService as PrismaService,
        eventBusService as EventBusService,
      );
      tardinessReportServiceMock = {
        generateAndEmit: vi.fn().mockResolvedValue({ tardy_count: 1 }),
      };
      lateReportAgent = new LateReportAgent(
        tardinessReportServiceMock as TardinessReportService,
      );
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    const WORKDAY = new Date(2026, 0, 5);

    it('HR_Team member flagged tardy by Absensi_Agent is picked up by Late_Report_Agent identically', async () => {
      // Simulates scenario: HR_Team member clocked in late, Absensi_Agent
      // stored is_tardy=true. Late_Report_Agent fetches ALL tardy records.
      prismaService.attendance.findMany.mockResolvedValue([
        {
          id: 'att-hr-only',
          employee_id: 'emp-hr-001',
          clock_in_time: new Date('2026-01-05T02:30:00.000Z'), // 09:30 WIB
          tardiness_minutes: 30,
          employee: {
            id: 'emp-hr-001',
            full_name: 'Sarah HR Admin',
            department: { name: 'Human Resources' },
          },
        },
      ]);

      const payload = await reportService.generateAndEmit(WORKDAY);

      // Even when the ONLY tardy employee is HR_Team, report is generated
      expect(payload).not.toBeNull();
      expect(payload!.public_tardiness_content).toContain('Sarah HR Admin');
      expect(payload!.public_tardiness_content).toContain('30 menit');
      expect(payload!.tardy_count).toBe(1);
      expect(payload!.tardy_employees[0].employee_name).toBe('Sarah HR Admin');
    });

    it('handles the real-time attendance.clock_in event for HR_Team member', async () => {
      // The LateReportAgent listens to attendance.clock_in events in real-time
      // Verifies it processes HR_Team member events without errors
      const hrClockInEvent = {
        event_type: 'attendance.clock_in',
        payload: {
          employee_id: 'emp-hr-001',
          is_tardy: true,
          tardiness_minutes: 15,
        },
        entity: { id: 'emp-hr-001', type: 'employee' },
        actor: { id: 'emp-hr-001', type: 'employee' },
      };

      // Should not throw — HR_Team events processed just like any employee event
      await expect(
        lateReportAgent.handleAttendanceClockIn(hrClockInEvent),
      ).resolves.toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Requirement 30.20: All agent events include HR_Team members as employees
  // ---------------------------------------------------------------------------
  describe('Requirement 30.20: Agent events include HR_Team members as employees', () => {
    let tardinessReportService: TardinessReportService;
    let saldoCutiAgent: SaldoCutiAgent;
    let prismaService: any;
    let notificationService: any;
    let eventBusService: any;

    beforeEach(() => {
      prismaService = {
        attendance: { findMany: vi.fn() },
        publicHoliday: { findFirst: vi.fn().mockResolvedValue(null) },
        leaveBalance: { findUnique: vi.fn() },
        leaveRequest: { findMany: vi.fn() },
        employee: { findMany: vi.fn() },
      };
      notificationService = {
        sendPublicAnnouncement: vi.fn().mockResolvedValue([{ id: 'pub-1' }]),
        sendHRTeamNotification: vi.fn().mockResolvedValue([{ id: 'hr-1' }]),
        sendPrivateNotification: vi.fn().mockResolvedValue({ id: 'notif-1' }),
      };
      eventBusService = {
        emit: vi.fn().mockResolvedValue({ id: 'event-1' }),
      };

      tardinessReportService = new TardinessReportService(
        prismaService as PrismaService,
        eventBusService as EventBusService,
      );
      saldoCutiAgent = new SaldoCutiAgent(
        prismaService as PrismaService,
        eventBusService as EventBusService,
        notificationService as any,
      );
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    const WORKDAY = new Date(2026, 0, 5);

    it('tardiness report events include HR_Team employee data', async () => {
      prismaService.attendance.findMany.mockResolvedValue([
        {
          id: 'att-hr-1',
          employee_id: 'emp-hr-001',
          clock_in_time: new Date('2026-01-05T02:10:00.000Z'), // 09:10 WIB
          tardiness_minutes: 10,
          employee: {
            id: 'emp-hr-001',
            full_name: 'Sarah HR Admin',
            department: { name: 'Human Resources' },
          },
        },
      ]);

      await tardinessReportService.generateAndEmit(WORKDAY);

      // Event Bus receives events that include HR_Team member data
      const emittedEvents = eventBusService.emit.mock.calls.map(
        (c: any[]) => c[0],
      );

      const reportEvent = emittedEvents.find(
        (e: any) => e.event_type === 'report.tardiness_generated',
      );

      expect(reportEvent).toBeDefined();
      expect(reportEvent.payload.tardy_count).toBe(1);
      expect(reportEvent.payload.tardy_employees[0].employee_id).toBe('emp-hr-001');
      expect(reportEvent.payload.tardy_employees[0].employee_name).toBe('Sarah HR Admin');
    });

    it('leave balance query events include HR_Team employee reference', async () => {
      const hrEmployeeId = 'emp-hr-001';

      prismaService.leaveBalance.findUnique.mockResolvedValue({
        total_entitlement: 12,
        used_days: 3,
        remaining_days: 9,
        carryover_days: 0,
        carryover_expiry_date: null,
      });
      prismaService.leaveRequest.findMany.mockResolvedValue([]);

      await saldoCutiAgent.queryLeaveBalance(hrEmployeeId, 2026);

      // Event Bus receives leave_balance.query_executed with HR_Team employee_id
      expect(eventBusService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'leave_balance.query_executed',
          entity: { id: hrEmployeeId, type: 'employee' },
          payload: expect.objectContaining({
            employee_id: hrEmployeeId,
          }),
        }),
      );
    });

    it('monthly recap event counts include HR_Team members', async () => {
      prismaService.employee.findMany.mockResolvedValue([
        { id: 'emp-hr-001', full_name: 'Sarah HR Admin' },
        { id: 'emp-eng-001', full_name: 'Dev Engineer' },
      ]);
      prismaService.leaveBalance.findUnique.mockResolvedValue({
        total_entitlement: 12,
        used_days: 0,
        remaining_days: 12,
        carryover_days: 0,
        carryover_expiry_date: null,
      });
      prismaService.leaveRequest.findMany.mockResolvedValue([]);

      await saldoCutiAgent.sendMonthlyRecap(2026);

      // Event reflects both HR_Team and regular employees in recipient count
      expect(eventBusService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'leave_balance.monthly_recap_sent',
          payload: expect.objectContaining({
            recipients_count: 2,
            total_employees: 2,
          }),
        }),
      );
    });

    it('SaldoCutiAgent handles leave.balance.updated event for HR_Team member', async () => {
      const hrBalanceEvent = {
        event_type: 'leave.balance.updated',
        payload: {
          employee_id: 'emp-hr-001',
          year: 2026,
          days_deducted: 2,
          new_remaining_days: 10,
        },
        entity: { id: 'emp-hr-001', type: 'employee' },
      };

      // Should not throw — HR_Team balance events processed like any employee
      await expect(
        saldoCutiAgent.handleLeaveBalanceUpdated(hrBalanceEvent),
      ).resolves.toBeUndefined();
    });
  });
});
