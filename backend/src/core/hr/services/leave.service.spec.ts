import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { PrismaService } from '../../../persistence/prisma.service';
import { EventBusService } from './event-bus.service';
import { NotificationService } from './notification.service';
import { LeaveRequestAgent } from '../agents/leave-request.agent';
import { CacheAsideService } from '../../../shared/cache/cache-aside.service';

describe('LeaveService', () => {
  let service: LeaveService;
  let prismaService: any;
  let eventBusService: any;
  let notificationService: any;

  beforeEach(async () => {
    const mockPrismaService = {
      leaveBalance: {
        findUnique: vi.fn(),
      },
      leaveRequest: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      publicHoliday: {
        findMany: vi.fn(),
      },
      employee: {
        findUnique: vi.fn(),
      },
    };

    const mockEventBusService = {
      emit: vi.fn(),
    };

    const mockNotificationService = {
      sendNotification: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaveService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EventBusService,
          useValue: mockEventBusService,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
        {
          provide: LeaveRequestAgent,
          useValue: {
            processLeaveRequestSubmission: vi.fn(),
            processLeaveRequestApproval: vi.fn(),
            processLeaveRequestRejection: vi.fn(),
          },
        },
        CacheAsideService,
      ],
    }).compile();

    service = module.get<LeaveService>(LeaveService);
    prismaService = module.get(PrismaService);
    eventBusService = module.get(EventBusService);
    notificationService = module.get(NotificationService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('submitLeaveRequest', () => {
    const mockEmployeeId = 'employee-123';
    const mockLeaveBalance = {
      id: 'balance-123',
      employee_id: mockEmployeeId,
      year: 2024,
      total_entitlement: 12,
      used_days: 5,
      remaining_days: 7,
      carryover_days: 0,
      carryover_expiry_date: null,
      last_calculated_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should successfully create a leave request with sufficient balance', async () => {
      const start_date = new Date('2024-06-03'); // Monday
      const end_date = new Date('2024-06-07'); // Friday
      const leave_type = 'annual';
      const reason = 'Family vacation';

      // Mock no public holidays
      prismaService.publicHoliday.findMany.mockResolvedValue([]);

      // Mock leave balance with sufficient days
      prismaService.leaveBalance.findUnique.mockResolvedValue(mockLeaveBalance);

      const mockCreatedRequest = {
        id: 'request-123',
        employee_id: mockEmployeeId,
        leave_type,
        start_date,
        end_date,
        total_days: 5, // Monday to Friday = 5 working days
        reason,
        status: 'pending',
        submitted_at: new Date(),
        approved_by: null,
        approved_at: null,
        rejection_reason: null,
        created_at: new Date(),
        updated_at: new Date(),
        employee: {
          id: mockEmployeeId,
          employee_code: 'EMP001',
          full_name: 'John Doe',
          email: 'john@example.com',
          department_id: 'dept-123',
        },
      };

      prismaService.leaveRequest.create.mockResolvedValue(mockCreatedRequest);
      eventBusService.emit.mockResolvedValue({ id: 'event-123' });

      const result = await service.submitLeaveRequest({
        employee_id: mockEmployeeId,
        leave_type,
        start_date,
        end_date,
        reason,
      });

      // Verify leave request was created
      expect(prismaService.leaveRequest.create).toHaveBeenCalledWith({
        data: {
          employee_id: mockEmployeeId,
          leave_type,
          start_date,
          end_date,
          total_days: 5,
          reason,
          status: 'pending',
          submitted_at: expect.any(Date),
        },
        include: {
          employee: {
            select: {
              id: true,
              employee_code: true,
              full_name: true,
              email: true,
              department_id: true,
            },
          },
        },
      });

      // Verify event was emitted
      expect(eventBusService.emit).toHaveBeenCalledWith({
        event_type: 'leave.request.submitted',
        event_version: '1.0',
        actor: {
          id: mockEmployeeId,
          type: 'employee',
        },
        entity: {
          id: 'request-123',
          type: 'leave_request',
        },
        payload: expect.objectContaining({
          employee_id: mockEmployeeId,
          employee_name: 'John Doe',
          leave_type,
          start_date: start_date.toISOString(),
          end_date: end_date.toISOString(),
          total_days: 5,
          reason,
          status: 'pending',
        }),
        metadata: expect.any(Object),
      });

      expect(result).toEqual(mockCreatedRequest);
    });

    it('should reject leave request with insufficient balance', async () => {
      const start_date = new Date('2024-06-03'); // Monday
      const end_date = new Date('2024-06-14'); // Friday (10 working days)
      const leave_type = 'annual';

      // Mock no public holidays
      prismaService.publicHoliday.findMany.mockResolvedValue([]);

      // Mock leave balance with only 7 remaining days
      prismaService.leaveBalance.findUnique.mockResolvedValue(mockLeaveBalance);

      await expect(
        service.submitLeaveRequest({
          employee_id: mockEmployeeId,
          leave_type,
          start_date,
          end_date,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.submitLeaveRequest({
          employee_id: mockEmployeeId,
          leave_type,
          start_date,
          end_date,
        }),
      ).rejects.toThrow(/Insufficient leave balance/);

      // Verify leave request was NOT created
      expect(prismaService.leaveRequest.create).not.toHaveBeenCalled();

      // Verify event was NOT emitted
      expect(eventBusService.emit).not.toHaveBeenCalled();
    });

    it('should exclude weekends from total days calculation', async () => {
      const start_date = new Date('2024-06-03'); // Monday
      const end_date = new Date('2024-06-09'); // Sunday (includes Saturday and Sunday)
      const leave_type = 'annual';

      // Mock no public holidays
      prismaService.publicHoliday.findMany.mockResolvedValue([]);

      // Mock leave balance
      prismaService.leaveBalance.findUnique.mockResolvedValue(mockLeaveBalance);

      const mockCreatedRequest = {
        id: 'request-123',
        employee_id: mockEmployeeId,
        leave_type,
        start_date,
        end_date,
        total_days: 5, // Monday to Friday only (excludes Sat & Sun)
        reason: null,
        status: 'pending',
        submitted_at: new Date(),
        approved_by: null,
        approved_at: null,
        rejection_reason: null,
        created_at: new Date(),
        updated_at: new Date(),
        employee: {
          id: mockEmployeeId,
          employee_code: 'EMP001',
          full_name: 'John Doe',
          email: 'john@example.com',
          department_id: 'dept-123',
        },
      };

      prismaService.leaveRequest.create.mockResolvedValue(mockCreatedRequest);
      eventBusService.emit.mockResolvedValue({ id: 'event-123' });

      const result = await service.submitLeaveRequest({
        employee_id: mockEmployeeId,
        leave_type,
        start_date,
        end_date,
      });

      // Verify total_days excludes weekends (should be 5 days, not 7)
      expect(prismaService.leaveRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            total_days: 5, // Monday-Friday only
          }),
        }),
      );

      expect(result.total_days).toBe(5);
    });

    it('should exclude public holidays from total days calculation', async () => {
      const start_date = new Date('2024-06-03'); // Monday
      const end_date = new Date('2024-06-07'); // Friday
      const leave_type = 'annual';

      // Mock public holiday on Wednesday (June 5)
      prismaService.publicHoliday.findMany.mockResolvedValue([
        {
          id: 'holiday-123',
          holiday_date: new Date('2024-06-05'),
          holiday_name: 'National Holiday',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      // Mock leave balance
      prismaService.leaveBalance.findUnique.mockResolvedValue(mockLeaveBalance);

      const mockCreatedRequest = {
        id: 'request-123',
        employee_id: mockEmployeeId,
        leave_type,
        start_date,
        end_date,
        total_days: 4, // Monday, Tuesday, Thursday, Friday (excludes Wednesday holiday)
        reason: null,
        status: 'pending',
        submitted_at: new Date(),
        approved_by: null,
        approved_at: null,
        rejection_reason: null,
        created_at: new Date(),
        updated_at: new Date(),
        employee: {
          id: mockEmployeeId,
          employee_code: 'EMP001',
          full_name: 'John Doe',
          email: 'john@example.com',
          department_id: 'dept-123',
        },
      };

      prismaService.leaveRequest.create.mockResolvedValue(mockCreatedRequest);
      eventBusService.emit.mockResolvedValue({ id: 'event-123' });

      const result = await service.submitLeaveRequest({
        employee_id: mockEmployeeId,
        leave_type,
        start_date,
        end_date,
      });

      // Verify total_days excludes public holiday (should be 4 days, not 5)
      expect(prismaService.leaveRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            total_days: 4, // Excludes Wednesday holiday
          }),
        }),
      );

      expect(result.total_days).toBe(4);
    });

    it('should reject leave request with invalid dates (start after end)', async () => {
      const start_date = new Date('2024-06-07'); // Friday
      const end_date = new Date('2024-06-03'); // Monday (before start)
      const leave_type = 'annual';

      await expect(
        service.submitLeaveRequest({
          employee_id: mockEmployeeId,
          leave_type,
          start_date,
          end_date,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.submitLeaveRequest({
          employee_id: mockEmployeeId,
          leave_type,
          start_date,
          end_date,
        }),
      ).rejects.toThrow(/Start date must be before or equal to end date/);

      // Verify no database operations were performed
      expect(prismaService.publicHoliday.findMany).not.toHaveBeenCalled();
      expect(prismaService.leaveBalance.findUnique).not.toHaveBeenCalled();
      expect(prismaService.leaveRequest.create).not.toHaveBeenCalled();
    });

    it('should reject leave request spanning only weekends/holidays (0 working days)', async () => {
      const start_date = new Date('2024-06-08'); // Saturday
      const end_date = new Date('2024-06-09'); // Sunday
      const leave_type = 'annual';

      // Mock no public holidays
      prismaService.publicHoliday.findMany.mockResolvedValue([]);

      await expect(
        service.submitLeaveRequest({
          employee_id: mockEmployeeId,
          leave_type,
          start_date,
          end_date,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.submitLeaveRequest({
          employee_id: mockEmployeeId,
          leave_type,
          start_date,
          end_date,
        }),
      ).rejects.toThrow(/must span at least one working day/);

      // Verify balance check was not performed
      expect(prismaService.leaveBalance.findUnique).not.toHaveBeenCalled();
      expect(prismaService.leaveRequest.create).not.toHaveBeenCalled();
    });

    it('should reject leave request when no leave balance exists', async () => {
      const start_date = new Date('2024-06-03'); // Monday
      const end_date = new Date('2024-06-05'); // Wednesday
      const leave_type = 'annual';

      // Mock no public holidays
      prismaService.publicHoliday.findMany.mockResolvedValue([]);

      // Mock no leave balance found
      prismaService.leaveBalance.findUnique.mockResolvedValue(null);

      await expect(
        service.submitLeaveRequest({
          employee_id: mockEmployeeId,
          leave_type,
          start_date,
          end_date,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.submitLeaveRequest({
          employee_id: mockEmployeeId,
          leave_type,
          start_date,
          end_date,
        }),
      ).rejects.toThrow(/No leave balance found/);

      // Verify leave request was NOT created
      expect(prismaService.leaveRequest.create).not.toHaveBeenCalled();
    });

    it('should handle event emission failure gracefully', async () => {
      const start_date = new Date('2024-06-03'); // Monday
      const end_date = new Date('2024-06-05'); // Wednesday
      const leave_type = 'sick';

      // Mock no public holidays
      prismaService.publicHoliday.findMany.mockResolvedValue([]);

      // Mock leave balance
      prismaService.leaveBalance.findUnique.mockResolvedValue(mockLeaveBalance);

      const mockCreatedRequest = {
        id: 'request-123',
        employee_id: mockEmployeeId,
        leave_type,
        start_date,
        end_date,
        total_days: 3,
        reason: null,
        status: 'pending',
        submitted_at: new Date(),
        approved_by: null,
        approved_at: null,
        rejection_reason: null,
        created_at: new Date(),
        updated_at: new Date(),
        employee: {
          id: mockEmployeeId,
          employee_code: 'EMP001',
          full_name: 'John Doe',
          email: 'john@example.com',
          department_id: 'dept-123',
        },
      };

      prismaService.leaveRequest.create.mockResolvedValue(mockCreatedRequest);

      // Mock event emission failure
      eventBusService.emit.mockRejectedValue(new Error('Event Bus unavailable'));

      // Should NOT throw - event failure should be logged but not fail the request
      const result = await service.submitLeaveRequest({
        employee_id: mockEmployeeId,
        leave_type,
        start_date,
        end_date,
      });

      // Verify leave request was still created
      expect(prismaService.leaveRequest.create).toHaveBeenCalled();
      expect(result).toEqual(mockCreatedRequest);
    });

    it('should record submission timestamp when creating leave request', async () => {
      const start_date = new Date('2024-06-03'); // Monday
      const end_date = new Date('2024-06-03'); // Same day
      const leave_type = 'emergency';
      const beforeSubmit = new Date();

      // Mock no public holidays
      prismaService.publicHoliday.findMany.mockResolvedValue([]);

      // Mock leave balance
      prismaService.leaveBalance.findUnique.mockResolvedValue(mockLeaveBalance);

      const mockCreatedRequest = {
        id: 'request-123',
        employee_id: mockEmployeeId,
        leave_type,
        start_date,
        end_date,
        total_days: 1,
        reason: null,
        status: 'pending',
        submitted_at: new Date(),
        approved_by: null,
        approved_at: null,
        rejection_reason: null,
        created_at: new Date(),
        updated_at: new Date(),
        employee: {
          id: mockEmployeeId,
          employee_code: 'EMP001',
          full_name: 'John Doe',
          email: 'john@example.com',
          department_id: 'dept-123',
        },
      };

      prismaService.leaveRequest.create.mockResolvedValue(mockCreatedRequest);
      eventBusService.emit.mockResolvedValue({ id: 'event-123' });

      await service.submitLeaveRequest({
        employee_id: mockEmployeeId,
        leave_type,
        start_date,
        end_date,
      });

      const afterSubmit = new Date();

      // Verify submitted_at was recorded
      const createCall = prismaService.leaveRequest.create.mock.calls[0][0];
      const submittedAt = createCall.data.submitted_at;

      expect(submittedAt).toBeInstanceOf(Date);
      expect(submittedAt.getTime()).toBeGreaterThanOrEqual(beforeSubmit.getTime());
      expect(submittedAt.getTime()).toBeLessThanOrEqual(afterSubmit.getTime());
    });
  });

  describe('getLeaveBalance', () => {
    it('should retrieve leave balance for current year by default', async () => {
      const employee_id = 'employee-123';
      const currentYear = new Date().getFullYear();

      const mockBalance = {
        id: 'balance-123',
        employee_id,
        year: currentYear,
        total_entitlement: 12,
        used_days: 3,
        remaining_days: 9,
        carryover_days: 0,
        carryover_expiry_date: null,
        last_calculated_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      prismaService.leaveBalance.findUnique.mockResolvedValue(mockBalance);

      const result = await service.getLeaveBalance(employee_id);

      expect(prismaService.leaveBalance.findUnique).toHaveBeenCalledWith({
        where: {
          employee_id_year: {
            employee_id,
            year: currentYear,
          },
        },
      });

      expect(result).toEqual(mockBalance);
    });

    it('should retrieve leave balance for specified year', async () => {
      const employee_id = 'employee-123';
      const year = 2023;

      const mockBalance = {
        id: 'balance-123',
        employee_id,
        year,
        total_entitlement: 12,
        used_days: 12,
        remaining_days: 0,
        carryover_days: 0,
        carryover_expiry_date: null,
        last_calculated_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      prismaService.leaveBalance.findUnique.mockResolvedValue(mockBalance);

      const result = await service.getLeaveBalance(employee_id, year);

      expect(prismaService.leaveBalance.findUnique).toHaveBeenCalledWith({
        where: {
          employee_id_year: {
            employee_id,
            year,
          },
        },
      });

      expect(result).toEqual(mockBalance);
    });

    it('should return null when leave balance does not exist', async () => {
      const employee_id = 'employee-123';

      prismaService.leaveBalance.findUnique.mockResolvedValue(null);

      const result = await service.getLeaveBalance(employee_id);

      expect(result).toBeNull();
    });
  });

  describe('getLeaveRequests', () => {
    it('should retrieve all leave requests for an employee', async () => {
      const employee_id = 'employee-123';

      const mockRequests = [
        {
          id: 'request-1',
          employee_id,
          leave_type: 'annual',
          start_date: new Date('2024-06-03'),
          end_date: new Date('2024-06-05'),
          total_days: 3,
          reason: 'Vacation',
          status: 'approved',
          submitted_at: new Date(),
          approved_by: 'manager-123',
          approved_at: new Date(),
          rejection_reason: null,
          created_at: new Date(),
          updated_at: new Date(),
          employee: {
            id: employee_id,
            employee_code: 'EMP001',
            full_name: 'John Doe',
            email: 'john@example.com',
          },
          approver: {
            id: 'manager-123',
            full_name: 'Jane Manager',
          },
        },
      ];

      prismaService.leaveRequest.findMany.mockResolvedValue(mockRequests);

      const result = await service.getLeaveRequests(employee_id);

      expect(prismaService.leaveRequest.findMany).toHaveBeenCalledWith({
        where: { employee_id },
        orderBy: { submitted_at: 'desc' },
        take: 50,
        skip: 0,
        include: {
          employee: {
            select: {
              id: true,
              employee_code: true,
              full_name: true,
              email: true,
            },
          },
          approver: {
            select: {
              id: true,
              full_name: true,
            },
          },
        },
      });

      expect(result).toEqual(mockRequests);
    });

    it('should filter leave requests by status', async () => {
      const employee_id = 'employee-123';
      const status = 'pending';

      prismaService.leaveRequest.findMany.mockResolvedValue([]);

      await service.getLeaveRequests(employee_id, { status });

      expect(prismaService.leaveRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { employee_id, status },
        }),
      );
    });

    it('should support pagination', async () => {
      const employee_id = 'employee-123';

      prismaService.leaveRequest.findMany.mockResolvedValue([]);

      await service.getLeaveRequests(employee_id, { limit: 10, offset: 20 });

      expect(prismaService.leaveRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        }),
      );
    });
  });

  describe('getLeaveRequestById', () => {
    it('should retrieve a specific leave request', async () => {
      const request_id = 'request-123';

      const mockRequest = {
        id: request_id,
        employee_id: 'employee-123',
        leave_type: 'sick',
        start_date: new Date('2024-06-03'),
        end_date: new Date('2024-06-03'),
        total_days: 1,
        reason: 'Medical appointment',
        status: 'pending',
        submitted_at: new Date(),
        approved_by: null,
        approved_at: null,
        rejection_reason: null,
        created_at: new Date(),
        updated_at: new Date(),
        employee: {
          id: 'employee-123',
          employee_code: 'EMP001',
          full_name: 'John Doe',
          email: 'john@example.com',
          department_id: 'dept-123',
        },
        approver: null,
      };

      prismaService.leaveRequest.findUnique.mockResolvedValue(mockRequest);

      const result = await service.getLeaveRequestById(request_id);

      expect(prismaService.leaveRequest.findUnique).toHaveBeenCalledWith({
        where: { id: request_id },
        include: {
          employee: {
            select: {
              id: true,
              employee_code: true,
              full_name: true,
              email: true,
              department_id: true,
            },
          },
          approver: {
            select: {
              id: true,
              full_name: true,
            },
          },
        },
      });

      expect(result).toEqual(mockRequest);
    });

    it('should return null when leave request does not exist', async () => {
      const request_id = 'non-existent';

      prismaService.leaveRequest.findUnique.mockResolvedValue(null);

      const result = await service.getLeaveRequestById(request_id);

      expect(result).toBeNull();
    });
  });

  /**
   * Task 12.2: Leave Balance Validation Tests
   * 
   * Requirements:
   * - 1.1: Query LeaveBalance for employee's remaining_days for current year
   * - 1.5: Reject request if total_days > remaining_days
   * - 1.5: Include balance information in rejection notification
   * 
   * Edge Cases:
   * - No balance record exists
   * - Zero days remaining
   * - Insufficient balance with detailed balance info
   */
  describe('Task 12.2: Leave Balance Validation', () => {
    const mockEmployeeId = 'employee-456';

    it('should send rejection notification when no balance record exists', async () => {
      const start_date = new Date('2024-06-03');
      const end_date = new Date('2024-06-05');
      const leave_type = 'annual';

      // Mock no public holidays
      prismaService.publicHoliday.findMany.mockResolvedValue([]);

      // Mock no leave balance found
      prismaService.leaveBalance.findUnique.mockResolvedValue(null);

      // Mock employee data for notification
      prismaService.employee.findUnique.mockResolvedValue({
        id: mockEmployeeId,
        full_name: 'Jane Smith',
      });

      notificationService.sendNotification.mockResolvedValue({
        id: 'notif-123',
      });

      // Expect request to be rejected
      await expect(
        service.submitLeaveRequest({
          employee_id: mockEmployeeId,
          leave_type,
          start_date,
          end_date,
        }),
      ).rejects.toThrow(BadRequestException);

      // Verify rejection notification was sent with balance information
      expect(notificationService.sendNotification).toHaveBeenCalledWith({
        recipient_id: mockEmployeeId,
        type: 'leave_request_rejected',
        visibility: 'private',
        title: expect.stringContaining('Cannot Be Processed'),
        content: expect.stringContaining('no leave balance record exists'),
        metadata: {
          reason: 'insufficient_balance',
          requested_days: 3,
          available_days: 0,
          total_entitlement: 0,
          used_days: 0,
          carryover_days: 0,
          year: new Date().getFullYear(),
        },
      });

      // Verify leave request was NOT created
      expect(prismaService.leaveRequest.create).not.toHaveBeenCalled();
    });

    it('should send rejection notification when employee has zero remaining days', async () => {
      const start_date = new Date('2024-06-03');
      const end_date = new Date('2024-06-05');
      const leave_type = 'annual';

      const mockZeroBalance = {
        id: 'balance-789',
        employee_id: mockEmployeeId,
        year: 2024,
        total_entitlement: 12,
        used_days: 12,
        remaining_days: 0, // Zero remaining
        carryover_days: 0,
        carryover_expiry_date: null,
        last_calculated_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Mock no public holidays
      prismaService.publicHoliday.findMany.mockResolvedValue([]);

      // Mock leave balance with zero remaining days
      prismaService.leaveBalance.findUnique.mockResolvedValue(mockZeroBalance);

      // Mock employee data for notification
      prismaService.employee.findUnique.mockResolvedValue({
        id: mockEmployeeId,
        full_name: 'Jane Smith',
      });

      notificationService.sendNotification.mockResolvedValue({
        id: 'notif-456',
      });

      // Expect request to be rejected
      await expect(
        service.submitLeaveRequest({
          employee_id: mockEmployeeId,
          leave_type,
          start_date,
          end_date,
        }),
      ).rejects.toThrow(BadRequestException);

      // Verify rejection notification was sent with balance information
      expect(notificationService.sendNotification).toHaveBeenCalledWith({
        recipient_id: mockEmployeeId,
        type: 'leave_request_rejected',
        visibility: 'private',
        title: expect.stringContaining('No Remaining Days'),
        content: expect.stringContaining('Available Days: 0'),
        metadata: {
          reason: 'insufficient_balance',
          requested_days: 3,
          available_days: 0,
          total_entitlement: 12,
          used_days: 12,
          carryover_days: 0,
          year: 2024,
        },
      });

      // Verify notification includes detailed balance breakdown
      const notificationCall = notificationService.sendNotification.mock.calls[0][0];
      expect(notificationCall.content).toContain('Total Entitlement: 12 days');
      expect(notificationCall.content).toContain('Used Days: 12 days');
      expect(notificationCall.content).toContain('You have used all your available leave days');

      // Verify leave request was NOT created
      expect(prismaService.leaveRequest.create).not.toHaveBeenCalled();
    });

    it('should send rejection notification with balance details when insufficient balance', async () => {
      const start_date = new Date('2024-06-03');
      const end_date = new Date('2024-06-14'); // 10 working days
      const leave_type = 'annual';

      const mockInsufficientBalance = {
        id: 'balance-123',
        employee_id: mockEmployeeId,
        year: 2024,
        total_entitlement: 12,
        used_days: 7,
        remaining_days: 5, // Only 5 remaining, but requesting 10
        carryover_days: 0,
        carryover_expiry_date: null,
        last_calculated_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Mock no public holidays
      prismaService.publicHoliday.findMany.mockResolvedValue([]);

      // Mock leave balance with insufficient days
      prismaService.leaveBalance.findUnique.mockResolvedValue(
        mockInsufficientBalance,
      );

      // Mock employee data for notification
      prismaService.employee.findUnique.mockResolvedValue({
        id: mockEmployeeId,
        full_name: 'Jane Smith',
      });

      notificationService.sendNotification.mockResolvedValue({
        id: 'notif-789',
      });

      // Expect request to be rejected
      await expect(
        service.submitLeaveRequest({
          employee_id: mockEmployeeId,
          leave_type,
          start_date,
          end_date,
        }),
      ).rejects.toThrow(BadRequestException);

      // Verify rejection notification was sent with complete balance information
      expect(notificationService.sendNotification).toHaveBeenCalledWith({
        recipient_id: mockEmployeeId,
        type: 'leave_request_rejected',
        visibility: 'private',
        title: expect.stringContaining('Insufficient Balance'),
        content: expect.stringContaining('Your Leave Balance:'),
        metadata: {
          reason: 'insufficient_balance',
          requested_days: 10,
          available_days: 5,
          total_entitlement: 12,
          used_days: 7,
          carryover_days: 0,
          year: 2024,
        },
      });

      // Verify notification includes all balance details
      const notificationCall = notificationService.sendNotification.mock.calls[0][0];
      expect(notificationCall.content).toContain('Requested Days: 10');
      expect(notificationCall.content).toContain('Available Days: 5');
      expect(notificationCall.content).toContain('Total Entitlement: 12 days');
      expect(notificationCall.content).toContain('Used Days: 7 days');
      expect(notificationCall.content).toContain('Carryover Days: 0 days');
      expect(notificationCall.content).toContain(
        'Please adjust your leave request to 5 day(s) or less',
      );

      // Verify leave request was NOT created
      expect(prismaService.leaveRequest.create).not.toHaveBeenCalled();
    });

    it('should include carryover days in rejection notification when applicable', async () => {
      const start_date = new Date('2024-06-03');
      const end_date = new Date('2024-06-07'); // 5 working days
      const leave_type = 'annual';

      const mockBalanceWithCarryover = {
        id: 'balance-999',
        employee_id: mockEmployeeId,
        year: 2024,
        total_entitlement: 12,
        used_days: 10,
        remaining_days: 2, // Only 2 remaining, but requesting 5
        carryover_days: 3, // Has carryover days from previous year
        carryover_expiry_date: new Date('2024-03-31'),
        last_calculated_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Mock no public holidays
      prismaService.publicHoliday.findMany.mockResolvedValue([]);

      // Mock leave balance with carryover
      prismaService.leaveBalance.findUnique.mockResolvedValue(
        mockBalanceWithCarryover,
      );

      // Mock employee data for notification
      prismaService.employee.findUnique.mockResolvedValue({
        id: mockEmployeeId,
        full_name: 'Jane Smith',
      });

      notificationService.sendNotification.mockResolvedValue({
        id: 'notif-carryover',
      });

      // Expect request to be rejected
      await expect(
        service.submitLeaveRequest({
          employee_id: mockEmployeeId,
          leave_type,
          start_date,
          end_date,
        }),
      ).rejects.toThrow(BadRequestException);

      // Verify notification includes carryover days information
      const notificationCall = notificationService.sendNotification.mock.calls[0][0];
      expect(notificationCall.content).toContain('Carryover Days: 3 days');
      expect(notificationCall.metadata.carryover_days).toBe(3);

      // Verify leave request was NOT created
      expect(prismaService.leaveRequest.create).not.toHaveBeenCalled();
    });

    it('should handle notification service failure gracefully during rejection', async () => {
      const start_date = new Date('2024-06-03');
      const end_date = new Date('2024-06-14'); // 10 working days
      const leave_type = 'annual';

      const mockInsufficientBalance = {
        id: 'balance-error',
        employee_id: mockEmployeeId,
        year: 2024,
        total_entitlement: 12,
        used_days: 7,
        remaining_days: 5,
        carryover_days: 0,
        carryover_expiry_date: null,
        last_calculated_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Mock no public holidays
      prismaService.publicHoliday.findMany.mockResolvedValue([]);

      // Mock leave balance with insufficient days
      prismaService.leaveBalance.findUnique.mockResolvedValue(
        mockInsufficientBalance,
      );

      // Mock employee data for notification
      prismaService.employee.findUnique.mockResolvedValue({
        id: mockEmployeeId,
        full_name: 'Jane Smith',
      });

      // Mock notification service failure
      notificationService.sendNotification.mockRejectedValue(
        new Error('Notification service unavailable'),
      );

      // Should still throw BadRequestException even if notification fails
      await expect(
        service.submitLeaveRequest({
          employee_id: mockEmployeeId,
          leave_type,
          start_date,
          end_date,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.submitLeaveRequest({
          employee_id: mockEmployeeId,
          leave_type,
          start_date,
          end_date,
        }),
      ).rejects.toThrow(/Insufficient leave balance/);

      // Verify notification was attempted
      expect(notificationService.sendNotification).toHaveBeenCalled();

      // Verify leave request was NOT created
      expect(prismaService.leaveRequest.create).not.toHaveBeenCalled();
    });

    it('should reject with correct error message format for no balance record', async () => {
      const start_date = new Date('2024-06-03');
      const end_date = new Date('2024-06-05');
      const leave_type = 'annual';
      const currentYear = new Date().getFullYear();

      // Mock no public holidays
      prismaService.publicHoliday.findMany.mockResolvedValue([]);

      // Mock no leave balance found
      prismaService.leaveBalance.findUnique.mockResolvedValue(null);

      // Mock employee for notification
      prismaService.employee.findUnique.mockResolvedValue({
        id: mockEmployeeId,
        full_name: 'Jane Smith',
      });

      notificationService.sendNotification.mockResolvedValue({
        id: 'notif-123',
      });

      await expect(
        service.submitLeaveRequest({
          employee_id: mockEmployeeId,
          leave_type,
          start_date,
          end_date,
        }),
      ).rejects.toThrow(
        `No leave balance found for employee ${mockEmployeeId} in year ${currentYear}. Please contact HR to set up your leave entitlement.`,
      );
    });

    it('should reject with correct error message format for zero days remaining', async () => {
      const start_date = new Date('2024-06-03');
      const end_date = new Date('2024-06-05');
      const leave_type = 'annual';

      const mockZeroBalance = {
        id: 'balance-789',
        employee_id: mockEmployeeId,
        year: 2024,
        total_entitlement: 12,
        used_days: 12,
        remaining_days: 0,
        carryover_days: 0,
        carryover_expiry_date: null,
        last_calculated_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Mock no public holidays
      prismaService.publicHoliday.findMany.mockResolvedValue([]);

      // Mock leave balance with zero remaining
      prismaService.leaveBalance.findUnique.mockResolvedValue(mockZeroBalance);

      // Mock employee for notification
      prismaService.employee.findUnique.mockResolvedValue({
        id: mockEmployeeId,
        full_name: 'Jane Smith',
      });

      notificationService.sendNotification.mockResolvedValue({
        id: 'notif-456',
      });

      await expect(
        service.submitLeaveRequest({
          employee_id: mockEmployeeId,
          leave_type,
          start_date,
          end_date,
        }),
      ).rejects.toThrow(
        /You have no remaining leave days\. Requested: 3 days, Available: 0 days\. Total entitlement: 12 days, Used: 12 days\./,
      );
    });

    it('should reject with correct error message format for insufficient balance', async () => {
      const start_date = new Date('2024-06-03');
      const end_date = new Date('2024-06-14'); // 10 working days
      const leave_type = 'annual';

      const mockInsufficientBalance = {
        id: 'balance-123',
        employee_id: mockEmployeeId,
        year: 2024,
        total_entitlement: 12,
        used_days: 7,
        remaining_days: 5,
        carryover_days: 0,
        carryover_expiry_date: null,
        last_calculated_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Mock no public holidays
      prismaService.publicHoliday.findMany.mockResolvedValue([]);

      // Mock leave balance with insufficient days
      prismaService.leaveBalance.findUnique.mockResolvedValue(
        mockInsufficientBalance,
      );

      // Mock employee for notification
      prismaService.employee.findUnique.mockResolvedValue({
        id: mockEmployeeId,
        full_name: 'Jane Smith',
      });

      notificationService.sendNotification.mockResolvedValue({
        id: 'notif-789',
      });

      await expect(
        service.submitLeaveRequest({
          employee_id: mockEmployeeId,
          leave_type,
          start_date,
          end_date,
        }),
      ).rejects.toThrow(
        /Insufficient leave balance\. Requested: 10 days, Available: 5 days\. Total entitlement: 12 days, Used: 7 days\./,
      );
    });
  });
});
