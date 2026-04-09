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
import { Throttle } from "@nestjs/throttler";
import { Request, Response } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import { HRMutationInterceptor } from "./interceptors/hr-mutation.interceptor";
import { IdempotencyInterceptor } from "../../shared/interceptors/idempotency.interceptor";
import { HRService } from "./hr.service";
import { IHRRepository } from "./repositories/hr.repository.interface";
import { PrismaService } from "../../persistence/prisma.service";
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  ClockInDto,
  CreateLeaveRequestDto,
  CreateDepartmentDto,
  CreateRequisitionDto,
  CreatePerformanceCycleDto,
  SubmitReviewDto,
  CreateCaseDto,
  CreateContractDto,
  ScheduleInterviewDto,
  UpdateInterviewStatusDto,
  PromoteEmployeeDto,
  TransferEmployeeDto,
  SuspendEmployeeDto,
  CreateCandidateDto,
  UpdatePositionDto,
  UpdateCompensationDto,
  IngestTalentLeadDto,
  UploadComplianceDocumentDto,
  CreateBudgetScenarioDto,
  CreateHeadcountPlanDto,
  CreateBenefitPlanDto,
  EnrollBenefitDto,
  UpdatePerformanceGoalDto,
  EnrollTrainingDto,
  SimulateInflationDto,
  CreateMentorshipDto,
  MatchTalentDto,
  ConvertLeadDto,
  GenerateDescriptionDto,
  PublishJobPostDto,
} from "./dto";
import { TalentSourcingService } from "./talent-sourcing.service";
import { ComplianceService } from "./compliance.service";
import { AnalyticsService } from "./analytics.service";
import { WorkforcePlannerService } from "./workforce-planner.service";
import { PayrollConsolidationService } from "./payroll-consolidation.service";
import { SuccessionService } from "./succession.service";
import { SkillsService } from "./skills.service";
import { TotalRewardsService } from "./total-rewards.service";
import { CareerPathService } from "./career-path.service";
import { JobDescriptionService } from "./job-description.service";
import { PerformancePredictorService } from "./performance-predictor.service";
import { LearningService } from "./learning.service";
import { LaborCostService } from "./labor-cost.service";
import { TenantContext } from "../../gateway/tenant-context.interface";
import { TenantInterceptor } from "../../gateway/tenant.interceptor";
import { ModuleStateGuard } from "../auth/guards/module-state.guard";
import { BranchGatingGuard } from "../auth/guards/branch-gating.guard";
import { TenantGuard } from "../../shared/guards/tenant.guard";
import { RequiredModule } from "../../shared/decorators/required-module.decorator";
import { isModuleActive } from "../../shared/helpers/module-active.helper";
import { AuditService } from "../../shared/audit/audit.service";
import { ComplianceEngineService } from "../../modules/compliance/compliance.service";
import { ComplianceSuggestionService } from "../../modules/compliance/compliance-suggestion.service";

interface RequestWithTenant extends Request {
  tenantContext: TenantContext;
}

/**
 * HR Controller
 * REST API endpoints for HR operations
 * All endpoints require x-tenant-id header
 */
@Controller("api/hr")
@UseInterceptors(TenantInterceptor, HRMutationInterceptor, IdempotencyInterceptor)
@UseGuards(ModuleStateGuard, BranchGatingGuard, TenantGuard)
@RequiredModule("hr")
@Throttle({ default: { limit: 20, ttl: 60000 } })
export class HRController {
  constructor(
    private readonly hrService: HRService,
    private readonly talentSourcingService: TalentSourcingService,
    private readonly complianceService: ComplianceService,
    private readonly analyticsService: AnalyticsService,
    private readonly workforcePlannerService: WorkforcePlannerService,
    private readonly payrollConsolidationService: PayrollConsolidationService,
    private readonly successionService: SuccessionService,
    private readonly skillsService: SkillsService,
    private readonly totalRewardsService: TotalRewardsService,
    private readonly careerPathService: CareerPathService,
    private readonly jobDescriptionService: JobDescriptionService,
    private readonly performancePredictorService: PerformancePredictorService,
    private readonly learningService: LearningService,
    private readonly laborCostService: LaborCostService,
    private readonly repository: IHRRepository,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly complianceEngineService: ComplianceEngineService,
    private readonly complianceSuggestionService: ComplianceSuggestionService,
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
      this.prisma.hrCase.count({ where: { tenantId, status: "OPEN" } }),
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

    const result =
      role === "SUPERADMIN"
        ? await this.hrService.getGlobalEmployees(effectiveLocationId)
        : await this.hrService.getEmployees(tenantId, effectiveLocationId);

    return {
      success: true,
      tenantId,
      locationId: locationId || "all",
      count: result.data.length,
      total: result.total,
      data: result.data,
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
    console.log(`[DEBUG] Updating Employee ${employeeId}:`, JSON.stringify(updateEmployeeDto, null, 2));
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

    const result =
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
      count: result.data.length,
      total: result.total,
      data: result.data,
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

  // ==================== Lifecycle Transitions ====================

  @Patch("employees/:id/promote")
  async promoteEmployee(
    @Req() request: RequestWithTenant,
    @Param("id") id: string,
    @Body() dto: PromoteEmployeeDto,
  ) {
    const { tenantId, userId } = request.tenantContext;
    const employee = await this.hrService.promoteEmployee(tenantId, id, dto, userId);
    return { success: true, tenantId, message: "Employee promoted", data: employee };
  }

  @Patch("employees/:id/transfer")
  async transferEmployee(
    @Req() request: RequestWithTenant,
    @Param("id") id: string,
    @Body() dto: TransferEmployeeDto,
  ) {
    const { tenantId, userId } = request.tenantContext;
    const employee = await this.hrService.transferEmployee(tenantId, id, dto, userId);
    return { success: true, tenantId, message: "Employee transferred", data: employee };
  }

  @Patch("employees/:id/suspend")
  async suspendEmployee(
    @Req() request: RequestWithTenant,
    @Param("id") id: string,
    @Body() dto: SuspendEmployeeDto,
  ) {
    const { tenantId, userId } = request.tenantContext;
    const employee = await this.hrService.suspendEmployee(tenantId, id, dto.reason, userId);
    return { success: true, tenantId, message: "Employee suspended", data: employee };
  }

  // ==================== Talent Management ====================

  @Get("candidates")
  async getCandidates(
    @Req() request: RequestWithTenant,
    @Query("status") status?: string,
  ) {
    const { tenantId } = request.tenantContext;
    const candidates = await this.hrService.getCandidates(tenantId, status);
    return { success: true, tenantId, data: candidates };
  }

  @Post("candidates")
  async createCandidate(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateCandidateDto,
  ) {
    const { tenantId, userId } = request.tenantContext;
    const candidate = await this.hrService.createCandidate(tenantId, dto, userId);
    return { success: true, tenantId, data: candidate };
  }

  @Post("candidates/:id/hire")
  async hireCandidate(
    @Req() request: RequestWithTenant,
    @Param("id") id: string,
  ) {
    const { tenantId, userId } = request.tenantContext;
    const employee = await this.hrService.hireCandidate(tenantId, id, userId);
    return { success: true, tenantId, message: "Candidate hired as employee", data: employee };
  }

  // ==================== Headcount & Compensation ====================

  @Get("positions")
  async getPositions(
    @Req() request: RequestWithTenant,
    @Query("departmentId") departmentId?: string,
  ) {
    const { tenantId } = request.tenantContext;
    const positions = await this.hrService.getPositions(tenantId, departmentId);
    return { success: true, tenantId, data: positions };
  }

  @Patch("positions/:id")
  async updatePosition(
    @Req() request: RequestWithTenant,
    @Param("id") id: string,
    @Body() dto: UpdatePositionDto,
  ) {
    const { tenantId, userId } = request.tenantContext;
    const position = await this.hrService.updatePosition(tenantId, id, dto, userId);
    return { success: true, tenantId, data: position };
  }

  @Get("employees/:id/compensation")
  async getCompensation(
    @Req() request: RequestWithTenant,
    @Param("id") employeeId: string,
  ) {
    const { tenantId } = request.tenantContext;
    const compensation = await this.hrService.getCompensation(tenantId, employeeId);
    return { success: true, tenantId, data: compensation };
  }

  @Patch("employees/:id/compensation")
  async updateCompensation(
    @Req() request: RequestWithTenant,
    @Param("id") employeeId: string,
    @Body() dto: UpdateCompensationDto,
  ) {
    const { tenantId, userId } = request.tenantContext;
    const compensation = await this.hrService.updateCompensation(tenantId, employeeId, dto, userId);
    return { success: true, tenantId, data: compensation };
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
    const runs = await this.prisma.hrCase.findMany({
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
    const run = await this.prisma.hrCase.create({
      data: {
        id: 'zv404yc3',
        updatedAt: new Date(),
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
    const run = await this.prisma.hrCase.update({
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
    const run = await this.prisma.hrCase.update({
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
    const run = await this.prisma.hrCase.findFirst({ where: { id, tenantId, type: "PAYROLL_RUN" } });
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
    const run = await this.prisma.hrCase.findFirst({ where: { id: runId, tenantId, type: "PAYROLL_RUN" } });
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

  // ==================== Analytics & Reporting ====================

  /**
   * GET /hr/analytics/workforce
   * Overall workforce metrics and turnover rates
   */
  @Get("analytics/workforce")
  async getWorkforceAnalytics(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const stats = await this.hrService.getTurnoverStats(tenantId);
    return { success: true, tenantId, data: stats };
  }

  /**
   * GET /hr/analytics/trends
   * Historical headcount growth trends
   */
  @Get("analytics/trends")
  async getHeadcountTrends(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const trend = await this.hrService.getHeadcountTrend(tenantId);
    return { success: true, tenantId, data: trend };
  }

  /**
   * GET /hr/analytics/departments
   * Department-level distribution and cost analytics
   */
  @Get("analytics/departments")
  async getDepartmentAnalytics(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const analytics = await this.hrService.getDepartmentAnalytics(tenantId);
    return { success: true, tenantId, data: analytics };
  }

  /**
   * GET /hr/analytics/compensation
   * Salary distribution and spend analysis
   */
  @Get("analytics/compensation")
  async getCompensationAnalytics(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const analytics = await this.hrService.getCompensationAnalytics(tenantId);
    return { success: true, tenantId, data: analytics };
  }

  // ==================== Recruitment & Scheduling ====================

  /**
   * GET /hr/recruitment/interviews
   * List scheduled interviews (optionally filtered by candidate)
   */
  @Get("recruitment/interviews")
  async getInterviews(
    @Req() request: RequestWithTenant,
    @Query("candidateId") candidateId?: string
  ) {
    const { tenantId } = request.tenantContext;
    const interviews = await this.hrService.getInterviews(tenantId, candidateId);
    return { success: true, tenantId, data: interviews };
  }

  /**
   * POST /hr/recruitment/interviews
   * Schedule a new interview
   */
  @Post("recruitment/interviews")
  async scheduleInterview(
    @Req() request: RequestWithTenant,
    @Body() body: ScheduleInterviewDto
  ) {
    const { tenantId, userId } = request.tenantContext;
    const interview = await this.hrService.scheduleInterview(tenantId, body, userId!);
    return { success: true, tenantId, data: interview };
  }

  /**
   * PATCH /hr/recruitment/interviews/:id/status
   * Update interview status
   */
  @Patch("recruitment/interviews/:id/status")
  async updateInterviewStatus(
    @Req() request: RequestWithTenant,
    @Param("id") id: string,
    @Body() body: UpdateInterviewStatusDto
  ) {
    const { tenantId, userId } = request.tenantContext;
    const interview = await this.hrService.updateInterviewStatus(tenantId, id, body.status, userId!);
    return { success: true, tenantId, data: interview };
  }

  // ==================== Talent Sourcing ====================

  /**
   * GET /hr/recruitment/talent-leads
   * List ingested talent leads
   */
  @Get("recruitment/talent-leads")
  async getTalentLeads(
    @Req() request: RequestWithTenant,
    @Query("status") status?: string
  ) {
    const { tenantId } = request.tenantContext;
    const leads = await this.hrService.getTalentLeads(tenantId, status);
    return { success: true, tenantId, count: leads.length, data: leads };
  }

  /**
   * POST /hr/recruitment/talent-leads/ingest
   * Ingest a new lead (from LinkedIn/Extension)
   */
  @Post("recruitment/talent-leads/ingest")
  async ingestLead(
    @Req() request: RequestWithTenant,
    @Body() dto: IngestTalentLeadDto
  ) {
    const { tenantId } = request.tenantContext;
    const lead = await this.talentSourcingService.ingestLead(tenantId, dto);
    return { success: true, tenantId, message: "Talent lead ingested", data: lead };
  }

  /**
   * POST /hr/recruitment/talent-leads/:id/convert
   * Convert lead to candidate in a specific requisition
   */
  @Post("recruitment/talent-leads/:id/convert")
  async convertLead(
    @Req() request: RequestWithTenant,
    @Param("id") id: string,
    @Body() dto: ConvertLeadDto
  ) {
    const { tenantId } = request.tenantContext;
    const candidate = await this.talentSourcingService.convertToCandidate(
      tenantId,
      id,
      dto.requisitionId
    );
    return { success: true, tenantId, message: "Lead converted to candidate", data: candidate };
  }

  // ==================== AI-Powered Global Compliance Vault ====================

  /**
   * GET /hr/compliance/documents/:employeeId
   * Fetch compliance documents for a specific employee
   */
  @Get("compliance/documents/:employeeId")
  async getComplianceDocuments(
    @Req() request: RequestWithTenant,
    @Param("employeeId") employeeId: string
  ) {
    const { tenantId } = request.tenantContext;
    const docs = await this.repository.getComplianceDocuments(tenantId, employeeId);
    return { success: true, tenantId, data: docs };
  }

  /**
   * POST /hr/compliance/upload-classify
   * Upload and auto-classify document using simulation OCR
   */
  @Post("compliance/upload-classify")
  async uploadAndClassify(
    @Req() request: RequestWithTenant,
    @Body() data: { employeeId: string; fileUrl: string; fileName: string; documentType?: string }
  ) {
    const { tenantId } = request.tenantContext;
    const doc = await this.complianceService.uploadAndClassify(tenantId, data.employeeId, data);
    return { success: true, tenantId, message: "Document uploaded and classified", data: doc };
  }

  /**
   * GET /hr/compliance/audit
   * Global compliance health check
   */
  @Get("compliance/audit")
  async auditCompliance(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const report = await this.complianceService.auditCompliance(tenantId);
    return { success: true, tenantId, data: report };
  }

  /**
   * PATCH /hr/compliance/verify/:id
   * HR Manager manual verification or rejection
   */
  @Patch("compliance/verify/:id")
  async verifyComplianceDocument(
    @Req() request: RequestWithTenant,
    @Param("id") id: string,
    @Body() data: { status: 'VERIFIED' | 'REJECTED'; verifiedBy: string }
  ) {
    const { tenantId } = request.tenantContext;
    const doc = await this.complianceService.verifyDocument(tenantId, id, data.verifiedBy, data.status);
    return { success: true, tenantId, message: `Document ${data.status.toLowerCase()}`, data: doc };
  }

  /**
   * POST /hr/compliance/check-expirations
   * Manually trigger expiry checks
   */
  @Post("compliance/check-expirations")
  async checkComplianceExpirations(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const expiredCount = await this.complianceService.checkExpirations(tenantId);
    return { success: true, tenantId, message: "Expiration check complete", expiredCount };
  }

  /**
   * POST /hr/compliance/documents/:id/ocr
   * Trigger OCR on a specific document
   */
  @Post("compliance/documents/:id/ocr")
  async triggerOcr(
    @Req() request: RequestWithTenant,
    @Param("id") id: string
  ) {
    const { tenantId, userId } = request.tenantContext;
    const result = await this.complianceService.triggerOcr(tenantId, id, userId!);
    return { success: true, tenantId, message: "OCR processing completed", data: result };
  }

  // ==================== Predictive Workforce Analytics ====================

  /**
   * GET /hr/analytics/predictions/turnover
   * Get predicted turnover rates
   */
  @Get("analytics/predictions/turnover")
  async predictTurnover(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const prediction = await this.analyticsService.predictTurnover(tenantId);
    return { success: true, tenantId, data: prediction };
  }

  /**
   * GET /hr/analytics/predictions/flight-risk
   * List high flight-risk employees
   */
  @Get("analytics/predictions/flight-risk")
  async getFlightRisks(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const risks = await this.analyticsService.getFlightRisks(tenantId);
    return { success: true, tenantId, count: risks.length, data: risks };
  }

  /**
   * GET /hr/analytics/insights
   * Get general workforce insights and productivity risks
   */
  @Get("analytics/insights")
  async getWorkforceInsights(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const insights = await this.analyticsService.getWorkforceInsights(tenantId);
    return { success: true, tenantId, data: insights };
  }

  // ==================== Strategic Workforce Planner ====================

  /**
   * GET /hr/planning/scenarios
   * List budget scenarios
   */
  @Get("planning/scenarios")
  async getBudgetScenarios(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const scenarios = await this.prisma.budgetScenario.findMany({
      where: { tenantId },
      orderBy: { fiscalYear: "desc" },
    });
    return { success: true, tenantId, count: scenarios.length, data: scenarios };
  }

  /**
   * POST /hr/planning/scenarios
   * Create a new budget scenario
   */
  @Post("planning/scenarios")
  async createBudgetScenario(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateBudgetScenarioDto
  ) {
    const { tenantId } = request.tenantContext;
    const scenario = await this.prisma.budgetScenario.create({
      data: {
        id: 'ol2p9h2a',
        updatedAt: new Date(),
        tenantId,
        ...dto,
      },
    });
    return { success: true, tenantId, message: "Budget scenario created", data: scenario };
  }

  /**
   * GET /hr/planning/scenarios/:id/plans
   * List headcount plans for a scenario
   */
  @Get("planning/scenarios/:id/plans")
  async getHeadcountPlans(
    @Req() request: RequestWithTenant,
    @Param("id") id: string
  ) {
    const { tenantId } = request.tenantContext;
    const plans = await this.prisma.headcountPlan.findMany({
      where: {
        scenarioId: id,
        tenantId,
      },
      orderBy: { plannedHireDate: "asc" },
    });
    return { success: true, tenantId, count: plans.length, data: plans };
  }

  /**
   * POST /hr/planning/plans
   * Create a new headcount plan
   */
  @Post("planning/plans")
  async createHeadcountPlan(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateHeadcountPlanDto
  ) {
    const { tenantId } = request.tenantContext;
    // Verify scenario ownership
    const scenario = await this.prisma.budgetScenario.findFirst({
      where: { id: dto.scenarioId, tenantId },
    });
    if (!scenario) return { success: false, message: "Scenario not found" };

    const plan = await this.prisma.headcountPlan.create({
      data: {
        id: 'wzeaebyt',
        updatedAt: new Date(),
        tenantId,
        scenarioId: dto.scenarioId,
        departmentId: dto.departmentId,
        positionTitle: dto.positionTitle,
        targetHeadcount: dto.targetHeadcount || 1,
        projectedSalary: dto.projectedSalary,
        plannedHireDate: new Date(dto.plannedHireDate),
      },
    });
    return { success: true, tenantId, message: "Headcount plan created", data: plan };
  }

  /**
   * GET /hr/planning/scenarios/:id/what-if
   * Comparison analysis for a scenario
   */
  @Get("planning/scenarios/:id/what-if")
  async calculateWhatIf(@Req() request: RequestWithTenant, @Param("id") id: string) {
    const { tenantId } = request.tenantContext;
    const analysis = await this.workforcePlannerService.calculateWhatIfAnalysis(tenantId, id);
    return { success: true, tenantId, data: analysis };
  }

  /**
   * GET /hr/planning/scenarios/:id/projections
   * Workforce cost forecasting for a scenario
   */
  @Get("planning/scenarios/:id/projections")
  async generateProjections(
    @Req() request: RequestWithTenant,
    @Param("id") id: string,
    @Query("months") months?: string
  ) {
    const { tenantId } = request.tenantContext;
    const projections = await this.workforcePlannerService.generateCostProjections(
      tenantId,
      id,
      months ? parseInt(months) : 24
    );
    return { success: true, tenantId, data: projections };
  }

  // ==================== Global Multi-Currency Payroll ====================

  /**
   * GET /hr/payroll/exchange-rates
   * List configured exchange rates
   */
  @Get("payroll/exchange-rates")
  async getExchangeRates(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const rates = await this.prisma.exchangeRate.findMany({
      where: { tenantId },
      orderBy: { effectiveAt: "desc" },
    });
    return { success: true, tenantId, data: rates };
  }

  /**
   * POST /hr/payroll/exchange-rates
   * Update manual exchange rate
   */
  @Post("payroll/exchange-rates")
  async updateExchangeRate(
    @Req() request: RequestWithTenant,
    @Body() data: any
  ) {
    const { tenantId } = request.tenantContext;
    const rate = await this.prisma.exchangeRate.create({
      data: {
        id: 'igf45np9',
        updatedAt: new Date(),
        tenantId,
        fromCurrency: data.fromCurrency,
        toCurrency: data.toCurrency,
        rate: data.rate,
        effectiveAt: data.effectiveAt || data.effectiveDate ? new Date(data.effectiveAt || data.effectiveDate) : new Date(),
      },
    });
    return { success: true, tenantId, message: "Exchange rate updated", data: rate };
  }

  /**
   * GET /hr/payroll/consolidated
   * Consolidated payroll reporting
   */
  @Get("payroll/consolidated")
  async getConsolidatedPayroll(
    @Req() request: RequestWithTenant,
    @Query("baseCurrency") baseCurrency?: string
  ) {
    const { tenantId } = request.tenantContext;
    const report = await this.payrollConsolidationService.getConsolidatedReport(
      tenantId,
      baseCurrency || "USD"
    );
    return { success: true, tenantId, data: report };
  }

  // ==================== Predictive Succession Planning ====================

  /**
   * GET /hr/succession/plans
   * List critical role succession plans
   */
  @Get("succession/plans")
  async getSuccessionPlans(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const plans = await this.successionService.getPlans(tenantId);
    return { success: true, tenantId, data: plans };
  }

  /**
   * GET /hr/succession/plans/model/:positionId
   * Generate potential successors for a position
   */
  @Get("succession/plans/model/:positionId")
  async modelSuccession(
    @Req() request: RequestWithTenant,
    @Param("positionId") positionId: string
  ) {
    const { tenantId } = request.tenantContext;
    const model = await this.successionService.getModelSuccession(tenantId, positionId);
    return { success: true, tenantId, data: model };
  }

  /**
   * POST /hr/succession/plans
   * Create a new succession plan
   */
  @Post("succession/plans")
  async createSuccessionPlan(
    @Req() request: RequestWithTenant,
    @Body() data: any
  ) {
    const { tenantId } = request.tenantContext;
    const plan = await this.successionService.createPlan(tenantId, data);
    return { success: true, tenantId, message: "Succession plan created", data: plan };
  }

  /**
   * POST /hr/succession/plans/:id/candidates
   * Nominate a successor
   */
  @Post("succession/plans/:id/candidates")
  async nominateSuccessor(
    @Req() request: RequestWithTenant,
    @Param("id") id: string,
    @Body() data: any
  ) {
    const { tenantId } = request.tenantContext;
    const candidate = await this.successionService.nominateSuccessor(tenantId, {
      ...data,
      planId: id,
    });
    return { success: true, tenantId, message: "Successor nominated", data: candidate };
  }

  /**
   * GET /hr/succession/bench-strength
   * Regional leadership readiness view
   */
  @Get("succession/bench-strength")
  async getBenchStrength(
    @Req() request: RequestWithTenant,
    @Query("departmentId") departmentId?: string
  ) {
    const { tenantId } = request.tenantContext;
    const health = await this.successionService.assessBenchStrength(tenantId, departmentId);
    return { success: true, tenantId, data: health };
  }

  // ==================== Skills-Based Org Design ====================

  /**
   * GET /hr/skills
   * List company skill ontology
   */
  @Get("skills")
  async getSkills(
    @Req() request: RequestWithTenant,
    @Query("category") category?: string
  ) {
    const { tenantId } = request.tenantContext;
    const skills = await this.repository.getSkills(tenantId, category);
    return { success: true, tenantId, count: skills.length, data: skills };
  }

  /**
   * POST /hr/skills
   * Create a new skill in the ontology
   */
  @Post("skills")
  async createSkill(
    @Req() request: RequestWithTenant,
    @Body() data: { name: string; category: string; description?: string }
  ) {
    const { tenantId } = request.tenantContext;
    const skill = await this.repository.createSkill(tenantId, data);
    return { success: true, tenantId, message: "Skill created", data: skill };
  }

  /**
   * GET /hr/skills/employee/:employeeId
   * Get skill profile for a specific employee
   */
  @Get("skills/employee/:employeeId")
  async getEmployeeSkills(
    @Req() request: RequestWithTenant,
    @Param("employeeId") employeeId: string
  ) {
    const { tenantId } = request.tenantContext;
    const skills = await this.repository.getEmployeeSkills(tenantId, employeeId);
    return { success: true, tenantId, count: skills.length, data: skills };
  }

  /**
   * POST /hr/skills/employee
   * Update or add employee skill proficiency
   */
  @Post("skills/employee")
  async updateEmployeeSkill(
    @Req() request: RequestWithTenant,
    @Body() data: { employeeId: string; skillId: string; proficiency: number }
  ) {
    const { tenantId, userId } = request.tenantContext;
    const result = await this.skillsService.verifyProficiency(
      tenantId,
      data.employeeId,
      data.skillId,
      userId!
    );
    return { success: true, tenantId, message: "Employee skill updated", data: result };
  }

  /**
   * GET /hr/skills/marketplace
   * Talent search based on skill requirements
   */
  @Post("skills/marketplace")
  async searchTalent(
    @Req() request: RequestWithTenant,
    @Body() dto: MatchTalentDto
  ) {
    const { tenantId } = request.tenantContext;
    const matches = await this.skillsService.mapInternalTalent(
      tenantId,
      dto.skillIds,
      dto.minProficiency || 3
    );
    return { success: true, tenantId, count: matches.length, data: matches };
  }

  /**
   * GET /hr/skills/employee/:id/gap-analysis
   * Analysis against a target role
   */
  @Get("skills/employee/:id/gap-analysis")
  async getSkillGap(
    @Req() request: RequestWithTenant,
    @Param("id") id: string,
    @Query("targetRoleId") targetRoleId: string
  ) {
    const { tenantId } = request.tenantContext;
    const analysis = await this.skillsService.calculateSkillGap(tenantId, id, targetRoleId);
    return { success: true, tenantId, data: analysis };
  }

  // ==================== Total Rewards & Benefits ====================

  /**
   * GET /hr/rewards/statement/:employeeId
   * Consolidated rewards summary (Salary + Benefits)
   */
  @Get("rewards/statement/:employeeId")
  async getTotalRewardsStatement(
    @Req() request: RequestWithTenant,
    @Param("employeeId") employeeId: string
  ) {
    const { tenantId } = request.tenantContext;
    const statement = await this.totalRewardsService.calculateTotalRewards(tenantId, employeeId);
    return { success: true, tenantId, data: statement };
  }

  /**
   * GET /hr/rewards/benefit-plans
   * List available benefit offerings
   */
  @Get("rewards/benefit-plans")
  async getBenefitPlans(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const plans = await this.repository.getBenefitPlans(tenantId);
    return { success: true, tenantId, data: plans };
  }

  /**
   * POST /hr/rewards/benefit-plans
   * Create a new benefit plan
   */
  @Post("rewards/benefit-plans")
  async createBenefitPlan(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateBenefitPlanDto
  ) {
    const { tenantId } = request.tenantContext;
    const plan = await this.repository.createBenefitPlan(tenantId, dto);
    return { success: true, tenantId, message: "Benefit plan created", data: plan };
  }

  /**
   * POST /hr/rewards/enroll
   * Enroll employee in a benefit plan
   */
  @Post("rewards/enroll")
  async enrollInBenefit(
    @Req() request: RequestWithTenant,
    @Body() dto: EnrollBenefitDto
  ) {
    const { tenantId } = request.tenantContext;
    const enrollment = await this.repository.enrollInBenefit(tenantId, dto);
    return { success: true, tenantId, message: "Enrollment successful", data: enrollment };
  }

  // ==================== AI-Powered Career Pathing ====================

  /**
   * GET /hr/career/suggestions/:employeeId
   * AI suggestions for next role progression
   */
  @Get("career/suggestions/:employeeId")
  async getCareerSuggestions(
    @Req() request: RequestWithTenant,
    @Param("employeeId") employeeId: string
  ) {
    const { tenantId } = request.tenantContext;
    const suggestions = await this.careerPathService.suggestNextRoles(tenantId, employeeId);
    return { success: true, tenantId, data: suggestions };
  }

  /**
   * GET /hr/career/mentors/:employeeId
   * Suggested internal mentors based on skill gaps
   */
  @Get("career/mentors/:employeeId")
  async getMentorSuggestions(
    @Req() request: RequestWithTenant,
    @Param("employeeId") employeeId: string
  ) {
    const { tenantId } = request.tenantContext;
    const mentors = await this.careerPathService.findMentorMatches(tenantId, employeeId);
    return { success: true, tenantId, data: mentors };
  }

  /**
   * POST /hr/career/mentorship
   * Initiate a developmental pairing
   */
  @Post("career/mentorship")
  async createMentorship(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateMentorshipDto
  ) {
    const { tenantId } = request.tenantContext;
    const pairing = await this.careerPathService.createMentorship(
      tenantId,
      dto.mentorId,
      dto.menteeId,
      dto.focusSkills
    );
    return { success: true, tenantId, message: "Mentorship initiated", data: pairing };
  }

  // ==================== AI-Generated Job Descriptions ====================

  /**
   * GET /hr/recruitment/position-skills/:positionId
   * List required skills for a position
   */
  @Get("recruitment/position-skills/:positionId")
  async getPositionSkills(
    @Req() request: RequestWithTenant,
    @Param("positionId") positionId: string
  ) {
    const { tenantId } = request.tenantContext;
    const skills = await this.repository.getPositionSkills(tenantId, positionId);
    return { success: true, tenantId, data: skills };
  }

  /**
   * POST /hr/recruitment/position-skills
   * Add or update a required skill for a position
   */
  @Post("recruitment/position-skills")
  async updatePositionSkill(
    @Req() request: RequestWithTenant,
    @Body() data: { positionId: string; skillId: string; minProficiency: number; isMandatory?: boolean }
  ) {
    const { tenantId } = request.tenantContext;
    const skill = await this.repository.updatePositionSkill(tenantId, data);
    return { success: true, tenantId, message: "Position skill updated", data: skill };
  }

  /**
   * POST /hr/recruitment/generate-description/:positionId
   * AI-based job description generation
   */
  @Post("recruitment/generate-description/:positionId")
  async generateJobDescription(
    @Req() request: RequestWithTenant,
    @Param("positionId") positionId: string,
    @Body() dto: GenerateDescriptionDto
  ) {
    const { tenantId } = request.tenantContext;
    const description = await this.jobDescriptionService.generateDescription(tenantId, positionId, dto.tone);
    return { success: true, tenantId, data: description };
  }

  /**
   * POST /hr/recruitment/publish/:positionId
   * Distribute job post to channels
   */
  @Post("recruitment/publish/:positionId")
  async publishJobPost(
    @Req() request: RequestWithTenant,
    @Param("positionId") positionId: string,
    @Body() dto: PublishJobPostDto
  ) {
    const { tenantId } = request.tenantContext;
    const result = await this.jobDescriptionService.publishJobPost(tenantId, positionId, dto.channels);
    return { success: true, tenantId, message: "Job post published", data: result };
  }

  /**
   * GET /hr/recruitment/benchmarks/:positionId
   * Market alignment analysis
   */
  @Get("recruitment/benchmarks/:positionId")
  async getRecruitmentBenchmarks(
    @Req() request: RequestWithTenant,
    @Param("positionId") positionId: string
  ) {
    const { tenantId } = request.tenantContext;
    const benchmarks = await this.jobDescriptionService.analyzeMarketAlignment(tenantId, positionId);
    return { success: true, tenantId, data: benchmarks };
  }

  // ==================== AI-Powered Performance Predictor ====================

  /**
   * GET /hr/performance/forecast/:employeeId
   * AI-based performance rating forecast
   */
  @Get("performance/forecast/:employeeId")
  async forecastPerformance(
    @Req() request: RequestWithTenant,
    @Param("employeeId") employeeId: string
  ) {
    const { tenantId } = request.tenantContext;
    const forecast = await this.performancePredictorService.forecastPerformance(tenantId, employeeId);
    return { success: true, tenantId, data: forecast };
  }

  /**
   * GET /hr/performance/goal-probability/:goalId
   * probability of completing a goal on time
   */
  @Get("performance/goal-probability/:goalId")
  async getGoalProbability(
    @Req() request: RequestWithTenant,
    @Param("goalId") goalId: string
  ) {
    const { tenantId } = request.tenantContext;
    const probability = await this.performancePredictorService.calculateGoalProbability(tenantId, goalId);
    return { success: true, tenantId, data: probability };
  }

  /**
   * GET /hr/performance/interventions/:employeeId
   * AI-recommended performance corrections
   */
  @Get("performance/interventions/:employeeId")
  async getPerformanceInterventions(
    @Req() request: RequestWithTenant,
    @Param("employeeId") employeeId: string
  ) {
    const { tenantId } = request.tenantContext;
    const interventions = await this.performancePredictorService.recommendInterventions(tenantId, employeeId);
    return { success: true, tenantId, data: interventions };
  }

  /**
   * GET /hr/performance/goals/:employeeId
   * List employee performance goals
   */
  @Get("performance/goals/:employeeId")
  async getEmployeeGoals(
    @Req() request: RequestWithTenant,
    @Param("employeeId") employeeId: string
  ) {
    const { tenantId } = request.tenantContext;
    const goals = await this.repository.getEmployeeGoals(tenantId, employeeId);
    return { success: true, tenantId, data: goals };
  }

  /**
   * POST /hr/performance/goals
   * Create or update a performance goal
   */
  @Post("performance/goals")
  async updatePerformanceGoal(
    @Req() request: RequestWithTenant,
    @Body() dto: UpdatePerformanceGoalDto
  ) {
    const { tenantId } = request.tenantContext;
    const goal = await this.repository.updatePerformanceGoal(tenantId, dto);
    return { success: true, tenantId, message: "Goal updated", data: goal };
  }

  // ==================== AI-Powered Learning Path Personalization ====================

  /**
   * GET /hr/learning/recommendations/:employeeId
   * Personalized course suggestions based on skill gaps
   */
  @Get("learning/recommendations/:employeeId")
  async getLearningRecommendations(
    @Req() request: RequestWithTenant,
    @Param("employeeId") employeeId: string
  ) {
    const { tenantId } = request.tenantContext;
    const recommendations = await this.learningService.recommendLearningPath(tenantId, employeeId);
    return { success: true, tenantId, data: recommendations };
  }

  /**
   * POST /hr/learning/enroll
   * Enroll employee in a training program
   */
  @Post("learning/enroll")
  async enrollInLearningProgram(
    @Req() request: RequestWithTenant,
    @Body() dto: EnrollTrainingDto
  ) {
    const { tenantId } = request.tenantContext;
    const enrollment = await this.repository.enrollInTrainingProgram(tenantId, dto.employeeId, dto.programId);
    return { success: true, tenantId, message: "Enrolled in training program", data: enrollment };
  }

  /**
   * POST /hr/learning/auto-enroll-gaps/:employeeId
   * Auto-enroll in mandatory gap-filler courses
   */
  @Post("learning/auto-enroll-gaps/:employeeId")
  async autoEnrollGaps(
    @Req() request: RequestWithTenant,
    @Param("employeeId") employeeId: string
  ) {
    const { tenantId } = request.tenantContext;
    const enrollments = await this.learningService.autoEnrollInGapFillers(tenantId, employeeId);
    return { success: true, tenantId, message: `Auto-enrolled in ${enrollments.length} programs`, data: enrollments };
  }

  /**
   * GET /hr/learning/roi/:employeeId
   * Impact analysis of completed training
   */
  @Get("learning/roi/:employeeId")
  async getLearningROI(
    @Req() request: RequestWithTenant,
    @Param("employeeId") employeeId: string
  ) {
    const { tenantId } = request.tenantContext;
    const roi = await this.learningService.calculateLearningROI(tenantId, employeeId);
    return { success: true, tenantId, data: roi };
  }

  // ==================== Strategic Global Workforce Explorer & Talent Mobility ====================

  /**
   * GET /hr/strategic/mobility/:employeeId
   * Assess employee readiness for cross-departmental or regional transition
   */
  @Get("strategic/mobility/:employeeId")
  async assessMobility(
    @Req() request: RequestWithTenant,
    @Param("employeeId") employeeId: string,
    @Query("targetDeptId") targetDeptId: string
  ) {
    const { tenantId } = request.tenantContext;
    const assessment = await this.workforcePlannerService.assessTalentMobility(tenantId, employeeId, targetDeptId);
    return { success: true, tenantId, data: assessment };
  }

  /**
   * GET /hr/strategic/explorer/headcount
   * Context-aware headcount analysis for HR Admins
   */
  @Get("strategic/explorer/headcount")
  async getStrategicHeadcount(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const [active, total] = await Promise.all([
      this.prisma.employee.count({ where: { tenantId, status: 'active' } }),
      this.prisma.employee.count({ where: { tenantId } })
    ]);
    return { success: true, tenantId, metrics: { active, total, utilization: Number((active / (total || 1)).toFixed(2)) } };
  }

  /**
   * GET /hr/strategic/explorer/growth
   * Workforce dynamics reporting (Hires, Exits, Transfers)
   */
  @Get("strategic/explorer/growth")
  async getWorkforceDynamics(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const dynamics = await this.workforcePlannerService.getGlobalWorkforceDynamics(tenantId);
    return { success: true, tenantId, data: dynamics };
  }

  /**
   * GET /hr/learning/history/:employeeId
   * employee training history
   */
  @Get("learning/history/:employeeId")
  async getEmployeeLearningHistory(
    @Req() request: RequestWithTenant,
    @Param("employeeId") employeeId: string
  ) {
    const { tenantId } = request.tenantContext;
    const history = await this.repository.getEmployeeTrainingHistory(tenantId, employeeId);
    return { success: true, tenantId, data: history };
  }

  // ==================== Predictive Labor Cost Modeling ====================

  /**
   * GET /hr/finance/labor-projection/:deptId
   * Forecast labor costs over N periods
   */
  @Get("finance/labor-projection/:deptId")
  async projectLaborCosts(
    @Req() request: RequestWithTenant,
    @Param("deptId") departmentId: string,
    @Query("periods") periods: string = "12"
  ) {
    const { tenantId } = request.tenantContext;
    const projection = await this.laborCostService.projectLaborCosts(tenantId, departmentId, parseInt(periods));
    return { success: true, tenantId, data: projection };
  }

  /**
   * GET /hr/finance/budget-variance/:deptId
   * Identify potential departmental budget overruns
   */
  @Get("finance/budget-variance/:deptId")
  async getBudgetVariance(
    @Req() request: RequestWithTenant,
    @Param("deptId") departmentId: string
  ) {
    const { tenantId } = request.tenantContext;
    const variance = await this.laborCostService.getBudgetVarianceForecast(tenantId, departmentId);
    return { success: true, tenantId, data: variance };
  }

  /**
   * POST /hr/finance/simulate-inflation
   * Model global impact of benefit/tax inflation
   */
  @Post("finance/simulate-inflation")
  async simulateInflation(
    @Req() request: RequestWithTenant,
    @Body() dto: SimulateInflationDto
  ) {
    const { tenantId } = request.tenantContext;
    const simulation = await this.laborCostService.simulateInflationImpact(tenantId, dto.inflationRate);
    return { success: true, tenantId, data: simulation };
  }

  // ==================== Compliance Engine ====================

  /**
   * POST /hr/compliance/calculate
   * Run a compliance calculation for a specific module and period.
   * Body: { module: 'BPJS_KESEHATAN'|'BPJS_KETENAGAKERJAAN'|'PPH21'|'CPF'|'WPS', period: 'YYYY-MM' }
   */
  @Post("compliance/calculate")
  async runComplianceCalculation(
    @Req() request: RequestWithTenant,
    @Body() dto: { module: string; period: string }
  ) {
    const { tenantId } = request.tenantContext;
    const result = await this.complianceEngineService.calculate(tenantId, dto.module, dto.period);
    return { success: true, tenantId, data: result };
  }

  /**
   * POST /hr/compliance/export
   * Export a compliance report in the specified format.
   * Body: { module: string; period: string; format: 'CSV'|'EXCEL'|'XML'|'PDF' }
   * CSV/XML are returned as text; EXCEL/PDF are returned as base64.
   */
  @Post("compliance/export")
  async exportComplianceReport(
    @Req() request: RequestWithTenant,
    @Body() dto: { module: string; period: string; format: 'CSV' | 'EXCEL' | 'XML' | 'PDF' }
  ) {
    const { tenantId } = request.tenantContext;
    const result = await this.complianceEngineService.calculate(tenantId, dto.module, dto.period);
    const exported = this.complianceEngineService.export(dto.format, result);
    if (dto.format === 'CSV' || dto.format === 'XML') {
      return { success: true, tenantId, format: dto.format, data: exported };
    }
    return {
      success: true,
      tenantId,
      format: dto.format,
      data: (exported as Buffer).toString('base64'),
    };
  }

  /**
   * POST /hr/compliance/calculate-all
   * Run all compliance modules for a given country in one call.
   * Body: { country: 'ID'|'SG'|'AE', period: 'YYYY-MM' }
   */
  @Post("compliance/calculate-all")
  async runAllComplianceModules(
    @Req() request: RequestWithTenant,
    @Body() dto: { country: string; period: string }
  ) {
    const { tenantId } = request.tenantContext;
    const results = await this.complianceEngineService.calculateAll(tenantId, dto.country, dto.period);
    return { success: true, tenantId, country: dto.country, results };
  }

  /**
   * GET /hr/compliance/modules/:country
   * List all available compliance modules for the given country.
   */
  @Get("compliance/modules/:country")
  getComplianceModules(
    @Param("country") country: string
  ) {
    const modules = this.complianceEngineService.getAvailableModules(country.toUpperCase());
    return { success: true, country: country.toUpperCase(), modules };
  }

  /**
   * GET /hr/compliance/ai-suggestions
   * AI-powered compliance module suggestions based on company registration
   */
  @Get('compliance/ai-suggestions')
  async getComplianceSuggestions(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const suggestions = await this.complianceSuggestionService.generateSuggestions(tenantId);
    return { success: true, tenantId, data: suggestions };
  }
}
