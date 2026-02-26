import { Injectable } from "@nestjs/common";
import { IHRRepository } from "./repositories/hr.repository.interface";
import { Employee } from "./entities/employee.entity";
import { Attendance } from "./entities/attendance.entity";
import { LeaveRequest } from "./entities/leave-request.entity";
import { Payroll } from "./entities/payroll.entity";
import { Department } from "./entities/department.entity";
import { JobRequisition } from "./entities/requisition.entity";
import { PerformanceCycle } from "./entities/performance-cycle.entity";
import { PerformanceReview } from "./entities/performance-review.entity";
import { HRCase } from "./entities/hr-case.entity";
import { Contract } from "./entities/contract.entity";

import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";
import { CreateLeaveRequestDto } from "./dto/create-leave-request.dto";
import { CreateDepartmentDto } from "./dto/create-department.dto";
import { CreateRequisitionDto } from "./dto/create-requisition.dto";
import { CreatePerformanceCycleDto } from "./dto/create-performance-cycle.dto";
import { SubmitReviewDto } from "./dto/submit-review.dto";
import { CreateCaseDto } from "./dto/create-case.dto";
import { CreateContractDto } from "./dto/create-contract.dto";

import { FileProcessingService } from "../../shared/file-processing/file-processing.service";
import { AuditService } from "../../shared/audit/audit.service";

/**
 * HR Service
 * Business logic layer for HR operations
 *
 * CRITICAL: All methods require tenantId as the first argument
 */
@Injectable()
export class HRService {
  constructor(
    private readonly hrRepository: IHRRepository,
    private readonly fileProcessingService: FileProcessingService,
    private readonly auditService: AuditService,
  ) {}

  // Employee Management
  async getEmployees(
    tenantId: string,
    locationId?: string,
  ): Promise<Employee[]> {
    return this.hrRepository.getEmployees(tenantId, locationId);
  }

  async getGlobalEmployees(locationId?: string): Promise<Employee[]> {
    return this.hrRepository.getGlobalEmployees(locationId);
  }

  async getEmployeeById(
    tenantId: string,
    employeeId: string,
  ): Promise<Employee | null> {
    return this.hrRepository.getEmployeeById(tenantId, employeeId);
  }

  async getGlobalEmployeeById(employeeId: string): Promise<Employee | null> {
    return this.hrRepository.getGlobalEmployeeById(employeeId);
  }

  async createEmployee(
    tenantId: string,
    data: CreateEmployeeDto,
    userId?: string,
  ): Promise<Employee> {
    const employee = await this.hrRepository.createEmployee(tenantId, data);
    if (userId) {
      await this.auditService.log({
        tenantId,
        userId,
        module: "hr",
        action: "CREATE",
        entityType: "EMPLOYEE",
        entityId: employee.id,
        metadata: {
          firstName: employee.firstName,
          lastName: employee.lastName,
          role: employee.roleTitle,
        },
      });
    }
    return employee;
  }

  async updateEmployee(
    tenantId: string,
    employeeId: string,
    data: UpdateEmployeeDto,
    userId?: string,
  ): Promise<Employee> {
    const employee = await this.hrRepository.updateEmployee(
      tenantId,
      employeeId,
      data,
    );
    if (userId) {
      await this.auditService.log({
        tenantId,
        userId,
        module: "hr",
        action: "UPDATE",
        entityType: "EMPLOYEE",
        entityId: employee.id,
        metadata: { updates: data },
      });
    }
    return employee;
  }

  async deactivateEmployee(
    tenantId: string,
    employeeId: string,
    userId?: string,
  ): Promise<Employee> {
    const employee = await this.hrRepository.deactivateEmployee(
      tenantId,
      employeeId,
    );
    if (userId) {
      await this.auditService.log({
        tenantId,
        userId,
        module: "hr",
        action: "DEACTIVATE",
        entityType: "EMPLOYEE",
        entityId: employee.id,
      });
    }
    return employee;
  }

  /**
   * Bulk import employees from file (CSV/Excel)
   */
  async importEmployees(
    tenantId: string,
    buffer: Buffer,
    fileType: "csv" | "xlsx",
    userId: string,
  ): Promise<{ imported: number; errors: any[] }> {
    const { data, errors } =
      fileType === "csv"
        ? await this.fileProcessingService.parseCsv(buffer, CreateEmployeeDto)
        : await this.fileProcessingService.parseExcel(
            buffer,
            CreateEmployeeDto,
          );

    if (errors.length > 0) {
      return { imported: 0, errors };
    }

    let importedCount = 0;
    for (const employeeData of data) {
      // Ensure tenantId is set for creation if repo doesn't handle it automagically
      await this.createEmployee(tenantId, employeeData, userId);
      importedCount++;
    }

    await this.auditService.log({
      tenantId,
      userId,
      module: "hr",
      action: "IMPORT",
      entityType: "EMPLOYEE",
      entityId: "bulk-import",
      metadata: { count: importedCount, fileType },
    });

    return { imported: importedCount, errors: [] };
  }

  /**
   * Export Employee list to Excel
   */
  async exportEmployees(tenantId: string, userId: string): Promise<Buffer> {
    const employees = await this.getEmployees(tenantId);

    const columns = [
      { header: "Employee ID", key: "id", width: 15 },
      { header: "First Name", key: "firstName", width: 20 },
      { header: "Last Name", key: "lastName", width: 20 },
      { header: "Email", key: "email", width: 30 },
      { header: "Role", key: "role", width: 15 },
      { header: "Department", key: "department", width: 20 },
      { header: "Designation", key: "designation", width: 20 },
      { header: "Joined Date", key: "joinedAt", width: 20 },
      { header: "Status", key: "status", width: 10 },
    ];

    return this.fileProcessingService.generateExcel(employees, columns, {
      traceId: `HR-${tenantId}-${userId}-${Date.now()}`,
      watermark: { text: "ZENVIX CONFIDENTIAL" },
    });
  }

  // Attendance Management
  async getAttendance(
    tenantId: string,
    locationId?: string,
    employeeId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<Attendance[]> {
    return this.hrRepository.getAttendance(
      tenantId,
      locationId,
      employeeId,
      startDate,
      endDate,
    );
  }

  async getGlobalAttendance(
    employeeId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<Attendance[]> {
    return this.hrRepository.getGlobalAttendance(
      employeeId,
      startDate,
      endDate,
    );
  }

  async clockIn(
    tenantId: string,
    employeeId: string,
    locationId: string,
  ): Promise<Attendance> {
    return this.hrRepository.clockIn(tenantId, employeeId, locationId);
  }

  async clockOut(tenantId: string, employeeId: string): Promise<Attendance> {
    return this.hrRepository.clockOut(tenantId, employeeId);
  }

  // Leave Management
  async getLeaveRequests(
    tenantId: string,
    locationId?: string,
    status?: string,
    employeeId?: string,
  ): Promise<LeaveRequest[]> {
    return this.hrRepository.getLeaveRequests(
      tenantId,
      locationId,
      status,
      employeeId,
    );
  }

  async getGlobalLeaveRequests(
    status?: string,
    employeeId?: string,
  ): Promise<LeaveRequest[]> {
    return this.hrRepository.getGlobalLeaveRequests(status, employeeId);
  }

  async createLeaveRequest(
    tenantId: string,
    data: CreateLeaveRequestDto,
  ): Promise<LeaveRequest> {
    return this.hrRepository.createLeaveRequest(tenantId, data);
  }

  async approveLeaveRequest(
    tenantId: string,
    requestId: string,
    reviewerId: string,
    notes?: string,
  ): Promise<LeaveRequest> {
    return this.hrRepository.approveLeaveRequest(
      tenantId,
      requestId,
      reviewerId,
      notes,
    );
  }

  async rejectLeaveRequest(
    tenantId: string,
    requestId: string,
    reviewerId: string,
    notes: string,
  ): Promise<LeaveRequest> {
    return this.hrRepository.rejectLeaveRequest(
      tenantId,
      requestId,
      reviewerId,
      notes,
    );
  }

  // Payroll Management
  async getPayroll(
    tenantId: string,
    locationId?: string,
    employeeId?: string,
    period?: string,
  ): Promise<Payroll[]> {
    return this.hrRepository.getPayroll(
      tenantId,
      locationId,
      employeeId,
      period,
    );
  }

  async getGlobalPayroll(
    employeeId: string,
    period?: string,
  ): Promise<Payroll[]> {
    return this.hrRepository.getGlobalPayroll(employeeId, period);
  }

  async calculatePayroll(
    tenantId: string,
    employeeId: string,
    period: string,
  ): Promise<Payroll> {
    return this.hrRepository.calculatePayroll(tenantId, employeeId, period);
  }

  // Organization Management
  async getDepartments(tenantId: string): Promise<Department[]> {
    return this.hrRepository.getDepartments(tenantId);
  }

  async getGlobalDepartments(): Promise<Department[]> {
    return this.hrRepository.getGlobalDepartments();
  }

  async getDepartmentById(
    tenantId: string,
    departmentId: string,
  ): Promise<Department | null> {
    return this.hrRepository.getDepartmentById(tenantId, departmentId);
  }

  async createDepartment(
    tenantId: string,
    data: CreateDepartmentDto,
  ): Promise<Department> {
    return this.hrRepository.createDepartment(tenantId, data);
  }

  // Recruitment Management
  async getRequisitions(
    tenantId: string,
    status?: string,
  ): Promise<JobRequisition[]> {
    return this.hrRepository.getRequisitions(tenantId, status);
  }

  async getGlobalRequisitions(status?: string): Promise<JobRequisition[]> {
    return this.hrRepository.getGlobalRequisitions(status);
  }

  async createRequisition(
    tenantId: string,
    data: CreateRequisitionDto,
  ): Promise<JobRequisition> {
    return this.hrRepository.createRequisition(tenantId, data);
  }

  async updateRequisition(
    tenantId: string,
    id: string,
    data: Partial<JobRequisition>,
  ): Promise<JobRequisition> {
    return this.hrRepository.updateRequisition(tenantId, id, data);
  }

  // Performance Management
  async getPerformanceCycles(tenantId: string): Promise<PerformanceCycle[]> {
    return this.hrRepository.getPerformanceCycles(tenantId);
  }

  async createPerformanceCycle(
    tenantId: string,
    data: CreatePerformanceCycleDto,
  ): Promise<PerformanceCycle> {
    return this.hrRepository.createPerformanceCycle(tenantId, data);
  }

  async updatePerformanceCycle(
    tenantId: string,
    id: string,
    data: Partial<PerformanceCycle>,
  ): Promise<PerformanceCycle> {
    return this.hrRepository.updatePerformanceCycle(tenantId, id, data);
  }

  async getPerformanceReviews(
    tenantId: string,
    cycleId?: string,
    employeeId?: string,
  ): Promise<PerformanceReview[]> {
    return this.hrRepository.getPerformanceReviews(
      tenantId,
      cycleId,
      employeeId,
    );
  }

  async getGlobalPerformanceReviews(
    cycleId?: string,
    employeeId?: string,
  ): Promise<PerformanceReview[]> {
    return this.hrRepository.getGlobalPerformanceReviews(cycleId, employeeId);
  }

  async submitPerformanceReview(
    tenantId: string,
    data: SubmitReviewDto,
  ): Promise<PerformanceReview> {
    return this.hrRepository.submitPerformanceReview(tenantId, data);
  }

  // Case Management
  async getCases(
    tenantId: string,
    locationId?: string,
    status?: string,
  ): Promise<HRCase[]> {
    return this.hrRepository.getCases(tenantId, locationId, status);
  }

  async getCaseById(tenantId: string, id: string): Promise<HRCase | null> {
    return this.hrRepository.getCaseById(tenantId, id);
  }

  async createCase(tenantId: string, data: CreateCaseDto): Promise<HRCase> {
    return this.hrRepository.createCase(tenantId, data);
  }

  async updateCase(
    tenantId: string,
    id: string,
    data: Partial<HRCase>,
  ): Promise<HRCase> {
    return this.hrRepository.updateCase(tenantId, id, data);
  }

  // Contract Management
  async getContracts(
    tenantId: string,
    locationId?: string,
    employeeId?: string,
  ): Promise<Contract[]> {
    return this.hrRepository.getContracts(tenantId, locationId, employeeId);
  }

  async getGlobalContracts(employeeId?: string): Promise<Contract[]> {
    return this.hrRepository.getGlobalContracts(employeeId);
  }

  async createContract(
    tenantId: string,
    data: CreateContractDto,
  ): Promise<Contract> {
    return this.hrRepository.createContract(tenantId, data);
  }

  async updateContract(
    tenantId: string,
    id: string,
    data: Partial<Contract>,
  ): Promise<Contract> {
    return this.hrRepository.updateContract(tenantId, id, data);
  }

  // Location Management
  async getLocations(tenantId: string): Promise<any[]> {
    return this.hrRepository.getLocations(tenantId);
  }
}
