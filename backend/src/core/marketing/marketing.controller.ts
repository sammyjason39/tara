import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseInterceptors,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { TenantContext } from "../../gateway/tenant-context.interface";
import { TenantInterceptor } from "../../gateway/tenant.interceptor";
import { ModuleStateGuard } from "../auth/guards/module-state.guard";
import { BranchGatingGuard } from "../auth/guards/branch-gating.guard";
import { RequiredModule } from "../../shared/decorators/required-module.decorator";
import { TenantGuard } from "../../shared/guards/tenant.guard";
import { CaptureLeadDto } from "./dto/capture-lead.dto";
import { ConnectAccountDto } from "./dto/connect-account.dto";
import { CreateCampaignDto } from "./dto/create-campaign.dto";
import { CreateWorkflowDto } from "./dto/create-workflow.dto";
import { RunExecutionDto } from "./dto/run-execution.dto";
import { ScheduleExecutionDto } from "./dto/schedule-execution.dto";
import { UpdateAccountStatusDto } from "./dto/update-account-status.dto";
import { UpdateCampaignStatusDto } from "./dto/update-campaign-status.dto";
import { UpdateWorkflowStatusDto } from "./dto/update-workflow-status.dto";
import { MarketingService } from "./marketing.service";
import { PrismaService } from "../../persistence/prisma.service";
import { isModuleActive } from "../../shared/helpers/module-active.helper";

interface RequestWithTenant extends Request {
  tenantContext: TenantContext;
}

@Controller("marketing")
@UseInterceptors(TenantInterceptor)
@UseGuards(ModuleStateGuard, BranchGatingGuard, TenantGuard)
@RequiredModule("marketing")
export class MarketingController {
  constructor(
    private readonly marketingService: MarketingService,
    private readonly prisma: PrismaService,
  ) {}

  private actor_id(request: RequestWithTenant) {
    const value = request.headers["x-actor-id"];
    return typeof value === "string" && value.trim().length > 0
      ? value
      : "system";
  }

  @Get("dashboard")
  async getDashboard(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const dashboardData = await this.marketingService.getDashboard(tenant_id);

    const moduleContributions: any = {};
    if (await isModuleActive(this.prisma, tenant_id, "retail")) {
      const walkInCustomers = await this.prisma.retail_orders.count({
        where: { tenant_id: tenant_id, customer_id: null },
      });
      const loyaltyMembers = await this.prisma.retail_orders.groupBy({
        by: ["customer_id"],
        where: { tenant_id: tenant_id, customer_id: { not: null } },
      });
      moduleContributions.retail = {
        walkInCustomers,
        loyaltyActive: loyaltyMembers.length,
      };
    }

    return {
      success: true,
      tenant_id,
      data: {
        ...dashboardData,
        moduleContributions,
      },
    };
  }

  @Get("channel-performance")
  async getChannelPerformance(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.marketingService.getChannelPerformance(tenant_id);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Get("campaigns")
  async getCampaigns(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.marketingService.getCampaigns(tenant_id);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Post("campaigns")
  async createCampaign(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateCampaignDto,
  ) {
    const { tenant_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Campaign created",
      data: await this.marketingService.createCampaign(
        tenant_id,
        dto,
        this.actor_id(request),
      ),
    };
  }

  @Put("campaigns/:id/status")
  async updateCampaignStatus(
    @Req() request: RequestWithTenant,
    @Param("id") campaignId: string,
    @Body() dto: UpdateCampaignStatusDto,
  ) {
    const { tenant_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Campaign status updated",
      data: await this.marketingService.updateCampaignStatus(
        tenant_id,
        campaignId,
        dto,
        this.actor_id(request),
      ),
    };
  }

  @Get("executions")
  async getExecutions(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.marketingService.getExecutions(tenant_id);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Post("executions")
  async scheduleExecution(
    @Req() request: RequestWithTenant,
    @Body() dto: ScheduleExecutionDto,
  ) {
    const { tenant_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Execution scheduled",
      data: await this.marketingService.scheduleExecution(
        tenant_id,
        dto,
        this.actor_id(request),
      ),
    };
  }

  @Put("executions/:id/run")
  async runExecution(
    @Req() request: RequestWithTenant,
    @Param("id") executionId: string,
    @Body() dto: RunExecutionDto,
  ) {
    const { tenant_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Execution update applied",
      data: await this.marketingService.runExecution(
        tenant_id,
        executionId,
        dto,
        this.actor_id(request),
      ),
    };
  }

  @Get("leads")
  async getLeads(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.marketingService.getLeads(tenant_id);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Post("leads")
  async captureLead(
    @Req() request: RequestWithTenant,
    @Body() dto: CaptureLeadDto,
  ) {
    const { tenant_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Lead captured",
      data: await this.marketingService.captureLead(
        tenant_id,
        dto,
        this.actor_id(request),
      ),
    };
  }

  @Put("leads/:id/handoff-ready")
  async markLeadHandoffReady(
    @Req() request: RequestWithTenant,
    @Param("id") lead_id: string,
  ) {
    const { tenant_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Lead marked handoff-ready",
      data: await this.marketingService.markLeadHandoffReady(
        tenant_id,
        lead_id,
        this.actor_id(request),
      ),
    };
  }

  @Put("leads/:id/handoff-sales")
  async handoffLeadToSales(
    @Req() request: RequestWithTenant,
    @Param("id") lead_id: string,
  ) {
    const { tenant_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Lead handed off to Sales",
      data: await this.marketingService.handoffLeadToSales(
        tenant_id,
        lead_id,
        this.actor_id(request),
      ),
    };
  }

  @Get("workflows")
  async getWorkflows(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.marketingService.getWorkflows(tenant_id);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Post("workflows")
  async createWorkflow(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateWorkflowDto,
  ) {
    const { tenant_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Workflow created",
      data: await this.marketingService.createWorkflow(
        tenant_id,
        dto,
        this.actor_id(request),
      ),
    };
  }

  @Put("workflows/:id/status")
  async updateWorkflowStatus(
    @Req() request: RequestWithTenant,
    @Param("id") workflowId: string,
    @Body() dto: UpdateWorkflowStatusDto,
  ) {
    const { tenant_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Workflow status updated",
      data: await this.marketingService.updateWorkflowStatus(
        tenant_id,
        workflowId,
        dto,
        this.actor_id(request),
      ),
    };
  }

  @Get("accounts")
  async getAccounts(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.marketingService.getConnectedAccounts(tenant_id);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Post("accounts")
  async connectAccount(
    @Req() request: RequestWithTenant,
    @Body() dto: ConnectAccountDto,
  ) {
    const { tenant_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Account connected",
      data: await this.marketingService.connectAccount(
        tenant_id,
        dto,
        this.actor_id(request),
      ),
    };
  }

  @Put("accounts/:id/status")
  async updateAccountStatus(
    @Req() request: RequestWithTenant,
    @Param("id") accountId: string,
    @Body() dto: UpdateAccountStatusDto,
  ) {
    const { tenant_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Account status updated",
      data: await this.marketingService.updateAccountStatus(
        tenant_id,
        accountId,
        dto,
        this.actor_id(request),
      ),
    };
  }

  @Get("attribution")
  async getAttribution(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.marketingService.getAttribution(tenant_id);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Get("alerts")
  async getAlerts(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.marketingService.getAlerts(tenant_id);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Put("alerts/:id/ack")
  async acknowledgeAlert(
    @Req() request: RequestWithTenant,
    @Param("id") alertId: string,
  ) {
    const { tenant_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Alert acknowledged",
      data: await this.marketingService.acknowledgeAlert(tenant_id, alertId),
    };
  }

  @Post("health-sweep")
  async runHealthSweep(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.marketingService.runHealthSweep(
      tenant_id,
      this.actor_id(request),
    );
    return {
      success: true,
      tenant_id,
      message: "Health sweep executed",
      count: data.length,
      data,
    };
  }

  @Get("audit-events")
  async getAuditEvents(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.marketingService.getAuditEvents(tenant_id);
    return { success: true, tenant_id, count: data.length, data };
  }
}
