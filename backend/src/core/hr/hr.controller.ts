import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Patch,
  UploadedFile,
  Res,
  UseInterceptors,
  UseGuards,
} from "@nestjs/common";
import { Request, Response } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import { HRService } from "./hr.service";
import { PrismaService } from "../../persistence/prisma.service";
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";
import { ClockInDto } from "./dto/clock-in.dto";
import { CreateLeaveRequestDto } from "./dto/create-leave-request.dto";
import { CreateDepartmentDto } from "./dto/create-department.dto";
import { CreateRequisitionDto } from "./dto/create-requisition.dto";
import { CreatePerformanceCycleDto } from "./dto/create-performance-cycle.dto";
import { SubmitReviewDto } from "./dto/submit-review.dto";
import { CreateCaseDto } from "./dto/create-case.dto";
import { CreateContractDto } from "./dto/create-contract.dto";
import { TenantContext } from "../../gateway/tenant-context.interface";
import { TenantInterceptor } from "../../gateway/tenant.interceptor";
import { ModuleStateGuard } from "../auth/guards/module-state.guard";
import { BranchGatingGuard } from "../auth/guards/branch-gating.guard";
import { TenantGuard } from "../../shared/guards/tenant.guard";
import { RequiredModule } from "../../shared/decorators/required-module.decorator";
import { isModuleActive } from "../../shared/helpers/module-active.helper";
import { AuditService } from "../../shared/audit/audit.service";

interface RequestWithTenant extends Request {
  tenantContext: TenantContext;
}

/**
 * HR Controller
 * REST API endpoints for HR operations
 * All endpoints require x-tenant-id header
 */
@Controller("hr")
@UseInterceptors(TenantInterceptor)
@UseGuards(ModuleStateGuard, BranchGatingGuard, TenantGuard)
@RequiredModule("hr")
export class HRController {
  constructor(
    private readonly hrService: HRService,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}
  // ==================== Overview (Module-Aware) ====================

  /**
   * GET /hr/overview
   * HR workspace overview — enriched with data from active industry modules.
   * Always returns core HR metrics; adds retail workforce data when retail is active.
   */
  @Get("overview")
  async getOverview(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;

    // Core HR metrics
    const [
      totalEmployees,
      activeEmployees,
      pendingLeaveCount,
      openCasesCount,
      openRequisitions,
    ] = await Promise.all([
      this.prisma.employee.count({ where: { tenantId } }),
      this.prisma.employee.count({ where: { tenantId, status: "active" } }),
      this.prisma.leaveRequest.count({
        where: { tenantId, status: "PENDING" },
      }),
      this.prisma.hRCase.count({ where: { tenantId, status: "OPEN" } }),
      this.prisma.jobRequisition.count({ where: { tenantId, status: "OPEN" } }),
    ]);

    const coreWorkforce = {
      totalEmployees,
      activeEmployees,
      attendanceToday: "N/A", // Replaced attendance count due to schema issue
      pendingLeaveRequests: pendingLeaveCount,
      openCases: openCasesCount,
      openRequisitions,
    };

    // ================================================================
    // MODULE CONTRIBUTIONS — Retail
    // ================================================================
    let retailContribution: Record<string, any> | null = null;

    const retailIsActive = await isModuleActive(
      this.prisma,
      tenantId,
      "retail",
    );
    if (retailIsActive) {
      // Retail staff (employees in the Retail Operations department or with retail role)
      const retailDept = await this.prisma.department.findFirst({
        where: {
          tenantId,
          OR: [
            { name: { contains: "Retail", mode: "insensitive" } },
            { code: { contains: "RET", mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true },
      });

      const retailStaffCount = retailDept
        ? await this.prisma.employee.count({
            where: { tenantId, departmentId: retailDept.id, status: "active" },
          })
        : await this.prisma.employee.count({
            where: { tenantId, status: "active" },
          });

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Active shifts today (open retail shifts)
      const activeShifts = await this.prisma.retailShift.count({
        where: {
          tenantId,
          startTime: { gte: todayStart },
          endTime: null,
        },
      });

      // Shifts closed today (completed)
      const completedShifts = await this.prisma.retailShift.count({
        where: {
          tenantId,
          startTime: { gte: todayStart },
          endTime: { not: null },
        },
      });

      // Pending shift closures (open shifts older than 8h — likely need closure)
      const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);
      const pendingShiftClosures = await this.prisma.retailShift.count({
        where: {
          tenantId,
          endTime: null,
          startTime: { lte: eightHoursAgo },
        },
      });

      retailContribution = {
        moduleId: "retail",
        moduleName: "Retail Operations",
        retailStaffCount,
        departmentName: retailDept?.name ?? "Retail",
        activeShiftsToday: activeShifts,
        completedShiftsToday: completedShifts,
        pendingShiftClosures,
      };
    }

    return {
      success: true,
      tenantId,
      data: {
        coreWorkforce,
        moduleContributions: {
          retail: retailContribution,
        },
      },
    };
  }

  // ==================== Employee Management ====================

  /**
   * GET /hr/employees
   * List all employees for the tenant
   */
  @Get("employees")
  async getEmployees(
    @Req() request: RequestWithTenant,
    @Query("locationId") locationId?: string,
  ) {
    const {
      tenantId,
      role,
      locationId: contextLocationId,
    } = request.tenantContext;

    // For non-admin, force the context's locationId
    const effectiveLocationId =
      role === "SUPERADMIN" || role === "OWNER" || role === "ADMIN"
        ? locationId
        : contextLocationId;

    const employees =
      role === "SUPERADMIN"
        ? await this.hrService.getGlobalEmployees(effectiveLocationId)
        : await this.hrService.getEmployees(tenantId, effectiveLocationId);

    return {
      success: true,
      tenantId,
      locationId: locationId || "all",
      count: employees.length,
      data: employees,
    };
  }

  /**
   * GET /hr/employees/:id
   * Get a specific employee
   */
  @Get("employees/:id")
  async getEmployee(
    @Req() request: RequestWithTenant,
    @Param("id") employeeId: string,
  ) {
    const { tenantId, role } = request.tenantContext;

    let employee;
    if (role === "SUPERADMIN") {
      employee = await this.hrService.getGlobalEmployeeById(employeeId);
    } else {
      employee = await this.hrService.getEmployeeById(tenantId, employeeId);
    }

    if (!employee) {
      return {
        success: false,
        tenantId,
        message: "Employee not found",
        data: null,
      };
    }

    return {
      success: true,
      tenantId,
      data: employee,
    };
  }

  /**
   * POST /hr/employees
   * Create a new employee
   */
  @Post("employees")
  async createEmployee(
    @Req() request: RequestWithTenant,
    @Body() createEmployeeDto: CreateEmployeeDto,
  ) {
    const { tenantId, locationId, userId } = request.tenantContext;

    // Use context locationId if not provided in DTO
    if (locationId && !createEmployeeDto.locationId) {
      createEmployeeDto.locationId = locationId;
    }

    const employee = await this.hrService.createEmployee(
      tenantId,
      createEmployeeDto,
      userId,
    );

    return {
      success: true,
      tenantId,
      message: "Employee created successfully",
      data: employee,
    };
  }

  /**
   * PUT /hr/employees/:id
   * Update an employee
   */
  @Put("employees/:id")
  async updateEmployee(
    @Req() request: RequestWithTenant,
    @Param("id") employeeId: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    const { tenantId, userId } = request.tenantContext;
    const employee = await this.hrService.updateEmployee(
      tenantId,
      employeeId,
      updateEmployeeDto,
      userId,
    );

    return {
      success: true,
      tenantId,
      message: "Employee updated successfully",
      data: employee,
    };
  }

  /**
   * DELETE /hr/employees/:id
   * Deactivate an employee (soft delete)
   */
  @Delete("employees/:id")
  async deactivateEmployee(
    @Req() request: RequestWithTenant,
    @Param("id") employeeId: string,
  ) {
    const { tenantId, userId } = request.tenantContext;
    const employee = await this.hrService.deactivateEmployee(
      tenantId,
      employeeId,
      userId,
    );

    return {
      success: true,
      tenantId,
      message: "Employee deactivated successfully",
      data: employee,
    };
  }

  /**
   * POST /hr/employees/import
   * Bulk import employees from CSV/Excel
   */
  @Post("employees/import")
  @UseInterceptors(FileInterceptor("file"))
  async importEmployees(
    @Req() request: RequestWithTenant,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const { tenantId, userId } = request.tenantContext;
    const fileType = file.originalname.endsWith(".csv") ? "csv" : "xlsx";

    const result = await this.hrService.importEmployees(
      tenantId,
      file.buffer,
      fileType,
      userId!,
    );

    return {
      success: true,
      tenantId,
      message: `Imported ${result.imported} employees`,
      errors: result.errors,
    };
  }

  /**
   * GET /hr/employees/export
   * Export employee list to Excel
   */
  @Get("employees/export")
  async exportEmployees(
    @Req() request: RequestWithTenant,
    @Res() res: Response,
  ) {
    const { tenantId, userId } = request.tenantContext;
    const buffer = await this.hrService.exportEmployees(tenantId, userId!);

    res.set({
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="employees_${tenantId}_${Date.now()}.xlsx"`,
      "Content-Length": buffer.length,
    });

    res.end(buffer);
  }

  // ==================== Attendance Management ====================

  /**
   * GET /hr/attendance
   * Get attendance records
   */
  @Get("attendance")
  async getAttendance(
    @Req() request: RequestWithTenant,
    @Query("employeeId") employeeId?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const {
      tenantId,
      role,
      locationId: contextLocationId,
    } = request.tenantContext;

    const effectiveLocationId =
      role === "SUPERADMIN" || role === "OWNER" || role === "ADMIN"
        ? undefined // Admin can filter by query or see all
        : contextLocationId;

    const attendance =
      role === "SUPERADMIN"
        ? await this.hrService.getGlobalAttendance(
            employeeId,
            startDate,
            endDate,
          )
        : await this.hrService.getAttendance(
            tenantId,
            effectiveLocationId,
            employeeId,
            startDate,
            endDate,
          );

    return {
      success: true,
      tenantId,
      employeeId: employeeId || "all",
      count: attendance.length,
      data: attendance,
    };
  }

  /**
   * POST /hr/attendance/clock-in
   * Clock in an employee
   */
  @Post("attendance/clock-in")
  async clockIn(
    @Req() request: RequestWithTenant,
    @Body() clockInDto: ClockInDto,
  ) {
    const { tenantId, userId, locationId } = request.tenantContext;
    const effectiveLocationId =
      clockInDto.locationId || locationId || "default";

    const attendance = await this.hrService.clockIn(
      tenantId,
      clockInDto.employeeId,
      effectiveLocationId,
      userId,
    );

    return {
      success: true,
      tenantId,
      message: "Clocked in successfully",
      data: attendance,
    };
  }

  /**
   * POST /hr/attendance/clock-out
   * Clock out an employee
   */
  @Post("attendance/clock-out")
  async clockOut(
    @Req() request: RequestWithTenant,
    @Body() body: { employeeId: string },
  ) {
    const { tenantId, userId } = request.tenantContext;
    const attendance = await this.hrService.clockOut(
      tenantId,
      body.employeeId,
      userId,
    );

    return {
      success: true,
      tenantId,
      message: "Clocked out successfully",
      data: attendance,
    };
  }

  // ==================== Leave Management ====================

  /**
   * GET /hr/leave-requests
   * Get leave requests
   */
  @Get("leave-requests")
  async getLeaveRequests(
    @Req() request: RequestWithTenant,
    @Query("status") status?: string,
    @Query("employeeId") employeeId?: string,
  ) {
    const {
      tenantId,
      role,
      locationId: contextLocationId,
    } = request.tenantContext;

    const effectiveLocationId =
      role === "SUPERADMIN" || role === "OWNER" || role === "ADMIN"
        ? undefined
        : contextLocationId;

    const requests =
      role === "SUPERADMIN"
        ? await this.hrService.getGlobalLeaveRequests(status, employeeId)
        : await this.hrService.getLeaveRequests(
            tenantId,
            effectiveLocationId,
            status,
            employeeId,
          );

    return {
      success: true,
      tenantId,
      count: requests.length,
      data: requests,
    };
  }

  /**
   * POST /hr/leave-requests
   * Create a leave request
   */
  @Post("leave-requests")
  async createLeaveRequest(
    @Req() request: RequestWithTenant,
    @Body() createLeaveRequestDto: CreateLeaveRequestDto,
  ) {
    const { tenantId, userId } = request.tenantContext;
    const leaveRequest = await this.hrService.createLeaveRequest(
      tenantId,
      createLeaveRequestDto,
      userId,
    );

    return {
      success: true,
      tenantId,
      message: "Leave request created successfully",
      data: leaveRequest,
    };
  }

  /**
   * PUT /hr/leave-requests/:id/approve
   * Approve a leave request
   */
  @Put("leave-requests/:id/approve")
  async approveLeaveRequest(
    @Req() request: RequestWithTenant,
    @Param("id") requestId: string,
    @Body() body: { reviewerId: string; notes?: string },
  ) {
    const { tenantId, userId } = request.tenantContext;
    const leaveRequest = await this.hrService.approveLeaveRequest(
      tenantId,
      requestId,
      body.reviewerId,
      body.notes,
      userId,
    );

    return {
      success: true,
      tenantId,
      message: "Leave request approved",
      data: leaveRequest,
    };
  }

  /**
   * PUT /hr/leave-requests/:id/reject
   * Reject a leave request
   */
  @Put("leave-requests/:id/reject")
  async rejectLeaveRequest(
    @Req() request: RequestWithTenant,
    @Param("id") requestId: string,
    @Body() body: { reviewerId: string; notes: string },
  ) {
    const { tenantId, userId } = request.tenantContext;
    const leaveRequest = await this.hrService.rejectLeaveRequest(
      tenantId,
      requestId,
      body.reviewerId,
      body.notes,
      userId,
    );

    return {
      success: true,
      tenantId,
      message: "Leave request rejected",
      data: leaveRequest,
    };
  }

  // ==================== Payroll Management ====================

  /**
   * GET /hr/payroll/:employeeId
   * Get payroll records for an employee
   */
  @Get("payroll/:employeeId")
  async getPayroll(
    @Req() request: RequestWithTenant,
    @Param("employeeId") employeeId: string,
    @Query("period") period?: string,
  ) {
    const {
      tenantId,
      role,
      locationId: contextLocationId,
    } = request.tenantContext;

    const effectiveLocationId =
      role === "SUPERADMIN" || role === "OWNER" || role === "ADMIN"
        ? undefined
        : contextLocationId;

    const payrolls =
      role === "SUPERADMIN"
        ? await this.hrService.getGlobalPayroll(employeeId, period)
        : await this.hrService.getPayroll(
            tenantId,
            effectiveLocationId,
            employeeId,
            period,
          );

    return {
      success: true,
      tenantId,
      employeeId,
      count: payrolls.length,
      data: payrolls,
    };
  }

  /**
   * POST /hr/payroll/:employeeId/calculate
   * Calculate payroll for an employee
   */
  @Post("payroll/:employeeId/calculate")
  async calculatePayroll(
    @Req() request: RequestWithTenant,
    @Param("employeeId") employeeId: string,
    @Body() body: { period: string },
  ) {
    const { tenantId, userId } = request.tenantContext;
    const payroll = await this.hrService.calculatePayroll(
      tenantId,
      employeeId,
      body.period,
      userId,
    );

    return {
      success: true,
      tenantId,
      message: "Payroll calculated successfully",
      data: payroll,
    };
  }

  // ==================== Organization Management ====================

  @Get("departments")
  async getDepartments(@Req() request: RequestWithTenant) {
    const { tenantId, role } = request.tenantContext;

    const departments =
      role === "SUPERADMIN"
        ? await this.hrService.getGlobalDepartments()
        : await this.hrService.getDepartments(tenantId);

    return { success: true, tenantId, data: departments };
  }

  @Post("departments")
  async createDepartment(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateDepartmentDto,
  ) {
    const { tenantId, userId } = request.tenantContext;
    const department = await this.hrService.createDepartment(
      tenantId,
      dto,
      userId,
    );
    return { success: true, tenantId, data: department };
  }

  // ==================== Recruitment Management ====================

  @Get("requisitions")
  async getRequisitions(
    @Req() request: RequestWithTenant,
    @Query("status") status?: string,
  ) {
    const { tenantId, role } = request.tenantContext;

    const requisitions =
      role === "SUPERADMIN"
        ? await this.hrService.getGlobalRequisitions(status)
        : await this.hrService.getRequisitions(tenantId, status);

    return { success: true, tenantId, data: requisitions };
  }

  @Post("requisitions")
  async createRequisition(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateRequisitionDto,
  ) {
    const { tenantId, userId } = request.tenantContext;
    const requisition = await this.hrService.createRequisition(
      tenantId,
      dto,
      userId,
    );
    return { success: true, tenantId, data: requisition };
  }

  @Patch("requisitions/:id")
  async updateRequisition(
    @Req() request: RequestWithTenant,
    @Param("id") id: string,
    @Body() body: any,
  ) {
    const { tenantId, userId } = request.tenantContext;
    const requisition = await this.hrService.updateRequisition(
      tenantId,
      id,
      body,
      userId,
    );
    return { success: true, tenantId, data: requisition };
  }

  // ==================== Performance Management ====================

  @Get("performance/cycles")
  async getPerformanceCycles(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const cycles = await this.hrService.getPerformanceCycles(tenantId);
    return { success: true, tenantId, data: cycles };
  }

  @Post("performance/cycles")
  async createPerformanceCycle(
    @Req() request: RequestWithTenant,
    @Body() dto: CreatePerformanceCycleDto,
  ) {
    const { tenantId, userId } = request.tenantContext;
    const cycle = await this.hrService.createPerformanceCycle(
      tenantId,
      dto,
      userId,
    );
    return { success: true, tenantId, data: cycle };
  }

  @Get("performance/reviews")
  async getPerformanceReviews(
    @Req() request: RequestWithTenant,
    @Query("cycleId") cycleId?: string,
    @Query("employeeId") employeeId?: string,
  ) {
    const { tenantId, role } = request.tenantContext;

    const reviews =
      role === "SUPERADMIN"
        ? await this.hrService.getGlobalPerformanceReviews(cycleId, employeeId)
        : await this.hrService.getPerformanceReviews(
            tenantId,
            cycleId,
            employeeId,
          );

    return { success: true, tenantId, data: reviews };
  }

  @Post("performance/reviews")
  async submitPerformanceReview(
    @Req() request: RequestWithTenant,
    @Body() dto: SubmitReviewDto,
  ) {
    const { tenantId, userId } = request.tenantContext;
    const review = await this.hrService.submitPerformanceReview(
      tenantId,
      dto,
      userId,
    );
    return { success: true, tenantId, data: review };
  }

  // ==================== Case Management ====================

  @Get("cases")
  async getCases(
    @Req() request: RequestWithTenant,
    @Query("status") status?: string,
  ) {
    const {
      tenantId,
      role,
      locationId: contextLocationId,
    } = request.tenantContext;

    const effectiveLocationId =
      role === "SUPERADMIN" || role === "OWNER" || role === "ADMIN"
        ? undefined
        : contextLocationId;

    const cases = await this.hrService.getCases(
      tenantId,
      effectiveLocationId,
      status,
    );
    return { success: true, tenantId, data: cases };
  }

  @Get("cases/:id")
  async getCase(@Req() request: RequestWithTenant, @Param("id") id: string) {
    const { tenantId } = request.tenantContext;
    const hrCase = await this.hrService.getCaseById(tenantId, id);
    return { success: true, tenantId, data: hrCase };
  }

  @Post("cases")
  async createCase(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateCaseDto,
  ) {
    const { tenantId, userId } = request.tenantContext;
    const hrCase = await this.hrService.createCase(tenantId, dto, userId);
    return { success: true, tenantId, data: hrCase };
  }

  @Patch("cases/:id")
  async updateCase(
    @Req() request: RequestWithTenant,
    @Param("id") id: string,
    @Body() body: any,
  ) {
    const { tenantId, userId } = request.tenantContext;
    const hrCase = await this.hrService.updateCase(tenantId, id, body, userId);
    return { success: true, tenantId, data: hrCase };
  }

  // ==================== Contract Management ====================

  @Get("contracts")
  async getContracts(
    @Req() request: RequestWithTenant,
    @Query("employeeId") employeeId?: string,
  ) {
    const {
      tenantId,
      role,
      locationId: contextLocationId,
    } = request.tenantContext;

    const effectiveLocationId =
      role === "SUPERADMIN" || role === "OWNER" || role === "ADMIN"
        ? undefined
        : contextLocationId;

    const contracts =
      role === "SUPERADMIN"
        ? await this.hrService.getGlobalContracts(employeeId)
        : await this.hrService.getContracts(
            tenantId,
            effectiveLocationId,
            employeeId,
          );

    return { success: true, tenantId, data: contracts };
  }

  @Post("contracts")
  async createContract(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateContractDto,
  ) {
    const { tenantId, userId } = request.tenantContext;
    const contract = await this.hrService.createContract(tenantId, dto, userId);
    return { success: true, tenantId, data: contract };
  }

  @Patch("contracts/:id")
  async updateContract(
    @Req() request: RequestWithTenant,
    @Param("id") id: string,
    @Body() body: any,
  ) {
    const { tenantId, userId } = request.tenantContext;
    const contract = await this.hrService.updateContract(
      tenantId,
      id,
      body,
      userId,
    );
    return { success: true, tenantId, data: contract };
  }

  // ==================== Payroll Runs Management ====================

  /**
   * GET /hr/payroll-runs
   * List all payroll runs for the tenant (tracked as HRCase with type=PAYROLL_RUN)
   */
  @Get("payroll-runs")
  async getPayrollRuns(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const runs = await this.prisma.hRCase.findMany({
      where: { tenantId, type: "PAYROLL_RUN" },
      orderBy: { createdAt: "desc" },
    });
    // Map case to payroll run shape
    const mapped = runs.map((r: any) => {
      let meta: any = {};
      try { meta = JSON.parse(r.description || "{}"); } catch {}
      return { id: r.id, tenantId: r.tenantId, periodStart: meta.periodStart, periodEnd: meta.periodEnd, status: r.status === "OPEN" ? "draft" : r.status === "IN_PROGRESS" ? "pending" : r.status === "CLOSED" ? "approved" : r.status, totalEmployees: meta.totalEmployees ?? 0, totalGrossPay: meta.totalGrossPay ?? 0, totalNetPay: meta.totalNetPay ?? 0, createdAt: r.createdAt, updatedAt: r.updatedAt };
    });
    return { success: true, tenantId, data: mapped };
  }

  /**
   * POST /hr/payroll-runs
   * Create a payroll run
   */
  @Post("payroll-runs")
  async createPayrollRun(
    @Req() request: RequestWithTenant,
    @Body() body: { periodStart: string; periodEnd: string },
  ) {
    const { tenantId, userId } = request.tenantContext;
    const meta = JSON.stringify({ periodStart: body.periodStart, periodEnd: body.periodEnd, totalEmployees: 0, totalGrossPay: 0, totalNetPay: 0 });
    const run = await this.prisma.hRCase.create({
      data: {
        tenantId,
        type: "PAYROLL_RUN",
        title: `Payroll Run: ${body.periodStart} - ${body.periodEnd}|${meta}`,
        status: "OPEN",
        priority: "NORMAL",
        employeeId: userId || "system",
        ownerId: userId || null,
      },
    });
    await this.auditService.log({ tenantId, userId: userId || "system", module: "hr", action: "CREATE", entityType: "PAYROLL_RUN", entityId: run.id, metadata: { periodStart: body.periodStart, periodEnd: body.periodEnd } });
    const result = { id: run.id, tenantId, periodStart: body.periodStart, periodEnd: body.periodEnd, status: "draft", totalEmployees: 0, totalGrossPay: 0, totalNetPay: 0, createdAt: run.createdAt };
    return { success: true, tenantId, data: result };
  }

  /**
   * PATCH /hr/payroll-runs/:id/submit
   * Submit payroll run for approval
   */
  @Patch("payroll-runs/:id/submit")
  async submitPayrollRun(
    @Req() request: RequestWithTenant,
    @Param("id") id: string,
  ) {
    const { tenantId, userId } = request.tenantContext;
    const run = await this.prisma.hRCase.update({
      where: { id },
      data: { status: "IN_PROGRESS" },
    });
    await this.auditService.log({ tenantId, userId: userId || "system", module: "hr", action: "SUBMIT", entityType: "PAYROLL_RUN", entityId: id, metadata: {} });
    return { success: true, tenantId, data: { ...run, status: "pending" } };
  }

  /**
   * PATCH /hr/payroll-runs/:id/approve
   * Approve a payroll run (Finance Admin/Owner/Superadmin only)
   */
  @Patch("payroll-runs/:id/approve")
  async approvePayrollRun(
    @Req() request: RequestWithTenant,
    @Param("id") id: string,
  ) {
    const { tenantId, userId, role } = request.tenantContext;
    const allowed = ["SUPERADMIN", "OWNER", "COMPANY_ADMIN", "FINANCE_ADMIN"].includes(role ?? "");
    if (!allowed) {
      return { success: false, message: "Insufficient permissions to approve payroll run." };
    }
    const run = await this.prisma.hRCase.update({
      where: { id },
      data: { status: "CLOSED" },
    });
    await this.auditService.log({ tenantId, userId: userId || "system", module: "hr", action: "APPROVE", entityType: "PAYROLL_RUN", entityId: id, metadata: {} });
    return { success: true, tenantId, data: { ...run, status: "approved" } };
  }

  /**
   * GET /hr/payroll-runs/:id/export
   * Export journal entries for approved run
   */
  @Get("payroll-runs/:id/export")
  async exportPayrollRun(
    @Req() request: RequestWithTenant,
    @Param("id") id: string,
    @Res() res: Response,
  ) {
    const { tenantId, userId } = request.tenantContext;
    const run = await this.prisma.hRCase.findFirst({ where: { id, tenantId, type: "PAYROLL_RUN" } });
    if (!run || run.status !== "CLOSED") {
      res.status(400).json({ success: false, message: "Run not found or not approved." });
      return;
    }
    let meta: any = {};
    try { const parts = (run as any).title?.split("|"); if (parts?.[1]) meta = JSON.parse(parts[1]); } catch {}
    const csv = `PayrollRun,${run.id},${meta.periodStart},${meta.periodEnd},${meta.totalGrossPay ?? 0},${meta.totalNetPay ?? 0}\n`;
    await this.auditService.log({ tenantId, userId: userId || "system", module: "hr", action: "EXPORT", entityType: "PAYROLL_RUN", entityId: id, metadata: {} });
    res.set({ "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="payroll_${id}.csv"` });
    res.end(csv);
  }

  /**
   * POST /hr/payroll-runs/:id/variance-check
   * Run variance check on a payroll run
   */
  @Post("payroll-runs/:id/variance-check")
  async varianceCheckPayrollRun(
    @Req() request: RequestWithTenant,
    @Param("id") runId: string,
  ) {
    const { tenantId } = request.tenantContext;
    const run = await this.prisma.hRCase.findFirst({ where: { id: runId, tenantId, type: "PAYROLL_RUN" } });
    if (!run) return { success: false, message: "Payroll run not found." };
    let meta: any = {};
    try { const parts = (run as any).title?.split("|"); if (parts?.[1]) meta = JSON.parse(parts[1]); } catch {}
    const gross = meta.totalGrossPay ?? 0;
    const net = meta.totalNetPay ?? 0;
    const varianceScore = gross > 0 ? Math.round(((gross - net) / gross) * 100) : 0;
    return { success: true, tenantId, data: { runId, varianceScore } };
  }

  // ==================== Location Management ====================

  /**
   * GET /hr/locations
   * List all locations for the tenant
   */
  @Get("locations")
  async getLocations(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const locations = await this.hrService.getLocations(tenantId);
    return { success: true, tenantId, data: locations };
  }
  // ==================== Training Management ====================

  /**
   * GET /hr/training/programs
   * List all training programs
   */
  @Get("training/programs")
  async getTrainingPrograms(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const programs = await this.hrService.getTrainingPrograms(tenantId);
    return { success: true, tenantId, data: programs };
  }

  /**
   * POST /hr/training/programs
   * Create a training program
   */
  @Post("training/programs")
  async createTrainingProgram(
    @Req() request: RequestWithTenant,
    @Body() dto: any,
  ) {
    const { tenantId, userId } = request.tenantContext;
    const program = await this.hrService.createTrainingProgram(tenantId, dto, userId!);
    return { success: true, tenantId, data: program };
  }

  /**
   * GET /hr/training/assignments
   * List training assignments
   */
  @Get("training/assignments")
  async getTrainingAssignments(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const assignments = await this.hrService.getTrainingAssignments(tenantId);
    return { success: true, tenantId, data: assignments };
  }

  /**
   * POST /hr/training/assignments
   * Create a training assignment
   */
  @Post("training/assignments")
  async createTrainingAssignment(
    @Req() request: RequestWithTenant,
    @Body() dto: any,
  ) {
    const { tenantId, userId } = request.tenantContext;
    const assignment = await this.hrService.createTrainingAssignment(tenantId, dto, userId!);
    return { success: true, tenantId, data: assignment };
  }

  /**
   * PATCH /hr/training/assignments/:id
   * Update a training assignment (e.g. status)
   */
  @Patch("training/assignments/:id")
  async updateTrainingAssignment(
    @Req() request: RequestWithTenant,
    @Param("id") id: string,
    @Body() body: any,
  ) {
    const { tenantId, userId } = request.tenantContext;
    const assignment = await this.hrService.updateTrainingAssignment(tenantId, id, body, userId!);
    return { success: true, tenantId, data: assignment };
  }
}
