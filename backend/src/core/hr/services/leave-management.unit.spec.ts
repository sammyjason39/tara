/**
 * Task 12.7: Unit Tests for Leave Management
 * 
 * Test Coverage:
 * - Leave request with insufficient balance rejection
 * - Supervisor notification sending
 * - Multiple leave types (annual, sick, emergency)
 * - Weekend and public holiday exclusion from total_days
 * 
 * Requirements: 1.1, 1.2, 1.5, 1.6, 1.7
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { PrismaService } from '../../../persistence/prisma.service';
import { EventBusService } from './event-bus.service';
import { NotificationService } from './notification.service';
import { LeaveRequestAgent } from '../agents/leave-request.agent';
import { CacheAsideService } from '../../../shared/cache/cache-aside.service';

describe('Task 12.7: Leave Management Unit Tests', () => {
  let service: LeaveService;
  let prismaService: any;
  let eventBusService: any;
  let notificationService: any;
  let mockPrismaService: any;

  beforeEach(async () => {
    // Create a comprehensive prisma mock - keep reference for test access
    mockPrismaService = {
      leaveBalance: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      leaveRequest: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      publicHoliday: {
        findMany: vi.fn().mockResolvedValue([]), // Default to no holidays
      },
      employee: {
        findUnique: vi.fn(),
      },
      $transaction: vi.fn((callback) => {
        // Execute callback immediately with mock prisma
        return callback(mockPrismaService);
      }),
    };

    const mockEventBusService = {
      emit: vi.fn().mockResolvedValue({ id: 'event-mock' }),
    };

    const mockNotificationService = {
      sendNotification: vi.fn().mockResolvedValue({ id: 'notif-mock' }),
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
    prismaService = mockPrismaService; // Use our mock reference directly
    eventBusService = module.get(EventBusService);
    notificationService = module.get(NotificationService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test 1: Leave request with insufficient balance rejection
   * 
   * Requirements:
   * - 1.1: Validate request against employee's leave balance
   * - 1.5: Reject request if it exceeds employee's leave balance
   * - 1.5: Notify employee with reason including balance information
   */
  describe('Test 1: Leave request with insufficient balance rejection', () => {
    const employeeId = 'emp-001';
    const currentYear = new Date().getFullYear();

    it('should reject leave request when requested days exceed remaining balance', async () => {
      // Arrange
      const leaveBalance = {
        id: 'balance-001',
        employee_id: employeeId,
        year: currentYear,
        total_entitlement: 12,
        used_days: 10,
        remaining_days: 2, // Only 2 days remaining
        carryover_days: 0,
        carryover_expiry_date: null,
        last_calculated_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      const employee = {
        id: employeeId,
        full_name: 'John Doe',
      };

      // Reset and configure mocks for this test
      vi.clearAllMocks();
      prismaService.publicHoliday.findMany.mockResolvedValue([]);
      prismaService.leaveBalance.findUnique.mockResolvedValue(leaveBalance);
      prismaService.employee.findUnique.mockResolvedValue(employee);
      notificationService.sendNotification.mockResolvedValue({ id: 'notif-001' });

      // Act & Assert - Requesting 5 days when only 2 remaining
      await expect(
        service.submitLeaveRequest({
          employee_id: employeeId,
          leave_type: 'annual',
          start_date: new Date('2025-01-06'), // Monday
          end_date: new Date('2025-01-10'),   // Friday (5 working days)
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.submitLeaveRequest({
          employee_id: employeeId,
          leave_type: 'annual',
          start_date: new Date('2025-01-06'),
          end_date: new Date('2025-01-10'),
        }),
      ).rejects.toThrow(/Insufficient leave balance/);

      // Verify notification was sent with balance details
      expect(notificationService.sendNotification).toHaveBeenCalledWith({
        recipient_id: employeeId,
        type: 'leave_request_rejected',
        visibility: 'private',
        title: expect.stringContaining('Insufficient Balance'),
        content: expect.stringContaining('Requested Days: 5'),
        metadata: {
          reason: 'insufficient_balance',
          requested_days: 5,
          available_days: 2,
          total_entitlement: 12,
          used_days: 10,
          carryover_days: 0,
          year: currentYear,
        },
      });

      // Verify leave request was NOT created
      expect(prismaService.leaveRequest.create).not.toHaveBeenCalled();
    });

    it('should include detailed balance information in rejection notification', async () => {
      // Arrange
      const leaveBalance = {
        id: 'balance-002',
        employee_id: employeeId,
        year: currentYear,
        total_entitlement: 15,
        used_days: 8,
        remaining_days: 7, // 7 days remaining
        carryover_days: 0,
        carryover_expiry_date: null,
        last_calculated_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      const employee = {
        id: employeeId,
        full_name: 'Jane Smith',
      };

      prismaService.publicHoliday.findMany.mockResolvedValue([]);
      prismaService.leaveBalance.findUnique.mockResolvedValue(leaveBalance);
      prismaService.employee.findUnique.mockResolvedValue(employee);
      notificationService.sendNotification.mockResolvedValue({ id: 'notif-002' });

      // Act - Request 10 days when only 7 remaining
      try {
        await service.submitLeaveRequest({
          employee_id: employeeId,
          leave_type: 'annual',
          start_date: new Date('2025-01-06'), // Monday
          end_date: new Date('2025-01-17'),   // Friday (10 working days)
        });
      } catch (error) {
        // Expected to throw
      }

      // Assert - Verify notification content includes balance breakdown
      const notificationCall = notificationService.sendNotification.mock.calls[0][0];
      expect(notificationCall.content).toContain('Requested Days: 10');
      expect(notificationCall.content).toContain('Available Days: 7');
      expect(notificationCall.content).toContain('Total Entitlement: 15 days');
      expect(notificationCall.content).toContain('Used Days: 8 days');
      expect(notificationCall.content).toContain('Please adjust your leave request to 7 day(s) or less');
    });
  });

  /**
   * Test 2: Supervisor notification sending
   * 
   * Requirements:
   * - 1.2: Notify supervisor for approval within 5 minutes (via event emission)
   * - Event emission triggers Leave Request Agent which handles supervisor notification
   */
  describe('Test 2: Supervisor notification sending via event emission', () => {
    const employeeId = 'emp-002';
    const supervisorId = 'sup-001';
    const currentYear = new Date().getFullYear();

    it('should emit leave.request.submitted event for supervisor notification', async () => {
      // Arrange
      const leaveBalance = {
        id: 'balance-003',
        employee_id: employeeId,
        year: currentYear,
        total_entitlement: 12,
        used_days: 2,
        remaining_days: 10,
        carryover_days: 0,
        carryover_expiry_date: null,
        last_calculated_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      const createdRequest = {
        id: 'request-001',
        employee_id: employeeId,
        leave_type: 'annual',
        start_date: new Date('2025-01-06'),
        end_date: new Date('2025-01-08'),
        total_days: 3,
        reason: 'Family vacation',
        status: 'pending',
        submitted_at: new Date(),
        approved_by: null,
        approved_at: null,
        rejection_reason: null,
        created_at: new Date(),
        updated_at: new Date(),
        employee: {
          id: employeeId,
          employee_code: 'EMP002',
          full_name: 'Alice Johnson',
          email: 'alice@example.com',
          department_id: 'dept-001',
        },
      };

      prismaService.publicHoliday.findMany.mockResolvedValue([]);
      prismaService.leaveBalance.findUnique.mockResolvedValue(leaveBalance);
      prismaService.leaveRequest.create.mockResolvedValue(createdRequest);
      eventBusService.emit.mockResolvedValue({ id: 'event-001' });

      // Act
      const result = await service.submitLeaveRequest({
        employee_id: employeeId,
        leave_type: 'annual',
        start_date: new Date('2025-01-06'),
        end_date: new Date('2025-01-08'),
        reason: 'Family vacation',
      });

      // Assert - Verify event was emitted for Leave Request Agent
      expect(eventBusService.emit).toHaveBeenCalledWith({
        event_type: 'leave.request.submitted',
        event_version: '1.0',
        actor: {
          id: employeeId,
          type: 'employee',
        },
        entity: {
          id: 'request-001',
          type: 'leave_request',
        },
        payload: expect.objectContaining({
          employee_id: employeeId,
          employee_name: 'Alice Johnson',
          leave_type: 'annual',
          total_days: 3,
          reason: 'Family vacation',
          status: 'pending',
        }),
        metadata: expect.objectContaining({
          department_id: 'dept-001',
          current_balance: 10,
        }),
      });

      expect(result).toEqual(createdRequest);
    });

    it('should include employee and department information in event for supervisor routing', async () => {
      // Arrange
      const leaveBalance = {
        id: 'balance-004',
        employee_id: employeeId,
        year: currentYear,
        total_entitlement: 12,
        used_days: 0,
        remaining_days: 12,
        carryover_days: 0,
        carryover_expiry_date: null,
        last_calculated_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      const createdRequest = {
        id: 'request-002',
        employee_id: employeeId,
        leave_type: 'sick',
        start_date: new Date('2025-01-13'),
        end_date: new Date('2025-01-14'),
        total_days: 2,
        reason: 'Medical appointment',
        status: 'pending',
        submitted_at: new Date(),
        approved_by: null,
        approved_at: null,
        rejection_reason: null,
        created_at: new Date(),
        updated_at: new Date(),
        employee: {
          id: employeeId,
          employee_code: 'EMP002',
          full_name: 'Alice Johnson',
          email: 'alice@example.com',
          department_id: 'dept-hr',
        },
      };

      prismaService.publicHoliday.findMany.mockResolvedValue([]);
      prismaService.leaveBalance.findUnique.mockResolvedValue(leaveBalance);
      prismaService.leaveRequest.create.mockResolvedValue(createdRequest);
      eventBusService.emit.mockResolvedValue({ id: 'event-002' });

      // Act
      await service.submitLeaveRequest({
        employee_id: employeeId,
        leave_type: 'sick',
        start_date: new Date('2025-01-13'),
        end_date: new Date('2025-01-14'),
        reason: 'Medical appointment',
      });

      // Assert - Verify event includes department for supervisor routing
      const emitCall = eventBusService.emit.mock.calls[0][0];
      expect(emitCall.metadata).toHaveProperty('department_id', 'dept-hr');
      expect(emitCall.payload).toHaveProperty('employee_name', 'Alice Johnson');
    });
  });

  /**
   * Test 3: Multiple leave types support
   * 
   * Requirements:
   * - 1.6: Support multiple leave types including Annual, Sick, and Emergency leave
   * - 1.7: Record leave type in leave request
   */
  describe('Test 3: Multiple leave types (annual, sick, emergency)', () => {
    const employeeId = 'emp-003';
    const currentYear = new Date().getFullYear();

    const setupMocks = (leaveType: string) => {
      const leaveBalance = {
        id: 'balance-005',
        employee_id: employeeId,
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

      const createdRequest = {
        id: `request-${leaveType}`,
        employee_id: employeeId,
        leave_type: leaveType,
        start_date: new Date('2025-01-20'),
        end_date: new Date('2025-01-22'),
        total_days: 3,
        reason: `${leaveType} leave reason`,
        status: 'pending',
        submitted_at: new Date(),
        approved_by: null,
        approved_at: null,
        rejection_reason: null,
        created_at: new Date(),
        updated_at: new Date(),
        employee: {
          id: employeeId,
          employee_code: 'EMP003',
          full_name: 'Bob Wilson',
          email: 'bob@example.com',
          department_id: 'dept-sales',
        },
      };

      prismaService.publicHoliday.findMany.mockResolvedValue([]);
      prismaService.leaveBalance.findUnique.mockResolvedValue(leaveBalance);
      prismaService.leaveRequest.create.mockResolvedValue(createdRequest);
      eventBusService.emit.mockResolvedValue({ id: `event-${leaveType}` });
    };

    it('should support annual leave type', async () => {
      // Arrange
      setupMocks('annual');

      // Act
      const result = await service.submitLeaveRequest({
        employee_id: employeeId,
        leave_type: 'annual',
        start_date: new Date('2025-01-20'),
        end_date: new Date('2025-01-22'),
        reason: 'annual leave reason',
      });

      // Assert
      expect(prismaService.leaveRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            leave_type: 'annual',
          }),
        }),
      );
      expect(result.leave_type).toBe('annual');
      expect(eventBusService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            leave_type: 'annual',
          }),
        }),
      );
    });

    it('should support sick leave type', async () => {
      // Arrange
      setupMocks('sick');

      // Act
      const result = await service.submitLeaveRequest({
        employee_id: employeeId,
        leave_type: 'sick',
        start_date: new Date('2025-01-20'),
        end_date: new Date('2025-01-22'),
        reason: 'sick leave reason',
      });

      // Assert
      expect(prismaService.leaveRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            leave_type: 'sick',
          }),
        }),
      );
      expect(result.leave_type).toBe('sick');
      expect(eventBusService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            leave_type: 'sick',
          }),
        }),
      );
    });

    it('should support emergency leave type', async () => {
      // Arrange
      setupMocks('emergency');

      // Act
      const result = await service.submitLeaveRequest({
        employee_id: employeeId,
        leave_type: 'emergency',
        start_date: new Date('2025-01-20'),
        end_date: new Date('2025-01-22'),
        reason: 'emergency leave reason',
      });

      // Assert
      expect(prismaService.leaveRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            leave_type: 'emergency',
          }),
        }),
      );
      expect(result.leave_type).toBe('emergency');
      expect(eventBusService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            leave_type: 'emergency',
          }),
        }),
      );
    });

    it('should process all leave types with same balance validation logic', async () => {
      // Arrange - Insufficient balance scenario for all leave types
      const insufficientBalance = {
        id: 'balance-006',
        employee_id: employeeId,
        year: currentYear,
        total_entitlement: 12,
        used_days: 11,
        remaining_days: 1, // Only 1 day remaining
        carryover_days: 0,
        carryover_expiry_date: null,
        last_calculated_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      const employee = {
        id: employeeId,
        full_name: 'Bob Wilson',
      };

      prismaService.publicHoliday.findMany.mockResolvedValue([]);
      prismaService.leaveBalance.findUnique.mockResolvedValue(insufficientBalance);
      prismaService.employee.findUnique.mockResolvedValue(employee);
      notificationService.sendNotification.mockResolvedValue({ id: 'notif-003' });

      const leaveTypes = ['annual', 'sick', 'emergency'];

      for (const leaveType of leaveTypes) {
        vi.clearAllMocks();

        // Act & Assert - All leave types should validate balance
        await expect(
          service.submitLeaveRequest({
            employee_id: employeeId,
            leave_type: leaveType,
            start_date: new Date('2025-01-20'), // Monday
            end_date: new Date('2025-01-22'),   // Wednesday (3 days)
          }),
        ).rejects.toThrow(BadRequestException);

        // Verify balance validation occurred for this leave type
        expect(prismaService.leaveBalance.findUnique).toHaveBeenCalled();
        expect(notificationService.sendNotification).toHaveBeenCalled();
      }
    });
  });

  /**
   * Test 4: Weekend and public holiday exclusion from total_days
   * 
   * Requirements:
   * - 1.7: Calculate total_days excluding weekends (Saturday, Sunday)
   * - 1.7: Calculate total_days excluding public holidays
   * - Accurate working day calculation for leave balance deduction
   */
  describe('Test 4: Weekend and public holiday exclusion from total_days', () => {
    const employeeId = 'emp-004';
    const currentYear = new Date().getFullYear();

    const leaveBalance = {
      id: 'balance-007',
      employee_id: employeeId,
      year: currentYear,
      total_entitlement: 12,
      used_days: 2,
      remaining_days: 10,
      carryover_days: 0,
      carryover_expiry_date: null,
      last_calculated_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should exclude Saturdays and Sundays from total_days calculation', async () => {
      // Arrange - Leave spanning Monday to Sunday (includes weekend)
      const start_date = new Date('2025-01-06'); // Monday
      const end_date = new Date('2025-01-12');   // Sunday

      prismaService.publicHoliday.findMany.mockResolvedValue([]);
      prismaService.leaveBalance.findUnique.mockResolvedValue(leaveBalance);

      const createdRequest = {
        id: 'request-weekend',
        employee_id: employeeId,
        leave_type: 'annual',
        start_date,
        end_date,
        total_days: 5, // Monday to Friday only (excludes Sat & Sun)
        reason: 'Vacation',
        status: 'pending',
        submitted_at: new Date(),
        approved_by: null,
        approved_at: null,
        rejection_reason: null,
        created_at: new Date(),
        updated_at: new Date(),
        employee: {
          id: employeeId,
          employee_code: 'EMP004',
          full_name: 'Charlie Brown',
          email: 'charlie@example.com',
          department_id: 'dept-ops',
        },
      };

      prismaService.leaveRequest.create.mockResolvedValue(createdRequest);
      eventBusService.emit.mockResolvedValue({ id: 'event-weekend' });

      // Act
      const result = await service.submitLeaveRequest({
        employee_id: employeeId,
        leave_type: 'annual',
        start_date,
        end_date,
        reason: 'Vacation',
      });

      // Assert - Total days should be 5 (Mon-Fri), not 7
      expect(prismaService.leaveRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            total_days: 5, // Excludes Saturday (Jan 11) and Sunday (Jan 12)
          }),
        }),
      );
      expect(result.total_days).toBe(5);
    });

    it('should exclude public holidays from total_days calculation', async () => {
      // Arrange - Leave spanning Monday to Friday with a public holiday on Wednesday
      const start_date = new Date('2025-01-06'); // Monday
      const end_date = new Date('2025-01-10');   // Friday

      const publicHolidays = [
        {
          id: 'holiday-001',
          holiday_date: new Date('2025-01-08'), // Wednesday
          holiday_name: 'National Holiday',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      prismaService.publicHoliday.findMany.mockResolvedValue(publicHolidays);
      prismaService.leaveBalance.findUnique.mockResolvedValue(leaveBalance);

      const createdRequest = {
        id: 'request-holiday',
        employee_id: employeeId,
        leave_type: 'annual',
        start_date,
        end_date,
        total_days: 4, // Mon, Tue, Thu, Fri (excludes Wed holiday)
        reason: 'Vacation with holiday',
        status: 'pending',
        submitted_at: new Date(),
        approved_by: null,
        approved_at: null,
        rejection_reason: null,
        created_at: new Date(),
        updated_at: new Date(),
        employee: {
          id: employeeId,
          employee_code: 'EMP004',
          full_name: 'Charlie Brown',
          email: 'charlie@example.com',
          department_id: 'dept-ops',
        },
      };

      prismaService.leaveRequest.create.mockResolvedValue(createdRequest);
      eventBusService.emit.mockResolvedValue({ id: 'event-holiday' });

      // Act
      const result = await service.submitLeaveRequest({
        employee_id: employeeId,
        leave_type: 'annual',
        start_date,
        end_date,
        reason: 'Vacation with holiday',
      });

      // Assert - Total days should be 4 (excludes Wednesday holiday)
      expect(prismaService.publicHoliday.findMany).toHaveBeenCalledWith({
        where: {
          is_active: true,
          holiday_date: {
            gte: start_date,
            lte: end_date,
          },
        },
      });

      expect(prismaService.leaveRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            total_days: 4, // Excludes Wednesday public holiday
          }),
        }),
      );
      expect(result.total_days).toBe(4);
    });

    it('should exclude both weekends and public holidays from total_days', async () => {
      // Arrange - Leave spanning 2 weeks with public holiday and weekends
      const start_date = new Date('2025-01-06'); // Monday
      const end_date = new Date('2025-01-17');   // Friday

      const publicHolidays = [
        {
          id: 'holiday-002',
          holiday_date: new Date('2025-01-08'), // Wednesday week 1
          holiday_name: 'Mid-Week Holiday',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'holiday-003',
          holiday_date: new Date('2025-01-15'), // Wednesday week 2
          holiday_name: 'Another Holiday',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      prismaService.publicHoliday.findMany.mockResolvedValue(publicHolidays);
      prismaService.leaveBalance.findUnique.mockResolvedValue(leaveBalance);

      const createdRequest = {
        id: 'request-combined',
        employee_id: employeeId,
        leave_type: 'annual',
        start_date,
        end_date,
        // Week 1: Mon, Tue, Thu, Fri (4 days - excludes Wed holiday + Sat/Sun)
        // Week 2: Mon, Tue, Thu, Fri (4 days - excludes Wed holiday + Sat/Sun)
        // Total: 8 working days
        total_days: 8,
        reason: 'Extended vacation',
        status: 'pending',
        submitted_at: new Date(),
        approved_by: null,
        approved_at: null,
        rejection_reason: null,
        created_at: new Date(),
        updated_at: new Date(),
        employee: {
          id: employeeId,
          employee_code: 'EMP004',
          full_name: 'Charlie Brown',
          email: 'charlie@example.com',
          department_id: 'dept-ops',
        },
      };

      prismaService.leaveRequest.create.mockResolvedValue(createdRequest);
      eventBusService.emit.mockResolvedValue({ id: 'event-combined' });

      // Act
      const result = await service.submitLeaveRequest({
        employee_id: employeeId,
        leave_type: 'annual',
        start_date,
        end_date,
        reason: 'Extended vacation',
      });

      // Assert - Should exclude 4 weekend days (2 Saturdays + 2 Sundays) and 2 holidays
      // Total 12 calendar days - 4 weekend days - 2 holidays = 8 working days
      expect(result.total_days).toBe(8);
      expect(prismaService.leaveRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            total_days: 8,
          }),
        }),
      );
    });

    it('should reject leave request spanning only weekends (0 working days)', async () => {
      // Arrange - Leave only on Saturday and Sunday
      const start_date = new Date('2025-01-11'); // Saturday
      const end_date = new Date('2025-01-12');   // Sunday

      prismaService.publicHoliday.findMany.mockResolvedValue([]);

      // Act & Assert
      await expect(
        service.submitLeaveRequest({
          employee_id: employeeId,
          leave_type: 'annual',
          start_date,
          end_date,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.submitLeaveRequest({
          employee_id: employeeId,
          leave_type: 'annual',
          start_date,
          end_date,
        }),
      ).rejects.toThrow(/must span at least one working day/);

      // Verify balance was not checked since no working days
      expect(prismaService.leaveBalance.findUnique).not.toHaveBeenCalled();
      expect(prismaService.leaveRequest.create).not.toHaveBeenCalled();
    });

    it('should handle inactive public holidays correctly (not excluded)', async () => {
      // Arrange - Leave with an inactive public holiday (should be counted as working day)
      const start_date = new Date('2025-01-06'); // Monday
      const end_date = new Date('2025-01-10');   // Friday

      const publicHolidays = [
        {
          id: 'holiday-inactive',
          holiday_date: new Date('2025-01-08'), // Wednesday
          holiday_name: 'Inactive Holiday',
          is_active: false, // Inactive holiday should NOT be excluded
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      // Mock returns empty array because is_active: false is filtered
      prismaService.publicHoliday.findMany.mockResolvedValue([]);
      prismaService.leaveBalance.findUnique.mockResolvedValue(leaveBalance);

      const createdRequest = {
        id: 'request-inactive-holiday',
        employee_id: employeeId,
        leave_type: 'annual',
        start_date,
        end_date,
        total_days: 5, // All 5 weekdays (inactive holiday not excluded)
        reason: 'Test inactive holiday',
        status: 'pending',
        submitted_at: new Date(),
        approved_by: null,
        approved_at: null,
        rejection_reason: null,
        created_at: new Date(),
        updated_at: new Date(),
        employee: {
          id: employeeId,
          employee_code: 'EMP004',
          full_name: 'Charlie Brown',
          email: 'charlie@example.com',
          department_id: 'dept-ops',
        },
      };

      prismaService.leaveRequest.create.mockResolvedValue(createdRequest);
      eventBusService.emit.mockResolvedValue({ id: 'event-inactive' });

      // Act
      const result = await service.submitLeaveRequest({
        employee_id: employeeId,
        leave_type: 'annual',
        start_date,
        end_date,
        reason: 'Test inactive holiday',
      });

      // Assert - Should count all 5 weekdays (inactive holiday not excluded)
      expect(prismaService.publicHoliday.findMany).toHaveBeenCalledWith({
        where: {
          is_active: true, // Only active holidays are queried
          holiday_date: {
            gte: start_date,
            lte: end_date,
          },
        },
      });

      expect(result.total_days).toBe(5);
    });

    it('should correctly calculate single working day', async () => {
      // Arrange - Single day leave (Monday)
      const start_date = new Date('2025-01-06'); // Monday
      const end_date = new Date('2025-01-06');   // Same Monday

      prismaService.publicHoliday.findMany.mockResolvedValue([]);
      prismaService.leaveBalance.findUnique.mockResolvedValue(leaveBalance);

      const createdRequest = {
        id: 'request-single-day',
        employee_id: employeeId,
        leave_type: 'sick',
        start_date,
        end_date,
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
          id: employeeId,
          employee_code: 'EMP004',
          full_name: 'Charlie Brown',
          email: 'charlie@example.com',
          department_id: 'dept-ops',
        },
      };

      prismaService.leaveRequest.create.mockResolvedValue(createdRequest);
      eventBusService.emit.mockResolvedValue({ id: 'event-single' });

      // Act
      const result = await service.submitLeaveRequest({
        employee_id: employeeId,
        leave_type: 'sick',
        start_date,
        end_date,
        reason: 'Medical appointment',
      });

      // Assert
      expect(result.total_days).toBe(1);
    });
  });
});
