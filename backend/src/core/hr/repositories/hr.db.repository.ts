import { Injectable } from "@nestjs/common";
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
  ): Promise<Employee[]> {
    const where: any = {
      tenantId: tenantId,
      deletedAt: null,
    };

    if (locationId) {
      where.locationId = locationId;
    }

    const employees = await this.prisma.employee.findMany({
      where,
      include: {
        location: true,
        department: true,
      },
      orderBy: { lastName: "asc" },
    });

    return employees.map(this.mapEmployee);
  }

  async getGlobalEmployees(locationId?: string): Promise<Employee[]> {
    const where: any = {
      deletedAt: null,
    };

    if (locationId) {
      where.locationId = locationId;
    }

    const employees = await this.prisma.employee.findMany({
      where,
      include: {
        location: true,
        department: true,
      },
      orderBy: { lastName: "asc" },
    });

    return employees.map(this.mapEmployee);
  }

  async getEmployeeById(
    tenantId: string,
    employeeId: string,
  ): Promise<Employee | null> {
    if (employeeId === "user-demo") {
      return {
        id: "user-demo",
        tenantId: "comp-demo-a",
        locationId: "loc-demo-1",
        employeeCode: "EMP-001",
        firstName: "Demo",
        lastName: "User",
        fullName: "Demo User",
        email: "demo@zenvix.com",
        phone: "123-456-7890",
        departmentId: "dept-demo",
        roleTitle: "Super Admin",
        status: "active",
        employmentType: "full_time",
        hireDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    const employee = await this.prisma.employee.findFirst({
      where: {
        id: employeeId,
        tenantId: tenantId,
        deletedAt: null,
      },
      include: {
        location: true,
        department: true,
      },
    });

    return employee ? this.mapEmployee(employee) : null;
  }

  async getGlobalEmployeeById(employeeId: string): Promise<Employee | null> {
    if (employeeId === "user-demo") {
      return {
        id: "user-demo",
        tenantId: "comp-demo-a",
        locationId: "loc-demo-1",
        employeeCode: "EMP-001",
        firstName: "Demo",
        lastName: "User",
        fullName: "Demo User",
        email: "demo@zenvix.com",
        phone: "123-456-7890",
        departmentId: "dept-demo",
        roleTitle: "Super Admin",
        status: "active",
        employmentType: "full_time",
        hireDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    const employee = await this.prisma.employee.findUnique({
      where: {
        id: employeeId,
      },
      include: {
        location: true,
        department: true,
      },
    });

    return employee ? this.mapEmployee(employee) : null;
  }

  async createEmployee(
    tenantId: string,
    data: CreateEmployeeDto,
  ): Promise<Employee> {
    // Ensure locationId is provided or use first available location
    let locationId = data.locationId;
    if (!locationId) {
      const firstLocation = await this.prisma.location.findFirst({
        where: { tenantId: tenantId },
      });
      locationId = firstLocation?.id || "loc-default";
    }

    const employee = await this.prisma.employee.create({
      data: {
        tenantId: tenantId,
        locationId,
        departmentId: data.departmentId,
        employeeCode: data.employeeCode,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        managerId: data.managerId,
        position: data.roleTitle,
        employmentType: data.employmentType,
        baseSalary: data.baseSalary,
        hourlyRate: data.hourlyRate,
        hireDate: new Date(data.hireDate),
        status: "active",
      },
      include: {
        location: true,
        department: true,
      },
    });

    return this.mapEmployee(employee);
  }

  async updateEmployee(
    tenantId: string,
    employeeId: string,
    data: UpdateEmployeeDto,
  ): Promise<Employee> {
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

    const employee = await this.prisma.employee.update({
      where: {
        id: employeeId,
        tenantId: tenantId,
      },
      data: updateData,
      include: {
        location: true,
        department: true,
      },
    });

    return this.mapEmployee(employee);
  }

  async deactivateEmployee(
    tenantId: string,
    employeeId: string,
  ): Promise<Employee> {
    const employee = await this.prisma.employee.update({
      where: {
        id: employeeId,
        tenantId: tenantId,
      },
      data: {
        deletedAt: new Date(),
        status: "terminated",
      },
      include: {
        location: true,
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
  ): Promise<Attendance[]> {
    const where: any = { tenantId: tenantId };

    if (locationId) where.locationId = locationId;
    if (employeeId) where.employeeId = employeeId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const records = await this.prisma.attendanceRecord.findMany({
      where,
      orderBy: { date: "desc" },
      take: 100,
    });

    return records.map(this.mapAttendance);
  }

  async getGlobalAttendance(
    employeeId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<Attendance[]> {
    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const attendance = await this.prisma.attendanceRecord.findMany({
      where,
      orderBy: { date: "desc" },
    });

    return attendance.map(this.mapAttendance);
  }

  async clockIn(
    tenantId: string,
    employeeId: string,
    locationId: string,
  ): Promise<Attendance> {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];

    const attendance = await this.prisma.attendanceRecord.create({
      data: {
        tenantId: tenantId,
        employeeId,
        locationId,
        date: now,
        status: "present",
        checkIn: {
          time: now.toISOString(),
          method: "manual",
        },
        workDurationMinutes: 0,
      },
    });

    return this.mapAttendance(attendance);
  }

  async clockOut(tenantId: string, employeeId: string): Promise<Attendance> {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];

    // Find today's attendance record
    const todayAttendance = await this.prisma.attendanceRecord.findFirst({
      where: {
        tenantId: tenantId,
        employeeId,
        date: {
          gte: new Date(dateStr + "T00:00:00Z"),
          lt: new Date(dateStr + "T23:59:59Z"),
        },
        checkOut: null as any,
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

    const attendance = await this.prisma.attendanceRecord.update({
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
      orderBy: { createdAt: "desc" },
    });

    return requests.map(this.mapLeaveRequest);
  }

  async getGlobalLeaveRequests(
    status?: string,
    employeeId?: string,
  ): Promise<LeaveRequest[]> {
    const where: any = {};
    if (status) where.status = status;
    if (employeeId) where.employeeId = employeeId;

    const requests = await this.prisma.leaveRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
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
  ): Promise<LeaveRequest> {
    const request = await this.prisma.leaveRequest.update({
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
  ): Promise<LeaveRequest> {
    const request = await this.prisma.leaveRequest.update({
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
        payrollRun: true,
      },
      orderBy: { createdAt: "desc" },
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
      orderBy: { createdAt: "desc" },
    });

    return payrolls.map(this.mapPayroll);
  }

  async calculatePayroll(
    tenantId: string,
    employeeId: string,
    period: string,
  ): Promise<Payroll> {
    // Get employee details
    const employee = await this.prisma.employee.findFirst({
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
      payrollRun = await this.prisma.payrollRun.create({
        data: {
          tenantId: tenantId,
          periodStart,
          periodEnd,
          status: "draft",
        },
      });
    }

    const payrollLine = await this.prisma.payrollLine.create({
      data: {
        tenantId: tenantId,
        payrollRunId: payrollRun.id,
        employeeId,
        grossPay,
        adjustments,
        netPay,
      },
      include: {
        payrollRun: true,
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
  ): Promise<Department> {
    const department = await this.prisma.department.create({
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
      orderBy: { createdAt: "desc" },
    });
    return requisitions.map(this.mapRequisition);
  }

  async getGlobalRequisitions(status?: string): Promise<JobRequisition[]> {
    const where: any = {};
    if (status) where.status = status;

    const requisitions = await this.prisma.jobRequisition.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return requisitions.map(this.mapRequisition);
  }

  async createRequisition(
    tenantId: string,
    data: CreateRequisitionDto,
  ): Promise<JobRequisition> {
    const requisition = await this.prisma.jobRequisition.create({
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
  ): Promise<JobRequisition> {
    const requisition = await this.prisma.jobRequisition.update({
      where: { id, tenantId: tenantId },
      data: data as any,
    });
    return this.mapRequisition(requisition);
  }

  // ============================================================
  // PERFORMANCE MANAGEMENT
  // ============================================================

  async getPerformanceCycles(tenantId: string): Promise<PerformanceCycle[]> {
    const cycles = await this.prisma.performanceCycle.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: "desc" },
    });
    return cycles.map(this.mapPerformanceCycle);
  }

  async createPerformanceCycle(
    tenantId: string,
    data: CreatePerformanceCycleDto,
  ): Promise<PerformanceCycle> {
    const cycle = await this.prisma.performanceCycle.create({
      data: {
        tenantId: tenantId,
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
    data: Partial<PerformanceCycle>,
  ): Promise<PerformanceCycle> {
    const cycle = await this.prisma.performanceCycle.update({
      where: { id, tenantId: tenantId },
      data: data as any,
    });
    return this.mapPerformanceCycle(cycle);
  }

  async getPerformanceReviews(
    tenantId: string,
    cycleId?: string,
    employeeId?: string,
  ): Promise<PerformanceReview[]> {
    const where: any = { tenantId: tenantId };
    if (cycleId) where.cycleId = cycleId;
    if (employeeId) where.employeeId = employeeId;

    const reviews = await this.prisma.performanceReview.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });
    return reviews.map(this.mapPerformanceReview);
  }

  async getGlobalPerformanceReviews(
    cycleId?: string,
    employeeId?: string,
  ): Promise<PerformanceReview[]> {
    const where: any = {};
    if (cycleId) where.cycleId = cycleId;
    if (employeeId) where.employeeId = employeeId;

    const reviews = await this.prisma.performanceReview.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return reviews.map(this.mapPerformanceReview);
  }

  async submitPerformanceReview(
    tenantId: string,
    data: SubmitReviewDto,
  ): Promise<PerformanceReview> {
    const review = await this.prisma.performanceReview.create({
      data: {
        tenantId: tenantId,
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
    const where: any = { tenantId: tenantId };
    if (locationId) {
      where.employee = { locationId: locationId };
    }
    if (status) where.status = status;

    const cases = await this.prisma.hRCase.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return cases.map(this.mapHRCase);
  }

  async getCaseById(tenantId: string, id: string): Promise<HRCase | null> {
    const hrCase = await this.prisma.hRCase.findFirst({
      where: { id, tenantId: tenantId },
    });
    return hrCase ? this.mapHRCase(hrCase) : null;
  }

  async createCase(tenantId: string, data: CreateCaseDto): Promise<HRCase> {
    const hrCase = await this.prisma.hRCase.create({
      data: {
        tenantId: tenantId,
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

  async updateCase(
    tenantId: string,
    id: string,
    data: Partial<HRCase>,
  ): Promise<HRCase> {
    const hrCase = await this.prisma.hRCase.update({
      where: { id, tenantId: tenantId },
      data: data as any,
    });
    return this.mapHRCase(hrCase);
  }

  // ============================================================
  // CONTRACT MANAGEMENT
  // ============================================================

  async getContracts(
    tenantId: string,
    locationId?: string,
    employeeId?: string,
  ): Promise<Contract[]> {
    const where: any = { tenantId: tenantId };
    if (locationId) {
      where.employee = { locationId: locationId };
    }
    if (employeeId) where.employeeId = employeeId;

    const contracts = await this.prisma.contract.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return contracts.map(this.mapContract);
  }

  async getGlobalContracts(employeeId?: string): Promise<Contract[]> {
    const where: any = {};
    if (employeeId) where.employeeId = employeeId;

    const contracts = await this.prisma.contract.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return contracts.map(this.mapContract);
  }

  async createContract(
    tenantId: string,
    data: CreateContractDto,
  ): Promise<Contract> {
    const contract = await this.prisma.contract.create({
      data: {
        tenantId: tenantId,
        employeeId: data.employeeId,
        title: data.title,
        type: data.type,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        url: data.url,
        status: "active",
      },
    });
    return this.mapContract(contract);
  }

  async updateContract(
    tenantId: string,
    id: string,
    data: Partial<Contract>,
  ): Promise<Contract> {
    const contract = await this.prisma.contract.update({
      where: { id, tenantId: tenantId },
      data: data as any,
    });
    return this.mapContract(contract);
  }

  // ============================================================
  // LOCATION MANAGEMENT
  // ============================================================

  async getLocations(tenantId: string): Promise<any[]> {
    return await this.prisma.location.findMany({
      where: { tenantId: tenantId },
      orderBy: { name: "asc" },
    });
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
      managerId: e.managerId,
      roleTitle: e.position,
      status: e.status as any,
      employmentType: e.employmentType as any,
      baseSalary: e.baseSalary ? Number(e.baseSalary) : undefined,
      hourlyRate: e.hourlyRate ? Number(e.hourlyRate) : undefined,
      hireDate: e.hireDate,
      terminationDate: e.terminationDate,
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
}
