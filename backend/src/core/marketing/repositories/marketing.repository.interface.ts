import { CaptureLeadDto } from "../dto/capture-lead.dto";
import { ConnectAccountDto } from "../dto/connect-account.dto";
import { CreateCampaignDto } from "../dto/create-campaign.dto";
import { CreateWorkflowDto } from "../dto/create-workflow.dto";
import { RunExecutionDto } from "../dto/run-execution.dto";
import { ScheduleExecutionDto } from "../dto/schedule-execution.dto";
import { UpdateAccountStatusDto } from "../dto/update-account-status.dto";
import { UpdateCampaignStatusDto } from "../dto/update-campaign-status.dto";
import { UpdateWorkflowStatusDto } from "../dto/update-workflow-status.dto";
import { MarketingConnectedAccount } from "../entities/marketing-account.entity";
import { MarketingAlert } from "../entities/marketing-alert.entity";
import { MarketingAttribution } from "../entities/marketing-attribution.entity";
import { MarketingAuditEvent } from "../entities/marketing-audit.entity";
import { MarketingCampaign } from "../entities/marketing-campaign.entity";
import { MarketingExecution } from "../entities/marketing-execution.entity";
import { MarketingLead } from "../entities/marketing-lead.entity";
import { MarketingWorkflow } from "../entities/marketing-workflow.entity";

export type MarketingDashboard = {
  activeCampaigns: number;
  leadsToday: number;
  qualifiedLeads: number;
  handoffReady: number;
  spendToDate: number;
  attributedRevenue: number;
  blendedRoiPercent: number;
  connectedAccountsHealthy: number;
};

export type MarketingChannelPerformance = {
  channel: MarketingExecution["channel"];
  leads: number;
  spend: number;
  cpl: number;
};

export abstract class IMarketingRepository {
  abstract getDashboard(tenant_id: string): Promise<MarketingDashboard>;
  abstract getChannelPerformance(
    tenant_id: string,
  ): Promise<MarketingChannelPerformance[]>;

  abstract getCampaigns(tenant_id: string): Promise<MarketingCampaign[]>;
  abstract createCampaign(
    tenant_id: string,
    dto: CreateCampaignDto,
    actor_id: string,
  ): Promise<MarketingCampaign>;
  abstract updateCampaignStatus(
    tenant_id: string,
    campaignId: string,
    dto: UpdateCampaignStatusDto,
    actor_id: string,
  ): Promise<MarketingCampaign>;

  abstract getExecutions(tenant_id: string): Promise<MarketingExecution[]>;
  abstract scheduleExecution(
    tenant_id: string,
    dto: ScheduleExecutionDto,
    actor_id: string,
  ): Promise<MarketingExecution>;
  abstract runExecution(
    tenant_id: string,
    executionId: string,
    dto: RunExecutionDto,
    actor_id: string,
  ): Promise<MarketingExecution>;

  abstract getLeads(tenant_id: string): Promise<MarketingLead[]>;
  abstract captureLead(
    tenant_id: string,
    dto: CaptureLeadDto,
    actor_id: string,
  ): Promise<MarketingLead>;
  abstract markLeadHandoffReady(
    tenant_id: string,
    lead_id: string,
    actor_id: string,
  ): Promise<MarketingLead>;
  abstract handoffLeadToSales(
    tenant_id: string,
    lead_id: string,
    actor_id: string,
  ): Promise<MarketingLead>;

  abstract getWorkflows(tenant_id: string): Promise<MarketingWorkflow[]>;
  abstract createWorkflow(
    tenant_id: string,
    dto: CreateWorkflowDto,
    actor_id: string,
  ): Promise<MarketingWorkflow>;
  abstract updateWorkflowStatus(
    tenant_id: string,
    workflowId: string,
    dto: UpdateWorkflowStatusDto,
    actor_id: string,
  ): Promise<MarketingWorkflow>;

  abstract getConnectedAccounts(
    tenant_id: string,
  ): Promise<MarketingConnectedAccount[]>;
  abstract connectAccount(
    tenant_id: string,
    dto: ConnectAccountDto,
    actor_id: string,
  ): Promise<MarketingConnectedAccount>;
  abstract updateAccountStatus(
    tenant_id: string,
    accountId: string,
    dto: UpdateAccountStatusDto,
    actor_id: string,
  ): Promise<MarketingConnectedAccount>;

  abstract getAttribution(tenant_id: string): Promise<MarketingAttribution[]>;
  abstract getAlerts(tenant_id: string): Promise<MarketingAlert[]>;
  abstract acknowledgeAlert(
    tenant_id: string,
    alertId: string,
  ): Promise<MarketingAlert>;
  abstract runHealthSweep(
    tenant_id: string,
    actor_id: string,
  ): Promise<MarketingAlert[]>;

  abstract getAuditEvents(tenant_id: string): Promise<MarketingAuditEvent[]>;
}
