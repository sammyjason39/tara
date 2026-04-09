import { Injectable } from "@nestjs/common";
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from "../../../persistence/prisma.service";
import { Prisma } from "@prisma/client";
import { IHRRepository } from "./hr.repository.interface";
import { Employee } from "../entities/employee.entity";
import { Attendance } from "../entities/attendance.entity";
import { LeaveRequest } from "../entities/leave-request.entity";
import { Payroll } from "../entities/payroll.entity";
import { CreateEmployeeDto } from "../dto/create-employee.dto";
import { UpdateEmployeeDto } from "../dto/update-employee.dto";
import { CreateLeaveRequestDto } from "../dto/create-leave-request.dto";
import { Department } from "../entities/department.entity";
import { JobRequisition } from "../entities/requisition.entity";
import { PerformanceCycle } from "../entities/performance-cycle.entity";
import { PerformanceReview } from "../entities/performance-review.entity";
import { HRCase } from "../entities/hr-case.entity";
import { Contract } from "../entities/contract.entity";
import { Candidate } from "../entities/candidate.entity";
import { Position } from "../entities/position.entity";
import { Compensation } from "../entities/compensation.entity";
import { Interview } from "../entities/interview.entity";
import { TalentLead } from "../entities/talent-lead.entity";
import { ComplianceDocument } from "../entities/compliance-document.entity";
import { BudgetScenario } from "../entities/budget-scenario.entity";
import { HeadcountPlan } from "../entities/headcount-plan.entity";
import { ExchangeRate } from "../entities/exchange-rate.entity";
import { PayrollRun } from "../entities/payroll-run.entity";
import { PayrollLine } from "../entities/payroll-line.entity";
import { SuccessionPlan } from "../entities/succession-plan.entity";
import { handlePrismaFkError, assertExists } from "../utils/hr-prisma.errors";
import { SuccessionCandidate } from "../entities/succession-candidate.entity";
import { Skill } from "../entities/skill.entity";
import { EmployeeSkill } from "../entities/employee-skill.entity";
import { BenefitPlan } from "../entities/benefit-plan.entity";
import { EmployeeBenefit } from "../entities/employee-benefit.entity";
import { CareerPath } from "../entities/career-path.entity";
import { MentorshipPair } from "../entities/mentorship-pair.entity";
import { PositionSkill } from "../entities/position-skill.entity";
import { PerformanceGoal } from "../entities/performance-goal.entity";
import { TrainingProgram } from "../entities/training-program.entity";
import { TrainingAssignment } from "../entities/training-assignment.entity";
import { ProgramSkill } from "../entities/program-skill.entity";
import { CreateDepartmentDto } from "../dto/create-department.dto";
import { CreateRequisitionDto } from "../dto/create-requisition.dto";
import { CreatePerformanceCycleDto } from "../dto/create-performance-cycle.dto";
import { SubmitReviewDto } from "../dto/submit-review.dto";
import { CreateCaseDto } from "../dto/create-case.dto";
import { CreateContractDto } from "../dto/create-contract.dto";

@Injectable()
export class HRDbRepository implements IHRRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // EMPLOYEE MANAGEMENT
  // ============================================================

  async getEmployees(
    tenantId: string,
    locationId?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: Employee[]; total: number }> {
    const where: any = {
      tenantId: tenantId,
      deletedAt: null,
    };

    if (locationId) {
      where.locationId = locationId;
    }

    const [employees, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        include: { location: true,
          department: true,
        },
        orderBy: { lastName: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.employee.count({ where }),
    ]);

    return {
      data: employees.map(this.mapEmployee),
      total,
    };
  }

  async getGlobalEmployees(
    locationId?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: Employee[]; total: number }> {
    const where: any = {
      deletedAt: null,
    };

    if (locationId) {
      where.locationId = locationId;
    }

    const [employees, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        include: { location: true,
          department: true,
        },
        orderBy: { lastName: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.employee.count({ where }),
    ]);

    return {
      data: employees.map(this.mapEmployee),
      total,
    };
  }

  async getEmployeeById(
    tenantId: string,
    employeeId: string,
  ): Promise<Employee | null> {
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: employeeId,
        tenantId: tenantId,
        deletedAt: null,
      },
      include: { location: true,
        department: true,
      },
    });

    return employee ? this.mapEmployee(employee) : null;
  }

  async getGlobalEmployeeById(employeeId: string): Promise<Employee | null> {
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: employeeId,
        deletedAt: null,
      },
      include: { location: true,
        department: true,
      },
    });

    return employee ? this.mapEmployee(employee) : null;
  }

  async createEmployee(
    tenantId: string,
    data: CreateEmployeeDto,
    tx?: Prisma.TransactionClient,
  ): Promise<Employee> {
    const db = tx ?? this.prisma;
    // Ensure locationId is provided or use first available location
    let locationId = data.locationId;
    if (!locationId) {
      const firstLocation = await db.location.findFirst({
        where: { tenantId: tenantId },
      });
      locationId = firstLocation?.id || "loc-default";
    }

    // --- PROVISIONING LOGIC ---
    // Ensure a User account exists for this employee
    let user = await db.user.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email: data.email,
        },
      },
    });

    if (!user) {
      // Create a default user account
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash("Welcome123", salt);

      user = await db.user.create({
        data: {
        tenantId,
          email: data.email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
        },
      });
    }

    // Ensure UserCompany association exists for multi-tenancy access
    await db.userCompany.upsert({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId: tenantId
        }
      },
      update: {}, // Keep existing role if already associated
      create: {
        userId: user.id,
        tenantId: tenantId,
        role: 'MEMBER'
      }
    });

    const employee = await db.employee.create({
      data: {
        tenantId: tenantId,
        locationId,
        departmentId: data.departmentId,
        employeeCode: data.employeeCode,
        userId: user.id, // Link to the user account
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        managerId: data.managerId,
        position: data.roleTitle || "Staff",
        employmentType: data.employmentType,
        baseSalary: data.baseSalary,
        hourlyRate: data.hourlyRate,
        hireDate: data.hireDate ? new Date(data.hireDate) : new Date(),
        status: (data.status as string) || "active",
      },
      include: { location: true,
        department: true,
      },
    });

    return this.mapEmployee(employee);
  }

  async updateEmployee(
    tenantId: string,
    employeeId: string,
    data: UpdateEmployeeDto,
    tx?: Prisma.TransactionClient,
  ): Promise<Employee> {
    const db = tx ?? this.prisma;
    const updateData: any = {};

    if (data.firstName) updateData.firstName = data.firstName;
    if (data.lastName) updateData.lastName = data.lastName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.departmentId) updateData.departmentId = data.departmentId;
    if (data.managerId !== undefined) updateData.managerId = data.managerId;
    if (data.roleTitle) updateData.position = data.roleTitle;
    if (data.locationId) updateData.locationId = data.locationId;
    if (data.employmentType) updateData.employmentType = data.employmentType;
    if (data.baseSalary !== undefined) updateData.baseSalary = data.baseSalary;
    if (data.hourlyRate !== undefined) updateData.hourlyRate = data.hourlyRate;
    if (data.status) updateData.status = data.status;

    const employee = await db.employee.update({
      where: {
        id: employeeId,
        tenantId: tenantId,
      },
      data: updateData,
      include: { location: true,
        department: true,
      },
    });

    return this.mapEmployee(employee);
  }

  async deactivateEmployee(
    tenantId: string,
    employeeId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Employee> {
    const db = tx ?? this.prisma;
    const employee = await db.employee.update({
      where: {
        id: employeeId,
        tenantId: tenantId,
      },
      data: {
        deletedAt: new Date(),
        status: "terminated",
      },
      include: { location: true,
        department: true,
      },
    });

    return this.mapEmployee(employee);
  }

  // ============================================================
  // ATTENDANCE MANAGEMENT
  // ============================================================

  async getAttendance(
    tenantId: string,
    locationId?: string,
    employeeId?: string,
    startDate?: string,
    endDate?: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ data: Attendance[]; total: number }> {
    const where: any = { 
      tenantId: tenantId,
      deletedAt: null,
    };

    if (locationId) where.locationId = locationId;
    if (employeeId) where.employeeId = employeeId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const [records, total] = await Promise.all([
      this.prisma.hrAttendanceRecord.findMany({
        where,
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.hrAttendanceRecord.count({ where }),
    ]);

    return {
      data: records.map(this.mapAttendance),
      total,
    };
  }

  async getGlobalAttendance(
    employeeId?: string,
    startDate?: string,
    endDate?: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ data: Attendance[]; total: number }> {
    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const [attendance, total] = await Promise.all([
      this.prisma.hrAttendanceRecord.findMany({
        where: {
          ...where,
          deletedAt: null,
        },
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.hrAttendanceRecord.count({
        where: {
          ...where,
          deletedAt: null,
        },
      }),
    ]);

    return {
      data: attendance.map(this.mapAttendance),
      total,
    };
  }

  async clockIn(
    tenantId: string,
    employeeId: string,
    locationId: string,
    shiftId?: string,
    method: string = "manual",
    metadata?: any,
    tx?: Prisma.TransactionClient,
  ): Promise<Attendance> {
    const db = tx ?? this.prisma;
    const now = new Date();

    const attendance = await db.hrAttendanceRecord.create({
      data: {
        tenantId,
        employeeId,
        locationId,
        shiftId: shiftId || null,
        date: now,
        status: "present",
        checkIn: {
          time: now.toISOString(),
          method,
          ...(metadata?.gps ? { gps: metadata.gps } : {}),
          ...(metadata?.deviceId ? { deviceId: metadata.deviceId } : {}),
        },
        workDurationMinutes: 0,
        metadata: metadata || {},
      },
    });

    return this.mapAttendance(attendance);
  }

  async clockOut(tenantId: string, employeeId: string, tx?: Prisma.TransactionClient): Promise<Attendance> {
    const db = tx ?? this.prisma;
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];

    // Find today's attendance record
    const todayAttendance = await db.hrAttendanceRecord.findFirst({
      where: {
        tenantId: tenantId,
        employeeId,
        date: {
          gte: new Date(dateStr + "T00:00:00Z"),
          lt: new Date(dateStr + "T23:59:59Z"),
        },
        checkOut: null as any,
        deletedAt: null,
      },
      orderBy: { date: "desc" },
    });

    if (!todayAttendance) {
      throw new Error("No active clock-in found for today");
    }

    // Calculate work duration in minutes
    const checkInData = todayAttendance.checkIn as any;
    const clockInTime = new Date(checkInData?.time || todayAttendance.date);
    const durationMinutes = Math.floor(
      (now.getTime() - clockInTime.getTime()) / (1000 * 60),
    );

    const attendance = await db.hrAttendanceRecord.update({
      where: { id: todayAttendance.id },
      data: {
        checkOut: {
          time: now.toISOString(),
          method: "manual",
        },
        workDurationMinutes: durationMinutes,
      },
    });

    return this.mapAttendance(attendance);
  }

  async assignShift(tenantId: string, employeeId: string, shiftId: string, locationId: string, date: string, tx?: Prisma.TransactionClient): Promise<void> {
    const db = tx ?? this.prisma;
    await db.scheduleAssignment.create({
      data: {
        tenantId,
        employeeId,
        shiftId,
        locationId,
        effectiveDate: new Date(date),
      },
    });
  }

  // ============================================================
  // LEAVE MANAGEMENT
  // ============================================================

  async getLeaveRequests(
    tenantId: string,
    locationId?: string,
    status?: string,
    employeeId?: string,
  ): Promise<LeaveRequest[]> {
    const where: any = { tenantId: tenantId };

    if (locationId) {
      // For leave requests, we might need to join with employees or handle location directly if stored
      where.employee = { locationId: locationId };
    }
    if (status) where.status = status;
    if (employeeId) where.employeeId = employeeId;

    const requests = await this.prisma.leaveRequest.findMany({
      where,
      orderBy: { id: 'desc' }
    });

    return requests.map(this.mapLeaveRequest);
  }

  async getLeaveRequestById(tenantId: string, id: string): Promise<LeaveRequest | null> {
    const request = await this.prisma.leaveRequest.findFirst({
      where: { id, tenantId },
    });
    return request ? this.mapLeaveRequest(request) : null;
  }

  async getGlobalLeaveRequests(
    status?: string,
    employeeId?: string,
  ): Promise<LeaveRequest[]> {
    const where: any = {};
    if (status) where.status = status;
    if (employeeId) where.employeeId = employeeId;
    where.deletedAt = null;

    const requests = await this.prisma.leaveRequest.findMany({
      where,
      orderBy: { id: 'desc' }
    });

    return requests.map(this.mapLeaveRequest);
  }

  async createLeaveRequest(
    tenantId: string,
    data: CreateLeaveRequestDto,
  ): Promise<LeaveRequest> {
    // Calculate total days
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    const totalDays =
      Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      ) + 1;

    const request = await this.prisma.leaveRequest.create({
      data: {
        tenantId: tenantId,
        employeeId: data.employeeId,
        departmentId: data.employeeId, // TODO: Get from employee
        type: data.leaveType,
        startDate: startDate,
        endDate: endDate,
        reason: data.reason,
        status: "requested",
      },
    });

    return this.mapLeaveRequest(request);
  }

  async approveLeaveRequest(
    tenantId: string,
    requestId: string,
    reviewerId: string,
    notes?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<LeaveRequest> {
    const db = tx ?? this.prisma;
    const request = await db.leaveRequest.update({
      where: {
        id: requestId,
        tenantId: tenantId,
      },
      data: {
        status: "approved",
        approvedBy: reviewerId,
        approvedAt: new Date(),
      },
    });

    return this.mapLeaveRequest(request);
  }

  async rejectLeaveRequest(
    tenantId: string,
    requestId: string,
    reviewerId: string,
    notes: string,
    tx?: Prisma.TransactionClient,
  ): Promise<LeaveRequest> {
    const db = tx ?? this.prisma;
    const request = await db.leaveRequest.update({
      where: {
        id: requestId,
        tenantId: tenantId,
      },
      data: {
        status: "rejected",
        approvedBy: reviewerId,
        approvedAt: new Date(),
      },
    });

    return this.mapLeaveRequest(request);
  }

  // ============================================================
  // PAYROLL MANAGEMENT
  // ============================================================

  async getPayroll(
    tenantId: string,
    locationId?: string,
    employeeId?: string,
    period?: string,
  ): Promise<Payroll[]> {
    const where: any = {
      tenantId: tenantId,
    };

    if (locationId) {
      where.employee = { locationId: locationId };
    }
    if (employeeId) {
      where.employeeId = employeeId;
    }

    const payrollLines = await this.prisma.payrollLine.findMany({
      where,
      include: {
        hrPayrollRun: true,
      },
      orderBy: { id: 'desc' }
    });

    return payrollLines.map(this.mapPayroll);
  }

  async getGlobalPayroll(
    employeeId: string,
    period?: string,
  ): Promise<Payroll[]> {
    const where: any = { employeeId };
    if (period) where.period = period;

    const payrolls = await this.prisma.payrollLine.findMany({
      where,
      orderBy: { id: 'desc' }
    });

    return payrolls.map(this.mapPayroll);
  }

  async calculatePayroll(
    tenantId: string,
    employeeId: string,
    period: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Payroll> {
    const db = tx ?? this.prisma;
    // Get employee details
    const employee = await db.employee.findFirst({
      where: { id: employeeId, tenantId: tenantId },
    });

    if (!employee) {
      throw new Error("Employee not found");
    }

    // Simple calculation (in real system, this would be more complex)
    const baseSalary = employee.baseSalary ? Number(employee.baseSalary) : 0;
    const grossPay = baseSalary;
    const adjustments = baseSalary * 0.1; // 10% deductions
    const netPay = grossPay - adjustments;

    // Create or get payroll run for this period
    const [periodStart, periodEnd] = this.getPeriodDates(period);
    let payrollRun = await this.prisma.payrollRun.findFirst({
      where: {
        tenantId: tenantId,
        periodStart,
        periodEnd,
      },
    });

    if (!payrollRun) {
      payrollRun = await db.payrollRun.create({
        data: {
        tenantId: tenantId,
          periodStart,
          periodEnd,
          status: "draft",
        },
      });
    }

    if (!payrollRun) throw new Error("Failed to create payroll run");

    const payrollLine = await db.payrollLine.create({
      data: {
        tenantId: tenantId,
        payrollRunId: (payrollRun as any).id,
        employeeId,
        grossPay,
        adjustments,
        netPay,
      },
      include: {
        hrPayrollRun: true,
      },
    });

    return this.mapPayroll(payrollLine);
  }

  // ============================================================
  // ORGANIZATION MANAGEMENT
  // ============================================================

  async getDepartments(tenantId: string): Promise<Department[]> {
    const departments = await this.prisma.department.findMany({
      where: { tenantId: tenantId, deletedAt: null },
      orderBy: { name: "asc" },
    });
    return departments.map(this.mapDepartment);
  }

  async getGlobalDepartments(): Promise<Department[]> {
    const departments = await this.prisma.department.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });

    return departments.map(this.mapDepartment);
  }

  async getDepartmentById(
    tenantId: string,
    departmentId: string,
  ): Promise<Department | null> {
    const department = await this.prisma.department.findFirst({
      where: { id: departmentId, tenantId: tenantId, deletedAt: null },
    });
    return department ? this.mapDepartment(department) : null;
  }

  async createDepartment(
    tenantId: string,
    data: CreateDepartmentDto,
    tx?: Prisma.TransactionClient,
  ): Promise<Department> {
    const db = tx ?? this.prisma;
    const department = await db.department.create({
      data: {
        tenantId: tenantId,
        name: data.name,
        code: data.code,
        headId: data.headId,
        description: data.description,
        status: "active",
      },
    });
    return this.mapDepartment(department);
  }



  // ============================================================
  // RECRUITMENT MANAGEMENT
  // ============================================================

  async getRequisitions(
    tenantId: string,
    status?: string,
  ): Promise<JobRequisition[]> {
    const where: any = { tenantId: tenantId };
    if (status) where.status = status;

    const requisitions = await this.prisma.jobRequisition.findMany({
      where,
      orderBy: { id: 'desc' }
    });
    return requisitions.map(this.mapRequisition);
  }

  async getGlobalRequisitions(status?: string): Promise<JobRequisition[]> {
    const where: any = {};
    if (status) where.status = status;

    const requisitions = await this.prisma.jobRequisition.findMany({
      where,
      orderBy: { id: 'desc' }
    });

    return requisitions.map(this.mapRequisition);
  }

  async createRequisition(
    tenantId: string,
    data: CreateRequisitionDto,
    tx?: Prisma.TransactionClient,
  ): Promise<JobRequisition> {
    const db = tx ?? this.prisma;
    const requisition = await db.jobRequisition.create({
      data: {
        tenantId: tenantId,
        departmentId: data.departmentId,
        title: data.title,
        openings: data.openings,
        status: "open",
      },
    });
    return this.mapRequisition(requisition);
  }

  async updateRequisition(
    tenantId: string,
    id: string,
    data: Partial<JobRequisition>,
    tx?: Prisma.TransactionClient,
  ): Promise<JobRequisition> {
    const db = tx ?? this.prisma;
    try {
      const requisition = await db.jobRequisition.update({
        where: { id, tenantId: tenantId },
        data: data as Prisma.JobRequisitionUpdateInput,
      });
      return this.mapRequisition(requisition);
    } catch (error) {
      handlePrismaFkError(error, 'JobRequisition');
    }
  }

  // ============================================================
  // PERFORMANCE MANAGEMENT
  // ============================================================

  async getPerformanceCycles(tenantId: string): Promise<PerformanceCycle[]> {
    const cycles = await this.prisma.hrPerformanceCycle.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { id: 'desc' }
    });
    return cycles.map((c) => this.mapPerformanceCycle(c));
  }

  async getPerformanceCycleById(tenantId: string, id: string): Promise<PerformanceCycle | null> {
    const cycle = await this.prisma.hrPerformanceCycle.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    return cycle ? this.mapPerformanceCycle(cycle) : null;
  }


  async createPerformanceCycle(
    tenantId: string,
    data: CreatePerformanceCycleDto,
    tx?: Prisma.TransactionClient,
  ): Promise<PerformanceCycle> {
    const db = tx ?? this.prisma;
    const cycle = await db.hrPerformanceCycle.create({
      data: {
        tenantId,
        name: data.name,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        dueDate: new Date(data.dueDate),
        status: "active",
      },
    });
    return this.mapPerformanceCycle(cycle);
  }

  async updatePerformanceCycle(
    tenantId: string,
    id: string,
    data: any,
    tx?: Prisma.TransactionClient,
  ): Promise<PerformanceCycle> {
    const db = tx ?? this.prisma;
    const updated = await db.hrPerformanceCycle.update({
      where: { id, tenantId },
      data,
    });
    return this.mapPerformanceCycle(updated);
  }

  async getPerformanceReviews(
    tenantId: string,
    cycleId?: string,
    employeeId?: string,
  ): Promise<PerformanceReview[]> {
    const where: any = { tenantId };
    if (cycleId) where.cycleId = cycleId;
    if (employeeId) where.employeeId = employeeId;

    const reviews = await this.prisma.performanceReview.findMany({
      where,
      orderBy: { id: 'desc' }
    });

    return reviews.map((r: any) => this.mapPerformanceReview(r));
  }

  async getGlobalPerformanceReviews(cycleId?: string, employeeId?: string): Promise<PerformanceReview[]> {
    const where: any = {};
    if (cycleId) where.cycleId = cycleId;
    if (employeeId) where.employeeId = employeeId;

    const reviews = await this.prisma.performanceReview.findMany({
      where,
      orderBy: { id: 'desc' }
    });

    return reviews.map((r: any) => this.mapPerformanceReview(r));
  }


  async submitPerformanceReview(
    tenantId: string,
    data: SubmitReviewDto,
    tx?: Prisma.TransactionClient,
  ): Promise<PerformanceReview> {
    const db = tx ?? this.prisma;
    const review = await db.performanceReview.create({
      data: {
        tenantId,
        cycleId: data.cycleId,
        employeeId: data.employeeId,
        reviewerId: data.reviewerId,
        rating: data.rating,
        comments: data.comments,
        status: "submitted",
      },
    });
    return this.mapPerformanceReview(review);
  }

  // ============================================================
  // CASE MANAGEMENT
  // ============================================================

  async getCases(
    tenantId: string,
    locationId?: string,
    status?: string,
  ): Promise<HRCase[]> {
    const where: any = { tenantId, deletedAt: null };
    if (locationId) where.employee = { locationId };
    if (status) where.status = status;

    const cases = await this.prisma.hrCase.findMany({
      where,
      orderBy: { id: 'desc' }
    });
    return cases.map((c) => this.mapHRCase(c));
  }

  async createCase(tenantId: string, data: CreateCaseDto, tx?: Prisma.TransactionClient): Promise<HRCase> {
    const db = tx ?? this.prisma;
    const hrCase = await db.hrCase.create({
      data: {
        tenantId,
        employeeId: data.employeeId,
        departmentId: data.departmentId,
        title: data.title,
        type: data.type,
        priority: (data.priority as any) || "medium",
        status: "open",
      },
    });
    return this.mapHRCase(hrCase);
  }

  async updateCase(tenantId: string, id: string, data: any, tx?: Prisma.TransactionClient): Promise<HRCase> {
    const db = tx ?? this.prisma;
    const updated = await db.hrCase.update({
      where: { id, tenantId },
      data,
    });
    return this.mapHRCase(updated);
  }


  // ============================================================
  // CONTRACT MANAGEMENT
  // ============================================================

  async getContracts(
    tenantId: string,
    locationId?: string,
    employeeId?: string,
  ): Promise<Contract[]> {
    const where: any = { tenantId, deletedAt: null };
    if (locationId) where.employee = { locationId };
    if (employeeId) where.employeeId = employeeId;

    const contracts = await this.prisma.contract.findMany({
      where,
      orderBy: { id: 'desc' }
    });

    return contracts.map((c: any) => this.mapContract(c));
  }

  async getGlobalContracts(employeeId?: string): Promise<Contract[]> {
    const where: any = { deletedAt: null };
    if (employeeId) where.employeeId = employeeId;

    const contracts = await this.prisma.contract.findMany({
      where,
      orderBy: { id: 'desc' }
    });

    return contracts.map((c: any) => this.mapContract(c));
  }

  async createContract(tenantId: string, data: CreateContractDto, tx?: Prisma.TransactionClient): Promise<Contract> {
    const db = tx ?? this.prisma;
    const contract = await db.contract.create({
      data: {
        tenantId,
        ...data,
        status: "ACTIVE",
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
    return contract as any;
  }

  async updateContract(tenantId: string, id: string, data: any, tx?: Prisma.TransactionClient): Promise<Contract> {
    const db = tx ?? this.prisma;
    const updated = await db.contract.update({
      where: { id, tenantId },
      data,
    });
    return this.mapContract(updated);
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  private getPeriodDates(period: string): [Date, Date] {
    // Expecting format: YYYY-MM
    const [year, month] = period.split("-").map(Number);
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0); // Last day of month
    return [periodStart, periodEnd];
  }

  // ============================================================
  // MAPPERS
  // ============================================================

  private mapEmployee(e: any): Employee {
    return {
      id: e.id,
      tenantId: e.tenantId,
      locationId: e.locationId,
      employeeCode: e.employeeCode,
      firstName: e.firstName,
      lastName: e.lastName,
      fullName: `${e.firstName} ${e.lastName}`,
      email: e.email,
      phone: e.phone,
      departmentId: e.departmentId,
      managerId: e.managerId || undefined,
      userId: e.userId || undefined,
      roleTitle: e.position || e.roleTitle || "",
      position: e.position || "",
      positionId: (e as any).positionId || undefined,
      status: e.status.toLowerCase() as any,
      employmentType: e.employmentType as any,
      baseSalary: e.baseSalary ? Number(e.baseSalary) : undefined,
      hourlyRate: e.hourlyRate ? Number(e.hourlyRate) : undefined,
      hireDate: e.hireDate,
      terminationDate: e.terminationDate,
      documentsMetadata: e.documentMetadata,
      hrEmployeeSkills: e.hrEmployeeSkills ? e.hrEmployeeSkills.map((es: any) => this.mapEmployeeSkill(es)) : undefined,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  }

  private mapAttendance(a: any): Attendance {
    const checkInData = a.checkIn as any;
    const checkOutData = a.checkOut as any;

    return {
      id: a.id,
      tenantId: a.tenantId,
      employeeId: a.employeeId,
      locationId: a.locationId,
      clockIn: checkInData?.time ? new Date(checkInData.time) : a.date,
      clockOut: checkOutData?.time ? new Date(checkOutData.time) : undefined,
      date: a.date.toISOString().split("T")[0],
      hoursWorked: a.workDurationMinutes
        ? a.workDurationMinutes / 60
        : undefined,
      status: a.status as any,
      notes: a.notes,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    };
  }

  private mapLeaveRequest(l: any): LeaveRequest {
    // Calculate total days
    const startDate = new Date(l.startDate);
    const endDate = new Date(l.endDate);
    const totalDays =
      Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      ) + 1;

    return {
      id: l.id,
      tenantId: l.tenantId,
      employeeId: l.employeeId,
      leaveType: l.type as any,
      startDate: l.startDate,
      endDate: l.endDate,
      totalDays,
      reason: l.reason || "",
      status: l.status as any,
      requestedAt: l.createdAt,
      reviewedBy: l.approvedBy,
      reviewedAt: l.approvedAt,
      reviewNotes: undefined,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
    };
  }

  private mapPayroll(p: any): Payroll {
    const payrollRun = p.payrollRun || {};
    const period = payrollRun.periodStart
      ? `${payrollRun.periodStart.getFullYear()}-${String(payrollRun.periodStart.getMonth() + 1).padStart(2, "0")}`
      : "unknown";

    return {
      id: p.id,
      tenantId: p.tenantId,
      employeeId: p.employeeId,
      period,
      baseSalary: Number(p.grossPay),
      bonuses: 0,
      deductions: Number(p.adjustments),
      grossPay: Number(p.grossPay),
      netPay: Number(p.netPay),
      status: "approved" as any,
      paidAt: payrollRun.payDate,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  private mapDepartment(d: any): Department {
    return {
      id: d.id,
      tenantId: d.tenantId,
      name: d.name,
      code: d.code,
      headId: d.headId,
      description: d.description,
      status: d.status as any,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  }

  async getLocations(tenantId: string): Promise<any[]> {
    return this.prisma.location.findMany({
      where: { tenantId },
    });
  }


  private mapRequisition(r: any): JobRequisition {
    return {
      id: r.id,
      tenantId: r.tenantId,
      departmentId: r.departmentId,
      title: r.title,
      status: r.status as any,
      openings: r.openings,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  private mapPerformanceCycle(c: any): PerformanceCycle {
    return {
      id: c.id,
      tenantId: c.tenantId,
      name: c.name,
      status: c.status as any,
      startDate: c.startDate,
      endDate: c.endDate,
      dueDate: c.dueDate,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  private mapPerformanceReview(r: any): PerformanceReview {
    return {
      id: r.id,
      tenantId: r.tenantId,
      cycleId: r.cycleId,
      employeeId: r.employeeId,
      reviewerId: r.reviewerId,
      status: r.status as any,
      rating: r.rating,
      comments: r.comments,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  private mapReview = this.mapPerformanceReview.bind(this);

  private mapHRCase(c: any): HRCase {
    return {
      id: c.id,
      tenantId: c.tenantId,
      employeeId: c.employeeId,
      departmentId: c.departmentId,
      title: c.title,
      type: c.type,
      status: c.status as any,
      priority: c.priority as any,
      ownerId: c.ownerId,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  private mapContract(c: any): Contract {
    return {
      id: c.id,
      tenantId: c.tenantId,
      employeeId: c.employeeId,
      title: c.title,
      type: c.type,
      status: c.status as any,
      startDate: c.startDate,
      endDate: c.endDate,
      url: c.url,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  private mapCandidate(c: any): Candidate {
    return {
      id: c.id,
      tenantId: c.tenantId,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone || undefined,
      requisitionId: c.requisitionId,
      source: c.source,
      status: c.status as any,
      resumeUrl: c.resumeUrl || undefined,
      metadata: (c.metadata as any) || {},
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  private mapPosition(p: any): Position {
    return {
      id: p.id,
      tenantId: p.tenantId,
      locationId: p.locationId,
      departmentId: p.departmentId,
      title: p.title,
      grade: p.grade,
      status: p.status as any,
      budgetedSalary: p.budgetedSalary ? Number(p.budgetedSalary) : undefined,
      reportsToPositionId: p.reportsToPositionId || undefined,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  private mapCompensation(c: any): Compensation {
    return {
      id: c.id,
      tenantId: c.tenantId,
      employeeId: c.employeeId,
      baseSalary: Number(c.baseSalary),
      currency: c.currency,
      payFrequency: c.payFrequency as any,
      allowances: (c.allowances as any) || [],
      bonuses: (c.bonuses as any) || [],
      effectiveDate: c.effectiveDate,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  private mapInterview(i: any): Interview {
    return {
      id: i.id,
      tenantId: i.tenantId,
      candidateId: i.candidateId,
      interviewerId: i.interviewerId,
      title: i.title,
      scheduledAt: i.scheduledAt,
      duration: i.duration,
      location: i.location || undefined,
      status: i.status as any,
      notes: i.notes || undefined,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    };
  }

  private mapLead(l: any): TalentLead {
    return {
      id: l.id,
      tenantId: l.tenantId,
      source: l.source,
      externalProfileUrl: l.externalProfileUrl || undefined,
      name: l.name,
      email: l.email || undefined,
      phone: l.phone || undefined,
      headline: l.headline || undefined,
      skills: (l.skills as any) || [],
      leadScore: l.leadScore,
      status: l.status as any,
      metadata: (l.metadata as any) || {},
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
    };
  }

  private mapDocument(d: any): ComplianceDocument {
    return {
      id: d.id,
      tenantId: d.tenantId,
      employeeId: d.employeeId,
      documentType: d.documentType,
      documentNumber: d.documentNumber || undefined,
      fileUrl: d.fileUrl,
      expiryDate: d.expiryDate || undefined,
      verificationStatus: d.verificationStatus,
      verifiedBy: d.verifiedBy || undefined,
      verifiedAt: d.verifiedAt || undefined,
      metadata: (d.metadata as any) || {},
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  }

  private mapScenario(s: any): BudgetScenario {
    return {
      id: s.id,
      tenantId: s.tenantId,
      name: s.name,
      fiscalYear: s.fiscalYear,
      status: s.status,
      totalBudget: s.totalBudget,
      description: s.description || undefined,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }

  private mapPlan(p: any): HeadcountPlan {
    return {
      id: p.id,
      tenantId: p.tenantId,
      scenarioId: p.scenarioId,
      departmentId: p.departmentId,
      positionTitle: p.positionTitle,
      targetHeadcount: p.targetHeadcount,
      projectedSalary: p.projectedSalary,
      plannedHireDate: p.plannedHireDate,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  private mapRate(r: any): ExchangeRate {
    return {
      id: r.id,
      tenantId: r.tenantId,
      fromCurrency: r.fromCurrency,
      toCurrency: r.toCurrency,
      rate: Number(r.rate),
      effectiveDate: r.effectiveDate,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  private mapRun(r: any): PayrollRun {
    return {
      id: r.id,
      tenantId: r.tenantId,
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      status: r.status,
      totalGrossPay: Number(r.totalGrossPay),
      totalNetPay: Number(r.totalNetPay),
      baseCurrency: r.baseCurrency,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  private mapLine(l: any): PayrollLine {
    return {
      id: l.id,
      tenantId: l.tenantId,
      payrollRunId: l.payrollRunId,
      employeeId: l.employeeId,
      grossPay: Number(l.grossPay),
      netPay: Number(l.netPay),
      adjustments: Number(l.adjustments || 0),
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
    };
  }

  private mapSuccessionPlan(p: any): SuccessionPlan {
    return {
      id: p.id,
      tenantId: p.tenantId,
      positionId: p.positionId,
      isCritical: p.isCritical,
      strategy: p.strategy,
      notes: p.notes,
      candidates: p.candidates?.map((c: any) => this.mapSuccessionCandidate(c)),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  private mapSuccessionCandidate(c: any): SuccessionCandidate {
    return {
      id: c.id,
      tenantId: c.tenantId,
      planId: c.planId,
      employeeId: c.employeeId,
      readiness: c.readiness,
      readinessScore: c.readinessScore,
      riskOfLoss: c.riskOfLoss,
      impactOfLoss: c.impactOfLoss,
      skillGaps: c.skillGaps,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  private mapSkill(s: any): Skill {
    return {
      id: s.id,
      tenantId: s.tenantId,
      name: s.name,
      category: s.category,
      description: s.description,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }

  private mapEmployeeSkill(es: any): EmployeeSkill {
    return {
      id: es.id,
      tenantId: es.tenantId,
      employeeId: es.employeeId,
      skillId: es.skillId,
      proficiency: es.proficiency,
      verificationStatus: es.verificationStatus,
      verifiedBy: es.verifiedBy,
      verifiedAt: es.verifiedAt,
      skill: es.skill ? this.mapSkill(es.skill) : undefined,
      createdAt: es.createdAt,
      updatedAt: es.updatedAt,
    };
  }

  private mapBenefitPlan(p: any): BenefitPlan {
    return {
      id: p.id,
      tenantId: p.tenantId,
      name: p.name,
      type: p.type,
      description: p.description,
      employerContribution: p.employerContribution,
      employeeContribution: p.employeeContribution,
      frequency: p.frequency,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  private mapEmployeeBenefit(b: any): EmployeeBenefit {
    return {
      id: b.id,
      tenantId: b.tenantId,
      employeeId: b.employeeId,
      planId: b.planId,
      enrollmentDate: b.enrollmentDate,
      status: b.status,
      coverageAmount: b.coverageAmount,
      plan: b.plan ? this.mapBenefitPlan(b.plan) : undefined,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    };
  }

  private mapCareerPath(p: any): CareerPath {
    return {
      id: p.id,
      tenantId: p.tenantId,
      fromPositionId: p.fromPositionId,
      toPositionId: p.toPositionId,
      requirementNotes: p.requirementNotes,
      fromPosition: p.fromPosition ? this.mapPosition(p.fromPosition) : undefined,
      toPosition: p.toPosition ? this.mapPosition(p.toPosition) : undefined,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  private mapMentorshipPair(p: any): MentorshipPair {
    return {
      id: p.id,
      tenantId: p.tenantId,
      mentorId: p.mentorId,
      menteeId: p.menteeId,
      status: p.status,
      startDate: p.startDate,
      endDate: p.endDate,
      focusSkills: p.focusSkills,
      mentor: p.employees_hr_mentorship_pairs_mentor_idToemployees ? this.mapEmployee(p.employees_hr_mentorship_pairs_mentor_idToemployees) : undefined,
      mentee: p.employees_hr_mentorship_pairs_mentee_idToemployees ? this.mapEmployee(p.employees_hr_mentorship_pairs_mentee_idToemployees) : undefined,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  private mapPositionSkill(s: any): PositionSkill {
    return {
      id: s.id,
      tenantId: s.tenantId,
      positionId: s.positionId,
      skillId: s.skillId,
      minProficiency: s.minProficiency,
      isMandatory: s.isMandatory || false,
      skill: s.hrSkill ? this.mapSkill(s.hrSkill) : undefined,
      position: s.position ? this.mapPosition(s.position) : undefined,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }

  private mapPerformanceGoal(g: any): PerformanceGoal {
    return {
      id: g.id,
      tenantId: g.tenantId,
      employeeId: g.employeeId,
      title: g.title,
      description: g.description,
      targetDate: g.targetDate,
      progress: g.progress,
      status: g.status,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    };
  }

  private mapTrainingProgram(p: any): TrainingProgram {
    return {
      id: p.id,
      tenantId: p.tenantId,
      name: p.name,
      status: p.status,
      completionRate: p.completionRate,
      dueDate: p.dueDate,
      skills: p.skills?.map((s: any) => this.mapProgramSkill(s)),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  private mapTrainingAssignment(a: any): TrainingAssignment {
    return {
      id: a.id,
      tenantId: a.tenantId,
      programId: a.programId,
      employeeId: a.employeeId,
      status: a.status,
      assignedAt: a.assignedAt,
      completedAt: a.completedAt,
      program: a.program ? this.mapTrainingProgram(a.program) : undefined,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    };
  }


  private mapProgramSkill(s: any): ProgramSkill {
    return {
      id: s.id,
      tenantId: s.tenantId,
      programId: s.programId,
      skillId: s.skillId,
      proficiencyGain: s.proficiencyGain,
      skill: s.skill ? this.mapSkill(s.skill) : undefined,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }

  // ============================================================
  // TRAINING MANAGEMENT
  // ============================================================

  async getTrainingPrograms(tenantId: string): Promise<any[]> {
    const programs = await this.prisma.trainingProgram.findMany({
      where: { tenantId },
      orderBy: { id: 'desc' }
    });
    return programs.map((p) => this.mapTrainingProgram(p));
  }

  async createTrainingProgram(tenantId: string, data: any): Promise<any> {
    const program = await this.prisma.trainingProgram.create({
      data: {
        tenantId,
        name: data.name,
        status: data.status || "active",
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
    });
    return this.mapTrainingProgram(program);
  }

  async getTrainingAssignments(tenantId: string): Promise<any[]> {
    const assignments = await this.prisma.trainingAssignment.findMany({
      where: { tenantId },
      orderBy: { id: 'desc' }
    });
    return assignments.map((a) => this.mapTrainingAssignment(a));
  }

  async createTrainingAssignment(tenantId: string, data: any): Promise<any> {
    const assignment = await this.prisma.trainingAssignment.create({
      data: {
        tenantId,
        programId: data.programId,
        employeeId: data.employeeId,
        status: data.status || "in_progress",
        assignedAt: new Date(),
      },
    });
    return this.mapTrainingAssignment(assignment);
  }

  async updateTrainingAssignment(tenantId: string, id: string, data: any): Promise<any> {
    const updateData: any = {};
    if (data.status) updateData.status = data.status;
    if (data.status === "completed") {
      updateData.completedAt = new Date();
    }
    const assignment = await this.prisma.trainingAssignment.update({
      where: { id, tenantId },
      data: updateData,
    });
    return this.mapTrainingAssignment(assignment);
  }
  async getTrainingAssignmentById(tenantId: string, id: string): Promise<any | null> {
    const assignment = await this.prisma.trainingAssignment.findFirst({
      where: { id, tenantId },
      include: { employee: true },
    });
    return assignment ? this.mapTrainingAssignment(assignment) : null;
  }

  // Lifecycle Methods
  async promoteEmployee(tenantId: string, employeeId: string, data: any): Promise<Employee> {
    const employee = await this.prisma.employee.update({
      where: { id: employeeId, tenantId },
      data: {
        position: data.newRole,
        baseSalary: data.newSalary,
        status: "promoted",
      },
    });
    return this.mapEmployee(employee);
  }

  async transferEmployee(tenantId: string, employeeId: string, data: any): Promise<Employee> {
    const employee = await this.prisma.employee.update({
      where: { id: employeeId, tenantId },
      data: {
        locationId: data.locationId,
        departmentId: data.departmentId,
        status: "transferred",
      },
    });
    return this.mapEmployee(employee);
  }

  async suspendEmployee(tenantId: string, employeeId: string, reason: string): Promise<Employee> {
    const employee = await this.prisma.employee.update({
      where: { id: employeeId, tenantId },
      data: {
        status: "suspended",
      },
    });
    return this.mapEmployee(employee);
  }

  // Talent & Candidate Management
  async getCandidates(tenantId: string, status?: string): Promise<Candidate[]> {
    const where: any = { tenantId, deletedAt: null };
    if (status) where.status = status;
    const candidates = await this.prisma.candidate.findMany({
      where,
      orderBy: { id: 'desc' }
    });
    return candidates.map((c) => this.mapCandidate(c));
  }

  async getCandidateById(tenantId: string, id: string): Promise<Candidate | null> {
    const candidate = await this.prisma.candidate.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    return candidate ? this.mapCandidate(candidate) : null;
  }

  async createCandidate(tenantId: string, data: any, tx?: Prisma.TransactionClient): Promise<Candidate> {
    const db = tx ?? this.prisma;
    const candidate = await db.candidate.create({
      data: {
        tenantId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        requisitionId: data.requisitionId,
        source: data.source || "direct",
        status: "applied",
      },
    });
    return this.mapCandidate(candidate);
  }

  async updateCandidate(tenantId: string, id: string, data: any, tx?: Prisma.TransactionClient): Promise<Candidate> {
    const db = tx ?? this.prisma;
    const updated = await db.candidate.update({
      where: { id, tenantId },
      data,
    });
    return this.mapCandidate(updated);
  }

  async hireCandidate(tenantId: string, candidateId: string, data: any, tx?: Prisma.TransactionClient): Promise<Employee> {
    const db = tx ?? this.prisma;
    const candidate = await db.candidate.findFirst({
      where: { id: candidateId, tenantId, deletedAt: null },
      include: { jobRequisition: true },
    });

    if (!candidate) throw new Error("Candidate not found.");
    if (candidate.status === "hired") {
      throw new Error(`Candidate ${candidateId} is already hired.`);
    }

    // Pre-calculate password hash outside of transaction to avoid lock contention
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash("Welcome123", salt);

    // SERIALIZABLE Transaction for atomic hiring
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Update Candidate Status
      await tx.candidate.update({
        where: { id: candidateId },
        data: { status: "hired" },
      });

      // 2. User Provisioning (moved into transaction)
      let user = await tx.user.findUnique({
        where: { tenantId_email: { tenantId, email: candidate.email } },
      });

      if (!user) {
        user = await tx.user.create({
          data: {
        tenantId,
            email: candidate.email,
            passwordHash,
            firstName: candidate.firstName,
            lastName: candidate.lastName,
          },
        });
      }

      await tx.userCompany.upsert({
        where: { userId_tenantId: { userId: user.id, tenantId } },
        update: {},
        create: { userId: user.id, tenantId, role: 'MEMBER' }
      });

      // 3. Create Employee Record
      const employee = await tx.employee.create({
        data: {
        tenantId,
          userId: user.id,
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          email: candidate.email,
          phone: candidate.phone,
          locationId: data.locationId || "loc-default",
          departmentId: data.departmentId || candidate.jobRequisition?.departmentId || "",
          position: data.position || candidate.jobRequisition?.title || "Staff",
          employeeCode: data.employeeCode || `EMP-${Date.now()}`,
          status: "probation",
          hireDate: data.hireDate ? new Date(data.hireDate) : new Date(),
          baseSalary: data.baseSalary || 0,
        },
      });

      // 4. Create Initial Contract
      await tx.contract.create({
        data: {
        tenantId,
          employeeId: employee.id,
          title: `Employment Contract - ${employee.firstName} ${employee.lastName}`,
          type: "PERMANENT",
          startDate: employee.hireDate,
          status: "active",
        },
      });

      // 4. Update Candidate if applicable (already done above)

      // 5. Create Outbox Event for reliable emission
      await tx.sysOutboxEvent.create({
        data: {
        tenantId,
          type: 'hr.employee.created.v1',
          payload: {
            employeeId: employee.id,
            candidateId,
            email: candidate.email,
          },
        },
      });

      return employee;
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    return this.mapEmployee(result as any);
  }

  async executePayrollTransaction(tenantId: string, period: string, activeEmployees: any[]): Promise<any> {
    const [year, month] = period.split("-").map(Number);
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0);

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Payroll Run
      const payrollRun = await tx.payrollRun.create({
        data: {
        tenantId,
          periodStart,
          periodEnd,
          status: "processing",
        },
      });

      // 2. Create Payroll Lines and calculate totals
      let totalGross = 0;
      let totalNet = 0;

      for (const emp of activeEmployees) {
        const baseSalary = Number(emp.baseSalary || 0);
        const adjustments = baseSalary * 0.1; // Default 10% deduction for now
        const netPay = baseSalary - adjustments;

        totalGross += baseSalary;
        totalNet += netPay;

        await tx.payrollLine.create({
          data: {
        tenantId,
            payrollRunId: payrollRun.id,
            employeeId: emp.id,
            grossPay: baseSalary,
            adjustments,
            netPay,
          },
        });
      }

      // 3. Finance/Ledger Integration: Create Ledger Posting Entry
      await tx.ledgerPosting.create({
        data: {
          id: uuidv4(),
          tenantId,
          sourceEventId: payrollRun.id,
          eventType: "PAYROLL_EXECUTION",
          status: "PENDING",
          payload: {
            period,
            totalGross,
            totalNet,
            employeeCount: activeEmployees.length,
          },
          updatedAt: new Date(),
        },
      });

      // 4. Create Outbox Event for reliable emission
      await tx.sysOutboxEvent.create({
        data: {
        tenantId,
          type: 'hr.payroll.executed.v1',
          payload: {
            payrollRunId: payrollRun.id,
            period,
            totalGross,
            totalNet,
            processedCount: activeEmployees.length,
          },
        },
      });

      return {
        payrollRunId: payrollRun.id,
        totalGross,
        totalNet,
        processedCount: activeEmployees.length,
      };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }


  async updatePosition(tenantId: string, id: string, data: any, tx?: Prisma.TransactionClient): Promise<Position> {
    const db = tx ?? this.prisma;
    const position = await db.position.update({
      where: { id, tenantId },
      data: {
        title: data.title,
        grade: data.grade,
        status: data.status,
        budgetedSalary: data.budgetedSalary,
      },
    });
    return this.mapPosition(position);
  }

  async getCompensation(tenantId: string, employeeId: string): Promise<Compensation | null> {
    const compensation = await this.prisma.compensation.findUnique({
      where: { employeeId },
    });
    return compensation ? this.mapCompensation(compensation) : null;
  }

  async updateCompensation(tenantId: string, employeeId: string, data: any, tx?: Prisma.TransactionClient): Promise<Compensation> {
    const db = tx ?? this.prisma;
    const compensation = await db.compensation.upsert({
      where: { employeeId },
      create: {
        id: uuidv4(),
        tenantId,
        employeeId,
        baseSalary: data.baseSalary,
        currency: data.currency || "USD",
        payFrequency: data.payFrequency || "monthly",
        allowances: data.allowances,
        bonuses: data.bonuses,
        effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : new Date(),
        updatedAt: new Date(),
      },
      update: {
        baseSalary: data.baseSalary,
        currency: data.currency,
        payFrequency: data.payFrequency,
        allowances: data.allowances,
        bonuses: data.bonuses,
        effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : undefined,
      },
    });
    return this.mapCompensation(compensation);
  }

  // Analytics & Reporting
  async getHeadcountTrend(tenantId: string): Promise<any[]> {
    const months = 12;
    const trend = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const count = await this.prisma.employee.count({
        where: {
          tenantId,
          hireDate: { lte: endOfMonth },
          OR: [
            { terminationDate: null },
            { terminationDate: { gt: endOfMonth } },
          ],
        },
      });

      trend.push({
        month: startOfMonth.toISOString().substring(0, 7),
        count,
      });
    }

    return trend.reverse();
  }

  async getTurnoverStats(tenantId: string): Promise<any> {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [hires, terminations] = await Promise.all([
      this.prisma.employee.count({
        where: {
          tenantId,
          hireDate: { gte: startOfYear },
        },
      }),
      this.prisma.employee.count({
        where: {
          tenantId,
          terminationDate: { gte: startOfYear },
        },
      }),
    ]);

    const activeCount = await this.prisma.employee.count({
      where: { tenantId, status: "active" },
    });

    return {
      hiresThisYear: hires,
      terminationsThisYear: terminations,
      turnoverRate: activeCount > 0 ? (terminations / activeCount) * 100 : 0,
      activeHeadcount: activeCount,
    };
  }

  async getDepartmentAnalytics(tenantId: string): Promise<any[]> {
    const departments = await this.prisma.department.findMany({
      where: { tenantId },
      include: {
        employees: {
          where: { status: "active" },
          include: { compensations: true },
        },
      },
    });

    return departments.map((d) => {
      const activeStaff = d.employees.length;
      let totalCost = 0;
      d.employees.forEach((emp: any) => {
        if (emp.compensation) {
          totalCost += Number(emp.compensation.baseSalary);
          // Simple addition of allowances/bonuses for analytics
          if (emp.compensation.allowances) {
            (emp.compensation.allowances as any[]).forEach(a => totalCost += Number(a.amount || 0));
          }
        } else {
          totalCost += Number(emp.baseSalary || 0);
        }
      });

      return {
        id: d.id,
        name: d.name,
        code: d.code,
        activeStaff,
        monthlyCost: totalCost,
        avgSalary: activeStaff > 0 ? totalCost / activeStaff : 0,
      };
    });
  }

  async getCompensationAnalytics(tenantId: string): Promise<any> {
    const compensations = await this.prisma.compensation.findMany({
      where: { tenantId },
    });

    if (compensations.length === 0) return { min: 0, max: 0, avg: 0, total: 0 };

    const salaries = compensations.map((c) => Number(c.baseSalary));
    const total = salaries.reduce((acc, curr) => acc + curr, 0);

    return {
      min: Math.min(...salaries),
      max: Math.max(...salaries),
      avg: total / salaries.length,
      totalMonthlySpend: total,
      currency: compensations[0].currency,
    };
  }

  async getExperienceRate(tenantId: string): Promise<any> {
    const total = await this.prisma.employee.count({ where: { tenantId } });
    if (total === 0) return { rate: 0 };
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const experienced = await this.prisma.employee.count({
      where: {
        tenantId,
        hireDate: { lte: twoYearsAgo },
      },
    });
    return { rate: (experienced / total) * 100 };
  }

  // Predictive Analytics
  async getPerformanceTrends(tenantId: string): Promise<any[]> {
    const reviews = await this.prisma.performanceReview.findMany({
      where: { tenantId, status: "completed" },
      orderBy: { updatedAt: 'desc' },
      select: { rating: true, updatedAt: true },
    });

    // Group by month and calculate avg rating
    const grouped: any = {};
    reviews.forEach((r: any) => {
      const month = r.updatedAt.toISOString().substring(0, 7);
      if (!grouped[month]) grouped[month] = { sum: 0, count: 0 };
      grouped[month].sum += r.rating;
      grouped[month].count++;
    });

    return Object.keys(grouped).map((month) => ({
      month,
      avgRating: grouped[month].sum / grouped[month].count,
    }));
  }

  async getEngagementMetrics(tenantId: string): Promise<any> {
    // Simulated engagement metrics based on attendance and case volume
    const [attendance, cases] = await Promise.all([
      this.prisma.hrAttendanceRecord.count({ where: { tenantId } }),
      this.prisma.hrCase.count({ where: { tenantId, status: "open" } }),
    ]);

    return {
      attendanceRate: 94.5, // Mocked for now
      pendingCases: cases,
      employeeNetPromoterScore: 72, // Mocked for now
    };
  }

  async getRetentionRiskData(tenantId: string): Promise<any[]> {
    const employees = await this.prisma.employee.findMany({
      where: { tenantId, status: "active" },
      include: {
        performance_reviews_performance_reviews_employee_idToemployees: {
          orderBy: { createdAt: 'desc' },
          take: 2,
        },
      },
    });

    return employees.map((e: any) => ({
      employeeId: e.id,
      fullName: `${e.firstName} ${e.lastName}`,
      tenureMonths: Math.floor((new Date().getTime() - e.hireDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)),
      lastRatings: e.performance_reviews_performance_reviews_employee_idToemployees?.map((r: any) => r.rating) || [],
    }));
  }

  async getPositions(tenantId: string, deptId?: string): Promise<Position[]> {
    const where: any = { tenantId, deletedAt: null };
    if (deptId) where.departmentId = deptId;
    const positions = await this.prisma.position.findMany({
      where,
      include: {
        department: true,
        location: true
      },
    });
    return positions.map((p) => this.mapPosition(p));
  }

  async createPosition(tenantId: string, data: any, tx?: Prisma.TransactionClient): Promise<Position> {
    const db = tx ?? this.prisma;
    const created = await db.position.create({
      data: {
        tenantId,
        locationId: data.locationId,
        departmentId: data.departmentId,
        title: data.title,
        grade: data.grade,
        status: "open",
        budgetedSalary: data.budgetedSalary,
        reportsToPositionId: data.reportsToPositionId,
        jobPostMetadata: data.jobPostMetadata || {},
      },
      include: { department: true,
        location: true,
        hrPositionSkills: { include: { hrSkill: true } },
      },
    });
    return this.mapPosition(created);
  }

  async getPositionById(tenantId: string, id: string): Promise<Position | null> {
    const pos = await this.prisma.position.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { department: true,
        hrPositionSkills: { include: { hrSkill: true } },
      },
    });
    return pos ? this.mapPosition(pos) : null;
  }

  // Interview & Scheduling
  async getInterviews(tenantId: string, candidateId?: string): Promise<Interview[]> {
    const interviews = await this.prisma.interview.findMany({
      where: {
        tenantId,
        ...(candidateId ? { candidateId } : {}),
      },
      orderBy: { scheduledAt: "desc" },
    });
    return interviews.map((i: any) => this.mapInterview(i));
  }

  async scheduleInterview(tenantId: string, data: any, tx?: Prisma.TransactionClient): Promise<Interview> {
    const db = tx ?? this.prisma;
    const created = await db.interview.create({
      data: {
        id: uuidv4(),
        tenantId,
        candidateId: data.candidateId,
        interviewerId: data.interviewerId,
        title: data.title,
        scheduledAt: new Date(data.scheduledAt),
        duration: data.duration || 30,
        location: data.location,
        status: "SCHEDULED",
        notes: data.notes,
        updatedAt: new Date(),
      },
    });
    return this.mapInterview(created);
  }

  async updateInterviewStatus(tenantId: string, id: string, status: string, tx?: Prisma.TransactionClient): Promise<Interview> {
    const db = tx ?? this.prisma;
    const updated = await db.interview.update({
      where: { id, tenantId },
      data: { status },
    });
    return this.mapInterview(updated);
  }

  // Talent Lead Management
  async getTalentLeads(tenantId: string, status?: string): Promise<TalentLead[]> {
    const where: any = { tenantId };
    if (status) where.status = status;

    const leads = await this.prisma.talentLead.findMany({
      where,
      orderBy: { id: 'desc' }
    });
    return leads.map((l: any) => this.mapLead(l));
  }

  async getTalentLeadById(tenantId: string, id: string): Promise<TalentLead | null> {
    const lead = await this.prisma.talentLead.findFirst({
      where: { id, tenantId },
    });
    return lead ? this.mapLead(lead) : null;
  }

  async createTalentLead(tenantId: string, data: any): Promise<TalentLead> {
    const created = await this.prisma.talentLead.create({
      data: {
        tenantId,
        source: data.source || "LINKEDIN",
        externalProfileUrl: data.externalProfileUrl,
        name: data.name,
        email: data.email,
        phone: data.phone,
        headline: data.headline,
        skills: data.skills,
        leadScore: data.leadScore || 0,
        status: data.status || "LEAD",
        metadata: data.metadata,
        updatedAt: new Date(),
      },
    });
    return this.mapLead(created);
  }

  async updateTalentLead(tenantId: string, id: string, data: any): Promise<TalentLead> {
    try {
      const updated = await this.prisma.talentLead.update({
        where: { id, tenantId },
        data: data as Prisma.TalentLeadUpdateInput,
      });
      return this.mapLead(updated);
    } catch (error) {
      handlePrismaFkError(error, 'TalentLead');
    }
  }

  async getCaseById(tenantId: string, id: string): Promise<HRCase | null> {
    const hrcase = await this.prisma.hrCase.findFirst({
      where: { id, tenantId },
    });
    return hrcase ? this.mapHRCase(hrcase) : null;
  }

  async getInterviewById(tenantId: string, id: string): Promise<Interview | null> {
    const interview = await this.prisma.interview.findFirst({
      where: { id, tenantId },
    });
    return interview ? this.mapInterview(interview) : null;
  }

  // Compliance Management
  async getComplianceDocuments(
    tenantId: string,
    employeeId: string,
    documentId?: string,
    status?: string,
  ): Promise<ComplianceDocument[]> {
    const where: any = { tenantId, employeeId };
    if (documentId) where.id = documentId;
    if (status) where.verificationStatus = status;

    const docs = await this.prisma.hrComplianceDocument.findMany({
      where,
      orderBy: { id: 'desc' }
    });
    return docs.map((d: any) => this.mapDocument(d));
  }

  async uploadComplianceDocument(tenantId: string, data: any): Promise<ComplianceDocument> {
    const doc = await this.prisma.hrComplianceDocument.create({
      data: {
        tenantId,
        employeeId: data.employeeId,
        documentType: data.documentType,
        documentNumber: data.documentNumber,
        fileUrl: data.fileUrl,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
        verificationStatus: "PENDING",
      },
    });
    return this.mapDocument(doc);
  }

  async verifyDocument(
    tenantId: string,
    id: string,
    verifiedBy: string,
    status: string,
    metadata?: any,
  ): Promise<ComplianceDocument> {
    const doc = await this.prisma.hrComplianceDocument.update({
      where: { id, tenantId },
      data: {
        verificationStatus: status,
        verifiedBy,
        verifiedAt: new Date(),
        metadata: metadata || {},
      },
    });
    return this.mapDocument(doc);
  }



  // Strategic Workforce Planning
  async getBudgetScenarios(tenantId: string): Promise<BudgetScenario[]> {
    const scenarios = await this.prisma.budgetScenario.findMany({
      where: { tenantId },
      orderBy: { fiscalYear: "desc" },
    });
    return scenarios.map((s: any) => this.mapScenario(s));
  }

  async createBudgetScenario(tenantId: string, data: any): Promise<BudgetScenario> {
    const created = await this.prisma.budgetScenario.create({
      data: {
        tenantId,
        name: data.name,
        fiscalYear: data.fiscalYear,
        status: data.status || "DRAFT",
        totalBudget: data.totalBudget || 0,
        description: data.description,
      },
    });
    return this.mapScenario(created);
  }

  async updateBudgetScenario(tenantId: string, id: string, data: any): Promise<BudgetScenario> {
    try {
      const updated = await this.prisma.budgetScenario.update({
        where: { id, tenantId },
        data: data as Prisma.BudgetScenarioUpdateInput,
      });
      return this.mapScenario(updated);
    } catch (error) {
      handlePrismaFkError(error, 'BudgetScenario');
    }
  }

  async getHeadcountPlans(tenantId: string, scenarioId: string): Promise<HeadcountPlan[]> {
    const plans = await this.prisma.headcountPlan.findMany({
      where: {
        scenarioId,
      },
      orderBy: { plannedHireDate: "asc" },
    });
    return plans.map((p: any) => this.mapPlan(p));
  }

  async createHeadcountPlan(tenantId: string, data: any): Promise<HeadcountPlan> {
    // Verify scenario belongs to tenant
    const scenario = await this.prisma.budgetScenario.findFirst({
      where: { id: data.scenarioId, tenantId },
    });
    if (!scenario) throw new Error("Scenario not found");

    const created = await this.prisma.headcountPlan.create({
      data: {
        tenantId,
        scenarioId: data.scenarioId,
        departmentId: data.departmentId,
        positionTitle: data.positionTitle,
        targetHeadcount: data.targetHeadcount || 1,
        projectedSalary: data.projectedSalary,
        plannedHireDate: new Date(data.plannedHireDate),
      },
    });
    return this.mapPlan(created);
  }

  async updateHeadcountPlan(tenantId: string, id: string, data: any): Promise<HeadcountPlan> {
    const updated = await this.prisma.headcountPlan.update({
      where: {
        id,
      },
      data: {
        ...data,
        plannedHireDate: data.plannedHireDate ? new Date(data.plannedHireDate) : undefined,
      } as any,
    });
    return this.mapPlan(updated);
  }

  // Global Multi-Currency Payroll
  async getExchangeRates(tenantId: string): Promise<ExchangeRate[]> {
    const rates = await this.prisma.exchangeRate.findMany({
      where: { tenantId },
      orderBy: { effectiveAt: "desc" },
    });
    return rates.map((r: any) => this.mapRate(r));
  }

  async updateExchangeRate(tenantId: string, data: any): Promise<ExchangeRate> {
    const rate = await this.prisma.exchangeRate.create({
      data: {
        tenantId,
        fromCurrency: data.fromCurrency,
        toCurrency: data.toCurrency,
        rate: data.rate,
        effectiveAt: data.effectiveDate ? new Date(data.effectiveDate) : new Date(),
      },
    });
    return this.mapRate(rate);
  }

  async getPayrollRuns(tenantId: string): Promise<PayrollRun[]> {
    const runs = await this.prisma.payrollRun.findMany({
      where: { tenantId },
      orderBy: { periodStart: "desc" },
    });
    return runs.map((r: any) => this.mapRun(r));
  }

  async getPayrollLines(tenantId: string, runId: string): Promise<PayrollLine[]> {
    const lines = await this.prisma.payrollLine.findMany({
      where: {
        payrollRunId: runId,
      },
    });
    return lines.map((l: any) => this.mapLine(l));
  }

  async createPayrollRun(tenantId: string, data: any): Promise<PayrollRun> {
    const created = await this.prisma.payrollRun.create({
      data: {
        tenantId,
        periodStart: new Date(data.periodStart),
        periodEnd: new Date(data.periodEnd),
        baseCurrency: data.baseCurrency || "USD",
        status: "DRAFT",
      },
    });
    return this.mapRun(created);
  }

  // Succession Planning
  async getSuccessionPlans(tenantId: string): Promise<SuccessionPlan[]> {
    const plans = await this.prisma.successionPlan.findMany({
      where: { tenantId },
      include: { hrSuccessionCandidates: true, position: true },
    });
    return plans.map((p: any) => this.mapSuccessionPlan(p));
  }

  async getSuccessionPlan(tenantId: string, positionId: string): Promise<SuccessionPlan | null> {
    const plan = await this.prisma.successionPlan.findFirst({
      where: { positionId, tenantId },
      include: { hrSuccessionCandidates: true, position: true },
    });
    return plan ? this.mapSuccessionPlan(plan) : null;
  }

  async createSuccessionPlan(tenantId: string, data: any): Promise<SuccessionPlan> {
    const created = await this.prisma.successionPlan.create({
      data: {
        tenantId,
        positionId: data.positionId,
        isCritical: data.isCritical ?? true,
        strategy: data.strategy,
        notes: data.notes,
      },
      include: { hrSuccessionCandidates: true, position: true },
    });
    return this.mapSuccessionPlan(created);
  }

  async addSuccessionCandidate(tenantId: string, data: any): Promise<SuccessionCandidate> {
    const created = await this.prisma.successionCandidate.create({
      data: {
        tenantId,
        planId: data.planId,
        candidateId: data.employeeId,
        readiness: data.readiness,
        readinessScore: data.readinessScore ?? 0,
        riskOfLoss: data.riskOfLoss ?? "LOW",
        impactOfLoss: data.impactOfLoss ?? "MEDIUM",
        skillGaps: data.skillGaps ?? [],
      },
    });
    return this.mapSuccessionCandidate(created);
  }

  async getBenchStrength(tenantId: string, departmentId?: string): Promise<any> {
    const plans = await this.prisma.successionPlan.findMany({
      where: { 
        tenantId,
        position: departmentId ? { departmentId } : undefined
      },
      include: { hrSuccessionCandidates: true,
        position: true
      },
    });

    const readinessCounts = {
      READY_NOW: 0,
      READY_1_2_YEARS: 0,
      READY_3_PLUS_YEARS: 0,
      EMERGENCY: 0,
    };

    plans.forEach(p => {
      p.hrSuccessionCandidates.forEach(c => {
        if (c.readiness === "READY_NOW") readinessCounts.READY_NOW++;
        if (c.readiness === "READY_1_2_YEARS") readinessCounts.READY_1_2_YEARS++;
        if (c.readiness === "READY_3_PLUS_YEARS") readinessCounts.READY_3_PLUS_YEARS++;
        if (c.readiness === "EMERGENCY") readinessCounts.EMERGENCY++;
      });
    });

    return {
      totalCriticalPositions: plans.filter(p => p.isCritical).length,
      averageBenchStrength: plans.length > 0 ? (readinessCounts.READY_NOW + readinessCounts.READY_1_2_YEARS) / plans.length : 0,
      readinessDistribution: readinessCounts,
    };
  }

  // Skills-Based Org Design
  async getSkills(tenantId: string, category?: string): Promise<Skill[]> {
    const where: any = { tenantId };
    if (category) where.category = category;
    const skills = await this.prisma.skill.findMany({ where });
    return skills.map((s) => this.mapSkill(s));
  }

  async createSkill(tenantId: string, data: any): Promise<Skill> {
    const skill = await this.prisma.skill.create({
      data: {
        tenantId,
        name: data.name,
        category: data.category,
        description: data.description,
      },
    });
    return this.mapSkill(skill);
  }

  async getEmployeeSkills(tenantId: string, employeeId: string): Promise<EmployeeSkill[]> {
    const skills = await this.prisma.employeeSkill.findMany({
      where: { employeeId, tenantId },
      include: { hrSkill: true },
    });
    return skills.map((s) => this.mapEmployeeSkill(s));
  }

  async updateEmployeeSkill(tenantId: string, data: any): Promise<EmployeeSkill> {
    const skill = await this.prisma.employeeSkill.upsert({
      where: {
        employeeId_skillId: {
          employeeId: data.employeeId,
          skillId: data.skillId,
        },
      },
      create: {
        id: uuidv4(),
        tenantId,
        employeeId: data.employeeId,
        skillId: data.skillId,
        proficiency: data.proficiency || 1,
        verificationStatus: data.verificationStatus || "SELF_ASSESSED",
        updatedAt: new Date(),
      },
      update: {
        proficiency: data.proficiency,
        verificationStatus: data.verificationStatus,
        verifiedBy: data.verifiedBy,
        verifiedAt: data.verifiedAt ? new Date(data.verifiedAt) : undefined,
        updatedAt: new Date(),
      },
      include: { hrSkill: true },
    });
    return this.mapEmployeeSkill(skill);
  }

  async addEmployeeSkill(tenantId: string, data: any): Promise<EmployeeSkill> {
    return this.updateEmployeeSkill(tenantId, data);
  }

  async findReplacementCandidates(tenantId: string, positionId: string): Promise<any[]> {
    const position = await this.getPositionById(tenantId, positionId);
    if (!position || !position.positionSkills) return [];

    const skillIds = position.positionSkills.map((s: any) => s.skillId);
    return this.findTalentBySkills(tenantId, skillIds);
  }

  async findTalentBySkills(tenantId: string, skillIds: string[], minProficiency: number = 1): Promise<any[]> {
    const employees = await this.prisma.employee.findMany({
      where: {
        tenantId,
        status: "active",
        hrEmployeeSkills: {
          some: {
            skillId: { in: skillIds },
            proficiency: { gte: minProficiency },
          },
        },
      },
      include: {
        hrEmployeeSkills: {
          where: { skillId: { in: skillIds } },
          include: { hrSkill: true },
        },
      },
    });

    return employees.map((e) => ({
      employee: this.mapEmployee(e),
      matchedSkills: e.hrEmployeeSkills.map((s: any) => ({
        name: s.hrSkill.name,
        proficiency: s.proficiency,
      })),
      matchPercentage: (e.hrEmployeeSkills.length / skillIds.length) * 100,
    }));
  }

  // Total Rewards & Benefits
  async getBenefitPlans(tenantId: string): Promise<BenefitPlan[]> {
    const plans = await this.prisma.benefitPlan.findMany({
      where: { tenantId },
    });
    return plans.map((p) => this.mapBenefitPlan(p));
  }

  async createBenefitPlan(tenantId: string, data: any): Promise<BenefitPlan> {
    const plan = await this.prisma.benefitPlan.create({
      data: {
        tenantId,
        name: data.name,
        type: data.type,
        description: data.description,
        employerContribution: data.employerContribution,
        employeeContribution: data.employeeContribution,
        frequency: data.frequency || "MONTHLY",
      },
    });
    return this.mapBenefitPlan(plan);
  }

  async getEmployeeBenefits(tenantId: string, employeeId: string): Promise<EmployeeBenefit[]> {
    const benefits = await this.prisma.employeeBenefit.findMany({
      where: { employeeId, tenantId },
      include: { hrBenefitPlan: true },
    });
    return benefits.map((b) => this.mapEmployeeBenefit(b));
  }

  async enrollInBenefit(tenantId: string, data: any): Promise<EmployeeBenefit> {
    const benefit = await this.prisma.employeeBenefit.create({
      data: {
        tenantId,
        employeeId: data.employeeId,
        planId: data.planId,
        coverageAmount: data.coverageAmount,
        status: "ACTIVE",
      },
      include: { hrBenefitPlan: true },
    });
    return this.mapEmployeeBenefit(benefit);
  }

  // AI-Powered Career Pathing
  async getCareerPaths(tenantId: string): Promise<CareerPath[]> {
    const paths = await this.prisma.careerPath.findMany({
      where: { tenantId },
      include: { 
        positions_hr_career_paths_from_position_idTopositions: true,
        positions_hr_career_paths_to_position_idTopositions: true 
      },
    });
    return paths.map((p) => this.mapCareerPath(p));
  }

  async createCareerPath(tenantId: string, data: any): Promise<CareerPath> {
    const path = await this.prisma.careerPath.create({
      data: {
        tenantId,
        fromPositionId: data.fromPositionId,
        toPositionId: data.toPositionId,
        requirementNotes: data.requirementNotes,
      },
      include: { 
        positions_hr_career_paths_from_position_idTopositions: true,
        positions_hr_career_paths_to_position_idTopositions: true 
      },
    });
    return this.mapCareerPath(path);
  }

  async getMentorshipPairs(tenantId: string, employeeId: string): Promise<MentorshipPair[]> {
    const pairs = await this.prisma.mentorshipPair.findMany({
      where: {
        tenantId,
        OR: [
          { mentorId: employeeId },
          { menteeId: employeeId },
        ],
      },
      include: {
        employees_hr_mentorship_pairs_mentor_idToemployees: true,
        employees_hr_mentorship_pairs_mentee_idToemployees: true,
      },
    });
    return pairs.map((p) => this.mapMentorshipPair(p));
  }

  async createMentorshipPair(tenantId: string, data: any): Promise<MentorshipPair> {
    const pair = await this.prisma.mentorshipPair.create({
      data: {
        tenantId,
        mentorId: data.mentorId,
        menteeId: data.menteeId,
        status: "ACTIVE",
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        focusSkills: data.focusSkills || [],
      },
      include: {
        employees_hr_mentorship_pairs_mentor_idToemployees: true,
        employees_hr_mentorship_pairs_mentee_idToemployees: true,
      },
    });
    return this.mapMentorshipPair(pair);
  }

  // AI-Generated Job Descriptions
  async updatePositionJobPost(tenantId: string, positionId: string, data: any): Promise<any> {
    const updated = await this.prisma.position.update({
      where: { id: positionId, tenantId },
      data: {
        jobPostMetadata: {
          ...(typeof (await this.prisma.position.findUnique({ where: { id: positionId } }))?.jobPostMetadata === 'object' 
            ? ((await this.prisma.position.findUnique({ where: { id: positionId } }))?.jobPostMetadata as any) 
            : {}),
          jobPost: data,
        },
      },
    });
    return updated.jobPostMetadata;
  }

  async getPositionJobPost(tenantId: string, positionId: string): Promise<any> {
    const pos = await this.prisma.position.findUnique({
      where: { id: positionId, tenantId },
      select: { jobPostMetadata: true },
    });
    return (pos?.jobPostMetadata as any)?.jobPost || null;
  }

  async getPositionSkills(tenantId: string, positionId: string): Promise<PositionSkill[]> {
    const skills = await this.prisma.positionSkill.findMany({
      where: { positionId, tenantId },
      include: { hrSkill: true },
    });
    return skills.map((s) => this.mapPositionSkill(s));
  }

  async updatePositionSkill(tenantId: string, data: any): Promise<PositionSkill> {
    const skill = await this.prisma.positionSkill.upsert({
      where: {
        positionId_skillId: {
          positionId: data.positionId,
          skillId: data.skillId,
        },
      },
      create: {
        id: uuidv4(),
        tenantId,
        positionId: data.positionId,
        skillId: data.skillId,
        minProficiency: data.minProficiency || 1,
        isMandatory: data.isMandatory || false,
        updatedAt: new Date(),
      },
      update: {
        minProficiency: data.minProficiency,
        isMandatory: data.isMandatory,
        updatedAt: new Date(),
      },
      include: { hrSkill: true },
    });
    return this.mapPositionSkill(skill);
  }

  // AI-Powered Performance Predictor
  async getEmployeePerformanceHistory(tenantId: string, employeeId: string): Promise<PerformanceReview[]> {
    const reviews = await this.prisma.performanceReview.findMany({
      where: { employeeId, tenantId },
      orderBy: { id: 'desc' },
      select: {
        id: true,
        tenantId: true,
        cycleId: true,
        employeeId: true,
        reviewerId: true,
        status: true,
        rating: true,
        comments: true,
      },
    });
    return reviews.map((r) => this.mapReview(r));
  }

  async getEmployeeGoals(tenantId: string, employeeId: string): Promise<PerformanceGoal[]> {
    const goals = await this.prisma.performanceGoal.findMany({
      where: { employeeId, tenantId },
      orderBy: { targetDate: "asc" },
    });
    return goals.map((g) => this.mapPerformanceGoal(g));
  }

  async updatePerformanceGoal(tenantId: string, data: any): Promise<PerformanceGoal> {
    const goal = await this.prisma.performanceGoal.upsert({
      where: { id: data.id || "new-id" },
      create: {
        tenantId,
        employeeId: data.employeeId,
        title: data.title,
        description: data.description,
        targetDate: new Date(data.targetDate),
        progress: data.progress || 0,
        status: data.status || "IN_PROGRESS",
      },
      update: {
        title: data.title,
        description: data.description,
        targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
        progress: data.progress,
        status: data.status,
      },
    });
    return this.mapPerformanceGoal(goal);
  }

  async getGoalById(tenantId: string, id: string): Promise<PerformanceGoal | null> {
    const goal = await this.prisma.performanceGoal.findFirst({
      where: { id, tenantId },
    });
    return goal ? this.mapPerformanceGoal(goal) : null;
  }

  // AI-Powered Learning Path Personalization
  async getTrainingProgramsBySkills(tenantId: string, skillIds: string[]): Promise<TrainingProgram[]> {
    const programs = await this.prisma.trainingProgram.findMany({
      where: {
        tenantId,
        hrProgramSkills: {
          some: {
            skillId: { in: skillIds },
          },
        },
      },
    });
    return programs.map((p) => this.mapTrainingProgram(p));
  }

  async getEmployeeTrainingHistory(tenantId: string, employeeId: string): Promise<TrainingAssignment[]> {
    const assignments = await this.prisma.trainingAssignment.findMany({
      where: { employeeId, tenantId },
      include: { employee: true },
    });
    return assignments.map((a) => this.mapTrainingAssignment(a));
  }

  async enrollInTrainingProgram(tenantId: string, employeeId: string, programId: string): Promise<TrainingAssignment> {
    const assignment = await this.prisma.trainingAssignment.create({
      data: {
        tenantId,
        employeeId,
        programId,
        status: "in_progress",
        assignedAt: new Date(),
      },
      include: { employee: true },
    });
    return this.mapTrainingAssignment(assignment);
  }

  async getTrainingProgramById(tenantId: string, id: string): Promise<TrainingProgram | null> {
    const program = await this.prisma.trainingProgram.findFirst({
      where: { id, tenantId },
      include: { 
        hrProgramSkills: { include: { hrSkill: true } }
      },
    });
    return program ? this.mapTrainingProgram(program) : null;
  }

  // Predictive Labor Cost Modeling
  async getDepartmentBudgetData(tenantId: string, departmentId: string): Promise<any> {
    const scenario = await this.prisma.budgetScenario.findFirst({
      where: { tenantId, status: "APPROVED" },
      orderBy: { fiscalYear: "desc" },
    });
    if (!scenario) return null;

    const plans = await this.prisma.headcountPlan.findMany({
      where: { scenarioId: scenario.id, departmentId },
    });

    return {
      scenarioName: scenario.name,
      fiscalYear: scenario.fiscalYear,
      totalDepartmentBudget: scenario.totalBudget, // This is simplified
      headcountPlans: plans.map(p => ({
        positionTitle: p.positionTitle,
        targetHeadcount: p.targetHeadcount,
        projectedSalary: p.projectedSalary,
      })),
    };
  }

  async getActualLaborCostHistory(tenantId: string, departmentId: string, monthLimit: number): Promise<any[]> {
    // This would ideally sum payroll lines but for now we aggregate monthly
    const payrolls = await this.prisma.payrollProfile.findMany({
      where: { employee: { departmentId, tenantId } },
    });
    
    // Simplified history
    return [
      { period: "2026-01", totalCost: 85000, grossCost: 95000 },
      { period: "2026-02", totalCost: 87000, grossCost: 97000 },
    ].slice(0, monthLimit);
  }

  // ============================================================
  // HOLIDAY MANAGEMENT
  // ============================================================

  async getHolidays(tenantId: string): Promise<any[]> {
    return this.prisma.hrHoliday.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      orderBy: { date: "asc" },
    });
  }

  async createHoliday(tenantId: string, data: any): Promise<any> {
    return this.prisma.hrHoliday.create({
      data: {
        tenantId,
        name: data.name,
        date: new Date(data.date),
        isGlobal: data.isGlobal || false,
        description: data.description,
      },
    });
  }

  // ============================================================
  // COMPLIANCE ENGINE
  // ============================================================

  async getComplianceModules(tenantId: string): Promise<any[]> {
    return this.prisma.hrComplianceModule.findMany({
      where: { tenantId },
    });
  }

  async enableComplianceModule(tenantId: string, moduleKey: string, config?: any): Promise<any> {
    return this.prisma.hrComplianceModule.upsert({
      where: {
        tenantId_moduleKey: {
          tenantId,
          moduleKey,
        },
      },
      update: {
        status: "ACTIVE",
        config,
      },
      create: {
        tenantId,
        moduleKey,
        status: "ACTIVE",
        config,
      },
    });
  }

  async getComplianceReports(tenantId: string): Promise<any[]> {
    return this.prisma.hrComplianceReport.findMany({
      where: { tenantId },
      orderBy: { id: 'desc' }
    });
  }

  async createComplianceReport(tenantId: string, data: any): Promise<any> {
    return this.prisma.hrComplianceReport.create({
      data: {
        tenantId,
        payrollRunId: data.payrollRunId,
        type: data.type,
        status: data.status || "GENERATED",
        summary: data.summary || {},
        fileUrl: data.fileUrl,
      },
    });
  }

  async getGlobalComplianceStatus(tenantId: string, status?: string): Promise<ComplianceDocument[]> {
    const where: any = { tenantId };
    if (status) where.verificationStatus = status;

    const docs = await this.prisma.hrComplianceDocument.findMany({
      where,
      orderBy: { id: 'desc' }
    });
    return docs.map((d: any) => this.mapDocument(d));
  }

  async getRequisitionById(tenantId: string, id: string): Promise<JobRequisition | null> {
    const requisition = await this.prisma.jobRequisition.findFirst({
      where: { id, tenantId },
    });
    return requisition ? this.mapRequisition(requisition) : null;
  }

  async getContractById(tenantId: string, id: string): Promise<Contract | null> {
    const contract = await this.prisma.contract.findFirst({
      where: { id, tenantId },
    });
    return contract ? this.mapContract(contract) : null;
  }

  async getWorkSchedules(tenantId: string, locationId?: string, status?: string): Promise<any[]> {
    const schedules = await this.prisma.workSchedule.findMany({
      where: {
        tenantId,
        ...(locationId ? { locationId } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { startDate: "desc" },
    });
    return schedules.map((s) => this.mapWorkSchedule(s));
  }

  async createWorkSchedule(tenantId: string, data: any, tx?: Prisma.TransactionClient): Promise<any> {
    const db = tx ?? this.prisma;
    
    // Critical pre-validation
    await assertExists(() => db.department.findUnique({ where: { id: data.departmentId } }), 'departmentId', data.departmentId);

    const createData: Prisma.WorkScheduleUncheckedCreateInput = {
      tenantId,
      departmentId: data.departmentId,
      name: data.name,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      status: data.status || "DRAFT",
      createdBy: data.createdBy,
      metadata: data.metadata || {},
      ...(data.locationId ? { locationId: data.locationId } : {}),
    };

    try {
      const schedule = await db.workSchedule.create({ data: createData });
      return this.mapWorkSchedule(schedule);
    } catch (error) {
      handlePrismaFkError(error, 'WorkSchedule');
    }
  }

  async updateWorkSchedule(tenantId: string, id: string, data: any, tx?: Prisma.TransactionClient): Promise<any> {
    const db = tx ?? this.prisma;
    const updated = await db.workSchedule.update({
      where: { id, tenantId },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
    return this.mapWorkSchedule(updated);
  }

  async getWorkShifts(tenantId: string, scheduleId?: string, employeeId?: string): Promise<any[]> {
    const shifts = await this.prisma.workShift.findMany({
      where: {
        tenantId,
        ...(scheduleId ? { scheduleId } : {}),
        ...(employeeId ? { employeeId } : {}),
      },
      orderBy: { startTime: "asc" },
    });
    return shifts.map((s) => this.mapWorkShift(s));
  }

  async createWorkShift(tenantId: string, data: any, tx?: Prisma.TransactionClient): Promise<any> {
    const db = tx ?? this.prisma;

    // Critical pre-validation
    await Promise.all([
      assertExists(() => db.workSchedule.findUnique({ where: { id: data.scheduleId } }), 'scheduleId', data.scheduleId),
      assertExists(() => db.employee.findUnique({ where: { id: data.employeeId } }), 'employeeId', data.employeeId),
    ]);

    const createData: Prisma.WorkShiftUncheckedCreateInput = {
      tenantId,
      scheduleId: data.scheduleId,
      employeeId: data.employeeId,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      roleId: data.roleId,
      notes: data.notes,
      metadata: data.metadata || {},
      ...(data.locationId ? { locationId: data.locationId } : {}),
    };

    try {
      const shift = await db.workShift.create({ data: createData });
      return this.mapWorkShift(shift);
    } catch (error) {
      handlePrismaFkError(error, 'WorkShift');
    }
  }

  async updateWorkShift(tenantId: string, id: string, data: any, tx?: Prisma.TransactionClient): Promise<any> {
    const db = tx ?? this.prisma;
    const updated = await db.workShift.update({
      where: { id, tenantId },
      data: {
        ...data,
        startTime: data.startTime ? new Date(data.startTime) : undefined,
        endTime: data.endTime ? new Date(data.endTime) : undefined,
      },
    });
    return this.mapWorkShift(updated);
  }

  async approveWorkSchedule(tenantId: string, id: string, approvedBy: string, tx?: Prisma.TransactionClient): Promise<any> {
    const db = tx ?? this.prisma;
    try {
      const schedule = await db.workSchedule.update({
        where: { id, tenantId },
        data: {
          status: "APPROVED",
          metadata: {
            approvedBy,
            approvedAt: new Date(),
          },
        },
      });
      return this.mapWorkSchedule(schedule);
    } catch (error) {
      handlePrismaFkError(error, 'WorkScheduleApproval');
    }
  }

  private mapWorkSchedule(s: any) {
    return {
      id: s.id,
      tenantId: s.tenantId,
      locationId: s.locationId,
      name: s.name,
      startDate: s.startDate,
      endDate: s.endDate,
      status: s.status,
      createdBy: s.createdBy,
      metadata: s.metadata,
    };
  }

  private mapWorkShift(s: any) {
    return {
      id: s.id,
      tenantId: s.tenantId,
      scheduleId: s.scheduleId,
      employeeId: s.employeeId,
      startTime: s.startTime,
      endTime: s.endTime,
      roleId: s.roleId,
      locationId: s.locationId,
      notes: s.notes,
      metadata: s.metadata,
    };
  }
}
