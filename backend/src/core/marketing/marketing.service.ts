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

  async getDashboard(tenant_id: string) {
    return this.repository.getDashboard(tenant_id);
  }

  async getChannelPerformance(tenant_id: string) {
    return this.repository.getChannelPerformance(tenant_id);
  }

  async getCampaigns(tenant_id: string) {
    return this.repository.getCampaigns(tenant_id);
  }

  async createCampaign(
    tenant_id: string,
    dto: CreateCampaignDto,
    actor_id: string,
  ) {
    const campaign = await this.repository.createCampaign(
      tenant_id,
      dto,
      actor_id,
    );
    await this.auditService.log({
      tenant_id,
      user_id: actor_id,
      module: "marketing",
      action: "CREATE",
      entity_type: "CAMPAIGN",
      entity_id: campaign.id,
      metadata: { name: dto.name, objective: dto.objective },
    });
    return campaign;
  }

  async updateCampaignStatus(
    tenant_id: string,
    campaignId: string,
    dto: UpdateCampaignStatusDto,
    actor_id: string,
  ) {
    const campaign = await this.repository.updateCampaignStatus(
      tenant_id,
      campaignId,
      dto,
      actor_id,
    );
    await this.auditService.log({
      tenant_id,
      user_id: actor_id,
      module: "marketing",
      action: "UPDATE_STATUS",
      entity_type: "CAMPAIGN",
      entity_id: campaignId,
      metadata: { status: dto.status },
    });
    return campaign;
  }

  async getExecutions(tenant_id: string) {
    return this.repository.getExecutions(tenant_id);
  }

  async scheduleExecution(
    tenant_id: string,
    dto: ScheduleExecutionDto,
    actor_id: string,
  ) {
    const execution = await this.repository.scheduleExecution(
      tenant_id,
      dto,
      actor_id,
    );
    await this.auditService.log({
      tenant_id,
      user_id: actor_id,
      module: "marketing",
      action: "SCHEDULE",
      entity_type: "EXECUTION",
      entity_id: execution.id,
      metadata: { campaignId: dto.campaignId, scheduledAt: dto.scheduledAt },
    });
    return execution;
  }

  async runExecution(
    tenant_id: string,
    executionId: string,
    dto: RunExecutionDto,
    actor_id: string,
  ) {
    const execution = await this.repository.runExecution(
      tenant_id,
      executionId,
      dto,
      actor_id,
    );
    await this.auditService.log({
      tenant_id,
      user_id: actor_id,
      module: "marketing",
      action: "RUN",
      entity_type: "EXECUTION",
      entity_id: executionId,
      metadata: { failed: dto.failed },
    });
    return execution;
  }

  async getLeads(tenant_id: string) {
    return this.repository.getLeads(tenant_id);
  }

  async captureLead(tenant_id: string, dto: CaptureLeadDto, actor_id: string) {
    const lead = await this.repository.captureLead(tenant_id, dto, actor_id);
    await this.auditService.log({
      tenant_id,
      user_id: actor_id,
      module: "marketing",
      action: "CAPTURE",
      entity_type: "LEAD",
      entity_id: lead.id,
      metadata: { source: dto.source, email: dto.email },
    });
    return lead;
  }

  async markLeadHandoffReady(
    tenant_id: string,
    lead_id: string,
    actor_id: string,
  ) {
    const lead = await this.repository.markLeadHandoffReady(
      tenant_id,
      lead_id,
      actor_id,
    );
    await this.auditService.log({
      tenant_id,
      user_id: actor_id,
      module: "marketing",
      action: "HANDOFF_READY",
      entity_type: "LEAD",
      entity_id: lead_id,
    });
    return lead;
  }

  async handoffLeadToSales(tenant_id: string, lead_id: string, actor_id: string) {
    const lead = await this.repository.handoffLeadToSales(
      tenant_id,
      lead_id,
      actor_id,
    );
    await this.auditService.log({
      tenant_id,
      user_id: actor_id,
      module: "marketing",
      action: "HANDOFF_TO_SALES",
      entity_type: "LEAD",
      entity_id: lead_id,
    });
    return lead;
  }

  async getWorkflows(tenant_id: string) {
    return this.repository.getWorkflows(tenant_id);
  }

  async createWorkflow(
    tenant_id: string,
    dto: CreateWorkflowDto,
    actor_id: string,
  ) {
    const workflow = await this.repository.createWorkflow(
      tenant_id,
      dto,
      actor_id,
    );
    await this.auditService.log({
      tenant_id,
      user_id: actor_id,
      module: "marketing",
      action: "CREATE",
      entity_type: "WORKFLOW",
      entity_id: workflow.id,
      metadata: { name: dto.name, trigger: dto.trigger },
    });
    return workflow;
  }

  async updateWorkflowStatus(
    tenant_id: string,
    workflowId: string,
    dto: UpdateWorkflowStatusDto,
    actor_id: string,
  ) {
    const workflow = await this.repository.updateWorkflowStatus(
      tenant_id,
      workflowId,
      dto,
      actor_id,
    );
    await this.auditService.log({
      tenant_id,
      user_id: actor_id,
      module: "marketing",
      action: "UPDATE_STATUS",
      entity_type: "WORKFLOW",
      entity_id: workflowId,
      metadata: { status: dto.status },
    });
    return workflow;
  }

  async getConnectedAccounts(tenant_id: string) {
    return this.repository.getConnectedAccounts(tenant_id);
  }

  async connectAccount(
    tenant_id: string,
    dto: ConnectAccountDto,
    actor_id: string,
  ) {
    const account = await this.repository.connectAccount(
      tenant_id,
      dto,
      actor_id,
    );
    await this.auditService.log({
      tenant_id,
      user_id: actor_id,
      module: "marketing",
      action: "CONNECT",
      entity_type: "ACCOUNT",
      entity_id: account.id,
      metadata: { provider: dto.provider, account_name: dto.account_name },
    });
    return account;
  }

  async updateAccountStatus(
    tenant_id: string,
    accountId: string,
    dto: UpdateAccountStatusDto,
    actor_id: string,
  ) {
    const account = await this.repository.updateAccountStatus(
      tenant_id,
      accountId,
      dto,
      actor_id,
    );
    await this.auditService.log({
      tenant_id,
      user_id: actor_id,
      module: "marketing",
      action: "UPDATE_STATUS",
      entity_type: "ACCOUNT",
      entity_id: accountId,
      metadata: { status: dto.status },
    });
    return account;
  }

  async getAttribution(tenant_id: string) {
    return this.repository.getAttribution(tenant_id);
  }

  async getAlerts(tenant_id: string) {
    return this.repository.getAlerts(tenant_id);
  }

  async acknowledgeAlert(tenant_id: string, alertId: string) {
    return this.repository.acknowledgeAlert(tenant_id, alertId);
  }

  async runHealthSweep(tenant_id: string, actor_id: string) {
    const findings = await this.repository.runHealthSweep(tenant_id, actor_id);
    await this.auditService.log({
      tenant_id,
      user_id: actor_id,
      module: "marketing",
      action: "RUN_HEALTH_SWEEP",
      entity_type: "SYSTEM",
      entity_id: "marketing-health",
      metadata: { findingsCount: findings.length },
    });
    return findings;
  }

  async getAuditEvents(tenant_id: string) {
    return this.repository.getAuditEvents(tenant_id);
  }
}
