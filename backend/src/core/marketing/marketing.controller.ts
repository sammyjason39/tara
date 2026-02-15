import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { TenantContext } from '../../gateway/tenant-context.interface';
import { TenantInterceptor } from '../../gateway/tenant.interceptor';
import { CaptureLeadDto } from './dto/capture-lead.dto';
import { ConnectAccountDto } from './dto/connect-account.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { RunExecutionDto } from './dto/run-execution.dto';
import { ScheduleExecutionDto } from './dto/schedule-execution.dto';
import { UpdateAccountStatusDto } from './dto/update-account-status.dto';
import { UpdateCampaignStatusDto } from './dto/update-campaign-status.dto';
import { UpdateWorkflowStatusDto } from './dto/update-workflow-status.dto';
import { MarketingService } from './marketing.service';

interface RequestWithTenant extends Request {
  tenantContext: TenantContext;
}

@Controller('marketing')
@UseInterceptors(TenantInterceptor)
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  private actorId(request: RequestWithTenant) {
    const value = request.headers['x-actor-id'];
    return typeof value === 'string' && value.trim().length > 0 ? value : 'system';
  }

  @Get('dashboard')
  async getDashboard(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      data: await this.marketingService.getDashboard(tenantId),
    };
  }

  @Get('channel-performance')
  async getChannelPerformance(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.marketingService.getChannelPerformance(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Get('campaigns')
  async getCampaigns(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.marketingService.getCampaigns(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post('campaigns')
  async createCampaign(@Req() request: RequestWithTenant, @Body() dto: CreateCampaignDto) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: 'Campaign created',
      data: await this.marketingService.createCampaign(tenantId, dto, this.actorId(request)),
    };
  }

  @Put('campaigns/:id/status')
  async updateCampaignStatus(
    @Req() request: RequestWithTenant,
    @Param('id') campaignId: string,
    @Body() dto: UpdateCampaignStatusDto,
  ) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: 'Campaign status updated',
      data: await this.marketingService.updateCampaignStatus(
        tenantId,
        campaignId,
        dto,
        this.actorId(request),
      ),
    };
  }

  @Get('executions')
  async getExecutions(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.marketingService.getExecutions(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post('executions')
  async scheduleExecution(
    @Req() request: RequestWithTenant,
    @Body() dto: ScheduleExecutionDto,
  ) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: 'Execution scheduled',
      data: await this.marketingService.scheduleExecution(tenantId, dto, this.actorId(request)),
    };
  }

  @Put('executions/:id/run')
  async runExecution(
    @Req() request: RequestWithTenant,
    @Param('id') executionId: string,
    @Body() dto: RunExecutionDto,
  ) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: 'Execution update applied',
      data: await this.marketingService.runExecution(
        tenantId,
        executionId,
        dto,
        this.actorId(request),
      ),
    };
  }

  @Get('leads')
  async getLeads(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.marketingService.getLeads(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post('leads')
  async captureLead(@Req() request: RequestWithTenant, @Body() dto: CaptureLeadDto) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: 'Lead captured',
      data: await this.marketingService.captureLead(tenantId, dto, this.actorId(request)),
    };
  }

  @Put('leads/:id/handoff-ready')
  async markLeadHandoffReady(
    @Req() request: RequestWithTenant,
    @Param('id') leadId: string,
  ) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: 'Lead marked handoff-ready',
      data: await this.marketingService.markLeadHandoffReady(
        tenantId,
        leadId,
        this.actorId(request),
      ),
    };
  }

  @Put('leads/:id/handoff-sales')
  async handoffLeadToSales(@Req() request: RequestWithTenant, @Param('id') leadId: string) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: 'Lead handed off to Sales',
      data: await this.marketingService.handoffLeadToSales(
        tenantId,
        leadId,
        this.actorId(request),
      ),
    };
  }

  @Get('workflows')
  async getWorkflows(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.marketingService.getWorkflows(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post('workflows')
  async createWorkflow(@Req() request: RequestWithTenant, @Body() dto: CreateWorkflowDto) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: 'Workflow created',
      data: await this.marketingService.createWorkflow(tenantId, dto, this.actorId(request)),
    };
  }

  @Put('workflows/:id/status')
  async updateWorkflowStatus(
    @Req() request: RequestWithTenant,
    @Param('id') workflowId: string,
    @Body() dto: UpdateWorkflowStatusDto,
  ) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: 'Workflow status updated',
      data: await this.marketingService.updateWorkflowStatus(
        tenantId,
        workflowId,
        dto,
        this.actorId(request),
      ),
    };
  }

  @Get('accounts')
  async getAccounts(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.marketingService.getConnectedAccounts(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post('accounts')
  async connectAccount(@Req() request: RequestWithTenant, @Body() dto: ConnectAccountDto) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: 'Account connected',
      data: await this.marketingService.connectAccount(tenantId, dto, this.actorId(request)),
    };
  }

  @Put('accounts/:id/status')
  async updateAccountStatus(
    @Req() request: RequestWithTenant,
    @Param('id') accountId: string,
    @Body() dto: UpdateAccountStatusDto,
  ) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: 'Account status updated',
      data: await this.marketingService.updateAccountStatus(
        tenantId,
        accountId,
        dto,
        this.actorId(request),
      ),
    };
  }

  @Get('attribution')
  async getAttribution(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.marketingService.getAttribution(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Get('alerts')
  async getAlerts(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.marketingService.getAlerts(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Put('alerts/:id/ack')
  async acknowledgeAlert(@Req() request: RequestWithTenant, @Param('id') alertId: string) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: 'Alert acknowledged',
      data: await this.marketingService.acknowledgeAlert(tenantId, alertId),
    };
  }

  @Post('health-sweep')
  async runHealthSweep(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.marketingService.runHealthSweep(tenantId, this.actorId(request));
    return {
      success: true,
      tenantId,
      message: 'Health sweep executed',
      count: data.length,
      data,
    };
  }

  @Get('audit-events')
  async getAuditEvents(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.marketingService.getAuditEvents(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }
}

