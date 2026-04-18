import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Query, 
  UseGuards, 
  Headers,
  Req 
} from "@nestjs/common";
import { HrAttendanceService } from "../hr-attendance.service";
import { Roles } from "../../../shared/decorators/roles.decorator";
import { RolesGuard } from "../../../shared/guards/roles.guard";
import { TenantGuard } from "../../../shared/guards/tenant.guard";
import { UserRole } from "../../../shared/roles";

@Controller("api/hr/attendance")
@UseGuards(RolesGuard, TenantGuard)
export class HrAttendanceController {
  constructor(private readonly attendanceService: HrAttendanceService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getAttendance(
    @Headers("x-tenant-id") tenant_id: string,
    @Query("location_id") location_id?: string,
    @Query("employee_id") employee_id?: string,
    @Query("start_date") start_date?: string,
    @Query("end_date") end_date?: string,
  ) {
    return this.attendanceService.getAttendance(
      tenant_id,
      location_id,
      employee_id,
      start_date,
      end_date,
    );
  }

  @Post("clock-in")
  @Roles(UserRole.MEMBER, UserRole.MANAGER, UserRole.ADMIN)
  async clock_in(
    @Headers("x-tenant-id") tenant_id: string,
    @Headers("x-location-id") location_id: string,
    @Body("employee_id") employee_id: string,
    @Req() req: any,
  ) {
    const user_id = req.user?.id;
    return this.attendanceService.clock_in(tenant_id, employee_id, location_id, user_id);
  }

  @Post("clock-out")
  @Roles(UserRole.MEMBER, UserRole.MANAGER, UserRole.ADMIN)
  async clock_out(
    @Headers("x-tenant-id") tenant_id: string,
    @Body("employee_id") employee_id: string,
    @Req() req: any,
  ) {
    const user_id = req.user?.id;
    return this.attendanceService.clock_out(tenant_id, employee_id, user_id);
  }
}
