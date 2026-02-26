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

interface RequestWithTenant extends Request {
  tenantContext: TenantContext;
}

@Controller("sales")
@UseInterceptors(TenantInterceptor)
@UseGuards(ModuleStateGuard, BranchGatingGuard)
@RequiredModule("sales")
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get("dashboard")
  async getDashboard(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      data: await this.salesService.getDashboard(tenantId),
    };
  }

  @Get("manager-metrics")
  async getManagerMetrics(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      data: await this.salesService.getManagerMetrics(tenantId),
    };
  }

  @Get("executive-forecast")
  async getExecutiveForecast(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      data: await this.salesService.getExecutiveForecast(tenantId),
    };
  }

  @Get("nba")
  async getNextBestActions(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      data: await this.salesService.getNextBestActions(tenantId),
    };
  }

  @Get("leads")
  async getLeads(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.salesService.getLeads(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post("leads")
  async createLead(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateLeadDto,
  ) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Lead created",
      data: await this.salesService.createLead(tenantId, dto),
    };
  }

  @Put("leads/:id/status")
  async updateLeadStatus(
    @Req() request: RequestWithTenant,
    @Param("id") leadId: string,
    @Body() dto: UpdateLeadStatusDto,
  ) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Lead status updated",
      data: await this.salesService.updateLeadStatus(tenantId, leadId, dto),
    };
  }

  @Post("leads/:id/convert")
  async convertLead(
    @Req() request: RequestWithTenant,
    @Param("id") leadId: string,
  ) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Lead converted to opportunity",
      data: await this.salesService.convertLead(tenantId, leadId, "system"),
    };
  }

  @Get("opportunities")
  async getOpportunities(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.salesService.getOpportunities(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post("opportunities")
  async createOpportunity(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateOpportunityDto,
  ) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Opportunity created",
      data: await this.salesService.createOpportunity(tenantId, dto),
    };
  }

  @Put("opportunities/:id/stage")
  async moveOpportunityStage(
    @Req() request: RequestWithTenant,
    @Param("id") opportunityId: string,
    @Body() dto: MoveOpportunityStageDto,
  ) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Opportunity stage updated",
      data: await this.salesService.moveOpportunityStage(
        tenantId,
        opportunityId,
        dto,
      ),
    };
  }

  @Put("opportunities/:id/close")
  async closeOpportunity(
    @Req() request: RequestWithTenant,
    @Param("id") opportunityId: string,
    @Body() dto: CloseOpportunityDto,
  ) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Opportunity close operation complete",
      data: await this.salesService.closeOpportunity(
        tenantId,
        opportunityId,
        dto,
      ),
    };
  }

  @Get("quotes")
  async getQuotes(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.salesService.getQuotes(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post("quotes")
  async createQuote(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateQuoteDto,
  ) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Quote created",
      data: await this.salesService.createQuote(tenantId, dto),
    };
  }

  @Put("quotes/:id/submit")
  async submitQuote(
    @Req() request: RequestWithTenant,
    @Param("id") quoteId: string,
  ) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Quote submitted for approval",
      data: await this.salesService.submitQuote(tenantId, quoteId),
    };
  }

  @Put("quotes/:id/decision")
  async decideQuote(
    @Req() request: RequestWithTenant,
    @Param("id") quoteId: string,
    @Body() dto: QuoteDecisionDto,
  ) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Quote decision recorded",
      data: await this.salesService.decideQuote(tenantId, quoteId, dto),
    };
  }

  @Get("timeline")
  async getTimeline(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.salesService.getTimeline(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post("timeline")
  async createTimelineEvent(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateTimelineEventDto,
  ) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Timeline event created",
      data: await this.salesService.createTimelineEvent(tenantId, dto),
    };
  }

  @Get("tasks")
  async getTasks(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.salesService.getTasks(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post("tasks")
  async createTask(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateTaskDto,
  ) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Task created",
      data: await this.salesService.createTask(tenantId, dto),
    };
  }

  @Put("tasks/:id/done")
  async completeTask(
    @Req() request: RequestWithTenant,
    @Param("id") taskId: string,
  ) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Task marked done",
      data: await this.salesService.completeTask(tenantId, taskId),
    };
  }

  @Get("orders")
  async getOrders(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.salesService.getOrders(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Get("alerts")
  async getAlerts(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.salesService.getAlerts(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post("sla-sweep")
  async runSlaSweep(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.salesService.runSlaSweep(tenantId, "system");
    return {
      success: true,
      tenantId,
      message: "SLA sweep executed",
      count: data.length,
      data,
    };
  }

  @Get("audit-events")
  async getAuditEvents(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.salesService.getAuditEvents(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }
}
