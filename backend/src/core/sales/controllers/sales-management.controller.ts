import { 
  Controller, 
  Get, 
  Query, 
  UseGuards, 
  Headers,
  Req 
} from "@nestjs/common";
import { SalesManagementService } from "../sales-management.service";
import { Roles } from "../../../shared/decorators/roles.decorator";
import { RolesGuard } from "../../../shared/guards/roles.guard";
import { TenantGuard } from "../../../shared/guards/tenant.guard";
import { UserRole } from "../../../shared/roles";

@Controller("v1/sales/management")
@UseGuards(RolesGuard, TenantGuard)
export class SalesManagementController {
  constructor(private readonly salesService: SalesManagementService) {}

  @Get("analytics")
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async getAnalytics(
    @Headers("x-tenant-id") tenant_id: string,
    @Query("period") period?: string,
  ) {
    return this.salesService.getSalesAnalytics(tenant_id, period);
  }

  @Get("forecast")
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  async getForecast(
    @Headers("x-tenant-id") tenant_id: string,
    @Req() req: any,
  ) {
    const user_id = req.user?.id;
    return this.salesService.getForecast(tenant_id, user_id);
  }

  @Get("velocity")
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  async getVelocity(@Headers("x-tenant-id") tenant_id: string) {
    return this.salesService.getPipelineVelocity(tenant_id);
  }

  @Get("sla")
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  async getSLAPerformance(@Headers("x-tenant-id") tenant_id: string) {
    return this.salesService.getSLAPerformance(tenant_id);
  }
}

