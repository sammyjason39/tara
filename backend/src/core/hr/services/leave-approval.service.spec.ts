import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { PrismaService } from '../../../persistence/prisma.service';
import { EventBusService } from './event-bus.service';
import { NotificationService } from './notification.service';
import { LeaveRequestAgent } from '../agents/leave-request.agent';
import { CacheAsideService } from '../../../shared/cache/cache-aside.service';

/**
 * Unit tests for Leave Approval Workflow
 * 
 * Tests:
 * - approveLeaveRequest() method
 * - rejectLeaveRequest() method
 * - Balance updates on approval
 * - Event emissions
 * - Error handling
 * 
 * Requirements: 1.3, 1.4, 1.5
 * Task: 12.3
 */
describe('LeaveService - Approval Workflow', () => {
  let service: LeaveService;
  let prismaService: PrismaService;
  let eventBusService: EventBusService;
  let notificationService: NotificationService;

  // Mock data
  const mockEmployeeId = 'emp-123';
  const mockApproverId = 'approver-456';
  const mockLeaveRequestId = 'leave-req-789';
  const currentYear = new Date().getFullYear();

  const mockLeaveRequest = {
    id: mockLeaveRequestId,
    employee_id: mockEmployeeId,
    leave_type: 'annual',
    start_date: new Date('2024-02-01'),
    end_date: new Date('2024-02-05'),
    total_days: 5,
    reason: 'Family vacation',
    status: 'pending',
    submitted_at: new Date('2024-01-15'),
    approved_by: null,
    approved_at: null,
    rejection_reason: null,
    employee: {
      id: mockEmployeeId,
      employee_code: 'EMP001',
      full_name: 'John Doe',
      email: 'john.doe@company.com',
      department_id: 'dept-1',
    },
  };

  const mockLeaveBalance = {
    id: 'balance-1',
    employee_id: mockEmployeeId,
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaveService,
        {
          provide: PrismaService,
          useValue: {
            leaveRequest: {
              findUnique: vi.fn(),
              update: vi.fn(),
            },
            leaveBalance: {
              update: vi.fn(),
            },
            $transaction: vi.fn(),
          },
        },
        {
          provide: EventBusService,
          useValue: {
            emit: vi.fn(),
          },
        },
        {
          provide: NotificationService,
          useValue: {
            sendNotification: vi.fn(),
          },
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
    prismaService = module.get<PrismaService>(PrismaService);
    eventBusService = module.get<EventBusService>(EventBusService);
    notificationService = module.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('approveLeaveRequest', () => {
    it('should approve a pending leave request successfully', async () => {
      // Arrange
      const updatedRequest = {
        ...mockLeaveRequest,
        status: 'approved',
        approved_by: mockApproverId,
        approved_at: new Date(),
        approver: {
          id: mockApproverId,
          full_name: 'Manager Smith',
        },
      };

      const updatedBalance = {
        ...mockLeaveBalance,
        remaining_days: 4,
        used_days: 8,
      };

      vi.spyOn(prismaService.leaveRequest, 'findUnique').mockResolvedValue(mockLeaveRequest as any);
      vi.spyOn(prismaService, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          leaveBalance: {
            update: vi.fn().mockResolvedValue(updatedBalance),
          },
          leaveRequest: {
            update: vi.fn().mockResolvedValue(updatedRequest),
          },
        });
      });
      vi.spyOn(eventBusService, 'emit').mockResolvedValue(undefined);

      // Act
      const result = await service.approveLeaveRequest(mockLeaveRequestId, mockApproverId);

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe('approved');
      expect(result.approved_by).toBe(mockApproverId);
      expect(result.approved_at).toBeDefined();
      expect(eventBusService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'leave.request.approved',
          entity: { id: mockLeaveRequestId, type: 'leave_request' },
        }),
      );
    });

    it('should throw BadRequestException if leave request not found', async () => {
      // Arrange
      vi.spyOn(prismaService.leaveRequest, 'findUnique').mockResolvedValue(null);

      // Act & Assert
      await expect(service.approveLeaveRequest(mockLeaveRequestId, mockApproverId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.approveLeaveRequest(mockLeaveRequestId, mockApproverId)).rejects.toThrow(
        `Leave request not found: ${mockLeaveRequestId}`,
      );
    });

    it('should throw BadRequestException if leave request is already approved', async () => {
      // Arrange
      const approvedRequest = { ...mockLeaveRequest, status: 'approved' };
      vi.spyOn(prismaService.leaveRequest, 'findUnique').mockResolvedValue(approvedRequest as any);

      // Act & Assert
      await expect(service.approveLeaveRequest(mockLeaveRequestId, mockApproverId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.approveLeaveRequest(mockLeaveRequestId, mockApproverId)).rejects.toThrow(
        `Leave request ${mockLeaveRequestId} is already approved`,
      );
    });

    it('should throw BadRequestException if leave request is already rejected', async () => {
      // Arrange
      const rejectedRequest = { ...mockLeaveRequest, status: 'rejected' };
      vi.spyOn(prismaService.leaveRequest, 'findUnique').mockResolvedValue(rejectedRequest as any);

      // Act & Assert
      await expect(service.approveLeaveRequest(mockLeaveRequestId, mockApproverId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should update leave balance atomically with decrement and increment', async () => {
      // Arrange
      const updatedRequest = {
        ...mockLeaveRequest,
        status: 'approved',
        approved_by: mockApproverId,
        approved_at: new Date(),
        approver: { id: mockApproverId, full_name: 'Manager' },
      };

      const updatedBalance = {
        ...mockLeaveBalance,
        remaining_days: 4,
        used_days: 8,
      };

      const mockBalanceUpdate = vi.fn().mockResolvedValue(updatedBalance);
      const mockRequestUpdate = vi.fn().mockResolvedValue(updatedRequest);

      vi.spyOn(prismaService.leaveRequest, 'findUnique').mockResolvedValue(mockLeaveRequest as any);
      vi.spyOn(prismaService, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          leaveBalance: { update: mockBalanceUpdate },
          leaveRequest: { update: mockRequestUpdate },
        });
      });
      vi.spyOn(eventBusService, 'emit').mockResolvedValue(undefined);

      // Act
      await service.approveLeaveRequest(mockLeaveRequestId, mockApproverId);

      // Assert
      expect(mockBalanceUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            employee_id_year: {
              employee_id: mockEmployeeId,
              year: currentYear,
            },
          },
          data: expect.objectContaining({
            remaining_days: { decrement: 5 },
            used_days: { increment: 5 },
          }),
        }),
      );
    });

    it('should emit leave.request.approved event to Event Bus', async () => {
      // Arrange
      const updatedRequest = {
        ...mockLeaveRequest,
        status: 'approved',
        approved_by: mockApproverId,
        approved_at: new Date(),
        approver: { id: mockApproverId, full_name: 'Manager Smith' },
      };

      const updatedBalance = {
        ...mockLeaveBalance,
        remaining_days: 4,
        used_days: 8,
      };

      vi.spyOn(prismaService.leaveRequest, 'findUnique').mockResolvedValue(mockLeaveRequest as any);
      vi.spyOn(prismaService, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          leaveBalance: { update: vi.fn().mockResolvedValue(updatedBalance) },
          leaveRequest: { update: vi.fn().mockResolvedValue(updatedRequest) },
        });
      });
      vi.spyOn(eventBusService, 'emit').mockResolvedValue(undefined);

      // Act
      await service.approveLeaveRequest(mockLeaveRequestId, mockApproverId);

      // Assert
      expect(eventBusService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'leave.request.approved',
          event_version: '1.0',
          actor: { id: mockApproverId, type: 'employee' },
          entity: { id: mockLeaveRequestId, type: 'leave_request' },
          payload: expect.objectContaining({
            leave_request_id: mockLeaveRequestId,
            employee_id: mockEmployeeId,
            approved_by: mockApproverId,
            remaining_balance: 4,
            used_days: 8,
          }),
        }),
      );
    });

    it('should continue approval even if event emission fails', async () => {
      // Arrange
      const updatedRequest = {
        ...mockLeaveRequest,
        status: 'approved',
        approved_by: mockApproverId,
        approved_at: new Date(),
        approver: { id: mockApproverId, full_name: 'Manager' },
      };

      const updatedBalance = { ...mockLeaveBalance, remaining_days: 4, used_days: 8 };

      vi.spyOn(prismaService.leaveRequest, 'findUnique').mockResolvedValue(mockLeaveRequest as any);
      vi.spyOn(prismaService, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          leaveBalance: { update: vi.fn().mockResolvedValue(updatedBalance) },
          leaveRequest: { update: vi.fn().mockResolvedValue(updatedRequest) },
        });
      });
      vi.spyOn(eventBusService, 'emit').mockRejectedValue(new Error('Event bus unavailable'));

      // Act
      const result = await service.approveLeaveRequest(mockLeaveRequestId, mockApproverId);

      // Assert - approval should succeed even though event emission failed
      expect(result).toBeDefined();
      expect(result.status).toBe('approved');
    });

    it('should send confirmation notification to employee on approval', async () => {
      // Arrange
      const updatedRequest = {
        ...mockLeaveRequest,
        status: 'approved',
        approved_by: mockApproverId,
        approved_at: new Date(),
        approver: { id: mockApproverId, full_name: 'Manager Smith' },
      };

      const updatedBalance = { ...mockLeaveBalance, remaining_days: 4, used_days: 8 };

      vi.spyOn(prismaService.leaveRequest, 'findUnique').mockResolvedValue(mockLeaveRequest as any);
      vi.spyOn(prismaService, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          leaveBalance: { update: vi.fn().mockResolvedValue(updatedBalance) },
          leaveRequest: { update: vi.fn().mockResolvedValue(updatedRequest) },
        });
      });
      vi.spyOn(eventBusService, 'emit').mockResolvedValue(undefined);
      const sendNotificationSpy = vi.spyOn(notificationService, 'sendNotification').mockResolvedValue(undefined);

      // Act
      await service.approveLeaveRequest(mockLeaveRequestId, mockApproverId);

      // Assert
      expect(sendNotificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient_id: mockEmployeeId,
          type: 'leave_approval',
          visibility: 'private',
          title: '✅ Leave Request Approved',
          metadata: expect.objectContaining({
            leave_request_id: mockLeaveRequestId,
            approved_by: mockApproverId,
          }),
        }),
      );
    });

    it('should continue approval even if notification sending fails', async () => {
      // Arrange
      const updatedRequest = {
        ...mockLeaveRequest,
        status: 'approved',
        approved_by: mockApproverId,
        approved_at: new Date(),
        approver: { id: mockApproverId, full_name: 'Manager' },
      };

      const updatedBalance = { ...mockLeaveBalance, remaining_days: 4, used_days: 8 };

      vi.spyOn(prismaService.leaveRequest, 'findUnique').mockResolvedValue(mockLeaveRequest as any);
      vi.spyOn(prismaService, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          leaveBalance: { update: vi.fn().mockResolvedValue(updatedBalance) },
          leaveRequest: { update: vi.fn().mockResolvedValue(updatedRequest) },
        });
      });
      vi.spyOn(eventBusService, 'emit').mockResolvedValue(undefined);
      vi.spyOn(notificationService, 'sendNotification').mockRejectedValue(new Error('Notification service unavailable'));

      // Act
      const result = await service.approveLeaveRequest(mockLeaveRequestId, mockApproverId);

      // Assert - approval should succeed even though notification sending failed
      expect(result).toBeDefined();
      expect(result.status).toBe('approved');
    });
  });

  describe('rejectLeaveRequest', () => {
    it('should reject a pending leave request successfully', async () => {
      // Arrange
      const rejectionReason = 'Insufficient staffing during requested period';
      const updatedRequest = {
        ...mockLeaveRequest,
        status: 'rejected',
        approved_by: mockApproverId, // Stores who rejected it
        approved_at: new Date(),
        rejection_reason: rejectionReason,
        approver: {
          id: mockApproverId,
          full_name: 'Manager Smith',
        },
      };

      vi.spyOn(prismaService.leaveRequest, 'findUnique').mockResolvedValue(mockLeaveRequest as any);
      vi.spyOn(prismaService.leaveRequest, 'update').mockResolvedValue(updatedRequest as any);
      vi.spyOn(eventBusService, 'emit').mockResolvedValue(undefined);

      // Act
      const result = await service.rejectLeaveRequest(
        mockLeaveRequestId,
        mockApproverId,
        rejectionReason,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe('rejected');
      expect(result.rejection_reason).toBe(rejectionReason);
      expect(result.approved_by).toBe(mockApproverId);
      expect(eventBusService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'leave.request.rejected',
        }),
      );
    });

    it('should throw BadRequestException if leave request not found', async () => {
      // Arrange
      vi.spyOn(prismaService.leaveRequest, 'findUnique').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.rejectLeaveRequest(mockLeaveRequestId, mockApproverId, 'Some reason'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if leave request is already processed', async () => {
      // Arrange
      const approvedRequest = { ...mockLeaveRequest, status: 'approved' };
      vi.spyOn(prismaService.leaveRequest, 'findUnique').mockResolvedValue(approvedRequest as any);

      // Act & Assert
      await expect(
        service.rejectLeaveRequest(mockLeaveRequestId, mockApproverId, 'Some reason'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should emit leave.request.rejected event to Event Bus', async () => {
      // Arrange
      const rejectionReason = 'Team capacity constraints';
      const updatedRequest = {
        ...mockLeaveRequest,
        status: 'rejected',
        approved_by: mockApproverId,
        approved_at: new Date(),
        rejection_reason: rejectionReason,
        approver: { id: mockApproverId, full_name: 'Manager Smith' },
      };

      vi.spyOn(prismaService.leaveRequest, 'findUnique').mockResolvedValue(mockLeaveRequest as any);
      vi.spyOn(prismaService.leaveRequest, 'update').mockResolvedValue(updatedRequest as any);
      vi.spyOn(eventBusService, 'emit').mockResolvedValue(undefined);

      // Act
      await service.rejectLeaveRequest(mockLeaveRequestId, mockApproverId, rejectionReason);

      // Assert
      expect(eventBusService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'leave.request.rejected',
          event_version: '1.0',
          actor: { id: mockApproverId, type: 'employee' },
          entity: { id: mockLeaveRequestId, type: 'leave_request' },
          payload: expect.objectContaining({
            leave_request_id: mockLeaveRequestId,
            employee_id: mockEmployeeId,
            rejected_by: mockApproverId,
            rejection_reason: rejectionReason,
          }),
        }),
      );
    });

    it('should not update leave balance on rejection', async () => {
      // Arrange
      const rejectionReason = 'Some reason';
      const updatedRequest = {
        ...mockLeaveRequest,
        status: 'rejected',
        approved_by: mockApproverId,
        approved_at: new Date(),
        rejection_reason: rejectionReason,
        approver: { id: mockApproverId, full_name: 'Manager' },
      };

      const balanceUpdateSpy = vi.spyOn(prismaService.leaveBalance, 'update');
      vi.spyOn(prismaService.leaveRequest, 'findUnique').mockResolvedValue(mockLeaveRequest as any);
      vi.spyOn(prismaService.leaveRequest, 'update').mockResolvedValue(updatedRequest as any);
      vi.spyOn(eventBusService, 'emit').mockResolvedValue(undefined);

      // Act
      await service.rejectLeaveRequest(mockLeaveRequestId, mockApproverId, rejectionReason);

      // Assert - balance should NOT be updated on rejection
      expect(balanceUpdateSpy).not.toHaveBeenCalled();
    });
  });
});

