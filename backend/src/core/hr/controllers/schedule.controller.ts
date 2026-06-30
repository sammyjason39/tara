import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ScheduleService } from '../services/schedule.service';
import { JwtGuard } from '../../auth/guards/jwt.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/guards/roles.guard';

/**
 * Schedule Controller — dedicated endpoints for work schedule management.
 * Routes served under `/schedules`.
 *
 * Handles:
 * - Work schedule CRUD (create templates, assign to departments/employees)
 * - Schedule assignments (link employees to schedules)
 * - Department schedule views
 * - Employee's own schedule (my-schedule)
 * - Absence records
 * - Company holidays
 */
@Controller('schedules')
@UseGuards(JwtGuard)
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  // ─── Work Schedules ──────────────────────────────────────────────────────

  @Get()
  async getSchedules(@Query('department_id') departmentId?: string) {
    if (departmentId) {
      const data = await this.scheduleService.getDepartmentSchedules(departmentId);
      return { success: true, data };
    }
    const data = await this.scheduleService.getSchedules();
    return { success: true, data };
  }

  @Get(':id')
  async getScheduleById(@Param('id') id: string) {
    const data = await this.scheduleService.getScheduleById(id);
    return { success: true, data };
  }

  @Post()
  @UseGuards(RolesGuard) @Roles('SuperAdmin', 'HR_Admin')
  async createSchedule(@Body() dto: any) {
    const data = await this.scheduleService.createSchedule(dto);
    return { success: true, data };
  }

  @Put(':id')
  @UseGuards(RolesGuard) @Roles('SuperAdmin', 'HR_Admin')
  async updateSchedule(@Param('id') id: string, @Body() dto: any) {
    const data = await this.scheduleService.updateSchedule(id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @UseGuards(RolesGuard) @Roles('SuperAdmin', 'HR_Admin')
  async deleteSchedule(@Param('id') id: string) {
    const data = await this.scheduleService.deleteSchedule(id);
    return { success: true, data };
  }

  // ─── Assignments ─────────────────────────────────────────────────────────

  @Get('assignments/all')
  async getAllAssignments(
    @Query('department_id') departmentId?: string,
    @Query('schedule_id') scheduleId?: string,
  ) {
    const data = await this.scheduleService.getAllAssignments({ departmentId, scheduleId });
    return { success: true, data };
  }

  @Post('assign')
  @UseGuards(RolesGuard) @Roles('SuperAdmin', 'HR_Admin')
  async assignSchedule(@Body() dto: any, @Req() req: any) {
    const data = await this.scheduleService.assignSchedule({
      ...dto,
      assigned_by: req.user?.sub,
    });
    return { success: true, data };
  }

  @Post('assign/bulk')
  @UseGuards(RolesGuard) @Roles('SuperAdmin', 'HR_Admin')
  async bulkAssignSchedule(@Body() dto: { schedule_id: string; employee_ids: string[]; effective_from: string; effective_to?: string }, @Req() req: any) {
    const data = await this.scheduleService.bulkAssignSchedule({
      ...dto,
      assigned_by: req.user?.sub,
    });
    return { success: true, data };
  }

  @Delete('assignments/:id')
  @UseGuards(RolesGuard) @Roles('SuperAdmin', 'HR_Admin')
  async removeAssignment(@Param('id') id: string) {
    await this.scheduleService.removeAssignment(id);
    return { success: true };
  }

  // ─── Department View ─────────────────────────────────────────────────────

  @Get('department/:departmentId')
  async getDepartmentSchedules(@Param('departmentId') departmentId: string) {
    const data = await this.scheduleService.getDepartmentSchedules(departmentId);
    return { success: true, data };
  }

  // ─── My Schedule (Employee Self-Service) ─────────────────────────────────

  @Get('my-schedule')
  async getMySchedule(@Req() req: any) {
    const data = await this.scheduleService.getEmployeeSchedule(req.user.sub);
    return { success: true, data };
  }

  // ─── Absences ────────────────────────────────────────────────────────────

  @Get('absences')
  @UseGuards(RolesGuard) @Roles('SuperAdmin', 'HR_Admin', 'Supervisor')
  async getAbsences(@Query() query: any) {
    const data = await this.scheduleService.getAbsences(query);
    return { success: true, data };
  }

  @Post('absences')
  @UseGuards(RolesGuard) @Roles('SuperAdmin', 'HR_Admin')
  async recordAbsence(@Body() dto: any, @Req() req: any) {
    const data = await this.scheduleService.recordAbsence({ ...dto, reported_by: req.user.sub });
    return { success: true, data };
  }

  @Put('absences/:id/resolve')
  @UseGuards(RolesGuard) @Roles('SuperAdmin', 'HR_Admin')
  async resolveAbsence(@Param('id') id: string, @Body() dto: any) {
    const data = await this.scheduleService.resolveAbsence(id, dto.resolution_note);
    return { success: true, data };
  }

  // ─── Company Holidays ────────────────────────────────────────────────────

  @Get('company-holidays')
  async getCompanyHolidays() {
    const data = await this.scheduleService.getCompanyHolidays();
    return { success: true, data };
  }

  @Post('company-holidays')
  @UseGuards(RolesGuard) @Roles('SuperAdmin', 'HR_Admin')
  async createCompanyHoliday(@Body() dto: any) {
    const data = await this.scheduleService.createCompanyHoliday(dto);
    return { success: true, data };
  }

  @Delete('company-holidays/:id')
  @UseGuards(RolesGuard) @Roles('SuperAdmin', 'HR_Admin')
  async deleteCompanyHoliday(@Param('id') id: string) {
    await this.scheduleService.deleteCompanyHoliday(id);
    return { success: true };
  }
}
