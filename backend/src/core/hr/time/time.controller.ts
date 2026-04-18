import { Controller, Post, Body, Headers, Param } from '@nestjs/common';
import { TimeAndAttendanceService } from './time.service';

@Controller('api/hr/time')
export class TimeAndAttendanceController {
  constructor(private readonly timeService: TimeAndAttendanceService) {}

  @Post('leave/request')
  async requestLeave(
    @Headers('x-tenant-id') tenant_id: string,
    @Body('employee_id') employee_id: string,
    @Body() dto: { type: string, start_date: Date, end_date: Date, reason?: string }
  ) {
    const result = await this.timeService.requestLeave(tenant_id, employee_id, dto);
    return { success: true, data: result };
  }

  @Post('leave/:id/approve')
  async approveLeave(
    @Headers('x-tenant-id') tenant_id: string,
    @Param('id') leaveId: string,
    @Body('approverId') approverId: string,
  ) {
    await this.timeService.approveLeave(tenant_id, leaveId, approverId);
    return { success: true, message: 'Leave approved' };
  }

  @Post('clock-in')
  async clock_in(
    @Headers('x-tenant-id') tenant_id: string,
    @Body('employee_id') employee_id: string,
    @Body('location_id') location_id: string,
  ) {
    const result = await this.timeService.clock_in(tenant_id, employee_id, location_id);
    return { success: true, data: result };
  }

  @Post('clock-out')
  async clock_out(
    @Headers('x-tenant-id') tenant_id: string,
    @Body('employee_id') employee_id: string,
  ) {
    await this.timeService.clock_out(tenant_id, employee_id);
    return { success: true, message: 'Clocked out successfully' };
  }

  @Post('shift/assign')
  async assignShift(
    @Headers('x-tenant-id') tenant_id: string,
    @Body('employee_id') employee_id: string,
    @Body('shift_id') shift_id: string,
    @Body('location_id') location_id: string,
    @Body('date') date: string,
  ) {
    await this.timeService.assignShift(tenant_id, employee_id, shift_id, location_id, date);
    return { success: true, message: 'Shift assigned' };
  }
}
