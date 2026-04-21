import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { IHRRepository } from "./repositories/hr.repository.interface";
import { ContractGeneratorService, ContractType } from "./contract-generator.service";
import { PrismaService } from "../../persistence/prisma.service";
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
import { Candidate } from "./entities/candidate.entity";
import { Position } from "./entities/position.entity";
import { Compensation } from "./entities/compensation.entity";
import { Interview } from "./entities/interview.entity";
import { TalentLead } from "./entities/talent-lead.entity";
import { IngestTalentLeadDto } from "./dto/ingest-talent-lead.dto";
import { EVENT_NAMES } from "./events/event-names";

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
import { LoggerService } from "../../shared/logger/logger.service";
import { EventBusService } from "../../shared/events/event-bus.service";
import { NotificationService } from "../../shared/comms/notification.service";

/**
 * HR Service
 * Business logic layer for HR operations
 *
 * CRITICAL: All methods require tenant_id as the first argument
 */
@Injectable()
export class HRService {
  constructor(
    private readonly hrRepository: IHRRepository,
    private readonly fileProcessingService: FileProcessingService,
    private readonly auditService: AuditService,
    private readonly loggerService: LoggerService,
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly contractGenerator: ContractGeneratorService,
  ) {}

  // Employee Management
  async getEmployees(
    tenant_id: string,
    location_id?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: Employee[]; total: number }> {
    return this.hrRepository.getEmployees(tenant_id, location_id, page, limit);
  }

  async getGlobalEmployees(
    location_id?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: Employee[]; total: number }> {
    return this.hrRepository.getGlobalEmployees(location_id, page, limit);
  }

  async getEmployeeById(
    tenant_id: string,
    employee_id: string,
  ): Promise<Employee | null> {
    return this.hrRepository.getEmployeeById(tenant_id, employee_id);
  }

  async getGlobalEmployeeById(employee_id: string): Promise<Employee | null> {
    return this.hrRepository.getGlobalEmployeeById(employee_id);
  }

  async createEmployee(
    tenant_id: string,
    data: CreateEmployeeDto,
    user_id?: string,
  ): Promise<Employee> {
    const event_reference_id = `EVT-HR-EMP-NEW-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const employee = await this.hrRepository.createEmployee(tenant_id, data, tx);
      
      // 1. Audit Logging (Transactional)
      await this.auditService.log({
        tenant_id,
        user_id: user_id || "SYSTEM",
        module: "HR",
        action: "CREATE",
        entity_type: "EMPLOYEE",
        entity_id: employee.id,
        after_state: employee,
        event_reference_id,
        metadata: {
          first_name: employee.first_name,
          last_name: employee.last_name,
          role: employee.role_title,
        },
      }, tx);

      // 2. System Logging
      await this.loggerService.log({
        tenant_id,
        module: "HR",
        level: "INFO",
        event: "EMPLOYEE_CREATED",
        message: `Employee created: ${employee.first_name} ${employee.last_name}`,
        payload: { employee_id: employee.id },
        user_id,
      });

      // 3. Domain Event
      await this.eventBus.publish({
        event_type: EVENT_NAMES.EMPLOYEE_CREATED,
        tenant_id,
        entity_id: employee.id,
        entity_type: "EMPLOYEE",
        source_module: "HR",
        user_id,
        event_reference_id,
        payload: {
          first_name: employee.first_name,
          last_name: employee.last_name,
          department_id: employee.department_id,
        },
      }, tx);

      return employee;
    });
  }

  async hireCandidate(
    tenant_id: string,
    candidateId: string,
    data?: any,
  ): Promise<Employee> {
    const event_reference_id = `EVT-HR-EMP-HIRE-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const employee = await this.hrRepository.hireCandidate(tenant_id, candidateId, data || {}, tx);
      
      // 1. Audit Logging (Transactional)
      await this.auditService.log({
        tenant_id,
        user_id: data?.actor_id || "SYSTEM",
        module: "HR",
        action: "HIRE",
        entity_type: "EMPLOYEE",
        entity_id: employee.id,
        after_state: employee,
        event_reference_id,
        metadata: {
          candidateId,
          positions: employee.role_title,
        },
      }, tx);

      // 1b. Notification
      await this.notificationService.createNotification({
        tenant_id,
        user_id: data?.actor_id || "SYSTEM",
        title: "New Hire Processed",
        message: `Candidate ${candidateId} has been hired as ${employee.role_title}`,
        type: "HR_HIRE",
        priority: "NORMAL",
        event_reference_id,
      });

      // 2. Domain Event
      await this.eventBus.publish({
        event_type: EVENT_NAMES.EMPLOYEE_CREATED,
        tenant_id,
        entity_id: employee.id,
        entity_type: "EMPLOYEE",
        source_module: "HR",
        user_id: data?.actor_id,
        event_reference_id,
        payload: {
          candidateId,
          employee_id: employee.id,
        },
      }, tx);

      return employee;
    });
  }

  async updateEmployee(
    tenant_id: string,
    employee_id: string,
    data: UpdateEmployeeDto,
    user_id?: string,
  ): Promise<Employee> {
    const event_reference_id = `EVT-HR-EMP-UPD-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      // Fetch before state for high-fidelity audit
      const before_state = await this.hrRepository.getEmployeeById(tenant_id, employee_id);
      
      const employee = await this.hrRepository.updateEmployee(
        tenant_id,
        employee_id,
        data,
        tx,
      );

      // 1. Audit Logging (Transactional)
      if (user_id) {
        await this.auditService.log({
          tenant_id,
          user_id,
          module: "HR",
          action: "UPDATE",
          entity_type: "EMPLOYEE",
          entity_id: employee.id,
          before_state,
          after_state: employee,
          event_reference_id,
          metadata: { updates: data },
        }, tx);
      }

      // 2. System Logging
      await this.loggerService.log({
        tenant_id,
        module: "HR",
        level: "INFO",
        event: "EMPLOYEE_UPDATED",
        message: `Employee updated: ${employee.id}`,
        payload: { employee_id: employee.id },
        user_id,
      });

      // 3. Domain Event
      await this.eventBus.publish({
        event_type: "HR.EMPLOYEE_UPDATED",
        tenant_id,
        entity_id: employee.id,
        entity_type: "EMPLOYEE",
        source_module: "HR",
        user_id,
        event_reference_id,
        payload: { employee_id: employee.id, updates: data },
      }, tx);

      return employee;
    });
  }


  async deactivateEmployee(
    tenant_id: string,
    employee_id: string,
    user_id?: string,
  ): Promise<Employee> {
    const event_reference_id = `EVT-HR-EMP-DEACT-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const before_state = await this.hrRepository.getEmployeeById(tenant_id, employee_id);
      
      const employee = await this.hrRepository.deactivateEmployee(
        tenant_id,
        employee_id,
        tx,
      );

      // 1. Audit Logging (Transactional)
      if (user_id) {
        await this.auditService.log({
          tenant_id,
          user_id,
          module: "HR",
          action: "DEACTIVATE",
          entity_type: "EMPLOYEE",
          entity_id: employee.id,
          before_state,
          after_state: employee,
          event_reference_id,
        }, tx);
      }

      // 2. System Logging
      await this.loggerService.log({
        tenant_id,
        module: "HR",
        level: "INFO",
        event: "EMPLOYEE_DEACTIVATED",
        message: `Employee deactivated: ${employee.first_name} ${employee.last_name}`,
        payload: { employee_id: employee.id },
        user_id,
      });

      // 3. Domain Event (Transactional)
      await this.eventBus.publish({
        event_type: "HR.EMPLOYEE_DEACTIVATED",
        tenant_id,
        entity_id: employee.id,
        entity_type: "EMPLOYEE",
        source_module: "HR",
        user_id,
        event_reference_id,
        payload: { 
          reason: "Deactivated",
          full_name: `${employee.first_name} ${employee.last_name}`,
          email: employee.email,
          department_id: employee.department_id
        },
      }, tx);

      return employee;
    });
  }

  async promoteEmployee(
    tenant_id: string,
    employee_id: string,
    data: any,
    user_id?: string,
  ): Promise<Employee> {
    const event_reference_id = `EVT-HR-EMP-PROM-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const before_state = await this.hrRepository.getEmployeeById(tenant_id, employee_id);
      const employee = await this.hrRepository.promoteEmployee(tenant_id, employee_id, data, tx);
      
      // 1. Audit Logging (Transactional)
      if (user_id) {
        await this.auditService.log({
          tenant_id,
          user_id,
          module: "HR",
          action: "PROMOTE",
          entity_type: "EMPLOYEE",
          entity_id: employee_id,
          before_state,
          after_state: employee,
          event_reference_id,
          metadata: data,
        }, tx);
      }

      // 2. System Logging
      await this.loggerService.log({
        tenant_id,
        module: "HR",
        level: "INFO",
        event: "EMPLOYEE_PROMOTED",
        message: `Employee promoted: ${employee.id}`,
        payload: { employee_id: employee.id, newRole: data.newRole },
        user_id,
      });

      // 3. Domain Event (Transactional)
      await this.eventBus.publish({
        event_type: "HR.EMPLOYEE_PROMOTED",
        tenant_id,
        entity_id: employee_id,
        entity_type: "EMPLOYEE",
        source_module: "HR",
        user_id,
        event_reference_id,
        payload: { ...data, employee_id },
      }, tx);

      return employee;
    });
  }

  async transferEmployee(
    tenant_id: string,
    employee_id: string,
    data: any,
    user_id?: string,
  ): Promise<Employee> {
    const event_reference_id = `EVT-HR-EMP-XFER-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const before_state = await this.hrRepository.getEmployeeById(tenant_id, employee_id);
      const employee = await this.hrRepository.transferEmployee(tenant_id, employee_id, data, tx);
      
      // 1. Audit Logging (Transactional)
      if (user_id) {
        await this.auditService.log({
          tenant_id,
          user_id,
          module: "HR",
          action: "TRANSFER",
          entity_type: "EMPLOYEE",
          entity_id: employee_id,
          before_state,
          after_state: employee,
          event_reference_id,
          metadata: data,
        }, tx);
      }

      // 2. System Logging
      await this.loggerService.log({
        tenant_id,
        module: "HR",
        level: "INFO",
        event: "EMPLOYEE_TRANSFERRED",
        message: `Employee transferred: ${employee.id} to ${data.targetLocation || data.targetDepartment}`,
        payload: { employee_id: employee.id, transferData: data },
        user_id,
      });

      // 1b. Notification
      await this.notificationService.createNotification({
        tenant_id,
        user_id: user_id || "SYSTEM",
        title: "Employee Transferred",
        message: `Employee ${employee_id} has been transferred.`,
        type: "HR_TRANSFER",
        priority: "NORMAL",
        event_reference_id,
      });

      // 3. Domain Event (Transactional)
      await this.eventBus.publish({
        event_type: EVENT_NAMES.EMPLOYEE_TRANSFERRED,
        tenant_id,
        entity_id: employee_id,
        entity_type: "EMPLOYEE",
        source_module: "HR",
        user_id,
        event_reference_id,
        payload: { ...data, employee_id },
      }, tx);

      return employee;
    });
  }

  async suspendEmployee(
    tenant_id: string,
    employee_id: string,
    reason: string,
    user_id?: string,
  ): Promise<Employee> {
    const event_reference_id = `EVT-HR-EMP-SUSP-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const before_state = await this.hrRepository.getEmployeeById(tenant_id, employee_id);
      const employee = await this.hrRepository.suspendEmployee(tenant_id, employee_id, reason, tx);
      
      // 1. Audit Logging (Transactional)
      await this.auditService.log({
        tenant_id,
        user_id: user_id || "SYSTEM",
        module: "HR",
        action: "SUSPEND",
        entity_type: "EMPLOYEE",
        entity_id: employee_id,
        before_state,
        after_state: employee,
        event_reference_id,
        metadata: { reason },
      }, tx);

      // 2. System Logging
      await this.loggerService.log({
        tenant_id,
        module: "HR",
        level: "WARN",
        event: "EMPLOYEE_SUSPENDED",
        message: `Employee suspended: ${employee.id} - Reason: ${reason}`,
        payload: { employee_id: employee.id, reason },
        user_id,
      });

      // 3. Domain Event (Transactional)
      await this.eventBus.publish({
        event_type: EVENT_NAMES.EMPLOYEE_SUSPENDED,
        tenant_id,
        entity_id: employee_id,
        entity_type: "EMPLOYEE",
        source_module: "HR",
        user_id,
        event_reference_id,
        payload: { employee_id, reason },
      }, tx);

      return employee;
    });
  }


  /**
   * Bulk import employees from file (CSV/Excel)
   */
  async importEmployees(
    tenant_id: string,
    buffer: Buffer,
    fileType: "csv" | "xlsx",
    user_id: string,
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
      // Ensure tenant_id is set for creation if repo doesn't handle it automagically
      await this.createEmployee(tenant_id, employeeData, user_id);
      importedCount++;
    }

    await this.auditService.log({
      tenant_id,
      user_id,
      module: "hr",
      action: "IMPORT",
      entity_type: "EMPLOYEE",
      entity_id: "bulk-import",
      metadata: { count: importedCount, fileType },
    });

    return { imported: importedCount, errors: [] };
  }

  /**
   * Export Employee list to Excel
   */
  async exportEmployees(tenant_id: string, user_id: string): Promise<Buffer> {
    const employees = await this.getEmployees(tenant_id);

    const columns = [
      { header: "Employee ID", key: "id", width: 15 },
      { header: "First Name", key: "first_name", width: 20 },
      { header: "Last Name", key: "last_name", width: 20 },
      { header: "Email", key: "email", width: 30 },
      { header: "Role", key: "role", width: 15 },
      { header: "Department", key: "department", width: 20 },
      { header: "Designation", key: "designation", width: 20 },
      { header: "Joined Date", key: "joinedAt", width: 20 },
      { header: "Status", key: "status", width: 10 },
    ];

    return this.fileProcessingService.generateExcel(employees.data, columns, {
      traceId: `HR-${tenant_id}-${user_id}-${Date.now()}`,
      watermark: { text: "ZENVIX CONFIDENTIAL" },
    });
  }

  // Attendance Management
  async getAttendance(
    tenant_id: string,
    location_id?: string,
    employee_id?: string,
    start_date?: string,
    end_date?: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ data: Attendance[]; total: number }> {
    return this.hrRepository.getAttendance(
      tenant_id,
      location_id,
      employee_id,
      start_date,
      end_date,
      page,
      limit,
    );
  }

  async getGlobalAttendance(
    employee_id?: string,
    start_date?: string,
    end_date?: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ data: Attendance[]; total: number }> {
    return this.hrRepository.getGlobalAttendance(
      employee_id,
      start_date,
      end_date,
      page,
      limit,
    );
  }

  async clock_in(
    tenant_id: string,
    employee_id: string,
    location_id: string,
    shift_id?: string,
    method: string = "manual",
    metadata?: any,
    user_id?: string,
  ): Promise<Attendance> {
    const event_reference_id = `EVT-HR-ATT-IN-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const attendance = await this.hrRepository.clock_in(
        tenant_id,
        employee_id,
        location_id,
        shift_id,
        method,
        metadata,
        tx,
      );

      // 1. Audit Logging (Transactional)
      await this.auditService.log({
        tenant_id,
        user_id: user_id || employee_id,
        module: "HR",
        action: "CLOCK_IN",
        entity_type: "ATTENDANCE",
        entity_id: attendance.id,
        after_state: attendance,
        event_reference_id,
        metadata: { location_id, shift_id },
      }, tx);

      // 2. Domain Event
      await this.eventBus.publish({
        event_type: EVENT_NAMES.CLOCK_IN,
        tenant_id,
        entity_id: attendance.id,
        entity_type: "ATTENDANCE",
        source_module: "HR",
        user_id: user_id || employee_id,
        event_reference_id,
        payload: { employee_id, location_id, shift_id },
      }, tx);

      return attendance;
    });
  }

  async clock_out(
    tenant_id: string,
    employee_id: string,
    user_id?: string,
  ): Promise<Attendance> {
    const event_reference_id = `EVT-HR-ATT-OUT-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const attendance = await this.hrRepository.clock_out(tenant_id, employee_id, tx);

      // 1. Audit Logging (Transactional)
      await this.auditService.log({
        tenant_id,
        user_id: user_id || employee_id,
        module: "HR",
        action: "CLOCK_OUT",
        entity_type: "ATTENDANCE",
        entity_id: attendance.id,
        after_state: attendance,
        event_reference_id,
        metadata: { employee_id },
      }, tx);

      // 2. Domain Event
      await this.eventBus.publish({
        event_type: EVENT_NAMES.CLOCK_OUT,
        tenant_id,
        entity_id: attendance.id,
        entity_type: "ATTENDANCE",
        source_module: "HR",
        user_id: user_id || employee_id,
        event_reference_id,
        payload: { employee_id, duration: 0 },
      }, tx);

      return attendance;
    });
  }

  // Leave Management
  async getLeaveRequests(
    tenant_id: string,
    location_id?: string,
    status?: string,
    employee_id?: string,
  ): Promise<LeaveRequest[]> {
    return this.hrRepository.getLeaveRequests(
      tenant_id,
      location_id,
      status,
      employee_id,
    );
  }

  async getGlobalLeaveRequests(
    status?: string,
    employee_id?: string,
  ): Promise<LeaveRequest[]> {
    return this.hrRepository.getGlobalLeaveRequests(status, employee_id);
  }

  async createLeaveRequest(
    tenant_id: string,
    data: CreateLeaveRequestDto,
    user_id?: string,
  ): Promise<LeaveRequest> {
    const event_reference_id = `EVT-HR-LEAVE-NEW-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const request = await this.hrRepository.createLeaveRequest(tenant_id, data, tx);
      if (user_id) {
        await this.auditService.log({
          tenant_id,
          user_id,
          module: "HR",
          action: "CREATE",
          entity_type: "LEAVE_REQUEST",
          entity_id: request.id,
          event_reference_id,
          metadata: {
            employee_id: data.employee_id,
            type: data.leave_type,
            start_date: data.start_date,
            end_date: data.end_date,
          },
        }, tx);
      }

      // Domain Event
      await this.eventBus.publish({
        event_type: EVENT_NAMES.LEAVE_REQUESTED,
        tenant_id,
        entity_id: request.id,
        entity_type: "LEAVE_REQUEST",
        source_module: "HR",
        user_id,
        event_reference_id,
        payload: { employee_id: data.employee_id, leave_type: data.leave_type },
      }, tx);

      return request;
    });
  }

  async approveLeaveRequest(
    tenant_id: string,
    request_id: string,
    reviewerId: string,
    notes?: string,
    user_id?: string,
  ): Promise<LeaveRequest> {
    const event_reference_id = `EVT-HR-LEAVE-APP-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const before_state = await this.hrRepository.getLeaveRequestById(tenant_id, request_id);
      const request = await this.hrRepository.approveLeaveRequest(
        tenant_id,
        request_id,
        reviewerId,
        notes,
        tx,
      );
      
      // 1. Audit Logging (Transactional)
      await this.auditService.log({
        tenant_id,
        user_id: user_id || reviewerId,
        module: "HR",
        action: "APPROVE_LEAVE",
        entity_type: "LEAVE_REQUEST",
        entity_id: request_id,
        before_state,
        after_state: request,
        event_reference_id,
        metadata: { notes },
      }, tx);

      // 2. System Logging
      await this.loggerService.log({
        tenant_id,
        module: "HR",
        level: "INFO",
        event: "LEAVE_APPROVED",
        message: `Leave request ${request_id} approved by ${reviewerId}`,
        payload: { request_id, reviewerId },
        user_id,
      });

      // 1c. Notification
      await this.notificationService.createNotification({
        tenant_id,
        user_id: request.employee_id,
        title: "Leave Approved",
        message: `Your leave request ${request_id} has been approved.`,
        type: "HR_LEAVE_APPROVAL",
        priority: "NORMAL",
        event_reference_id,
      });

      // 3. Domain Event (Transactional)
      await this.eventBus.publish({
        event_type: EVENT_NAMES.LEAVE_APPROVED,
        tenant_id,
        entity_id: request_id,
        entity_type: "LEAVE_REQUEST",
        source_module: "HR",
        user_id,
        event_reference_id,
        payload: { employee_id: request.employee_id, reviewerId, notes },
      }, tx);

      return request;
    });
  }

  async rejectLeaveRequest(
    tenant_id: string,
    request_id: string,
    reviewerId: string,
    notes: string,
    user_id?: string,
  ): Promise<LeaveRequest> {
    const event_reference_id = `EVT-HR-LEAVE-REJ-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const before_state = await this.hrRepository.getLeaveRequestById(tenant_id, request_id);
      const request = await this.hrRepository.rejectLeaveRequest(
        tenant_id,
        request_id,
        reviewerId,
        notes,
        tx,
      );
      
      // 1. Audit Logging (Transactional)
      if (user_id || reviewerId) {
        await this.auditService.log({
          tenant_id,
          user_id: user_id || reviewerId,
          module: "HR",
          action: "REJECT_LEAVE",
          entity_type: "LEAVE_REQUEST",
          entity_id: request_id,
          before_state,
          after_state: request,
          event_reference_id,
          metadata: { notes },
        }, tx);
      }

      // 2. System Logging
      await this.loggerService.log({
        tenant_id,
        module: "HR",
        level: "INFO",
        event: "LEAVE_REJECTED",
        message: `Leave request ${request_id} rejected by ${reviewerId}`,
        payload: { request_id, reviewerId },
        user_id,
      });

      // 1c. Notification
      await this.notificationService.createNotification({
        tenant_id,
        user_id: request.employee_id,
        title: "Leave Rejected",
        message: `Your leave request ${request_id} has been rejected.`,
        type: "HR_LEAVE_REJECTION",
        priority: "NORMAL",
        event_reference_id,
      });

      // 3. Domain Event (Transactional)
      await this.eventBus.publish({
        event_type: EVENT_NAMES.LEAVE_REJECTED,
        tenant_id,
        entity_id: request_id,
        entity_type: "LEAVE_REQUEST",
        source_module: "HR",
        user_id,
        event_reference_id,
        payload: { employee_id: request.employee_id, reviewerId, notes },
      }, tx);

      return request;
    });
  }

  // Payroll Management
  async getPayroll(
    tenant_id: string,
    location_id?: string,
    employee_id?: string,
    period?: string,
  ): Promise<Payroll[]> {
    return this.hrRepository.getPayroll(
      tenant_id,
      location_id,
      employee_id,
      period,
    );
  }

  async getGlobalPayroll(
    employee_id: string,
    period?: string,
  ): Promise<Payroll[]> {
    return this.hrRepository.getGlobalPayroll(employee_id, period);
  }


  // Organization Management
  async getDepartments(tenant_id: string): Promise<Department[]> {
    return this.hrRepository.getDepartments(tenant_id);
  }

  async getGlobalDepartments(): Promise<Department[]> {
    return this.hrRepository.getGlobalDepartments();
  }

  async getDepartmentById(
    tenant_id: string,
    department_id: string,
  ): Promise<Department | null> {
    return this.hrRepository.getDepartmentById(tenant_id, department_id);
  }

  async createDepartment(
    tenant_id: string,
    data: CreateDepartmentDto,
    user_id?: string,
  ): Promise<Department> {
    const department = await this.hrRepository.createDepartment(tenant_id, data);
    
    // 1. Audit Logging
    await this.auditService.log({
      tenant_id,
      user_id: user_id || "SYSTEM",
      module: "HR",
      action: "CREATE",
      entity_type: "DEPARTMENT",
      entity_id: department.id,
      after_state: department,
      metadata: { name: department.name },
    });

    // 2. System Logging
    await this.loggerService.log({
      tenant_id,
      module: "HR",
      level: "INFO",
      event: "DEPARTMENT_CREATED",
      message: `Department created: ${department.name}`,
      payload: { department_id: department.id },
      user_id,
    });

    // 3. Domain Event
    await this.eventBus.publish({
      event_type: EVENT_NAMES.DEPARTMENT_CREATED,
      tenant_id,
      entity_id: department.id,
      entity_type: "DEPARTMENT",
      source_module: "HR",
      user_id,
      payload: { name: department.name },
    });

    return department;
  }

  // Recruitment Management
  async getRequisitions(
    tenant_id: string,
    status?: string,
  ): Promise<JobRequisition[]> {
    return this.hrRepository.getRequisitions(tenant_id, status);
  }

  async getGlobalRequisitions(status?: string): Promise<JobRequisition[]> {
    return this.hrRepository.getGlobalRequisitions(status);
  }

  async createRequisition(
    tenant_id: string,
    data: CreateRequisitionDto,
    user_id?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<JobRequisition> {
    const event_reference_id = `EVT-HR-REQ-NEW-${Date.now()}`;
    const execute = async (contextTx: Prisma.TransactionClient) => {
      const requisition = await this.hrRepository.createRequisition(tenant_id, data, contextTx);
      await this.auditService.log({
        tenant_id, user_id: user_id || "SYSTEM", module: "HR", action: "CREATE", entity_type: "REQUISITION", entity_id: requisition.id, after_state: requisition, event_reference_id, metadata: { title: data.title, department_id: data.department_id },
      }, contextTx);
      await this.loggerService.log({
        tenant_id, module: "HR", level: "INFO", event: "REQUISITION_CREATED", message: `Job Requisition created: ${requisition.title}`, payload: { requisitionId: requisition.id }, user_id,
      });
      await this.eventBus.publish({
        event_type: EVENT_NAMES.REQUISITION_CREATED, tenant_id, entity_id: requisition.id, entity_type: "REQUISITION", source_module: "HR", user_id, event_reference_id, payload: { title: requisition.title, department_id: requisition.department_id },
      }, contextTx);
      return requisition;
    };

    if (tx) return execute(tx);
    return this.prisma.$transaction(execute);
  }



  async updateRequisition(
    tenant_id: string,
    id: string,
    data: Partial<JobRequisition>,
    user_id?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<JobRequisition> {
    const event_reference_id = `EVT-HR-REQ-UPD-${Date.now()}`;
    const execute = async (contextTx: Prisma.TransactionClient) => {
      const before_state = await this.hrRepository.getRequisitionById(tenant_id, id);
      const requisition = await this.hrRepository.updateRequisition(tenant_id, id, data, contextTx);
      if (user_id) {
        await this.auditService.log({
          tenant_id, user_id, module: "HR", action: "UPDATE", entity_type: "REQUISITION", entity_id: id, before_state, after_state: requisition, event_reference_id, metadata: data,
        }, contextTx);
      }
      await this.loggerService.log({
        tenant_id, module: "HR", level: "INFO", event: "REQUISITION_UPDATED", message: `Job Requisition updated: ${id}`, payload: { requisitionId: id, updates: data }, user_id,
      });
      await this.eventBus.publish({
        event_type: "HR.REQUISITION_UPDATED", tenant_id, entity_id: id, entity_type: "REQUISITION", source_module: "HR", user_id, event_reference_id, payload: data,
      }, contextTx);
      return requisition;
    };

    if (tx) return execute(tx);
    return this.prisma.$transaction(execute);
  }




  async getCandidates(tenant_id: string, status?: string): Promise<Candidate[]> {
    return this.hrRepository.getCandidates(tenant_id, status);
  }

  async updateCandidate(tenant_id: string, id: string, data: any, user_id?: string, tx?: Prisma.TransactionClient): Promise<Candidate> {
    const event_reference_id = `EVT-HR-CAND-UPD-${Date.now()}`;
    const execute = async (contextTx: Prisma.TransactionClient) => {
      const before_state = await this.hrRepository.getCandidateById(tenant_id, id);
      const candidate = await this.hrRepository.updateCandidate(tenant_id, id, data, contextTx);
      if (user_id) {
        await this.auditService.log({
          tenant_id, user_id, module: "HR", action: "UPDATE", entity_type: "CANDIDATE", entity_id: id, before_state, after_state: candidate, event_reference_id, metadata: data,
        }, contextTx);
      }
      return candidate;
    };
    if (tx) return execute(tx);
    return this.prisma.$transaction(execute);
  }

  async getInterviews(tenant_id: string, candidateId?: string): Promise<Interview[]> {
    return this.hrRepository.getInterviews(tenant_id, candidateId);
  }

  async scheduleInterview(tenant_id: string, data: any, user_id?: string, tx?: Prisma.TransactionClient): Promise<Interview> {
    const event_reference_id = `EVT-HR-INT-NEW-${Date.now()}`;
    const execute = async (contextTx: Prisma.TransactionClient) => {
      const interview = await this.hrRepository.scheduleInterview(tenant_id, data, contextTx);
      if (user_id) {
        await this.auditService.log({
          tenant_id, user_id, module: "HR", action: "SCHEDULE", entity_type: "INTERVIEW", entity_id: interview.id, after_state: interview, event_reference_id, metadata: data,
        }, contextTx);
      }
      return interview;
    };
    if (tx) return execute(tx);
    return this.prisma.$transaction(execute);
  }

  async updateInterviewStatus(tenant_id: string, id: string, status: string, user_id?: string, tx?: Prisma.TransactionClient): Promise<Interview> {
    const event_reference_id = `EVT-HR-INT-UPD-${Date.now()}`;
    const execute = async (contextTx: Prisma.TransactionClient) => {
        const before_state = await this.hrRepository.getInterviewById(tenant_id, id);
        const interview = await this.hrRepository.updateInterviewStatus(tenant_id, id, status, contextTx);
        if (user_id) {
            await this.auditService.log({
                tenant_id, user_id, module: "HR", action: "UPDATE_STATUS", entity_type: "INTERVIEW", entity_id: id, before_state, after_state: interview, event_reference_id, metadata: { status },
            }, contextTx);
        }
        return interview;
    };
    if (tx) return execute(tx);
    return this.prisma.$transaction(execute);
  }

  async getTalentLeads(tenant_id: string, status?: string): Promise<TalentLead[]> {
    return this.hrRepository.getTalentLeads(tenant_id, status);
  }

  async createTalentLead(tenant_id: string, data: any): Promise<TalentLead> {
    return this.hrRepository.createTalentLead(tenant_id, data);
  }

  async updateTalentLead(tenant_id: string, id: string, data: any): Promise<TalentLead> {
    return this.hrRepository.updateTalentLead(tenant_id, id, data);
  }

  async createCandidate(tenant_id: string, data: any, user_id?: string): Promise<Candidate> {
    const event_reference_id = `EVT-HR-CAND-NEW-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const candidate = await this.hrRepository.createCandidate(tenant_id, data, tx);
      
      // 1. Audit Logging (Transactional)
      if (user_id) {
        await this.auditService.log({
          tenant_id,
          user_id,
          module: "HR",
          action: "CREATE",
          entity_type: "CANDIDATE",
          entity_id: candidate.id,
          after_state: candidate,
          event_reference_id,
        }, tx);
      }

      // 2. System Logging
      await this.loggerService.log({
        tenant_id,
        module: "HR",
        level: "INFO",
        event: "CANDIDATE_CREATED",
        message: `Candidate profile created for: ${candidate.first_name} ${candidate.last_name}`,
        payload: { candidateId: candidate.id },
        user_id,
      });

      // 3. Domain Event (Transactional)
      await this.eventBus.publish({
        event_type: EVENT_NAMES.CANDIDATE_APPLIED,
        tenant_id,
        entity_id: candidate.id,
        entity_type: "CANDIDATE",
        source_module: "HR",
        user_id,
        event_reference_id,
        payload: { requisitionId: candidate.requisitionId, source: candidate.source },
      }, tx);

      return candidate;
    });
  }







  async convertLeadToCandidate(
    tenant_id: string,
    lead_id: string,
    requisitionId: string,
    user_id?: string,
  ): Promise<Candidate> {
    const event_reference_id = `EVT-HR-CAND-CONV-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const lead = await this.hrRepository.getTalentLeadById(tenant_id, lead_id);
      if (!lead) throw new Error("Lead not found");

      const candidate = await this.hrRepository.createCandidate(tenant_id, {
        first_name: lead.name.split(" ")[0],
        last_name: lead.name.split(" ").slice(1).join(" ") || "N/A",
        email: lead.email,
        phone: lead.phone,
        requisitionId,
        source: lead.source,
      }, tx);

      // 1. Audit Logging (Transactional)
      if (user_id) {
        await this.auditService.log({
          tenant_id,
          user_id,
          module: "HR",
          action: "CONVERT_LEAD",
          entity_type: "CANDIDATE",
          entity_id: candidate.id,
          after_state: candidate,
          event_reference_id,
          metadata: { lead_id },
        }, tx);
      }

      // 2. System Logging
      await this.loggerService.log({
        tenant_id,
        module: "HR",
        level: "INFO",
        event: "TALENT_LEAD_CONVERTED",
        message: `Talent Lead ${lead_id} converted to Candidate ${candidate.id}`,
        payload: { lead_id, candidateId: candidate.id },
        user_id,
      });

      // 3. Domain Event (Transactional)
      await this.eventBus.publish({
        event_type: EVENT_NAMES.CANDIDATE_CONVERTED,
        tenant_id,
        entity_id: candidate.id,
        entity_type: "CANDIDATE",
        source_module: "HR",
        user_id,
        event_reference_id,
        payload: { lead_id, requisitionId },
      }, tx);

      return candidate;
    });
  }


  // Headcount & Compensation Management
  async getPositions(tenant_id: string, deptId?: string): Promise<Position[]> {
    return this.hrRepository.getPositions(tenant_id, deptId);
  }

  async updatePosition(tenant_id: string, id: string, data: any, user_id?: string): Promise<Position> {
    const event_reference_id = `EVT-HR-POS-UPD-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const before_state = await this.hrRepository.getPositionById(tenant_id, id);
      const position = await this.hrRepository.updatePosition(tenant_id, id, data, tx);
      
      // 1. Audit Logging (Transactional)
      await this.auditService.log({
        tenant_id,
        user_id: user_id || "SYSTEM",
        module: "HR",
        action: "UPDATE",
        entity_type: "POSITION",
        entity_id: position.id,
        before_state,
        after_state: position,
        event_reference_id,
        metadata: data,
      }, tx);

      // 2. System Logging
      await this.loggerService.log({
        tenant_id,
        module: "HR",
        level: "INFO",
        event: "POSITION_UPDATED",
        message: `Position updated: ${position.id}`,
        payload: { position_id: position.id },
        user_id,
      });

      // 3. Domain Event (Transactional)
      await this.eventBus.publish({
        event_type: EVENT_NAMES.POSITION_UPDATED,
        tenant_id,
        entity_id: id,
        entity_type: "POSITION",
        source_module: "HR",
        user_id,
        event_reference_id,
        payload: data,
      }, tx);

      return position;
    });
  }

  async getCompensation(tenant_id: string, employee_id: string): Promise<Compensation | null> {
    return this.hrRepository.getCompensation(tenant_id, employee_id);
  }

  async updateCompensation(tenant_id: string, employee_id: string, data: any, user_id?: string): Promise<Compensation> {
    const event_reference_id = `EVT-HR-COMP-UPD-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const before_state = await this.hrRepository.getCompensation(tenant_id, employee_id);
      const compensation = await this.hrRepository.updateCompensation(tenant_id, employee_id, data, tx);
      
      // 1. Audit Logging (Transactional)
      if (user_id) {
        await this.auditService.log({
          tenant_id,
          user_id,
          module: "HR",
          action: "UPDATE",
          entity_type: "COMPENSATION",
          entity_id: compensation.id,
          before_state,
          after_state: compensation,
          event_reference_id,
          metadata: data,
        }, tx);
      }

      // 2. System Logging
      await this.loggerService.log({
        tenant_id,
        module: "HR",
        level: "INFO",
        event: "COMPENSATION_UPDATED",
        message: `Compensation updated for employee: ${employee_id}`,
        payload: { employee_id, compensationId: compensation.id },
        user_id,
      });

      // 3. Domain Event (Transactional)
      await this.eventBus.publish({
        event_type: EVENT_NAMES.DEPARTMENT_UPDATED, // Use Dept update for compensation context
        tenant_id,
        entity_id: employee_id,
        entity_type: "COMPENSATION",
        source_module: "HR",
        user_id,
        event_reference_id,
        payload: data,
      }, tx);

      return compensation;
    });
  }


  // Performance Management
  async getPerformanceCycles(tenant_id: string): Promise<PerformanceCycle[]> {
    return this.hrRepository.getPerformanceCycles(tenant_id);
  }

  async createPerformanceCycle(
    tenant_id: string,
    data: CreatePerformanceCycleDto,
    user_id?: string,
  ): Promise<PerformanceCycle> {
    const cycle = await this.hrRepository.createPerformanceCycle(
      tenant_id,
      data,
    );
    
    // 1. Audit Logging
    if (user_id) {
      await this.auditService.log({
        tenant_id,
        user_id,
        module: "HR",
        action: "CREATE",
        entity_type: "PERFORMANCE_CYCLE",
        entity_id: cycle.id,
        after_state: cycle,
        metadata: { name: data.name },
      });
    }

    // 2. System Logging
    await this.loggerService.log({
      tenant_id,
      module: "HR",
      level: "INFO",
      event: "PERFORMANCE_CYCLE_CREATED",
      message: `Performance Cycle created: ${data.name}`,
      payload: { cycleId: cycle.id },
      user_id,
    });

    // 3. Domain Event
    await this.eventBus.publish({
      event_type: EVENT_NAMES.PERFORMANCE_CYCLE_CREATED,
      tenant_id,
      entity_id: cycle.id,
      entity_type: "PERFORMANCE_CYCLE",
      source_module: "HR",
      user_id,
      payload: { name: data.name },
    });

    return cycle;
  }

  async updatePerformanceCycle(
    tenant_id: string,
    id: string,
    data: Partial<PerformanceCycle>,
    user_id?: string,
  ): Promise<PerformanceCycle> {
    const before_state = await this.hrRepository.getPerformanceCycleById?.(tenant_id, id);
    const cycle = await this.hrRepository.updatePerformanceCycle(
      tenant_id,
      id,
      data,
    );
    
    // 1. Audit Logging
    if (user_id) {
      await this.auditService.log({
        tenant_id,
        user_id,
        module: "HR",
        action: "UPDATE",
        entity_type: "PERFORMANCE_CYCLE",
        entity_id: id,
        before_state,
        after_state: cycle,
        changes: data,
      });
    }

    // 2. System Logging
    await this.loggerService.log({
      tenant_id,
      module: "HR",
      level: "INFO",
      event: "PERFORMANCE_CYCLE_UPDATED",
      message: `Performance Cycle updated: ${id}`,
      payload: { cycleId: id },
      user_id,
    });

    // 3. Domain Event
    await this.eventBus.publish({
      event_type: "HR.PERFORMANCE_CYCLE_UPDATED",
      tenant_id,
      entity_id: id,
      entity_type: "PERFORMANCE_CYCLE",
      source_module: "HR",
      user_id,
      payload: data,
    });

    return cycle;
  }

  async getPerformanceReviews(tenant_id: string, cycleId?: string, employee_id?: string): Promise<PerformanceReview[]> {
    return this.hrRepository.getPerformanceReviews(tenant_id, cycleId, employee_id);
  }

  async getGlobalPerformanceReviews(cycleId?: string, employee_id?: string): Promise<PerformanceReview[]> {
    return this.hrRepository.getGlobalPerformanceReviews(cycleId, employee_id);
  }

  async submitPerformanceReview(tenant_id: string, data: SubmitReviewDto, user_id?: string, tx?: Prisma.TransactionClient): Promise<PerformanceReview> {
    const event_reference_id = `EVT-HR-PERF-REV-${Date.now()}`;
    const execute = async (contextTx: Prisma.TransactionClient) => {
      const review = await this.hrRepository.submitPerformanceReview(tenant_id, data, contextTx);
      if (user_id) {
        await this.auditService.log({
          tenant_id, user_id, module: "HR", action: "SUBMIT", entity_type: "PERFORMANCE_REVIEW", entity_id: review.id, after_state: review, event_reference_id, metadata: { employee_id: data.employee_id, rating: data.rating },
        }, contextTx);
      }
      return review;
    };

    if (tx) return execute(tx);
    return this.prisma.$transaction(execute);
  }

  async getPositionById(tenant_id: string, id: string): Promise<Position | null> {
    return this.hrRepository.getPositionById(tenant_id, id);
  }

  // Case Management
  async getCases(tenant_id: string, location_id?: string, status?: string, employee_id?: string): Promise<HRCase[]> {
    return this.hrRepository.getCases(tenant_id, location_id, status, employee_id);
  }

  async getCaseById(tenant_id: string, id: string): Promise<HRCase | null> {
    return this.hrRepository.getCaseById(tenant_id, id);
  }

  async createCase(tenant_id: string, data: CreateCaseDto, user_id?: string, tx?: Prisma.TransactionClient): Promise<HRCase> {
    const hrCase = await this.hrRepository.createCase(tenant_id, data, tx);
    
    // 1. Audit Logging
    if (user_id) {
      await this.auditService.log({
        tenant_id,
        user_id,
        module: "HR",
        action: "CREATE",
        entity_type: "CASE",
        entity_id: hrCase.id,
        after_state: hrCase,
        metadata: { title: data.title, type: data.type },
      });
    }

    // 2. System Logging
    await this.loggerService.log({
      tenant_id,
      module: "HR",
      level: "INFO",
      event: "CASE_CREATED",
      message: `HR Case created: ${data.title}`,
      payload: { caseId: hrCase.id },
      user_id,
    });

    // 3. Domain Event
    await this.eventBus.publish({
      event_type: EVENT_NAMES.CASE_CREATED,
      tenant_id,
      entity_id: hrCase.id,
      entity_type: "CASE",
      source_module: "HR",
      user_id,
      payload: { title: data.title, type: data.type },
    });

    return hrCase;
  }

   async updateCase(
    tenant_id: string,
    id: string,
    data: Partial<HRCase>,
    user_id?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<HRCase> {
    const before_state = await this.hrRepository.getCaseById(tenant_id, id);
    const hrCase = await this.hrRepository.updateCase(tenant_id, id, data, tx);
    
    // 1. Audit Logging
    if (user_id) {
      await this.auditService.log({
        tenant_id,
        user_id,
        module: "HR",
        action: "UPDATE",
        entity_type: "CASE",
        entity_id: id,
        before_state,
        after_state: hrCase,
        changes: data,
      });
    }

    // 2. System Logging
    await this.loggerService.log({
      tenant_id,
      module: "HR",
      level: "INFO",
      event: "CASE_UPDATED",
      message: `HR Case updated: ${id}`,
      payload: { caseId: id, updates: data },
      user_id,
    });

    // 3. Domain Event
    await this.eventBus.publish({
      event_type: "HR.CASE_UPDATED",
      tenant_id,
      entity_id: id,
      entity_type: "CASE",
      source_module: "HR",
      user_id,
      payload: data,
    });

    return hrCase;
  }

  // Contract Management
  async generateContractPDF(
    tenant_id: string,
    type: ContractType,
    data: any,
    user_id: string,
  ): Promise<Buffer> {
    // 1. Log sensitive access
    await this.auditService.logSensitiveAccess({
      tenant_id,
      user_id,
      module: "HR",
      entity_type: type === ContractType.EMPLOYMENT ? "EMPLOYEE_CONTRACT" : "SUPPLIER_CONTRACT",
      entity_id: data.employee_id || data.supplier_id || "generated-doc",
      metadata: { contractType: type },
    });

    // 2. Generate PDF using service
    return this.contractGenerator.generateContractPDF(tenant_id, type, data);
  }
  async getContracts(
    tenant_id: string,
    location_id?: string,
    employee_id?: string,
  ): Promise<Contract[]> {
    return this.hrRepository.getContracts(tenant_id, location_id, employee_id);
  }

  async getGlobalContracts(employee_id?: string): Promise<Contract[]> {
    return this.hrRepository.getGlobalContracts(employee_id);
  }

  async createContract(
    tenant_id: string,
    data: CreateContractDto,
    user_id?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Contract> {
    const contract = await this.hrRepository.createContract(tenant_id, data, tx);
    
    // 1. Audit Logging
    if (user_id) {
      await this.auditService.log({
        tenant_id,
        user_id,
        module: "HR",
        action: "CREATE",
        entity_type: "CONTRACT",
        entity_id: contract.id,
        after_state: contract,
        metadata: { employee_id: data.employee_id, type: data.type },
      });
    }

    // 2. System Logging
    await this.loggerService.log({
      tenant_id,
      module: "HR",
      level: "INFO",
      event: "CONTRACT_CREATED",
      message: `Employment contract created for employee: ${data.employee_id}`,
      payload: { contractId: contract.id, employee_id: data.employee_id },
      user_id,
    });

    // 3. Domain Event
    await this.eventBus.publish({
      event_type: EVENT_NAMES.CONTRACT_CREATED,
      tenant_id,
      entity_id: contract.id,
      entity_type: "CONTRACT",
      source_module: "HR",
      user_id,
      payload: { employee_id: data.employee_id, type: data.type },
    });

    return contract;
  }

   async updateContract(
    tenant_id: string,
    id: string,
    data: Partial<Contract>,
    user_id?: string,
  ): Promise<Contract> {
    const before_state = await this.hrRepository.getContractById?.(tenant_id, id);
    const contract = await this.hrRepository.updateContract(tenant_id, id, data);
    
    // 1. Audit Logging
    if (user_id) {
      await this.auditService.log({
        tenant_id,
        user_id,
        module: "HR",
        action: "UPDATE",
        entity_type: "CONTRACT",
        entity_id: id,
        before_state,
        after_state: contract,
        changes: data,
      });
    }

    // 2. System Logging
    await this.loggerService.log({
      tenant_id,
      module: "HR",
      level: "INFO",
      event: "CONTRACT_UPDATED",
      message: `Employment contract updated: ${id}`,
      payload: { contractId: id, updates: data },
      user_id,
    });

    // 3. Domain Event
    await this.eventBus.publish({
      event_type: "HR.CONTRACT_UPDATED",
      tenant_id,
      entity_id: id,
      entity_type: "CONTRACT",
      source_module: "HR",
      user_id,
      payload: data,
    });

    return contract;
  }

  // Location Management
  async getLocations(tenant_id: string): Promise<any[]> {
    return this.hrRepository.getLocations(tenant_id);
  }

  // Training Management
  async getTrainingPrograms(tenant_id: string): Promise<any[]> {
    return this.hrRepository.getTrainingPrograms(tenant_id);
  }

  async createTrainingProgram(tenant_id: string, data: any, user_id?: string): Promise<any> {
    const program = await this.hrRepository.createTrainingProgram(tenant_id, data);
    
    // 1. Audit Logging
    if (user_id) {
      await this.auditService.log({
        tenant_id,
        user_id,
        module: "hr",
        action: "CREATE",
        entity_type: "TRAINING_PROGRAM",
        entity_id: program.id,
        after_state: program,
      });
    }

    // 2. System Logging
    await this.loggerService.log({
      tenant_id,
      module: "HR",
      level: "INFO",
      event: "TRAINING_PROGRAM_CREATED",
      message: `Training program created: ${data.title || program.id}`,
      payload: { programId: program.id },
      user_id,
    });

    // 3. Domain Event
    await this.eventBus.publish({
      event_type: "HR.TRAINING_PROGRAM_CREATED",
      tenant_id,
      entity_id: program.id,
      entity_type: "TRAINING_PROGRAM",
      source_module: "HR",
      user_id,
      payload: { title: data.title },
    });

    return program;
  }

  async getTrainingAssignments(tenant_id: string): Promise<any[]> {
    return this.hrRepository.getTrainingAssignments(tenant_id);
  }

  async createTrainingAssignment(tenant_id: string, data: any, user_id?: string): Promise<any> {
    const assignment = await this.hrRepository.createTrainingAssignment(tenant_id, data);
    
    // 1. Audit Logging
    if (user_id) {
      await this.auditService.log({
        tenant_id,
        user_id,
        module: "hr",
        action: "CREATE",
        entity_type: "TRAINING_ASSIGNMENT",
        entity_id: assignment.id,
        after_state: assignment,
      });
    }

    // 2. System Logging
    await this.loggerService.log({
      tenant_id,
      module: "HR",
      level: "INFO",
      event: "TRAINING_ASSIGNMENT_CREATED",
      message: `Training assigned: ${assignment.id}`,
      payload: { assignmentId: assignment.id, employee_id: data.employee_id },
      user_id,
    });

    // 3. Domain Event
    await this.eventBus.publish({
      event_type: "HR.TRAINING_ASSIGNED",
      tenant_id,
      entity_id: assignment.id,
      entity_type: "TRAINING_ASSIGNMENT",
      source_module: "HR",
      user_id,
      payload: { employee_id: data.employee_id, programId: data.programId },
    });

    return assignment;
  }

  async updateTrainingAssignment(tenant_id: string, id: string, data: any, user_id?: string): Promise<any> {
    const before_state = await this.hrRepository.getTrainingAssignmentById?.(tenant_id, id);
    const assignment = await this.hrRepository.updateTrainingAssignment(tenant_id, id, data);
    
    // 1. Audit Logging
    if (user_id) {
      await this.auditService.log({
        tenant_id,
        user_id,
        module: "hr",
        action: "UPDATE",
        entity_type: "TRAINING_ASSIGNMENT",
        entity_id: assignment.id,
        before_state,
        after_state: assignment,
        changes: data,
      });
    }

    // 2. System Logging
    await this.loggerService.log({
      tenant_id,
      module: "HR",
      level: "INFO",
      event: "TRAINING_STATUS_UPDATED",
      message: `Training assignment ${id} updated to status: ${data.status}`,
      payload: { assignmentId: id, status: data.status },
      user_id,
    });

    // 3. Domain Event
    await this.eventBus.publish({
      event_type: "HR.TRAINING_STATUS_UPDATED",
      tenant_id,
      entity_id: id,
      entity_type: "TRAINING_ASSIGNMENT",
      source_module: "HR",
      user_id,
      payload: { status: data.status },
    });

    return assignment;
  }

  // Analytics & Reporting
  async getHeadcountTrend(tenant_id: string): Promise<any[]> {
    return this.hrRepository.getHeadcountTrend(tenant_id);
  }

  async getTurnoverStats(tenant_id: string): Promise<any> {
    return this.hrRepository.getTurnoverStats(tenant_id);
  }

  async getDepartmentAnalytics(tenant_id: string): Promise<any[]> {
    return this.hrRepository.getDepartmentAnalytics(tenant_id);
  }

  async getCompensationAnalytics(tenant_id: string): Promise<any> {
    return this.hrRepository.getCompensationAnalytics(tenant_id);
  }

  async getExperienceRate(tenant_id: string): Promise<any> {
    return this.hrRepository.getExperienceRate(tenant_id);
  }

  async getActualLaborCostHistory(tenant_id: string, department_id: string, monthLimit: number): Promise<any[]> {
    return this.hrRepository.getActualLaborCostHistory(tenant_id, department_id, monthLimit);
  }


  /**
   * Resolves the full business context of an HR related event.
   * Used by Chat and Mail modules to display 'Rich Event Context' 
   * based on the event_reference_id.
   */
  async resolveEventContext(tenant_id: string, event_reference_id: string): Promise<any> {
    const auditLog = await this.prisma.audit_logs.findFirst({
      where: {
        tenant_id: tenant_id,
        event_reference_id: event_reference_id,
      },
      orderBy: { created_at: 'desc' },
    });

    if (!auditLog) return null;

    const domainEvent = await this.prisma.domain_events.findFirst({
      where: {
        tenant_id: tenant_id,
        event_reference_id: event_reference_id,
      },
    });

    return {
      referenceId: event_reference_id,
      action: auditLog.action,
      entity_type: auditLog.entity_type,
      entity_id: auditLog.entity_id,
      timestamp: auditLog.created_at,
      actor_id: auditLog.user_id,
      data: auditLog.after_state || auditLog.metadata,
      event_type: domainEvent?.event_type,
      payload: domainEvent?.payload,
    };
  }
}

