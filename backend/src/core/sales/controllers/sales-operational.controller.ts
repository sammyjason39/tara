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
import { SalesOperationalService } from "../sales-operational.service";
import { Roles } from "../../../shared/decorators/roles.decorator";
import { RolesGuard } from "../../../shared/guards/roles.guard";
import { TenantGuard } from "../../../shared/guards/tenant.guard";
import { UserRole } from "../../../shared/roles";

@Controller("api/sales/operational")
@UseGuards(RolesGuard, TenantGuard)
export class SalesOperationalController {
  constructor(private readonly salesService: SalesOperationalService) {}

  @Get("leads")
  @Roles(UserRole.MEMBER, UserRole.MANAGER, UserRole.ADMIN)
  async getLeads(
    @Headers("x-tenant-id") tenant_id: string,
    @Query("status") status?: string,
  ) {
    return this.salesService.getLeads(tenant_id, status);
  }

  @Post("leads")
  @Roles(UserRole.MEMBER, UserRole.ADMIN)
  async createLead(
    @Headers("x-tenant-id") tenant_id: string,
    @Body() data: any,
    @Req() req: any,
  ) {
    const user_id = req.user?.id;
    return this.salesService.createLead(tenant_id, data, user_id);
  }

  @Get("opportunities")
  @Roles(UserRole.MEMBER, UserRole.MANAGER, UserRole.ADMIN)
  async getOpportunities(
    @Headers("x-tenant-id") tenant_id: string,
    @Query("stage") stage?: string,
  ) {
    return this.salesService.getOpportunities(tenant_id, stage);
  }

  @Get("deals")
  @Roles(UserRole.MEMBER, UserRole.MANAGER, UserRole.ADMIN)
  async getDeals(
    @Headers("x-tenant-id") tenant_id: string,
    @Query("status") status?: string,
  ) {
    return this.salesService.getDeals(tenant_id, status);
  }

  @Get("quotes")
  @Roles(UserRole.MEMBER, UserRole.MANAGER, UserRole.ADMIN)
  async getQuotes(
    @Headers("x-tenant-id") tenant_id: string,
    @Query("dealId") dealId?: string,
  ) {
    return this.salesService.getQuotes(tenant_id, dealId);
  }
}
