import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../auth/guards/jwt.guard';
import { RolesGuard, Roles } from '../../auth/guards/roles.guard';
import { RequireFeature } from '../decorators/require-feature.decorator';
import { FeatureEnabledGuard } from '../guards/feature-enabled.guard';
import { PayrollService } from '../services/payroll.service';
import { LoanService } from '../services/loan.service';
import { ScheduleService } from '../services/schedule.service';

@Controller('payroll')
@UseGuards(JwtGuard, FeatureEnabledGuard)
export class PayrollController {
  constructor(
    private readonly payrollService: PayrollService,
    private readonly loanService: LoanService,
    private readonly scheduleService: ScheduleService,
  ) {}

  // === Payroll Periods (HR only) ===

  @Get('periods')
  @RequireFeature('payroll')
  @UseGuards(RolesGuard) @Roles('SuperAdmin', 'HR_Admin')
  async getPeriods(@Query('status') status?: string) {
    return { success: true, data: await this.payrollService.getPeriods(status) };
  }

  @Post('periods')
  @RequireFeature('payroll')
  @UseGuards(RolesGuard) @Roles('SuperAdmin', 'HR_Admin')
  async createPeriod(@Body() dto: any) {
    return { success: true, data: await this.payrollService.createPeriod(dto) };
  }

  @Post('periods/:id/process')
  @RequireFeature('payroll')
  @UseGuards(RolesGuard) @Roles('SuperAdmin', 'HR_Admin')
  async processPeriod(@Param('id') id: string, @Req() req: any) {
    return { success: true, data: await this.payrollService.processPeriod(id, req.user.sub) };
  }

  @Post('periods/:id/finalize')
  @RequireFeature('payroll')
  @UseGuards(RolesGuard) @Roles('SuperAdmin', 'HR_Admin')
  async finalizePeriod(@Param('id') id: string) {
    return { success: true, data: await this.payrollService.finalizePeriod(id) };
  }

  // === Payslips ===

  @Get('payslips')
  @RequireFeature('payroll')
  @UseGuards(RolesGuard) @Roles('SuperAdmin', 'HR_Admin')
  async getPayslips(@Query('period_id') periodId: string) {
    return { success: true, data: await this.payrollService.getPayslips(periodId) };
  }

  @Get('my-payslips')
  @RequireFeature('payroll')
  async getMyPayslips(@Req() req: any) {
    return { success: true, data: await this.payrollService.getEmployeePayslips(req.user.sub) };
  }

  @Get('payslips/:id')
  @RequireFeature('payroll')
  async getPayslipDetail(@Param('id') id: string) {
    return { success: true, data: await this.payrollService.getPayslipDetail(id) };
  }

  @Post('payslips/:id/items')
  @RequireFeature('payroll')
  @UseGuards(RolesGuard) @Roles('SuperAdmin', 'HR_Admin')
  async addPayslipItem(@Param('id') id: string, @Body() dto: any) {
    return { success: true, data: await this.payrollService.addPayslipItem(id, dto) };
  }

  @Delete('payslip-items/:id')
  @RequireFeature('payroll')
  @UseGuards(RolesGuard) @Roles('SuperAdmin', 'HR_Admin')
  async removePayslipItem(@Param('id') id: string) {
    await this.payrollService.removePayslipItem(id);
    return { success: true };
  }

  // === Payroll Components ===

  @Get('components')
  @RequireFeature('payroll')
  @UseGuards(RolesGuard) @Roles('SuperAdmin', 'HR_Admin')
  async getComponents() {
    return { success: true, data: await this.payrollService.getComponents() };
  }

  @Post('components')
  @RequireFeature('payroll')
  @UseGuards(RolesGuard) @Roles('SuperAdmin', 'HR_Admin')
  async createComponent(@Body() dto: any) {
    return { success: true, data: await this.payrollService.createComponent(dto) };
  }

  @Put('components/:id')
  @RequireFeature('payroll')
  @UseGuards(RolesGuard) @Roles('SuperAdmin', 'HR_Admin')
  async updateComponent(@Param('id') id: string, @Body() dto: any) {
    return { success: true, data: await this.payrollService.updateComponent(id, dto) };
  }

  @Delete('components/:id')
  @RequireFeature('payroll')
  @UseGuards(RolesGuard) @Roles('SuperAdmin', 'HR_Admin')
  async deleteComponent(@Param('id') id: string) {
    return { success: true, data: await this.payrollService.deleteComponent(id) };
  }

  // === Loans / Kasbon ===

  @Get('loans')
  @RequireFeature('loans')
  @UseGuards(RolesGuard) @Roles('SuperAdmin', 'HR_Admin')
  async getLoans(@Query('status') status?: string, @Query('employee_id') empId?: string) {
    return { success: true, data: await this.loanService.getLoans({ status, employee_id: empId }) };
  }

  @Get('my-loans')
  @RequireFeature('loans')
  async getMyLoans(@Req() req: any) {
    return { success: true, data: await this.loanService.getMyLoans(req.user.sub) };
  }

  @Post('loans/request')
  @RequireFeature('loans')
  async requestLoan(@Req() req: any, @Body() dto: any) {
    return { success: true, data: await this.loanService.requestLoan({ ...dto, employee_id: req.user.sub }) };
  }

  @Post('loans/:id/approve')
  @RequireFeature('loans')
  @UseGuards(RolesGuard) @Roles('SuperAdmin', 'HR_Admin')
  async approveLoan(@Param('id') id: string, @Req() req: any) {
    return { success: true, data: await this.loanService.approveLoan(id, req.user.sub) };
  }

  @Post('loans/:id/reject')
  @RequireFeature('loans')
  @UseGuards(RolesGuard) @Roles('SuperAdmin', 'HR_Admin')
  async rejectLoan(@Param('id') id: string, @Body() dto: any) {
    return { success: true, data: await this.loanService.rejectLoan(id, dto.notes) };
  }

  @Post('loans/:id/repayment')
  @RequireFeature('loans')
  @UseGuards(RolesGuard) @Roles('SuperAdmin', 'HR_Admin')
  async recordRepayment(@Param('id') id: string, @Body() dto: any) {
    return { success: true, data: await this.loanService.recordRepayment(id, dto) };
  }

  // === Schedules ===

  @Get('schedules')
  @RequireFeature('schedule')
  async getSchedules() {
    return { success: true, data: await this.scheduleService.getSchedules() };
  }

  @Post('schedules')
  @RequireFeature('schedule')
  @UseGuards(RolesGuard) @Roles('SuperAdmin', 'HR_Admin')
  async createSchedule(@Body() dto: any) {
    return { success: true, data: await this.scheduleService.createSchedule(dto) };
  }

  @Put('schedules/:id')
  @RequireFeature('schedule')
  @UseGuards(RolesGuard) @Roles('SuperAdmin', 'HR_Admin')
  async updateSchedule(@Param('id') id: string, @Body() dto: any) {
    return { success: true, data: await this.scheduleService.updateSchedule(id, dto) };
  }

  @Delete('schedules/:id')
  @RequireFeature('schedule')
  @UseGuards(RolesGuard) @Roles('SuperAdmin', 'HR_Admin')
  async deleteSchedule(@Param('id') id: string) {
    return { success: true, data: await this.scheduleService.deleteSchedule(id) };
  }

  @Post('schedules/assign')
  @RequireFeature('schedule')
  @UseGuards(RolesGuard) @Roles('SuperAdmin', 'HR_Admin')
  async assignSchedule(@Body() dto: any) {
    return { success: true, data: await this.scheduleService.assignSchedule(dto) };
  }

  @Get('my-schedule')
  @RequireFeature('schedule')
  async getMySchedule(@Req() req: any) {
    return { success: true, data: await this.scheduleService.getEmployeeSchedule(req.user.sub) };
  }

  // === Absences ===

  @Get('absences')
  @RequireFeature('schedule')
  @UseGuards(RolesGuard) @Roles('SuperAdmin', 'HR_Admin', 'Supervisor')
  async getAbsences(@Query() query: any) {
    return { success: true, data: await this.scheduleService.getAbsences(query) };
  }

  @Post('absences')
  @RequireFeature('schedule')
  @UseGuards(RolesGuard) @Roles('SuperAdmin', 'HR_Admin')
  async recordAbsence(@Body() dto: any, @Req() req: any) {
    return { success: true, data: await this.scheduleService.recordAbsence({ ...dto, reported_by: req.user.sub }) };
  }

  @Put('absences/:id/resolve')
  @RequireFeature('schedule')
  @UseGuards(RolesGuard) @Roles('SuperAdmin', 'HR_Admin')
  async resolveAbsence(@Param('id') id: string, @Body() dto: any) {
    return { success: true, data: await this.scheduleService.resolveAbsence(id, dto.resolution_note) };
  }

  // === Company Holidays ===

  @Get('company-holidays')
  @RequireFeature('schedule')
  async getCompanyHolidays() {
    return { success: true, data: await this.scheduleService.getCompanyHolidays() };
  }

  @Post('company-holidays')
  @RequireFeature('schedule')
  @UseGuards(RolesGuard) @Roles('SuperAdmin', 'HR_Admin')
  async createCompanyHoliday(@Body() dto: any) {
    return { success: true, data: await this.scheduleService.createCompanyHoliday(dto) };
  }

  @Delete('company-holidays/:id')
  @RequireFeature('schedule')
  @UseGuards(RolesGuard) @Roles('SuperAdmin', 'HR_Admin')
  async deleteCompanyHoliday(@Param('id') id: string) {
    await this.scheduleService.deleteCompanyHoliday(id);
    return { success: true };
  }
}
