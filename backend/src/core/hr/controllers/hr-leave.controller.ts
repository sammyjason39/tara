import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Body, 
  Query, 
  Param, 
  UseGuards, 
  Headers,
  Req 
} from "@nestjs/common";
import { HrLeaveService } from "../hr-leave.service";
import { Roles } from "../../../shared/decorators/roles.decorator";
import { RolesGuard } from "../../../shared/guards/roles.guard";
import { TenantGuard } from "../../../shared/guards/tenant.guard";
import { UserRole } from "../../../shared/roles";
import { CreateLeaveRequestDto } from "../dto";

@Controller("api/hr/leaves")
@UseGuards(RolesGuard, TenantGuard)
export class HrLeaveController {
  constructor(private readonly leaveService: HrLeaveService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getLeaveRequests(
    @Headers("x-tenant-id") tenant_id: string,
    @Query("location_id") location_id?: string,
    @Query("status") status?: string,
    @Query("employee_id") employee_id?: string,
  ) {
    return this.leaveService.getLeaveRequests(tenant_id, location_id, status, employee_id);
  }

  @Post()
  @Roles(UserRole.MEMBER, UserRole.MANAGER, UserRole.ADMIN)
  async createLeaveRequest(
    @Headers("x-tenant-id") tenant_id: string,
    @Body() data: CreateLeaveRequestDto,
    @Req() req: any,
  ) {
    const user_id = req.user?.id;
    return this.leaveService.createLeaveRequest(tenant_id, data, user_id);
  }

  @Put(":id/approve")
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  async approveLeaveRequest(
    @Headers("x-tenant-id") tenant_id: string,
    @Param("id") id: string,
    @Body("notes") notes: string,
    @Req() req: any,
  ) {
    const user_id = req.user?.id;
    return this.leaveService.approveLeaveRequest(tenant_id, id, user_id, notes, user_id);
  }

  @Put(":id/reject")
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  async rejectLeaveRequest(
    @Headers("x-tenant-id") tenant_id: string,
    @Param("id") id: string,
    @Body("notes") notes: string,
    @Req() req: any,
  ) {
    const user_id = req.user?.id;
    return this.leaveService.rejectLeaveRequest(tenant_id, id, user_id, notes, user_id);
  }
}
