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
import { CloseOpportunityDto } from "./dto/close-opportunity.dto";
import { CreateLeadDto } from "./dto/create-lead.dto";
import { CreateOpportunityDto } from "./dto/create-opportunity.dto";
import { CreateQuoteDto } from "./dto/create-quote.dto";
import { CreateTaskDto } from "./dto/create-task.dto";
import { CreateTimelineEventDto } from "./dto/create-timeline-event.dto";
import { MoveOpportunityStageDto } from "./dto/move-opportunity-stage.dto";
import { QuoteDecisionDto } from "./dto/quote-decision.dto";
import { UpdateLeadStatusDto } from "./dto/update-lead-status.dto";
import { SalesService } from "./sales.service";
import { PrismaService } from "../../persistence/prisma.service";
import { isModuleActive } from "../../shared/helpers/module-active.helper";
import { MultiTenancyUtil } from "../../shared/utils/multi-tenancy.util";

interface RequestWithTenant extends Request {
  tenantContext: TenantContext;
}

@Controller('sales')
@UseInterceptors(TenantInterceptor)
@UseGuards(ModuleStateGuard, BranchGatingGuard, TenantGuard)
@RequiredModule("sales")
export class SalesController {
  constructor(
    private readonly salesService: SalesService,
    private readonly prisma: PrismaService,
  ) {}

  @Get("dashboard")
  async getDashboard(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const dashboardData = await this.salesService.getDashboard(request.tenantContext);

    // Core Module Integration: Retail Contributions
    const moduleContributions: any = {};
    if (await isModuleActive(this.prisma, tenant_id, "retail")) {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const retailRevenueAgg = await this.prisma.retail_orders.aggregate({
        where: {
          ...MultiTenancyUtil.getScope(request.tenantContext),
          status: { in: ["COMPLETED", "PAID", "complete", "paid"] },
          created_at: { gte: startOfWeek },
        },
        _sum: { total_amount: true },
      });

      const retailOrders = await this.prisma.retail_orders.count({
        where: {
          ...MultiTenancyUtil.getScope(request.tenantContext),
          created_at: { gte: startOfWeek },
        },
      });

      moduleContributions.retail = {
        retailRevenue: retailRevenueAgg._sum.total_amount?.toNumber() || 0,
        retailOrders,
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

  @Get("manager-metrics")
  async getManagerMetrics(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      data: await this.salesService.getManagerMetrics(request.tenantContext),
    };
  }

  @Get("executive-forecast")
  async getExecutiveForecast(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      data: await this.salesService.getExecutiveForecast(request.tenantContext),
    };
  }

  @Get("nba")
  async getNextBestActions(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      data: await this.salesService.getNextBestActions(request.tenantContext),
    };
  }

  @Get("forecast")
  async getForecast(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      data: await this.salesService.getForecast(request.tenantContext),
    };
  }

  @Get("analytics")
  async getAnalytics(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      data: await this.salesService.getSalesAnalytics(request.tenantContext),
    };
  }

  @Get("leads")
  async getLeads(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.salesService.getLeads(request.tenantContext);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Get("pipeline")
  async getPipeline(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.salesService.getPipeline(request.tenantContext);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Post("leads")
  async createLead(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateLeadDto,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Lead created",
      data: await this.salesService.createLead(request.tenantContext, dto, user_id),
    };
  }

  @Put("leads/:id/status")
  async updateLeadStatus(
    @Req() request: RequestWithTenant,
    @Param("id") lead_id: string,
    @Body() dto: UpdateLeadStatusDto,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Lead status updated",
      data: await this.salesService.updateLeadStatus(
        request.tenantContext,
        lead_id,
        dto,
        user_id,
      ),
    };
  }

  @Post("leads/:id/convert")
  async convertLead(
    @Req() request: RequestWithTenant,
    @Param("id") lead_id: string,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Lead converted to opportunity",
      data: await this.salesService.convertLead(
        request.tenantContext,
        lead_id,
        user_id || "system",
      ),
    };
  }

  @Get("opportunities")
  async getOpportunities(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.salesService.getOpportunities(request.tenantContext);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Post("opportunities")
  async createOpportunity(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateOpportunityDto,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Opportunity created",
      data: await this.salesService.createOpportunity(request.tenantContext, dto, user_id),
    };
  }

  @Put("opportunities/:id/stage")
  async moveOpportunityStage(
    @Req() request: RequestWithTenant,
    @Param("id") opportunityId: string,
    @Body() dto: MoveOpportunityStageDto,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Opportunity stage updated",
      data: await this.salesService.moveOpportunityStage(
        request.tenantContext,
        opportunityId,
        dto,
        user_id,
      ),
    };
  }

  @Put("opportunities/:id/close")
  async closeOpportunity(
    @Req() request: RequestWithTenant,
    @Param("id") opportunityId: string,
    @Body() dto: CloseOpportunityDto,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Opportunity close operation complete",
      data: await this.salesService.closeOpportunity(
        request.tenantContext,
        opportunityId,
        dto,
        user_id,
      ),
    };
  }

  @Get("quotes")
  async getQuotes(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.salesService.getQuotes(request.tenantContext);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Post("quotes")
  async createQuote(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateQuoteDto,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Quote created",
      data: await this.salesService.createQuote(request.tenantContext, dto, user_id),
    };
  }

  @Put("quotes/:id/submit")
  async submitQuote(
    @Req() request: RequestWithTenant,
    @Param("id") quoteId: string,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Quote submitted for approval",
      data: await this.salesService.submitQuote(request.tenantContext, quoteId, user_id),
    };
  }

  @Put("quotes/:id/decision")
  async decideQuote(
    @Req() request: RequestWithTenant,
    @Param("id") quoteId: string,
    @Body() dto: QuoteDecisionDto,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Quote decision recorded",
      data: await this.salesService.decideQuote(request.tenantContext, quoteId, dto, user_id),
    };
  }

  @Get("timeline")
  async getTimeline(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.salesService.getTimeline(request.tenantContext);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Post("timeline")
  async createTimelineEvent(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateTimelineEventDto,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Timeline event created",
      data: await this.salesService.createTimelineEvent(request.tenantContext, dto, user_id),
    };
  }

  @Get("tasks")
  async getTasks(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.salesService.getTasks(request.tenantContext);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Post("tasks")
  async createTask(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateTaskDto,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Task created",
      data: await this.salesService.createTask(request.tenantContext, dto, user_id),
    };
  }

  @Put("tasks/:id/done")
  async completeTask(
    @Req() request: RequestWithTenant,
    @Param("id") taskId: string,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Task marked done",
      data: await this.salesService.completeTask(request.tenantContext, taskId, user_id),
    };
  }

  @Get("orders")
  async getOrders(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.salesService.getOrders(request.tenantContext);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Get("alerts")
  async getAlerts(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.salesService.getAlerts(request.tenantContext);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Post("sla-sweep")
  async runSlaSweep(@Req() request: RequestWithTenant) {
    const { tenant_id, user_id } = request.tenantContext;
    const data = await this.salesService.runSlaSweep(
      request.tenantContext,
      user_id || "system",
    );
    return {
      success: true,
      tenant_id,
      message: "SLA sweep executed",
      count: data.length,
      data,
    };
  }

  @Get("audit-events")
  async getAuditEvents(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.salesService.getAuditEvents(request.tenantContext);
    return { success: true, tenant_id, count: data.length, data };
  }
}
