import { Employee } from "../entities/employee.entity";
import { Attendance } from "../entities/attendance.entity";
import { LeaveRequest } from "../entities/leave-request.entity";
import { Payroll } from "../entities/payroll.entity";
import { Department } from "../entities/department.entity";
import { JobRequisition } from "../entities/requisition.entity";
import { PerformanceCycle } from "../entities/performance-cycle.entity";
import { PerformanceReview } from "../entities/performance-review.entity";
import { HRCase } from "../entities/hr-case.entity";
import { Contract } from "../entities/contract.entity";

import { CreateEmployeeDto } from "../dto/create-employee.dto";
import { UpdateEmployeeDto } from "../dto/update-employee.dto";
import { CreateLeaveRequestDto } from "../dto/create-leave-request.dto";
import { CreateDepartmentDto } from "../dto/create-department.dto";
import { CreateRequisitionDto } from "../dto/create-requisition.dto";
import { CreatePerformanceCycleDto } from "../dto/create-performance-cycle.dto";
import { SubmitReviewDto } from "../dto/submit-review.dto";
import { CreateCaseDto } from "../dto/create-case.dto";
import { CreateContractDto } from "../dto/create-contract.dto";

/**
 * HR Repository Interface
 * Abstract class defining the contract for HR data persistence
 *
 * CRITICAL: All methods MUST accept tenantId as the first argument
 */
export abstract class IHRRepository {
  // Employee Management
  abstract getEmployees(
    tenantId: string,
    locationId?: string,
  ): Promise<Employee[]>;
  abstract getGlobalEmployees(locationId?: string): Promise<Employee[]>;
  abstract getEmployeeById(
    tenantId: string,
    employeeId: string,
  ): Promise<Employee | null>;
  abstract getGlobalEmployeeById(employeeId: string): Promise<Employee | null>;
  abstract createEmployee(
    tenantId: string,
    data: CreateEmployeeDto,
  ): Promise<Employee>;
  abstract updateEmployee(
    tenantId: string,
    employeeId: string,
    data: UpdateEmployeeDto,
  ): Promise<Employee>;
  abstract deactivateEmployee(
    tenantId: string,
    employeeId: string,
  ): Promise<Employee>;

  // Attendance Management
  abstract getAttendance(
    tenantId: string,
    locationId?: string,
    employeeId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<Attendance[]>;
  abstract getGlobalAttendance(
    employeeId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<Attendance[]>;
  abstract clockIn(
    tenantId: string,
    employeeId: string,
    locationId: string,
  ): Promise<Attendance>;
  abstract clockOut(tenantId: string, employeeId: string): Promise<Attendance>;

  // Leave Management
  abstract getLeaveRequests(
    tenantId: string,
    locationId?: string,
    status?: string,
    employeeId?: string,
  ): Promise<LeaveRequest[]>;
  abstract getGlobalLeaveRequests(
    status?: string,
    employeeId?: string,
  ): Promise<LeaveRequest[]>;
  abstract createLeaveRequest(
    tenantId: string,
    data: CreateLeaveRequestDto,
  ): Promise<LeaveRequest>;
  abstract approveLeaveRequest(
    tenantId: string,
    requestId: string,
    reviewerId: string,
    notes?: string,
  ): Promise<LeaveRequest>;
  abstract rejectLeaveRequest(
    tenantId: string,
    requestId: string,
    reviewerId: string,
    notes: string,
  ): Promise<LeaveRequest>;

  // Payroll Management
  abstract getPayroll(
    tenantId: string,
    locationId?: string,
    employeeId?: string,
    period?: string,
  ): Promise<Payroll[]>;
  abstract getGlobalPayroll(
    employeeId: string,
    period?: string,
  ): Promise<Payroll[]>;
  abstract calculatePayroll(
    tenantId: string,
    employeeId: string,
    period: string,
  ): Promise<Payroll>;

  // Organization Management
  abstract getDepartments(tenantId: string): Promise<Department[]>;
  abstract getGlobalDepartments(): Promise<Department[]>;
  abstract getDepartmentById(
    tenantId: string,
    departmentId: string,
  ): Promise<Department | null>;
  abstract createDepartment(
    tenantId: string,
    data: CreateDepartmentDto,
  ): Promise<Department>;

  // Recruitment Management
  abstract getRequisitions(
    tenantId: string,
    status?: string,
  ): Promise<JobRequisition[]>;
  abstract getGlobalRequisitions(status?: string): Promise<JobRequisition[]>;
  abstract createRequisition(
    tenantId: string,
    data: CreateRequisitionDto,
  ): Promise<JobRequisition>;
  abstract updateRequisition(
    tenantId: string,
    id: string,
    data: Partial<JobRequisition>,
  ): Promise<JobRequisition>;

  // Performance Management
  abstract getPerformanceCycles(tenantId: string): Promise<PerformanceCycle[]>;
  abstract createPerformanceCycle(
    tenantId: string,
    data: CreatePerformanceCycleDto,
  ): Promise<PerformanceCycle>;
  abstract updatePerformanceCycle(
    tenantId: string,
    id: string,
    data: Partial<PerformanceCycle>,
  ): Promise<PerformanceCycle>;
  abstract getPerformanceReviews(
    tenantId: string,
    cycleId?: string,
    employeeId?: string,
  ): Promise<PerformanceReview[]>;
  abstract getGlobalPerformanceReviews(
    cycleId?: string,
    employeeId?: string,
  ): Promise<PerformanceReview[]>;
  abstract submitPerformanceReview(
    tenantId: string,
    data: SubmitReviewDto,
  ): Promise<PerformanceReview>;

  // Case Management
  abstract getCases(
    tenantId: string,
    locationId?: string,
    status?: string,
  ): Promise<HRCase[]>;
  abstract getCaseById(tenantId: string, id: string): Promise<HRCase | null>;
  abstract createCase(tenantId: string, data: CreateCaseDto): Promise<HRCase>;
  abstract updateCase(
    tenantId: string,
    id: string,
    data: Partial<HRCase>,
  ): Promise<HRCase>;

  // Contract Management
  abstract getContracts(
    tenantId: string,
    locationId?: string,
    employeeId?: string,
  ): Promise<Contract[]>;
  abstract getGlobalContracts(employeeId?: string): Promise<Contract[]>;
  abstract createContract(
    tenantId: string,
    data: CreateContractDto,
  ): Promise<Contract>;
  abstract updateContract(
    tenantId: string,
    id: string,
    data: Partial<Contract>,
  ): Promise<Contract>;

  // Location Management
  abstract getLocations(tenantId: string): Promise<any[]>;

  // Training Management
  abstract getTrainingPrograms(tenantId: string): Promise<any[]>;
  abstract createTrainingProgram(tenantId: string, data: any): Promise<any>;
  abstract getTrainingAssignments(tenantId: string): Promise<any[]>;
  abstract createTrainingAssignment(tenantId: string, data: any): Promise<any>;
  abstract updateTrainingAssignment(tenantId: string, id: string, data: any): Promise<any>;
}
