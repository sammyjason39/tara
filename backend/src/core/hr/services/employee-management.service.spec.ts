import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { EmployeeManagementService, CreateEmployeeDto, UpdateEmployeeDto } from './employee-management.service';
import { PrismaService } from '../../../persistence/prisma.service';
import { EventBusService } from './event-bus.service';
import { CacheAsideService } from '../../../shared/cache/cache-aside.service';

describe('EmployeeManagementService', () => {
  let service: EmployeeManagementService;
  let prismaService: any;
  let eventBusService: any;

  const mockTenantId = 'tenant-123';
  const mockLocationId = 'location-123';
  const mockDepartmentId = 'dept-123';
  const mockEmployeeId = 'emp-123';

  const mockEmployee = {
    id: mockEmployeeId,
    tenant_id: mockTenantId,
    location_id: mockLocationId,
    department_id: mockDepartmentId,
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    employee_code: 'EMP001',
    positions: 'Software Engineer',
    employment_type: 'full_time',
    base_salary: 50000,
    hire_date: new Date('2024-01-01'),
    status: 'active',
    manager_id: null,
    tara_role_id: null,
    job_role_id: null,
    company_id: null,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    user_id: null,
    hourly_rate: null,
    termination_date: null,
    document_metadata: null,
    retail_id: null,
  };

  beforeEach(async () => {
    const mockPrismaService = {
      employee: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
    };

    const mockEventBusService = {
      publish: vi.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeManagementService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EventBusService,
          useValue: mockEventBusService,
        },
        CacheAsideService,
      ],
    }).compile();

    service = module.get<EmployeeManagementService>(EmployeeManagementService);
    prismaService = module.get(PrismaService);
    eventBusService = module.get(EventBusService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createEmployee', () => {
    const createData: CreateEmployeeDto = {
      tenant_id: mockTenantId,
      location_id: mockLocationId,
      department_id: mockDepartmentId,
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      employee_code: 'EMP001',
      positions: 'Software Engineer',
      hire_date: new Date('2024-01-01'),
    };

    it('should create an employee successfully', async () => {
      // Mock: no existing email or employee_code
      prismaService.employee.findFirst.mockResolvedValue(null);

      // Mock: employee creation
      prismaService.employee.create.mockResolvedValue({
        ...mockEmployee,
        departments: { id: mockDepartmentId, department_name: 'Engineering' } as any,
        tara_roles: null,
        locations: { id: mockLocationId, location_name: 'HQ' } as any,
      } as any);

      const result = await service.createEmployee(createData, 'user-123');

      expect(result).toBeDefined();
      expect(result.email).toBe(createData.email);
      expect(prismaService.employee.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: createData.email,
            employee_code: createData.employee_code,
            first_name: createData.first_name,
            last_name: createData.last_name,
          }),
          include: expect.any(Object),
        }),
      );
      expect(eventBusService.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'hr.employee.created',
          payload: expect.objectContaining({
            employee_id: mockEmployeeId,
          }),
        }),
      );
    });

    it('should throw BadRequestException when required fields are missing', async () => {
      const invalidData = {
        ...createData,
        first_name: '',
      };

      await expect(service.createEmployee(invalidData, 'user-123')).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when email already exists', async () => {
      // Mock: existing email found (stable across repeated invocations)
      prismaService.employee.findFirst.mockResolvedValue(mockEmployee as any);

      await expect(service.createEmployee(createData, 'user-123')).rejects.toThrow(ConflictException);
      await expect(service.createEmployee(createData, 'user-123')).rejects.toThrow(
        `Email ${createData.email} already exists for this tenant`,
      );
    });

    it('should throw ConflictException when employee_code already exists', async () => {
      // Mock: no existing email, but existing employee_code (stable across repeated invocations)
      prismaService.employee.findFirst.mockImplementation((args: any) =>
        Promise.resolve(args?.where?.employee_code ? (mockEmployee as any) : null),
      );

      await expect(service.createEmployee(createData, 'user-123')).rejects.toThrow(ConflictException);
      await expect(service.createEmployee(createData, 'user-123')).rejects.toThrow(
        `Employee code ${createData.employee_code} already exists for this tenant`,
      );
    });
  });

  describe('updateEmployee', () => {
    const updateData: UpdateEmployeeDto = {
      first_name: 'Jane',
      positions: 'Senior Software Engineer',
    };

    it('should update an employee successfully', async () => {
      // Mock: employee exists
      prismaService.employee.findFirst.mockResolvedValue(mockEmployee as any);

      // Mock: employee update
      const updatedEmployee = { ...mockEmployee, ...updateData };
      prismaService.employee.update.mockResolvedValue({
        ...updatedEmployee,
        departments: { id: mockDepartmentId, department_name: 'Engineering' } as any,
        tara_roles: null,
        locations: { id: mockLocationId, location_name: 'HQ' } as any,
      } as any);

      const result = await service.updateEmployee(mockEmployeeId, mockTenantId, updateData, 'user-123');

      expect(result).toBeDefined();
      expect(result.first_name).toBe(updateData.first_name);
      expect(prismaService.employee.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockEmployeeId },
          data: expect.objectContaining(updateData),
        }),
      );
      expect(eventBusService.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'hr.employee.updated',
          payload: expect.objectContaining({
            employee_id: mockEmployeeId,
            changes: expect.any(Object),
          }),
        }),
      );
    });

    it('should throw NotFoundException when employee does not exist', async () => {
      // Mock: employee not found
      prismaService.employee.findFirst.mockResolvedValue(null);

      await expect(service.updateEmployee(mockEmployeeId, mockTenantId, updateData, 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when changing email to an existing one', async () => {
      const updateDataWithEmail: UpdateEmployeeDto = {
        email: 'existing@example.com',
      };

      // Mock: employee exists
      prismaService.employee.findFirst
        .mockResolvedValueOnce(mockEmployee as any) // employee check
        .mockResolvedValueOnce({ ...mockEmployee, id: 'different-id' } as any); // email exists check

      await expect(
        service.updateEmployee(mockEmployeeId, mockTenantId, updateDataWithEmail, 'user-123'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getEmployeeById', () => {
    it('should return an employee by ID', async () => {
      // Mock: employee found
      prismaService.employee.findFirst.mockResolvedValue({
        ...mockEmployee,
        departments: { id: mockDepartmentId, department_name: 'Engineering' } as any,
        tara_roles: null,
        locations: { id: mockLocationId, location_name: 'HQ' } as any,
        job_roles: null,
      } as any);

      const result = await service.getEmployeeById(mockEmployeeId, mockTenantId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockEmployeeId);
      expect(prismaService.employee.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: mockEmployeeId,
            tenant_id: mockTenantId,
            deleted_at: null,
          }),
        }),
      );
    });

    it('should throw NotFoundException when employee does not exist', async () => {
      // Mock: employee not found
      prismaService.employee.findFirst.mockResolvedValue(null);

      await expect(service.getEmployeeById(mockEmployeeId, mockTenantId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('searchEmployees', () => {
    it('should search employees with filters', async () => {
      const filters = {
        tenant_id: mockTenantId,
        department_id: mockDepartmentId,
        status: 'active',
        page: 1,
        limit: 20,
      };

      const mockEmployees = [
        {
          ...mockEmployee,
          departments: { id: mockDepartmentId, department_name: 'Engineering' },
          tara_roles: null,
          locations: { id: mockLocationId, location_name: 'HQ' },
        },
      ];

      prismaService.employee.count.mockResolvedValue(1);
      prismaService.employee.findMany.mockResolvedValue(mockEmployees as any);

      const result = await service.searchEmployees(filters);

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(prismaService.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenant_id: mockTenantId,
            department_id: mockDepartmentId,
            status: 'active',
            deleted_at: null,
          }),
        }),
      );
    });

    it('should search employees by search term', async () => {
      const filters = {
        tenant_id: mockTenantId,
        search: 'John',
        page: 1,
        limit: 20,
      };

      prismaService.employee.count.mockResolvedValue(1);
      prismaService.employee.findMany.mockResolvedValue([mockEmployee] as any);

      const result = await service.searchEmployees(filters);

      expect(result).toBeDefined();
      expect(prismaService.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { first_name: { contains: 'John', mode: 'insensitive' } },
              { last_name: { contains: 'John', mode: 'insensitive' } },
              { email: { contains: 'John', mode: 'insensitive' } },
              { employee_code: { contains: 'John', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });
  });

  describe('deleteEmployee', () => {
    it('should soft delete an employee successfully', async () => {
      // Mock: employee exists
      prismaService.employee.findFirst.mockResolvedValue(mockEmployee as any);

      // Mock: employee soft deletion
      const deletedEmployee = { ...mockEmployee, deleted_at: new Date() };
      prismaService.employee.update.mockResolvedValue(deletedEmployee as any);

      const result = await service.deleteEmployee(mockEmployeeId, mockTenantId, 'user-123');

      expect(result).toBeDefined();
      expect(result.deleted_at).toBeDefined();
      expect(prismaService.employee.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockEmployeeId },
          data: expect.objectContaining({
            deleted_at: expect.any(Date),
          }),
        }),
      );
      expect(eventBusService.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'hr.employee.deleted',
        }),
      );
    });

    it('should throw NotFoundException when employee does not exist', async () => {
      // Mock: employee not found
      prismaService.employee.findFirst.mockResolvedValue(null);

      await expect(service.deleteEmployee(mockEmployeeId, mockTenantId, 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getEmployeesByDepartment', () => {
    it('should return employees in a department', async () => {
      const mockEmployees = [
        {
          ...mockEmployee,
          tara_roles: { id: 'role-123', role_name: 'Employee' },
        },
      ];

      prismaService.employee.findMany.mockResolvedValue(mockEmployees as any);

      const result = await service.getEmployeesByDepartment(mockDepartmentId, mockTenantId);

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(prismaService.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            department_id: mockDepartmentId,
            tenant_id: mockTenantId,
            deleted_at: null,
          }),
        }),
      );
    });
  });

  describe('getEmployeesByRole', () => {
    it('should return employees with a specific role', async () => {
      const mockRoleId = 'role-123';
      const mockEmployees = [
        {
          ...mockEmployee,
          tara_role_id: mockRoleId,
          departments: { id: mockDepartmentId, department_name: 'Engineering' },
        },
      ];

      prismaService.employee.findMany.mockResolvedValue(mockEmployees as any);

      const result = await service.getEmployeesByRole(mockRoleId, mockTenantId);

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(prismaService.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tara_role_id: mockRoleId,
            tenant_id: mockTenantId,
            deleted_at: null,
          }),
        }),
      );
    });
  });

  describe('getEmployeesByStatus', () => {
    it('should return employees with a specific status', async () => {
      const mockEmployees = [
        {
          ...mockEmployee,
          departments: { id: mockDepartmentId, department_name: 'Engineering' },
          tara_roles: { id: 'role-123', role_name: 'Employee' },
        },
      ];

      prismaService.employee.findMany.mockResolvedValue(mockEmployees as any);

      const result = await service.getEmployeesByStatus('active', mockTenantId);

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(prismaService.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'active',
            tenant_id: mockTenantId,
            deleted_at: null,
          }),
        }),
      );
    });
  });

  describe('bulkCreateEmployees', () => {
    it('should bulk create employees successfully', async () => {
      const employeesData: CreateEmployeeDto[] = [
        {
          tenant_id: mockTenantId,
          location_id: mockLocationId,
          department_id: mockDepartmentId,
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          employee_code: 'EMP001',
          positions: 'Engineer',
          hire_date: new Date('2024-01-01'),
        },
        {
          tenant_id: mockTenantId,
          location_id: mockLocationId,
          department_id: mockDepartmentId,
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane@example.com',
          employee_code: 'EMP002',
          positions: 'Manager',
          hire_date: new Date('2024-01-01'),
        },
      ];

      // Mock: no existing employees
      prismaService.employee.findFirst.mockResolvedValue(null);

      // Mock: successful creations
      prismaService.employee.create
        .mockResolvedValueOnce({
          ...mockEmployee,
          email: 'john@example.com',
          employee_code: 'EMP001',
          departments: {} as any,
          tara_roles: null,
          locations: {} as any,
        } as any)
        .mockResolvedValueOnce({
          ...mockEmployee,
          id: 'emp-456',
          email: 'jane@example.com',
          employee_code: 'EMP002',
          departments: {} as any,
          tara_roles: null,
          locations: {} as any,
        } as any);

      const result = await service.bulkCreateEmployees(employeesData, mockTenantId, 'user-123');

      expect(result.created).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle errors during bulk creation', async () => {
      const employeesData: CreateEmployeeDto[] = [
        {
          tenant_id: mockTenantId,
          location_id: mockLocationId,
          department_id: mockDepartmentId,
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          employee_code: 'EMP001',
          positions: 'Engineer',
          hire_date: new Date('2024-01-01'),
        },
        {
          tenant_id: mockTenantId,
          location_id: mockLocationId,
          department_id: mockDepartmentId,
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'john@example.com', // Duplicate email
          employee_code: 'EMP002',
          positions: 'Manager',
          hire_date: new Date('2024-01-01'),
        },
      ];

      // Mock: first succeeds, second has duplicate email
      prismaService.employee.findFirst
        .mockResolvedValueOnce(null) // no existing email for first
        .mockResolvedValueOnce(null) // no existing code for first
        .mockResolvedValueOnce({ ...mockEmployee, email: 'john@example.com' } as any); // duplicate email for second

      prismaService.employee.create.mockResolvedValueOnce({
        ...mockEmployee,
        email: 'john@example.com',
        departments: {} as any,
        tara_roles: null,
        locations: {} as any,
      } as any);

      const result = await service.bulkCreateEmployees(employeesData, mockTenantId, 'user-123');

      expect(result.created).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('already exists');
    });
  });

  describe('Supervisor Assignment Logic', () => {
    it('should create employee with manager_id (supervisor assignment)', async () => {
      const managerId = 'manager-123';
      const createData: CreateEmployeeDto = {
        tenant_id: mockTenantId,
        location_id: mockLocationId,
        department_id: mockDepartmentId,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        employee_code: 'EMP001',
        positions: 'Software Engineer',
        hire_date: new Date('2024-01-01'),
        manager_id: managerId,
      };

      prismaService.employee.findFirst.mockResolvedValue(null);
      prismaService.employee.create.mockResolvedValue({
        ...mockEmployee,
        manager_id: managerId,
        departments: { id: mockDepartmentId, department_name: 'Engineering' } as any,
        tara_roles: null,
        locations: { id: mockLocationId, location_name: 'HQ' } as any,
      } as any);

      const result = await service.createEmployee(createData, 'user-123');

      expect(result.manager_id).toBe(managerId);
      expect(prismaService.employee.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            manager_id: managerId,
          }),
        }),
      );
    });

    it('should update employee supervisor assignment', async () => {
      const newManagerId = 'new-manager-456';
      const updateData: UpdateEmployeeDto = {
        manager_id: newManagerId,
      };

      prismaService.employee.findFirst.mockResolvedValue(mockEmployee as any);
      const updatedEmployee = { ...mockEmployee, manager_id: newManagerId };
      prismaService.employee.update.mockResolvedValue({
        ...updatedEmployee,
        departments: { id: mockDepartmentId, department_name: 'Engineering' } as any,
        tara_roles: null,
        locations: { id: mockLocationId, location_name: 'HQ' } as any,
      } as any);

      const result = await service.updateEmployee(mockEmployeeId, mockTenantId, updateData, 'user-123');

      expect(result.manager_id).toBe(newManagerId);
      expect(eventBusService.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            changes: expect.objectContaining({
              manager_id: expect.any(Object),
            }),
          }),
        }),
      );
    });

    it('should allow creating employee without supervisor', async () => {
      const createData: CreateEmployeeDto = {
        tenant_id: mockTenantId,
        location_id: mockLocationId,
        department_id: mockDepartmentId,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        employee_code: 'EMP001',
        positions: 'CEO',
        hire_date: new Date('2024-01-01'),
        // No manager_id - top-level employee
      };

      prismaService.employee.findFirst.mockResolvedValue(null);
      prismaService.employee.create.mockResolvedValue({
        ...mockEmployee,
        manager_id: null,
        departments: { id: mockDepartmentId, department_name: 'Executive' } as any,
        tara_roles: null,
        locations: { id: mockLocationId, location_name: 'HQ' } as any,
      } as any);

      const result = await service.createEmployee(createData, 'user-123');

      expect(result.manager_id).toBeNull();
    });

    it('should remove supervisor assignment when set to null', async () => {
      const employeeWithManager = { ...mockEmployee, manager_id: 'manager-123' };
      const updateData: UpdateEmployeeDto = {
        manager_id: null as any,
      };

      prismaService.employee.findFirst.mockResolvedValue(employeeWithManager as any);
      const updatedEmployee = { ...employeeWithManager, manager_id: null };
      prismaService.employee.update.mockResolvedValue({
        ...updatedEmployee,
        departments: { id: mockDepartmentId, department_name: 'Engineering' } as any,
        tara_roles: null,
        locations: { id: mockLocationId, location_name: 'HQ' } as any,
      } as any);

      const result = await service.updateEmployee(mockEmployeeId, mockTenantId, updateData, 'user-123');

      expect(result.manager_id).toBeNull();
    });
  });

  describe('Advanced Search and Filtering', () => {
    it('should filter employees by multiple criteria simultaneously', async () => {
      const filters = {
        tenant_id: mockTenantId,
        department_id: mockDepartmentId,
        tara_role_id: 'role-123',
        status: 'active',
        employment_type: 'full_time',
        page: 1,
        limit: 20,
      };

      const mockEmployees = [
        {
          ...mockEmployee,
          tara_role_id: 'role-123',
          employment_type: 'full_time',
          departments: { id: mockDepartmentId, department_name: 'Engineering' },
          tara_roles: { id: 'role-123', role_name: 'Developer' },
          locations: { id: mockLocationId, location_name: 'HQ' },
        },
      ];

      prismaService.employee.count.mockResolvedValue(1);
      prismaService.employee.findMany.mockResolvedValue(mockEmployees as any);

      const result = await service.searchEmployees(filters);

      expect(result.data).toHaveLength(1);
      expect(prismaService.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenant_id: mockTenantId,
            department_id: mockDepartmentId,
            tara_role_id: 'role-123',
            status: 'active',
            employment_type: 'full_time',
            deleted_at: null,
          }),
        }),
      );
    });

    it('should search by employee code', async () => {
      const filters = {
        tenant_id: mockTenantId,
        search: 'EMP001',
        page: 1,
        limit: 20,
      };

      const mockEmployees = [
        {
          ...mockEmployee,
          employee_code: 'EMP001',
          departments: { id: mockDepartmentId, department_name: 'Engineering' },
          tara_roles: null,
          locations: { id: mockLocationId, location_name: 'HQ' },
        },
      ];

      prismaService.employee.count.mockResolvedValue(1);
      prismaService.employee.findMany.mockResolvedValue(mockEmployees as any);

      const result = await service.searchEmployees(filters);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].employee_code).toBe('EMP001');
    });

    it('should handle empty search results', async () => {
      const filters = {
        tenant_id: mockTenantId,
        search: 'NonExistent',
        page: 1,
        limit: 20,
      };

      prismaService.employee.count.mockResolvedValue(0);
      prismaService.employee.findMany.mockResolvedValue([]);

      const result = await service.searchEmployees(filters);

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should handle pagination correctly', async () => {
      const filters = {
        tenant_id: mockTenantId,
        page: 2,
        limit: 10,
      };

      prismaService.employee.count.mockResolvedValue(25);
      prismaService.employee.findMany.mockResolvedValue([mockEmployee] as any);

      const result = await service.searchEmployees(filters);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(25);
      expect(prismaService.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10, // (page 2 - 1) * 10
          take: 10,
        }),
      );
    });

    it('should use default pagination when not specified', async () => {
      const filters = {
        tenant_id: mockTenantId,
      };

      prismaService.employee.count.mockResolvedValue(5);
      prismaService.employee.findMany.mockResolvedValue([mockEmployee] as any);

      const result = await service.searchEmployees(filters);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should filter by employment type', async () => {
      const filters = {
        tenant_id: mockTenantId,
        employment_type: 'part_time',
        page: 1,
        limit: 20,
      };

      const mockEmployees = [
        {
          ...mockEmployee,
          employment_type: 'part_time',
          departments: { id: mockDepartmentId, department_name: 'Support' },
          tara_roles: null,
          locations: { id: mockLocationId, location_name: 'HQ' },
        },
      ];

      prismaService.employee.count.mockResolvedValue(1);
      prismaService.employee.findMany.mockResolvedValue(mockEmployees as any);

      const result = await service.searchEmployees(filters);

      expect(result.data[0].employment_type).toBe('part_time');
      expect(prismaService.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            employment_type: 'part_time',
          }),
        }),
      );
    });
  });

  describe('Employee Validation Edge Cases', () => {
    it('should reject employee creation with empty first_name', async () => {
      const invalidData: CreateEmployeeDto = {
        tenant_id: mockTenantId,
        location_id: mockLocationId,
        department_id: mockDepartmentId,
        first_name: '',
        last_name: 'Doe',
        email: 'test@example.com',
        employee_code: 'EMP001',
        positions: 'Engineer',
        hire_date: new Date('2024-01-01'),
      };

      await expect(service.createEmployee(invalidData, 'user-123')).rejects.toThrow(BadRequestException);
    });

    it('should reject employee creation with empty last_name', async () => {
      const invalidData: CreateEmployeeDto = {
        tenant_id: mockTenantId,
        location_id: mockLocationId,
        department_id: mockDepartmentId,
        first_name: 'John',
        last_name: '',
        email: 'test@example.com',
        employee_code: 'EMP001',
        positions: 'Engineer',
        hire_date: new Date('2024-01-01'),
      };

      await expect(service.createEmployee(invalidData, 'user-123')).rejects.toThrow(BadRequestException);
    });

    it('should reject employee creation with empty email', async () => {
      const invalidData: CreateEmployeeDto = {
        tenant_id: mockTenantId,
        location_id: mockLocationId,
        department_id: mockDepartmentId,
        first_name: 'John',
        last_name: 'Doe',
        email: '',
        employee_code: 'EMP001',
        positions: 'Engineer',
        hire_date: new Date('2024-01-01'),
      };

      await expect(service.createEmployee(invalidData, 'user-123')).rejects.toThrow(BadRequestException);
    });

    it('should reject employee creation with empty employee_code', async () => {
      const invalidData: CreateEmployeeDto = {
        tenant_id: mockTenantId,
        location_id: mockLocationId,
        department_id: mockDepartmentId,
        first_name: 'John',
        last_name: 'Doe',
        email: 'test@example.com',
        employee_code: '',
        positions: 'Engineer',
        hire_date: new Date('2024-01-01'),
      };

      await expect(service.createEmployee(invalidData, 'user-123')).rejects.toThrow(BadRequestException);
    });

    it('should allow email uniqueness within different tenants', async () => {
      const createData: CreateEmployeeDto = {
        tenant_id: 'tenant-456', // Different tenant
        location_id: mockLocationId,
        department_id: mockDepartmentId,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        employee_code: 'EMP001',
        positions: 'Engineer',
        hire_date: new Date('2024-01-01'),
      };

      // Mock: email exists in different tenant (should not conflict)
      prismaService.employee.findFirst.mockResolvedValue(null);
      prismaService.employee.create.mockResolvedValue({
        ...mockEmployee,
        tenant_id: 'tenant-456',
        departments: {} as any,
        tara_roles: null,
        locations: {} as any,
      } as any);

      const result = await service.createEmployee(createData, 'user-123');

      expect(result).toBeDefined();
      expect(prismaService.employee.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenant_id: 'tenant-456',
            email: 'john.doe@example.com',
          }),
        }),
      );
    });
  });
});
