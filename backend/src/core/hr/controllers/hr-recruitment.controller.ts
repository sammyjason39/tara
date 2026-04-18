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
import { HrRecruitmentService } from "../hr-recruitment.service";
import { Roles } from "../../../shared/decorators/roles.decorator";
import { RolesGuard } from "../../../shared/guards/roles.guard";
import { TenantGuard } from "../../../shared/guards/tenant.guard";
import { UserRole } from "../../../shared/roles";
import { CreateRequisitionDto } from "../dto";

@Controller("api/hr/recruitment")
@UseGuards(RolesGuard, TenantGuard)
export class HrRecruitmentController {
  constructor(private readonly recruitmentService: HrRecruitmentService) {}

  @Get("requisitions")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getRequisitions(
    @Headers("x-tenant-id") tenant_id: string,
    @Query("status") status?: string,
  ) {
    return this.recruitmentService.getRequisitions(tenant_id, status);
  }

  @Post("requisitions")
  @Roles(UserRole.ADMIN)
  async createRequisition(
    @Headers("x-tenant-id") tenant_id: string,
    @Body() data: CreateRequisitionDto,
    @Req() req: any,
  ) {
    const user_id = req.user?.id;
    return this.recruitmentService.createRequisition(tenant_id, data, user_id);
  }

  @Get("candidates")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getCandidates(
    @Headers("x-tenant-id") tenant_id: string,
    @Query("status") status?: string,
  ) {
    return this.recruitmentService.getCandidates(tenant_id, status);
  }

  @Post("candidates")
  @Roles(UserRole.ADMIN)
  async createCandidate(
    @Headers("x-tenant-id") tenant_id: string,
    @Body() data: any,
    @Req() req: any,
  ) {
    const user_id = req.user?.id;
    return this.recruitmentService.createCandidate(tenant_id, data, user_id);
  }

  @Get("interviews")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getInterviews(
    @Headers("x-tenant-id") tenant_id: string,
    @Query("candidateId") candidateId?: string,
  ) {
    return this.recruitmentService.getInterviews(tenant_id, candidateId);
  }

  @Post("interviews")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async scheduleInterview(
    @Headers("x-tenant-id") tenant_id: string,
    @Body() data: any,
    @Req() req: any,
  ) {
    const user_id = req.user?.id;
    return this.recruitmentService.scheduleInterview(tenant_id, data, user_id);
  }

  @Get("leads")
  @Roles(UserRole.ADMIN)
  async getLeads(
    @Headers("x-tenant-id") tenant_id: string,
    @Query("status") status?: string,
  ) {
    return this.recruitmentService.getTalentLeads(tenant_id, status);
  }

  @Post("leads/convert")
  @Roles(UserRole.ADMIN)
  async convertLead(
    @Headers("x-tenant-id") tenant_id: string,
    @Body("lead_id") lead_id: string,
    @Body("requisitionId") requisitionId: string,
    @Req() req: any,
  ) {
    const user_id = req.user?.id;
    return this.recruitmentService.convertLeadToCandidate(tenant_id, lead_id, requisitionId, user_id);
  }
}
