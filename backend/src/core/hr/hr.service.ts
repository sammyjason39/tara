import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { IHRRepository } from "./repositories/hr.repository.interface";
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
 * CRITICAL: All methods require tenantId as the first argument
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
  ) {}

  // Employee Management
  async getEmployees(
    tenantId: string,
    locationId?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: Employee[]; total: number }> {
    return this.hrRepository.getEmployees(tenantId, locationId, page, limit);
  }

  async getGlobalEmployees(
    locationId?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: Employee[]; total: number }> {
    return this.hrRepository.getGlobalEmployees(locationId, page, limit);
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
    const eventReferenceId = `EVT-HR-EMP-NEW-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const employee = await this.hrRepository.createEmployee(tenantId, data, tx);
      
      // 1. Audit Logging (Transactional)
      await this.auditService.log({
        tenantId,
        userId: userId || "SYSTEM",
        module: "HR",
        action: "CREATE",
        entityType: "EMPLOYEE",
        entityId: employee.id,
        afterState: employee,
        eventReferenceId,
        metadata: {
          firstName: employee.firstName,
          lastName: employee.lastName,
          role: employee.roleTitle,
        },
      }, tx);

      // 2. System Logging
      await this.loggerService.log({
        tenantId,
        module: "HR",
        level: "INFO",
        event: "EMPLOYEE_CREATED",
        message: `Employee created: ${employee.firstName} ${employee.lastName}`,
        payload: { employeeId: employee.id },
        userId,
      });

      // 3. Domain Event
      await this.eventBus.publish({
        eventType: EVENT_NAMES.EMPLOYEE_CREATED,
        tenantId,
        entityId: employee.id,
        entityType: "EMPLOYEE",
        sourceModule: "HR",
        userId,
        eventReferenceId,
        payload: {
          firstName: employee.firstName,
          lastName: employee.lastName,
          departmentId: employee.departmentId,
        },
      }, tx);

      return employee;
    });
  }

  async hireCandidate(
    tenantId: string,
    candidateId: string,
    data?: any,
  ): Promise<Employee> {
    const eventReferenceId = `EVT-HR-EMP-HIRE-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const employee = await this.hrRepository.hireCandidate(tenantId, candidateId, data || {}, tx);
      
      // 1. Audit Logging (Transactional)
      await this.auditService.log({
        tenantId,
        userId: data?.actorId || "SYSTEM",
        module: "HR",
        action: "HIRE",
        entityType: "EMPLOYEE",
        entityId: employee.id,
        afterState: employee,
        eventReferenceId,
        metadata: {
          candidateId,
          position: employee.roleTitle,
        },
      }, tx);

      // 1b. Notification
      await this.notificationService.createNotification({
        tenantId,
        userId: data?.actorId || "SYSTEM",
        title: "New Hire Processed",
        message: `Candidate ${candidateId} has been hired as ${employee.roleTitle}`,
        type: "HR_HIRE",
        priority: "NORMAL",
        eventReferenceId,
      });

      // 2. Domain Event
      await this.eventBus.publish({
        eventType: EVENT_NAMES.EMPLOYEE_CREATED,
        tenantId,
        entityId: employee.id,
        entityType: "EMPLOYEE",
        sourceModule: "HR",
        userId: data?.actorId,
        eventReferenceId,
        payload: {
          candidateId,
          employeeId: employee.id,
        },
      }, tx);

      return employee;
    });
  }

  async updateEmployee(
    tenantId: string,
    employeeId: string,
    data: UpdateEmployeeDto,
    userId?: string,
  ): Promise<Employee> {
    const eventReferenceId = `EVT-HR-EMP-UPD-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      // Fetch before state for high-fidelity audit
      const beforeState = await this.hrRepository.getEmployeeById(tenantId, employeeId);
      
      const employee = await this.hrRepository.updateEmployee(
        tenantId,
        employeeId,
        data,
        tx,
      );

      // 1. Audit Logging (Transactional)
      if (userId) {
        await this.auditService.log({
          tenantId,
          userId,
          module: "HR",
          action: "UPDATE",
          entityType: "EMPLOYEE",
          entityId: employee.id,
          beforeState,
          afterState: employee,
          eventReferenceId,
          metadata: { updates: data },
        }, tx);
      }

      // 2. System Logging
      await this.loggerService.log({
        tenantId,
        module: "HR",
        level: "INFO",
        event: "EMPLOYEE_UPDATED",
        message: `Employee updated: ${employee.id}`,
        payload: { employeeId: employee.id },
        userId,
      });

      // 3. Domain Event
      await this.eventBus.publish({
        eventType: "HR.EMPLOYEE_UPDATED",
        tenantId,
        entityId: employee.id,
        entityType: "EMPLOYEE",
        sourceModule: "HR",
        userId,
        eventReferenceId,
        payload: { employeeId: employee.id, updates: data },
      }, tx);

      return employee;
    });
  }


  async deactivateEmployee(
    tenantId: string,
    employeeId: string,
    userId?: string,
  ): Promise<Employee> {
    const eventReferenceId = `EVT-HR-EMP-DEACT-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const beforeState = await this.hrRepository.getEmployeeById(tenantId, employeeId);
      
      const employee = await this.hrRepository.deactivateEmployee(
        tenantId,
        employeeId,
        tx,
      );

      // 1. Audit Logging (Transactional)
      if (userId) {
        await this.auditService.log({
          tenantId,
          userId,
          module: "HR",
          action: "DEACTIVATE",
          entityType: "EMPLOYEE",
          entityId: employee.id,
          beforeState,
          afterState: employee,
          eventReferenceId,
        }, tx);
      }

      // 2. System Logging
      await this.loggerService.log({
        tenantId,
        module: "HR",
        level: "INFO",
        event: "EMPLOYEE_DEACTIVATED",
        message: `Employee deactivated: ${employee.firstName} ${employee.lastName}`,
        payload: { employeeId: employee.id },
        userId,
      });

      // 3. Domain Event (Transactional)
      await this.eventBus.publish({
        eventType: "HR.EMPLOYEE_DEACTIVATED",
        tenantId,
        entityId: employee.id,
        entityType: "EMPLOYEE",
        sourceModule: "HR",
        userId,
        eventReferenceId,
        payload: { 
          reason: "Deactivated",
          fullName: `${employee.firstName} ${employee.lastName}`,
          email: employee.email,
          departmentId: employee.departmentId
        },
      }, tx);

      return employee;
    });
  }

  async promoteEmployee(
    tenantId: string,
    employeeId: string,
    data: any,
    userId?: string,
  ): Promise<Employee> {
    const eventReferenceId = `EVT-HR-EMP-PROM-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const beforeState = await this.hrRepository.getEmployeeById(tenantId, employeeId);
      const employee = await this.hrRepository.promoteEmployee(tenantId, employeeId, data, tx);
      
      // 1. Audit Logging (Transactional)
      if (userId) {
        await this.auditService.log({
          tenantId,
          userId,
          module: "HR",
          action: "PROMOTE",
          entityType: "EMPLOYEE",
          entityId: employeeId,
          beforeState,
          afterState: employee,
          eventReferenceId,
          metadata: data,
        }, tx);
      }

      // 2. System Logging
      await this.loggerService.log({
        tenantId,
        module: "HR",
        level: "INFO",
        event: "EMPLOYEE_PROMOTED",
        message: `Employee promoted: ${employee.id}`,
        payload: { employeeId: employee.id, newRole: data.newRole },
        userId,
      });

      // 3. Domain Event (Transactional)
      await this.eventBus.publish({
        eventType: "HR.EMPLOYEE_PROMOTED",
        tenantId,
        entityId: employeeId,
        entityType: "EMPLOYEE",
        sourceModule: "HR",
        userId,
        eventReferenceId,
        payload: { ...data, employeeId },
      }, tx);

      return employee;
    });
  }

  async transferEmployee(
    tenantId: string,
    employeeId: string,
    data: any,
    userId?: string,
  ): Promise<Employee> {
    const eventReferenceId = `EVT-HR-EMP-XFER-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const beforeState = await this.hrRepository.getEmployeeById(tenantId, employeeId);
      const employee = await this.hrRepository.transferEmployee(tenantId, employeeId, data, tx);
      
      // 1. Audit Logging (Transactional)
      if (userId) {
        await this.auditService.log({
          tenantId,
          userId,
          module: "HR",
          action: "TRANSFER",
          entityType: "EMPLOYEE",
          entityId: employeeId,
          beforeState,
          afterState: employee,
          eventReferenceId,
          metadata: data,
        }, tx);
      }

      // 2. System Logging
      await this.loggerService.log({
        tenantId,
        module: "HR",
        level: "INFO",
        event: "EMPLOYEE_TRANSFERRED",
        message: `Employee transferred: ${employee.id} to ${data.targetLocation || data.targetDepartment}`,
        payload: { employeeId: employee.id, transferData: data },
        userId,
      });

      // 1b. Notification
      await this.notificationService.createNotification({
        tenantId,
        userId: userId || "SYSTEM",
        title: "Employee Transferred",
        message: `Employee ${employeeId} has been transferred.`,
        type: "HR_TRANSFER",
        priority: "NORMAL",
        eventReferenceId,
      });

      // 3. Domain Event (Transactional)
      await this.eventBus.publish({
        eventType: EVENT_NAMES.EMPLOYEE_TRANSFERRED,
        tenantId,
        entityId: employeeId,
        entityType: "EMPLOYEE",
        sourceModule: "HR",
        userId,
        eventReferenceId,
        payload: { ...data, employeeId },
      }, tx);

      return employee;
    });
  }

  async suspendEmployee(
    tenantId: string,
    employeeId: string,
    reason: string,
    userId?: string,
  ): Promise<Employee> {
    const eventReferenceId = `EVT-HR-EMP-SUSP-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const beforeState = await this.hrRepository.getEmployeeById(tenantId, employeeId);
      const employee = await this.hrRepository.suspendEmployee(tenantId, employeeId, reason, tx);
      
      // 1. Audit Logging (Transactional)
      await this.auditService.log({
        tenantId,
        userId: userId || "SYSTEM",
        module: "HR",
        action: "SUSPEND",
        entityType: "EMPLOYEE",
        entityId: employeeId,
        beforeState,
        afterState: employee,
        eventReferenceId,
        metadata: { reason },
      }, tx);

      // 2. System Logging
      await this.loggerService.log({
        tenantId,
        module: "HR",
        level: "WARN",
        event: "EMPLOYEE_SUSPENDED",
        message: `Employee suspended: ${employee.id} - Reason: ${reason}`,
        payload: { employeeId: employee.id, reason },
        userId,
      });

      // 3. Domain Event (Transactional)
      await this.eventBus.publish({
        eventType: EVENT_NAMES.EMPLOYEE_SUSPENDED,
        tenantId,
        entityId: employeeId,
        entityType: "EMPLOYEE",
        sourceModule: "HR",
        userId,
        eventReferenceId,
        payload: { employeeId, reason },
      }, tx);

      return employee;
    });
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

    return this.fileProcessingService.generateExcel(employees.data, columns, {
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
    page: number = 1,
    limit: number = 50,
  ): Promise<{ data: Attendance[]; total: number }> {
    return this.hrRepository.getAttendance(
      tenantId,
      locationId,
      employeeId,
      startDate,
      endDate,
      page,
      limit,
    );
  }

  async getGlobalAttendance(
    employeeId?: string,
    startDate?: string,
    endDate?: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ data: Attendance[]; total: number }> {
    return this.hrRepository.getGlobalAttendance(
      employeeId,
      startDate,
      endDate,
      page,
      limit,
    );
  }

  async clockIn(
    tenantId: string,
    employeeId: string,
    locationId: string,
    shiftId?: string,
    method: string = "manual",
    metadata?: any,
    userId?: string,
  ): Promise<Attendance> {
    const eventReferenceId = `EVT-HR-ATT-IN-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const attendance = await this.hrRepository.clockIn(
        tenantId,
        employeeId,
        locationId,
        shiftId,
        method,
        metadata,
        tx,
      );

      // 1. Audit Logging (Transactional)
      await this.auditService.log({
        tenantId,
        userId: userId || employeeId,
        module: "HR",
        action: "CLOCK_IN",
        entityType: "ATTENDANCE",
        entityId: attendance.id,
        afterState: attendance,
        eventReferenceId,
        metadata: { locationId, shiftId },
      }, tx);

      // 2. Domain Event
      await this.eventBus.publish({
        eventType: EVENT_NAMES.CLOCK_IN,
        tenantId,
        entityId: attendance.id,
        entityType: "ATTENDANCE",
        sourceModule: "HR",
        userId: userId || employeeId,
        eventReferenceId,
        payload: { employeeId, locationId, shiftId },
      }, tx);

      return attendance;
    });
  }

  async clockOut(
    tenantId: string,
    employeeId: string,
    userId?: string,
  ): Promise<Attendance> {
    const eventReferenceId = `EVT-HR-ATT-OUT-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const attendance = await this.hrRepository.clockOut(tenantId, employeeId, tx);

      // 1. Audit Logging (Transactional)
      await this.auditService.log({
        tenantId,
        userId: userId || employeeId,
        module: "HR",
        action: "CLOCK_OUT",
        entityType: "ATTENDANCE",
        entityId: attendance.id,
        afterState: attendance,
        eventReferenceId,
        metadata: { employeeId },
      }, tx);

      // 2. Domain Event
      await this.eventBus.publish({
        eventType: EVENT_NAMES.CLOCK_OUT,
        tenantId,
        entityId: attendance.id,
        entityType: "ATTENDANCE",
        sourceModule: "HR",
        userId: userId || employeeId,
        eventReferenceId,
        payload: { employeeId, duration: 0 },
      }, tx);

      return attendance;
    });
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
    userId?: string,
  ): Promise<LeaveRequest> {
    const eventReferenceId = `EVT-HR-LEAVE-NEW-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const request = await this.hrRepository.createLeaveRequest(tenantId, data, tx);
      if (userId) {
        await this.auditService.log({
          tenantId,
          userId,
          module: "HR",
          action: "CREATE",
          entityType: "LEAVE_REQUEST",
          entityId: request.id,
          eventReferenceId,
          metadata: {
            employeeId: data.employeeId,
            type: data.leaveType,
            startDate: data.startDate,
            endDate: data.endDate,
          },
        }, tx);
      }

      // Domain Event
      await this.eventBus.publish({
        eventType: EVENT_NAMES.LEAVE_REQUESTED,
        tenantId,
        entityId: request.id,
        entityType: "LEAVE_REQUEST",
        sourceModule: "HR",
        userId,
        eventReferenceId,
        payload: { employeeId: data.employeeId, leaveType: data.leaveType },
      }, tx);

      return request;
    });
  }

  async approveLeaveRequest(
    tenantId: string,
    requestId: string,
    reviewerId: string,
    notes?: string,
    userId?: string,
  ): Promise<LeaveRequest> {
    const eventReferenceId = `EVT-HR-LEAVE-APP-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const beforeState = await this.hrRepository.getLeaveRequestById(tenantId, requestId);
      const request = await this.hrRepository.approveLeaveRequest(
        tenantId,
        requestId,
        reviewerId,
        notes,
        tx,
      );
      
      // 1. Audit Logging (Transactional)
      await this.auditService.log({
        tenantId,
        userId: userId || reviewerId,
        module: "HR",
        action: "APPROVE_LEAVE",
        entityType: "LEAVE_REQUEST",
        entityId: requestId,
        beforeState,
        afterState: request,
        eventReferenceId,
        metadata: { notes },
      }, tx);

      // 2. System Logging
      await this.loggerService.log({
        tenantId,
        module: "HR",
        level: "INFO",
        event: "LEAVE_APPROVED",
        message: `Leave request ${requestId} approved by ${reviewerId}`,
        payload: { requestId, reviewerId },
        userId,
      });

      // 1c. Notification
      await this.notificationService.createNotification({
        tenantId,
        userId: request.employeeId,
        title: "Leave Approved",
        message: `Your leave request ${requestId} has been approved.`,
        type: "HR_LEAVE_APPROVAL",
        priority: "NORMAL",
        eventReferenceId,
      });

      // 3. Domain Event (Transactional)
      await this.eventBus.publish({
        eventType: EVENT_NAMES.LEAVE_APPROVED,
        tenantId,
        entityId: requestId,
        entityType: "LEAVE_REQUEST",
        sourceModule: "HR",
        userId,
        eventReferenceId,
        payload: { employeeId: request.employeeId, reviewerId, notes },
      }, tx);

      return request;
    });
  }

  async rejectLeaveRequest(
    tenantId: string,
    requestId: string,
    reviewerId: string,
    notes: string,
    userId?: string,
  ): Promise<LeaveRequest> {
    const eventReferenceId = `EVT-HR-LEAVE-REJ-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const beforeState = await this.hrRepository.getLeaveRequestById(tenantId, requestId);
      const request = await this.hrRepository.rejectLeaveRequest(
        tenantId,
        requestId,
        reviewerId,
        notes,
        tx,
      );
      
      // 1. Audit Logging (Transactional)
      if (userId || reviewerId) {
        await this.auditService.log({
          tenantId,
          userId: userId || reviewerId,
          module: "HR",
          action: "REJECT_LEAVE",
          entityType: "LEAVE_REQUEST",
          entityId: requestId,
          beforeState,
          afterState: request,
          eventReferenceId,
          metadata: { notes },
        }, tx);
      }

      // 2. System Logging
      await this.loggerService.log({
        tenantId,
        module: "HR",
        level: "INFO",
        event: "LEAVE_REJECTED",
        message: `Leave request ${requestId} rejected by ${reviewerId}`,
        payload: { requestId, reviewerId },
        userId,
      });

      // 1c. Notification
      await this.notificationService.createNotification({
        tenantId,
        userId: request.employeeId,
        title: "Leave Rejected",
        message: `Your leave request ${requestId} has been rejected.`,
        type: "HR_LEAVE_REJECTION",
        priority: "NORMAL",
        eventReferenceId,
      });

      // 3. Domain Event (Transactional)
      await this.eventBus.publish({
        eventType: EVENT_NAMES.LEAVE_REJECTED,
        tenantId,
        entityId: requestId,
        entityType: "LEAVE_REQUEST",
        sourceModule: "HR",
        userId,
        eventReferenceId,
        payload: { employeeId: request.employeeId, reviewerId, notes },
      }, tx);

      return request;
    });
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
    userId?: string,
  ): Promise<Payroll> {
    const eventReferenceId = `EVT-HR-PAY-CALC-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const payroll = await this.hrRepository.calculatePayroll(
        tenantId,
        employeeId,
        period,
        tx,
      );
      
      // 1. Audit Logging (Transactional)
      await this.auditService.log({
        tenantId,
        userId: userId || "SYSTEM",
        module: "HR",
        action: "CALCULATE",
        entityType: "PAYROLL",
        entityId: payroll.id,
        afterState: payroll,
        eventReferenceId,
        metadata: { employeeId, period },
      }, tx);

      // 3. Domain Event (Transactional)
      await this.eventBus.publish({
        eventType: EVENT_NAMES.PAYROLL_CALCULATED,
        tenantId,
        entityId: payroll.id,
        entityType: "PAYROLL",
        sourceModule: "HR",
        userId,
        eventReferenceId,
        payload: { employeeId, period, totalAmount: payroll.netPay },
      }, tx);

      return payroll;
    });
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
    userId?: string,
  ): Promise<Department> {
    const department = await this.hrRepository.createDepartment(tenantId, data);
    
    // 1. Audit Logging
    await this.auditService.log({
      tenantId,
      userId: userId || "SYSTEM",
      module: "HR",
      action: "CREATE",
      entityType: "DEPARTMENT",
      entityId: department.id,
      afterState: department,
      metadata: { name: department.name },
    });

    // 2. System Logging
    await this.loggerService.log({
      tenantId,
      module: "HR",
      level: "INFO",
      event: "DEPARTMENT_CREATED",
      message: `Department created: ${department.name}`,
      payload: { departmentId: department.id },
      userId,
    });

    // 3. Domain Event
    await this.eventBus.publish({
      eventType: EVENT_NAMES.DEPARTMENT_CREATED,
      tenantId,
      entityId: department.id,
      entityType: "DEPARTMENT",
      sourceModule: "HR",
      userId,
      payload: { name: department.name },
    });

    return department;
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
    userId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<JobRequisition> {
    const eventReferenceId = `EVT-HR-REQ-NEW-${Date.now()}`;
    const execute = async (contextTx: Prisma.TransactionClient) => {
      const requisition = await this.hrRepository.createRequisition(tenantId, data, contextTx);
      await this.auditService.log({
        tenantId, userId: userId || "SYSTEM", module: "HR", action: "CREATE", entityType: "REQUISITION", entityId: requisition.id, afterState: requisition, eventReferenceId, metadata: { title: data.title, departmentId: data.departmentId },
      }, contextTx);
      await this.loggerService.log({
        tenantId, module: "HR", level: "INFO", event: "REQUISITION_CREATED", message: `Job Requisition created: ${requisition.title}`, payload: { requisitionId: requisition.id }, userId,
      });
      await this.eventBus.publish({
        eventType: EVENT_NAMES.REQUISITION_CREATED, tenantId, entityId: requisition.id, entityType: "REQUISITION", sourceModule: "HR", userId, eventReferenceId, payload: { title: requisition.title, departmentId: requisition.departmentId },
      }, contextTx);
      return requisition;
    };

    if (tx) return execute(tx);
    return this.prisma.$transaction(execute);
  }



  async updateRequisition(
    tenantId: string,
    id: string,
    data: Partial<JobRequisition>,
    userId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<JobRequisition> {
    const eventReferenceId = `EVT-HR-REQ-UPD-${Date.now()}`;
    const execute = async (contextTx: Prisma.TransactionClient) => {
      const beforeState = await this.hrRepository.getRequisitionById(tenantId, id);
      const requisition = await this.hrRepository.updateRequisition(tenantId, id, data, contextTx);
      if (userId) {
        await this.auditService.log({
          tenantId, userId, module: "HR", action: "UPDATE", entityType: "REQUISITION", entityId: id, beforeState, afterState: requisition, eventReferenceId, metadata: data,
        }, contextTx);
      }
      await this.loggerService.log({
        tenantId, module: "HR", level: "INFO", event: "REQUISITION_UPDATED", message: `Job Requisition updated: ${id}`, payload: { requisitionId: id, updates: data }, userId,
      });
      await this.eventBus.publish({
        eventType: "HR.REQUISITION_UPDATED", tenantId, entityId: id, entityType: "REQUISITION", sourceModule: "HR", userId, eventReferenceId, payload: data,
      }, contextTx);
      return requisition;
    };

    if (tx) return execute(tx);
    return this.prisma.$transaction(execute);
  }




  async getCandidates(tenantId: string, status?: string): Promise<Candidate[]> {
    return this.hrRepository.getCandidates(tenantId, status);
  }

  async updateCandidate(tenantId: string, id: string, data: any, userId?: string, tx?: Prisma.TransactionClient): Promise<Candidate> {
    const eventReferenceId = `EVT-HR-CAND-UPD-${Date.now()}`;
    const execute = async (contextTx: Prisma.TransactionClient) => {
      const beforeState = await this.hrRepository.getCandidateById(tenantId, id);
      const candidate = await this.hrRepository.updateCandidate(tenantId, id, data, contextTx);
      if (userId) {
        await this.auditService.log({
          tenantId, userId, module: "HR", action: "UPDATE", entityType: "CANDIDATE", entityId: id, beforeState, afterState: candidate, eventReferenceId, metadata: data,
        }, contextTx);
      }
      return candidate;
    };
    if (tx) return execute(tx);
    return this.prisma.$transaction(execute);
  }

  async getInterviews(tenantId: string, candidateId?: string): Promise<Interview[]> {
    return this.hrRepository.getInterviews(tenantId, candidateId);
  }

  async scheduleInterview(tenantId: string, data: any, userId?: string, tx?: Prisma.TransactionClient): Promise<Interview> {
    const eventReferenceId = `EVT-HR-INT-NEW-${Date.now()}`;
    const execute = async (contextTx: Prisma.TransactionClient) => {
      const interview = await this.hrRepository.scheduleInterview(tenantId, data, contextTx);
      if (userId) {
        await this.auditService.log({
          tenantId, userId, module: "HR", action: "SCHEDULE", entityType: "INTERVIEW", entityId: interview.id, afterState: interview, eventReferenceId, metadata: data,
        }, contextTx);
      }
      return interview;
    };
    if (tx) return execute(tx);
    return this.prisma.$transaction(execute);
  }

  async updateInterviewStatus(tenantId: string, id: string, status: string, userId?: string, tx?: Prisma.TransactionClient): Promise<Interview> {
    const eventReferenceId = `EVT-HR-INT-UPD-${Date.now()}`;
    const execute = async (contextTx: Prisma.TransactionClient) => {
        const beforeState = await this.hrRepository.getInterviewById(tenantId, id);
        const interview = await this.hrRepository.updateInterviewStatus(tenantId, id, status, contextTx);
        if (userId) {
            await this.auditService.log({
                tenantId, userId, module: "HR", action: "UPDATE_STATUS", entityType: "INTERVIEW", entityId: id, beforeState, afterState: interview, eventReferenceId, metadata: { status },
            }, contextTx);
        }
        return interview;
    };
    if (tx) return execute(tx);
    return this.prisma.$transaction(execute);
  }

  async getTalentLeads(tenantId: string, status?: string): Promise<TalentLead[]> {
    return this.hrRepository.getTalentLeads(tenantId, status);
  }

  async createTalentLead(tenantId: string, data: any): Promise<TalentLead> {
    return this.hrRepository.createTalentLead(tenantId, data);
  }

  async updateTalentLead(tenantId: string, id: string, data: any): Promise<TalentLead> {
    return this.hrRepository.updateTalentLead(tenantId, id, data);
  }

  async createCandidate(tenantId: string, data: any, userId?: string): Promise<Candidate> {
    const eventReferenceId = `EVT-HR-CAND-NEW-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const candidate = await this.hrRepository.createCandidate(tenantId, data, tx);
      
      // 1. Audit Logging (Transactional)
      if (userId) {
        await this.auditService.log({
          tenantId,
          userId,
          module: "HR",
          action: "CREATE",
          entityType: "CANDIDATE",
          entityId: candidate.id,
          afterState: candidate,
          eventReferenceId,
        }, tx);
      }

      // 2. System Logging
      await this.loggerService.log({
        tenantId,
        module: "HR",
        level: "INFO",
        event: "CANDIDATE_CREATED",
        message: `Candidate profile created for: ${candidate.firstName} ${candidate.lastName}`,
        payload: { candidateId: candidate.id },
        userId,
      });

      // 3. Domain Event (Transactional)
      await this.eventBus.publish({
        eventType: EVENT_NAMES.CANDIDATE_APPLIED,
        tenantId,
        entityId: candidate.id,
        entityType: "CANDIDATE",
        sourceModule: "HR",
        userId,
        eventReferenceId,
        payload: { requisitionId: candidate.requisitionId, source: candidate.source },
      }, tx);

      return candidate;
    });
  }







  async convertLeadToCandidate(
    tenantId: string,
    leadId: string,
    requisitionId: string,
    userId?: string,
  ): Promise<Candidate> {
    const eventReferenceId = `EVT-HR-CAND-CONV-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const lead = await this.hrRepository.getTalentLeadById(tenantId, leadId);
      if (!lead) throw new Error("Lead not found");

      const candidate = await this.hrRepository.createCandidate(tenantId, {
        firstName: lead.name.split(" ")[0],
        lastName: lead.name.split(" ").slice(1).join(" ") || "N/A",
        email: lead.email,
        phone: lead.phone,
        requisitionId,
        source: lead.source,
      }, tx);

      // 1. Audit Logging (Transactional)
      if (userId) {
        await this.auditService.log({
          tenantId,
          userId,
          module: "HR",
          action: "CONVERT_LEAD",
          entityType: "CANDIDATE",
          entityId: candidate.id,
          afterState: candidate,
          eventReferenceId,
          metadata: { leadId },
        }, tx);
      }

      // 2. System Logging
      await this.loggerService.log({
        tenantId,
        module: "HR",
        level: "INFO",
        event: "TALENT_LEAD_CONVERTED",
        message: `Talent Lead ${leadId} converted to Candidate ${candidate.id}`,
        payload: { leadId, candidateId: candidate.id },
        userId,
      });

      // 3. Domain Event (Transactional)
      await this.eventBus.publish({
        eventType: EVENT_NAMES.CANDIDATE_CONVERTED,
        tenantId,
        entityId: candidate.id,
        entityType: "CANDIDATE",
        sourceModule: "HR",
        userId,
        eventReferenceId,
        payload: { leadId, requisitionId },
      }, tx);

      return candidate;
    });
  }


  // Headcount & Compensation Management
  async getPositions(tenantId: string, deptId?: string): Promise<Position[]> {
    return this.hrRepository.getPositions(tenantId, deptId);
  }

  async updatePosition(tenantId: string, id: string, data: any, userId?: string): Promise<Position> {
    const eventReferenceId = `EVT-HR-POS-UPD-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const beforeState = await this.hrRepository.getPositionById(tenantId, id);
      const position = await this.hrRepository.updatePosition(tenantId, id, data, tx);
      
      // 1. Audit Logging (Transactional)
      await this.auditService.log({
        tenantId,
        userId: userId || "SYSTEM",
        module: "HR",
        action: "UPDATE",
        entityType: "POSITION",
        entityId: position.id,
        beforeState,
        afterState: position,
        eventReferenceId,
        metadata: data,
      }, tx);

      // 2. System Logging
      await this.loggerService.log({
        tenantId,
        module: "HR",
        level: "INFO",
        event: "POSITION_UPDATED",
        message: `Position updated: ${position.id}`,
        payload: { positionId: position.id },
        userId,
      });

      // 3. Domain Event (Transactional)
      await this.eventBus.publish({
        eventType: EVENT_NAMES.POSITION_UPDATED,
        tenantId,
        entityId: id,
        entityType: "POSITION",
        sourceModule: "HR",
        userId,
        eventReferenceId,
        payload: data,
      }, tx);

      return position;
    });
  }

  async getCompensation(tenantId: string, employeeId: string): Promise<Compensation | null> {
    return this.hrRepository.getCompensation(tenantId, employeeId);
  }

  async updateCompensation(tenantId: string, employeeId: string, data: any, userId?: string): Promise<Compensation> {
    const eventReferenceId = `EVT-HR-COMP-UPD-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const beforeState = await this.hrRepository.getCompensation(tenantId, employeeId);
      const compensation = await this.hrRepository.updateCompensation(tenantId, employeeId, data, tx);
      
      // 1. Audit Logging (Transactional)
      if (userId) {
        await this.auditService.log({
          tenantId,
          userId,
          module: "HR",
          action: "UPDATE",
          entityType: "COMPENSATION",
          entityId: compensation.id,
          beforeState,
          afterState: compensation,
          eventReferenceId,
          metadata: data,
        }, tx);
      }

      // 2. System Logging
      await this.loggerService.log({
        tenantId,
        module: "HR",
        level: "INFO",
        event: "COMPENSATION_UPDATED",
        message: `Compensation updated for employee: ${employeeId}`,
        payload: { employeeId, compensationId: compensation.id },
        userId,
      });

      // 3. Domain Event (Transactional)
      await this.eventBus.publish({
        eventType: EVENT_NAMES.DEPARTMENT_UPDATED, // Use Dept update for compensation context
        tenantId,
        entityId: employeeId,
        entityType: "COMPENSATION",
        sourceModule: "HR",
        userId,
        eventReferenceId,
        payload: data,
      }, tx);

      return compensation;
    });
  }


  // Performance Management
  async getPerformanceCycles(tenantId: string): Promise<PerformanceCycle[]> {
    return this.hrRepository.getPerformanceCycles(tenantId);
  }

  async createPerformanceCycle(
    tenantId: string,
    data: CreatePerformanceCycleDto,
    userId?: string,
  ): Promise<PerformanceCycle> {
    const cycle = await this.hrRepository.createPerformanceCycle(
      tenantId,
      data,
    );
    
    // 1. Audit Logging
    if (userId) {
      await this.auditService.log({
        tenantId,
        userId,
        module: "HR",
        action: "CREATE",
        entityType: "PERFORMANCE_CYCLE",
        entityId: cycle.id,
        afterState: cycle,
        metadata: { name: data.name },
      });
    }

    // 2. System Logging
    await this.loggerService.log({
      tenantId,
      module: "HR",
      level: "INFO",
      event: "PERFORMANCE_CYCLE_CREATED",
      message: `Performance Cycle created: ${data.name}`,
      payload: { cycleId: cycle.id },
      userId,
    });

    // 3. Domain Event
    await this.eventBus.publish({
      eventType: EVENT_NAMES.PERFORMANCE_CYCLE_CREATED,
      tenantId,
      entityId: cycle.id,
      entityType: "PERFORMANCE_CYCLE",
      sourceModule: "HR",
      userId,
      payload: { name: data.name },
    });

    return cycle;
  }

  async updatePerformanceCycle(
    tenantId: string,
    id: string,
    data: Partial<PerformanceCycle>,
    userId?: string,
  ): Promise<PerformanceCycle> {
    const beforeState = await this.hrRepository.getPerformanceCycleById?.(tenantId, id);
    const cycle = await this.hrRepository.updatePerformanceCycle(
      tenantId,
      id,
      data,
    );
    
    // 1. Audit Logging
    if (userId) {
      await this.auditService.log({
        tenantId,
        userId,
        module: "HR",
        action: "UPDATE",
        entityType: "PERFORMANCE_CYCLE",
        entityId: id,
        beforeState,
        afterState: cycle,
        changes: data,
      });
    }

    // 2. System Logging
    await this.loggerService.log({
      tenantId,
      module: "HR",
      level: "INFO",
      event: "PERFORMANCE_CYCLE_UPDATED",
      message: `Performance Cycle updated: ${id}`,
      payload: { cycleId: id },
      userId,
    });

    // 3. Domain Event
    await this.eventBus.publish({
      eventType: "HR.PERFORMANCE_CYCLE_UPDATED",
      tenantId,
      entityId: id,
      entityType: "PERFORMANCE_CYCLE",
      sourceModule: "HR",
      userId,
      payload: data,
    });

    return cycle;
  }

  async getPerformanceReviews(tenantId: string, cycleId?: string, employeeId?: string): Promise<PerformanceReview[]> {
    return this.hrRepository.getPerformanceReviews(tenantId, cycleId, employeeId);
  }

  async getGlobalPerformanceReviews(cycleId?: string, employeeId?: string): Promise<PerformanceReview[]> {
    return this.hrRepository.getGlobalPerformanceReviews(cycleId, employeeId);
  }

  async submitPerformanceReview(tenantId: string, data: SubmitReviewDto, userId?: string, tx?: Prisma.TransactionClient): Promise<PerformanceReview> {
    const eventReferenceId = `EVT-HR-PERF-REV-${Date.now()}`;
    const execute = async (contextTx: Prisma.TransactionClient) => {
      const review = await this.hrRepository.submitPerformanceReview(tenantId, data, contextTx);
      if (userId) {
        await this.auditService.log({
          tenantId, userId, module: "HR", action: "SUBMIT", entityType: "PERFORMANCE_REVIEW", entityId: review.id, afterState: review, eventReferenceId, metadata: { employeeId: data.employeeId, rating: data.rating },
        }, contextTx);
      }
      return review;
    };

    if (tx) return execute(tx);
    return this.prisma.$transaction(execute);
  }

  async getPositionById(tenantId: string, id: string): Promise<Position | null> {
    return this.hrRepository.getPositionById(tenantId, id);
  }

  // Case Management
  async getCases(tenantId: string, locationId?: string, status?: string, employeeId?: string): Promise<HRCase[]> {
    return this.hrRepository.getCases(tenantId, locationId, status, employeeId);
  }

  async getCaseById(tenantId: string, id: string): Promise<HRCase | null> {
    return this.hrRepository.getCaseById(tenantId, id);
  }

  async createCase(tenantId: string, data: CreateCaseDto, userId?: string, tx?: Prisma.TransactionClient): Promise<HRCase> {
    const hrCase = await this.hrRepository.createCase(tenantId, data, tx);
    
    // 1. Audit Logging
    if (userId) {
      await this.auditService.log({
        tenantId,
        userId,
        module: "HR",
        action: "CREATE",
        entityType: "CASE",
        entityId: hrCase.id,
        afterState: hrCase,
        metadata: { title: data.title, type: data.type },
      });
    }

    // 2. System Logging
    await this.loggerService.log({
      tenantId,
      module: "HR",
      level: "INFO",
      event: "CASE_CREATED",
      message: `HR Case created: ${data.title}`,
      payload: { caseId: hrCase.id },
      userId,
    });

    // 3. Domain Event
    await this.eventBus.publish({
      eventType: EVENT_NAMES.CASE_CREATED,
      tenantId,
      entityId: hrCase.id,
      entityType: "CASE",
      sourceModule: "HR",
      userId,
      payload: { title: data.title, type: data.type },
    });

    return hrCase;
  }

   async updateCase(
    tenantId: string,
    id: string,
    data: Partial<HRCase>,
    userId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<HRCase> {
    const beforeState = await this.hrRepository.getCaseById(tenantId, id);
    const hrCase = await this.hrRepository.updateCase(tenantId, id, data, tx);
    
    // 1. Audit Logging
    if (userId) {
      await this.auditService.log({
        tenantId,
        userId,
        module: "HR",
        action: "UPDATE",
        entityType: "CASE",
        entityId: id,
        beforeState,
        afterState: hrCase,
        changes: data,
      });
    }

    // 2. System Logging
    await this.loggerService.log({
      tenantId,
      module: "HR",
      level: "INFO",
      event: "CASE_UPDATED",
      message: `HR Case updated: ${id}`,
      payload: { caseId: id, updates: data },
      userId,
    });

    // 3. Domain Event
    await this.eventBus.publish({
      eventType: "HR.CASE_UPDATED",
      tenantId,
      entityId: id,
      entityType: "CASE",
      sourceModule: "HR",
      userId,
      payload: data,
    });

    return hrCase;
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
    userId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Contract> {
    const contract = await this.hrRepository.createContract(tenantId, data, tx);
    
    // 1. Audit Logging
    if (userId) {
      await this.auditService.log({
        tenantId,
        userId,
        module: "HR",
        action: "CREATE",
        entityType: "CONTRACT",
        entityId: contract.id,
        afterState: contract,
        metadata: { employeeId: data.employeeId, type: data.type },
      });
    }

    // 2. System Logging
    await this.loggerService.log({
      tenantId,
      module: "HR",
      level: "INFO",
      event: "CONTRACT_CREATED",
      message: `Employment contract created for employee: ${data.employeeId}`,
      payload: { contractId: contract.id, employeeId: data.employeeId },
      userId,
    });

    // 3. Domain Event
    await this.eventBus.publish({
      eventType: EVENT_NAMES.CONTRACT_CREATED,
      tenantId,
      entityId: contract.id,
      entityType: "CONTRACT",
      sourceModule: "HR",
      userId,
      payload: { employeeId: data.employeeId, type: data.type },
    });

    return contract;
  }

   async updateContract(
    tenantId: string,
    id: string,
    data: Partial<Contract>,
    userId?: string,
  ): Promise<Contract> {
    const beforeState = await this.hrRepository.getContractById?.(tenantId, id);
    const contract = await this.hrRepository.updateContract(tenantId, id, data);
    
    // 1. Audit Logging
    if (userId) {
      await this.auditService.log({
        tenantId,
        userId,
        module: "HR",
        action: "UPDATE",
        entityType: "CONTRACT",
        entityId: id,
        beforeState,
        afterState: contract,
        changes: data,
      });
    }

    // 2. System Logging
    await this.loggerService.log({
      tenantId,
      module: "HR",
      level: "INFO",
      event: "CONTRACT_UPDATED",
      message: `Employment contract updated: ${id}`,
      payload: { contractId: id, updates: data },
      userId,
    });

    // 3. Domain Event
    await this.eventBus.publish({
      eventType: "HR.CONTRACT_UPDATED",
      tenantId,
      entityId: id,
      entityType: "CONTRACT",
      sourceModule: "HR",
      userId,
      payload: data,
    });

    return contract;
  }

  // Location Management
  async getLocations(tenantId: string): Promise<any[]> {
    return this.hrRepository.getLocations(tenantId);
  }

  // Training Management
  async getTrainingPrograms(tenantId: string): Promise<any[]> {
    return this.hrRepository.getTrainingPrograms(tenantId);
  }

  async createTrainingProgram(tenantId: string, data: any, userId?: string): Promise<any> {
    const program = await this.hrRepository.createTrainingProgram(tenantId, data);
    
    // 1. Audit Logging
    if (userId) {
      await this.auditService.log({
        tenantId,
        userId,
        module: "hr",
        action: "CREATE",
        entityType: "TRAINING_PROGRAM",
        entityId: program.id,
        afterState: program,
      });
    }

    // 2. System Logging
    await this.loggerService.log({
      tenantId,
      module: "HR",
      level: "INFO",
      event: "TRAINING_PROGRAM_CREATED",
      message: `Training program created: ${data.title || program.id}`,
      payload: { programId: program.id },
      userId,
    });

    // 3. Domain Event
    await this.eventBus.publish({
      eventType: "HR.TRAINING_PROGRAM_CREATED",
      tenantId,
      entityId: program.id,
      entityType: "TRAINING_PROGRAM",
      sourceModule: "HR",
      userId,
      payload: { title: data.title },
    });

    return program;
  }

  async getTrainingAssignments(tenantId: string): Promise<any[]> {
    return this.hrRepository.getTrainingAssignments(tenantId);
  }

  async createTrainingAssignment(tenantId: string, data: any, userId?: string): Promise<any> {
    const assignment = await this.hrRepository.createTrainingAssignment(tenantId, data);
    
    // 1. Audit Logging
    if (userId) {
      await this.auditService.log({
        tenantId,
        userId,
        module: "hr",
        action: "CREATE",
        entityType: "TRAINING_ASSIGNMENT",
        entityId: assignment.id,
        afterState: assignment,
      });
    }

    // 2. System Logging
    await this.loggerService.log({
      tenantId,
      module: "HR",
      level: "INFO",
      event: "TRAINING_ASSIGNMENT_CREATED",
      message: `Training assigned: ${assignment.id}`,
      payload: { assignmentId: assignment.id, employeeId: data.employeeId },
      userId,
    });

    // 3. Domain Event
    await this.eventBus.publish({
      eventType: "HR.TRAINING_ASSIGNED",
      tenantId,
      entityId: assignment.id,
      entityType: "TRAINING_ASSIGNMENT",
      sourceModule: "HR",
      userId,
      payload: { employeeId: data.employeeId, programId: data.programId },
    });

    return assignment;
  }

  async updateTrainingAssignment(tenantId: string, id: string, data: any, userId?: string): Promise<any> {
    const beforeState = await this.hrRepository.getTrainingAssignmentById?.(tenantId, id);
    const assignment = await this.hrRepository.updateTrainingAssignment(tenantId, id, data);
    
    // 1. Audit Logging
    if (userId) {
      await this.auditService.log({
        tenantId,
        userId,
        module: "hr",
        action: "UPDATE",
        entityType: "TRAINING_ASSIGNMENT",
        entityId: assignment.id,
        beforeState,
        afterState: assignment,
        changes: data,
      });
    }

    // 2. System Logging
    await this.loggerService.log({
      tenantId,
      module: "HR",
      level: "INFO",
      event: "TRAINING_STATUS_UPDATED",
      message: `Training assignment ${id} updated to status: ${data.status}`,
      payload: { assignmentId: id, status: data.status },
      userId,
    });

    // 3. Domain Event
    await this.eventBus.publish({
      eventType: "HR.TRAINING_STATUS_UPDATED",
      tenantId,
      entityId: id,
      entityType: "TRAINING_ASSIGNMENT",
      sourceModule: "HR",
      userId,
      payload: { status: data.status },
    });

    return assignment;
  }

  // Analytics & Reporting
  async getHeadcountTrend(tenantId: string): Promise<any[]> {
    return this.hrRepository.getHeadcountTrend(tenantId);
  }

  async getTurnoverStats(tenantId: string): Promise<any> {
    return this.hrRepository.getTurnoverStats(tenantId);
  }

  async getDepartmentAnalytics(tenantId: string): Promise<any[]> {
    return this.hrRepository.getDepartmentAnalytics(tenantId);
  }

  async getCompensationAnalytics(tenantId: string): Promise<any> {
    return this.hrRepository.getCompensationAnalytics(tenantId);
  }

  async getExperienceRate(tenantId: string): Promise<any> {
    return this.hrRepository.getExperienceRate(tenantId);
  }

  async getActualLaborCostHistory(tenantId: string, departmentId: string, monthLimit: number): Promise<any[]> {
    return this.hrRepository.getActualLaborCostHistory(tenantId, departmentId, monthLimit);
  }


  /**
   * Resolves the full business context of an HR related event.
   * Used by Chat and Mail modules to display 'Rich Event Context' 
   * based on the eventReferenceId.
   */
  async resolveEventContext(tenantId: string, eventReferenceId: string): Promise<any> {
    const auditLog = await this.prisma.auditLog.findFirst({
      where: {
        tenantId,
        eventReferenceId,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!auditLog) return null;

    const domainEvent = await this.prisma.domainEvent.findFirst({
      where: {
        tenantId,
        eventReferenceId,
      },
    });

    return {
      referenceId: eventReferenceId,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      timestamp: auditLog.createdAt,
      actorId: auditLog.userId,
      data: auditLog.afterState || auditLog.metadata,
      eventType: domainEvent?.eventType,
      payload: domainEvent?.payload,
    };
  }
}

