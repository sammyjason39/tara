import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  Headers,
  Req 
} from "@nestjs/common";
import { SchedulingService } from "../scheduling.service";
import { Roles } from "../../../shared/decorators/roles.decorator";
import { RolesGuard } from "../../../shared/guards/roles.guard";
import { TenantGuard } from "../../../shared/guards/tenant.guard";
import { UserRole } from "../../../shared/roles";
import { 
  CreateWorkScheduleDto, 
  UpdateWorkScheduleDto, 
  CreateWorkShiftDto, 
  UpdateWorkShiftDto 
} from "../dto";

@Controller("v1/hr/scheduling")
@UseGuards(RolesGuard, TenantGuard)
export class HrSchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @Get("schedules")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getSchedules(
    @Headers("x-tenant-id") tenant_id: string,
    @Query("location_id") location_id?: string,
    @Query("status") status?: string,
  ) {
    return this.schedulingService.getWorkSchedules(tenant_id, location_id);
  }

  @Post("schedules")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async createSchedule(
    @Headers("x-tenant-id") tenant_id: string,
    @Body() data: CreateWorkScheduleDto,
    @Req() req: any,
  ) {
    const user_id = req.user?.id;
    return this.schedulingService.createWorkSchedule(tenant_id, data, user_id);
  }

  @Post("schedules/:id/approve")
  @Roles(UserRole.ADMIN) // Only Admin can approve
  async approveSchedule(
    @Headers("x-tenant-id") tenant_id: string,
    @Param("id") id: string,
    @Req() req: any,
  ) {
    const user_id = req.user?.id;
    return this.schedulingService.approveSchedule(tenant_id, id, user_id);
  }

  @Get("shifts")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER)
  async getShifts(
    @Headers("x-tenant-id") tenant_id: string,
    @Query("schedule_id") schedule_id?: string,
    @Query("employee_id") employee_id?: string,
  ) {
    return this.schedulingService.getWorkShifts(tenant_id, schedule_id, employee_id);
  }

  @Post("shifts")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async createShift(
    @Headers("x-tenant-id") tenant_id: string,
    @Body() data: CreateWorkShiftDto,
    @Req() req: any,
  ) {
    const user_id = req.user?.id;
    return this.schedulingService.createWorkShift(tenant_id, data, user_id);
  }
}
