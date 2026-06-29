import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { GeoFenceOverrideService } from './geo-fence-override.service';
import { PrismaService } from '../../../persistence/prisma.service';
import { AuditService } from '../../../shared/audit/audit.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

/**
 * Unit tests for GeoFenceOverrideService
 * 
 * Tests cover:
 * - Requirement 23.10: Manual geo-fence override by HR team
 * - Requirement 23.11: Logging override reason and authorizing HR personnel
 * - Task 10.4: Implement geo-fence override mechanism
 */
describe('GeoFenceOverrideService', () => {
  let service: GeoFenceOverrideService;
  let prismaService: PrismaService;
  let auditService: AuditService;

  const mockPrismaService = {
    $transaction: jest.fn(),
    attendance: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    employee: {
      findFirst: jest.fn(),
    },
    auditLog: {
      findMany: jest.fn(),
    },
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeoFenceOverrideService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<GeoFenceOverrideService>(GeoFenceOverrideService);
    prismaService = module.get<PrismaService>(PrismaService);
    auditService = module.get<AuditService>(AuditService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('approveOverride', () => {
    const tenantId = 'tenant-123';
    const attendanceId = 'attendance-456';
    const hrUserId = 'hr-789';
    const overrideReason = 'Employee is on approved business travel to client site';
    const ipAddress = '192.168.1.1';
    const userAgent = 'Mozilla/5.0';

    const mockAttendance = {
      id: attendanceId,
      employee_id: 'emp-123',
      attendance_date: new Date('2024-01-15'),
      clock_in_time: new Date('2024-01-15T09:00:00Z'),
      clock_out_time: null,
      override_reason: null,
      override_by: null,
      employee: {
        id: 'emp-123',
        full_name: 'John Doe',
        employee_code: 'EMP001',
        tenant_id: tenantId,
      },
      office_location: {
        id: 'office-123',
        name: 'Jakarta HQ',
      },
    };

    const mockHrUser = {
      id: hrUserId,
      full_name: 'HR Manager',
      employee_code: 'HR001',
      tenant_id: tenantId,
      status: 'active',
      deleted_at: null,
    };

    it('should successfully approve an override with all required fields', async () => {
      // Setup transaction mock
      const mockTransaction = {
        attendance: {
          findFirst: jest.fn().mockResolvedValue(mockAttendance),
          update: jest.fn().mockResolvedValue({
            ...mockAttendance,
            override_reason: overrideReason,
            override_by: hrUserId,
          }),
        },
        employee: {
          findFirst: jest.fn().mockResolvedValue(mockHrUser),
        },
      };

      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback(mockTransaction),
      );

      const result = await service.approveOverride(
        tenantId,
        attendanceId,
        hrUserId,
        overrideReason,
        ipAddress,
        userAgent,
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('John Doe');
      expect(result.attendance.override_reason).toBe(overrideReason);
      expect(result.attendance.override_by).toBe(hrUserId);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: tenantId,
          user_id: hrUserId,
          module: 'HR_ATTENDANCE',
          action: 'GEO_FENCE_OVERRIDE_APPROVED',
          entity_type: 'ATTENDANCE',
          entity_id: attendanceId,
          metadata: expect.objectContaining({
            employee_id: 'emp-123',
            override_reason: overrideReason,
            hr_user_id: hrUserId,
          }),
        }),
        expect.anything(),
      );
    });

    it('should throw BadRequestException if override reason is empty', async () => {
      await expect(
        service.approveOverride(
          tenantId,
          attendanceId,
          hrUserId,
          '',
          ipAddress,
          userAgent,
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.approveOverride(
          tenantId,
          attendanceId,
          hrUserId,
          '   ',
          ipAddress,
          userAgent,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if override reason exceeds 500 characters', async () => {
      const longReason = 'a'.repeat(501);

      await expect(
        service.approveOverride(
          tenantId,
          attendanceId,
          hrUserId,
          longReason,
          ipAddress,
          userAgent,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if attendance record not found', async () => {
      const mockTransaction = {
        attendance: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
        employee: {
          findFirst: jest.fn(),
        },
      };

      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback(mockTransaction),
      );

      await expect(
        service.approveOverride(
          tenantId,
          attendanceId,
          hrUserId,
          overrideReason,
          ipAddress,
          userAgent,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if attendance already has an override', async () => {
      const attendanceWithOverride = {
        ...mockAttendance,
        override_by: 'another-hr-user',
      };

      const mockTransaction = {
        attendance: {
          findFirst: jest.fn().mockResolvedValue(attendanceWithOverride),
        },
        employee: {
          findFirst: jest.fn(),
        },
      };

      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback(mockTransaction),
      );

      await expect(
        service.approveOverride(
          tenantId,
          attendanceId,
          hrUserId,
          overrideReason,
          ipAddress,
          userAgent,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if HR user not found', async () => {
      const mockTransaction = {
        attendance: {
          findFirst: jest.fn().mockResolvedValue(mockAttendance),
        },
        employee: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      };

      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback(mockTransaction),
      );

      await expect(
        service.approveOverride(
          tenantId,
          attendanceId,
          hrUserId,
          overrideReason,
          ipAddress,
          userAgent,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should log override details in audit trail with before/after state', async () => {
      const mockTransaction = {
        attendance: {
          findFirst: jest.fn().mockResolvedValue(mockAttendance),
          update: jest.fn().mockResolvedValue({
            ...mockAttendance,
            override_reason: overrideReason,
            override_by: hrUserId,
          }),
        },
        employee: {
          findFirst: jest.fn().mockResolvedValue(mockHrUser),
        },
      };

      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback(mockTransaction),
      );

      await service.approveOverride(
        tenantId,
        attendanceId,
        hrUserId,
        overrideReason,
        ipAddress,
        userAgent,
      );

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          changes: {
            override_reason: {
              before: null,
              after: overrideReason,
            },
            override_by: {
              before: null,
              after: hrUserId,
            },
          },
          before_state: {
            override_reason: null,
            override_by: null,
          },
          after_state: {
            override_reason: overrideReason,
            override_by: hrUserId,
          },
          ip_address: ipAddress,
          user_agent: userAgent,
          severity: 'WARN',
        }),
        expect.anything(),
      );
    });
  });

  describe('getPendingOverrides', () => {
    const tenantId = 'tenant-123';

    it('should retrieve pending overrides without filters', async () => {
      const mockRecords = [
        {
          id: 'att-1',
          employee_id: 'emp-1',
          attendance_date: new Date('2024-01-15'),
          override_reason: null,
          override_by: null,
          employee: {
            id: 'emp-1',
            full_name: 'John Doe',
            employee_code: 'EMP001',
          },
          office_location: {
            id: 'office-123',
            name: 'Jakarta HQ',
          },
        },
      ];

      mockPrismaService.attendance.findMany.mockResolvedValue(mockRecords);
      mockPrismaService.attendance.count.mockResolvedValue(1);

      const result = await service.getPendingOverrides(tenantId);

      expect(result.records).toEqual(mockRecords);
      expect(result.total).toBe(1);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it('should filter by employee_id when provided', async () => {
      mockPrismaService.attendance.findMany.mockResolvedValue([]);
      mockPrismaService.attendance.count.mockResolvedValue(0);

      await service.getPendingOverrides(tenantId, { employee_id: 'emp-123' });

      expect(mockPrismaService.attendance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            employee_id: 'emp-123',
          }),
        }),
      );
    });

    it('should filter by date range when provided', async () => {
      mockPrismaService.attendance.findMany.mockResolvedValue([]);
      mockPrismaService.attendance.count.mockResolvedValue(0);

      await service.getPendingOverrides(tenantId, {
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(mockPrismaService.attendance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            attendance_date: {
              gte: new Date('2024-01-01'),
              lte: new Date('2024-01-31'),
            },
          }),
        }),
      );
    });

    it('should apply pagination limits', async () => {
      mockPrismaService.attendance.findMany.mockResolvedValue([]);
      mockPrismaService.attendance.count.mockResolvedValue(100);

      const result = await service.getPendingOverrides(tenantId, {
        limit: 10,
        offset: 20,
      });

      expect(result.limit).toBe(10);
      expect(result.offset).toBe(20);
      expect(mockPrismaService.attendance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        }),
      );
    });
  });

  describe('getOverrideHistory', () => {
    const tenantId = 'tenant-123';

    it('should retrieve override history for tenant', async () => {
      const mockAuditLogs = [
        {
          id: 'audit-1',
          tenant_id: tenantId,
          action_type: 'GEO_FENCE_OVERRIDE_APPROVED',
          target_entity_id: 'att-1',
          target_entity_type: 'ATTENDANCE',
          changes: {
            employee_id: 'emp-123',
          },
          actor: {
            id: 'hr-123',
            full_name: 'HR Manager',
            employee_code: 'HR001',
          },
          created_at: new Date(),
        },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(mockAuditLogs);

      const result = await service.getOverrideHistory(tenantId);

      expect(result).toEqual(mockAuditLogs);
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenant_id: tenantId,
            action_type: 'GEO_FENCE_OVERRIDE_APPROVED',
          }),
        }),
      );
    });

    it('should filter by attendance_id when provided', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      await service.getOverrideHistory(tenantId, undefined, 'att-123');

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            target_entity_id: 'att-123',
            target_entity_type: 'ATTENDANCE',
          }),
        }),
      );
    });

    it('should filter by employee_id when provided', async () => {
      const mockAuditLogs = [
        {
          id: 'audit-1',
          changes: {
            employee_id: 'emp-123',
          },
        },
        {
          id: 'audit-2',
          changes: {
            employee_id: 'emp-456',
          },
        },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(mockAuditLogs);

      const result = await service.getOverrideHistory(tenantId, 'emp-123');

      expect(result).toHaveLength(1);
      expect((result[0] as any).changes.employee_id).toBe('emp-123');
    });
  });
});
