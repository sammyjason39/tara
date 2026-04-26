import { TenantContext } from "../../gateway/tenant-context.interface";
import { Injectable } from "@nestjs/common";
import { CaptureLeadDto } from "./dto/capture-lead.dto";
import { ConnectAccountDto } from "./dto/connect-account.dto";
import { CreateCampaignDto } from "./dto/create-campaign.dto";
import { CreateWorkflowDto } from "./dto/create-workflow.dto";
import { RunExecutionDto } from "./dto/run-execution.dto";
import { ScheduleExecutionDto } from "./dto/schedule-execution.dto";
import { UpdateAccountStatusDto } from "./dto/update-account-status.dto";
import { UpdateCampaignStatusDto } from "./dto/update-campaign-status.dto";
import { UpdateWorkflowStatusDto } from "./dto/update-workflow-status.dto";
import { IMarketingRepository } from "./repositories/marketing.repository.interface";
import { AuditService } from "../../shared/audit/audit.service";

@Injectable()
export class MarketingService {
  constructor(
    private readonly repository: IMarketingRepository,
    private readonly auditService: AuditService,
  ) {}

  async getDashboard(ctx: TenantContext) {
    return this.repository.getDashboard(ctx);
  }

  async getChannelPerformance(ctx: TenantContext) {
    return this.repository.getChannelPerformance(ctx);
  }

  async getCampaigns(ctx: TenantContext) {
    return this.repository.getCampaigns(ctx);
  }

  async createCampaign(ctx: TenantContext,
    dto: CreateCampaignDto,
    actor_id: string,
  ) {
    const campaign = await this.repository.createCampaign(
      ctx,
      dto,
      actor_id,
    );
    await this.auditService.log({
      tenant_id: ctx.tenant_id,
      user_id: actor_id,
      module: "marketing",
      action: "CREATE",
      entity_type: "CAMPAIGN",
      entity_id: campaign.id,
      metadata: { name: dto.name, objective: dto.objective },
    });
    return campaign;
  }

  async updateCampaignStatus(ctx: TenantContext,
    campaignId: string,
    dto: UpdateCampaignStatusDto,
    actor_id: string,
  ) {
    const campaign = await this.repository.updateCampaignStatus(
      ctx,
      campaignId,
      dto,
      actor_id,
    );
    await this.auditService.log({
      tenant_id: ctx.tenant_id,
      user_id: actor_id,
      module: "marketing",
      action: "UPDATE_STATUS",
      entity_type: "CAMPAIGN",
      entity_id: campaignId,
      metadata: { status: dto.status },
    });
    return campaign;
  }

  async getExecutions(ctx: TenantContext) {
    return this.repository.getExecutions(ctx);
  }

  async scheduleExecution(ctx: TenantContext,
    dto: ScheduleExecutionDto,
    actor_id: string,
  ) {
    const execution = await this.repository.scheduleExecution(
      ctx,
      dto,
      actor_id,
    );
    await this.auditService.log({
      tenant_id: ctx.tenant_id,
      user_id: actor_id,
      module: "marketing",
      action: "SCHEDULE",
      entity_type: "EXECUTION",
      entity_id: execution.id,
      metadata: { campaignId: dto.campaignId, scheduledAt: dto.scheduledAt },
    });
    return execution;
  }

  async runExecution(ctx: TenantContext,
    executionId: string,
    dto: RunExecutionDto,
    actor_id: string,
  ) {
    const execution = await this.repository.runExecution(
      ctx,
      executionId,
      dto,
      actor_id,
    );
    await this.auditService.log({
      tenant_id: ctx.tenant_id,
      user_id: actor_id,
      module: "marketing",
      action: "RUN",
      entity_type: "EXECUTION",
      entity_id: executionId,
      metadata: { failed: dto.failed },
    });
    return execution;
  }

  async getLeads(ctx: TenantContext) {
    return this.repository.getLeads(ctx);
  }

  async captureLead(ctx: TenantContext, dto: CaptureLeadDto, actor_id: string) {
    const lead = await this.repository.captureLead(ctx, dto, actor_id);
    await this.auditService.log({ tenant_id: ctx.tenant_id ,
      user_id: actor_id,
      module: "marketing",
      action: "CAPTURE",
      entity_type: "LEAD",
      entity_id: lead.id,
      metadata: { source: dto.source, email: dto.email },
    });
    return lead;
  }

  async markLeadHandoffReady(ctx: TenantContext,
    lead_id: string,
    actor_id: string,
  ) {
    const lead = await this.repository.markLeadHandoffReady(
      ctx,
      lead_id,
      actor_id,
    );
    await this.auditService.log({
      tenant_id: ctx.tenant_id,
      user_id: actor_id,
      module: "marketing",
      action: "HANDOFF_READY",
      entity_type: "LEAD",
      entity_id: lead_id,
    });
    return lead;
  }

  async handoffLeadToSales(ctx: TenantContext, lead_id: string, actor_id: string) {
    const lead = await this.repository.handoffLeadToSales(
      ctx,
      lead_id,
      actor_id,
    );
    await this.auditService.log({ tenant_id: ctx.tenant_id ,
      user_id: actor_id,
      module: "marketing",
      action: "HANDOFF_TO_SALES",
      entity_type: "LEAD",
      entity_id: lead_id,
    });
    return lead;
  }

  async getWorkflows(ctx: TenantContext) {
    return this.repository.getWorkflows(ctx);
  }

  async createWorkflow(ctx: TenantContext,
    dto: CreateWorkflowDto,
    actor_id: string,
  ) {
    const workflow = await this.repository.createWorkflow(
      ctx,
      dto,
      actor_id,
    );
    await this.auditService.log({
      tenant_id: ctx.tenant_id,
      user_id: actor_id,
      module: "marketing",
      action: "CREATE",
      entity_type: "WORKFLOW",
      entity_id: workflow.id,
      metadata: { name: dto.name, trigger: dto.trigger },
    });
    return workflow;
  }

  async updateWorkflowStatus(ctx: TenantContext,
    workflowId: string,
    dto: UpdateWorkflowStatusDto,
    actor_id: string,
  ) {
    const workflow = await this.repository.updateWorkflowStatus(
      ctx,
      workflowId,
      dto,
      actor_id,
    );
    await this.auditService.log({
      tenant_id: ctx.tenant_id,
      user_id: actor_id,
      module: "marketing",
      action: "UPDATE_STATUS",
      entity_type: "WORKFLOW",
      entity_id: workflowId,
      metadata: { status: dto.status },
    });
    return workflow;
  }

  async getConnectedAccounts(ctx: TenantContext) {
    return this.repository.getConnectedAccounts(ctx);
  }

  async connectAccount(ctx: TenantContext,
    dto: ConnectAccountDto,
    actor_id: string,
  ) {
    const account = await this.repository.connectAccount(
      ctx,
      dto,
      actor_id,
    );
    await this.auditService.log({
      tenant_id: ctx.tenant_id,
      user_id: actor_id,
      module: "marketing",
      action: "CONNECT",
      entity_type: "ACCOUNT",
      entity_id: account.id,
      metadata: { provider: dto.provider, account_name: dto.account_name },
    });
    return account;
  }

  async updateAccountStatus(ctx: TenantContext,
    accountId: string,
    dto: UpdateAccountStatusDto,
    actor_id: string,
  ) {
    const account = await this.repository.updateAccountStatus(
      ctx,
      accountId,
      dto,
      actor_id,
    );
    await this.auditService.log({
      tenant_id: ctx.tenant_id,
      user_id: actor_id,
      module: "marketing",
      action: "UPDATE_STATUS",
      entity_type: "ACCOUNT",
      entity_id: accountId,
      metadata: { status: dto.status },
    });
    return account;
  }

  async getAttribution(ctx: TenantContext) {
    return this.repository.getAttribution(ctx);
  }

  async getAlerts(ctx: TenantContext) {
    return this.repository.getAlerts(ctx);
  }

  async acknowledgeAlert(ctx: TenantContext, alertId: string) {
    return this.repository.acknowledgeAlert(ctx, alertId);
  }

  async runHealthSweep(ctx: TenantContext, actor_id: string) {
    const findings = await this.repository.runHealthSweep(ctx, actor_id);
    await this.auditService.log({ tenant_id: ctx.tenant_id ,
      user_id: actor_id,
      module: "marketing",
      action: "RUN_HEALTH_SWEEP",
      entity_type: "SYSTEM",
      entity_id: "marketing-health",
      metadata: { findingsCount: findings.length },
    });
    return findings;
  }

  async getAuditEvents(ctx: TenantContext) {
    return this.repository.getAuditEvents(ctx);
  }

  async getFunnels(ctx: TenantContext) {
    return this.repository.getFunnels(ctx);
  }
}
