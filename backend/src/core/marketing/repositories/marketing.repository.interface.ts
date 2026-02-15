import { CaptureLeadDto } from '../dto/capture-lead.dto';
import { ConnectAccountDto } from '../dto/connect-account.dto';
import { CreateCampaignDto } from '../dto/create-campaign.dto';
import { CreateWorkflowDto } from '../dto/create-workflow.dto';
import { RunExecutionDto } from '../dto/run-execution.dto';
import { ScheduleExecutionDto } from '../dto/schedule-execution.dto';
import { UpdateAccountStatusDto } from '../dto/update-account-status.dto';
import { UpdateCampaignStatusDto } from '../dto/update-campaign-status.dto';
import { UpdateWorkflowStatusDto } from '../dto/update-workflow-status.dto';
import { MarketingConnectedAccount } from '../entities/marketing-account.entity';
import { MarketingAlert } from '../entities/marketing-alert.entity';
import { MarketingAttribution } from '../entities/marketing-attribution.entity';
import { MarketingAuditEvent } from '../entities/marketing-audit.entity';
import { MarketingCampaign } from '../entities/marketing-campaign.entity';
import { MarketingExecution } from '../entities/marketing-execution.entity';
import { MarketingLead } from '../entities/marketing-lead.entity';
import { MarketingWorkflow } from '../entities/marketing-workflow.entity';

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
  channel: MarketingExecution['channel'];
  leads: number;
  spend: number;
  cpl: number;
};

export abstract class IMarketingRepository {
  abstract getDashboard(tenantId: string): Promise<MarketingDashboard>;
  abstract getChannelPerformance(tenantId: string): Promise<MarketingChannelPerformance[]>;

  abstract getCampaigns(tenantId: string): Promise<MarketingCampaign[]>;
  abstract createCampaign(
    tenantId: string,
    dto: CreateCampaignDto,
    actorId: string,
  ): Promise<MarketingCampaign>;
  abstract updateCampaignStatus(
    tenantId: string,
    campaignId: string,
    dto: UpdateCampaignStatusDto,
    actorId: string,
  ): Promise<MarketingCampaign>;

  abstract getExecutions(tenantId: string): Promise<MarketingExecution[]>;
  abstract scheduleExecution(
    tenantId: string,
    dto: ScheduleExecutionDto,
    actorId: string,
  ): Promise<MarketingExecution>;
  abstract runExecution(
    tenantId: string,
    executionId: string,
    dto: RunExecutionDto,
    actorId: string,
  ): Promise<MarketingExecution>;

  abstract getLeads(tenantId: string): Promise<MarketingLead[]>;
  abstract captureLead(
    tenantId: string,
    dto: CaptureLeadDto,
    actorId: string,
  ): Promise<MarketingLead>;
  abstract markLeadHandoffReady(
    tenantId: string,
    leadId: string,
    actorId: string,
  ): Promise<MarketingLead>;
  abstract handoffLeadToSales(
    tenantId: string,
    leadId: string,
    actorId: string,
  ): Promise<MarketingLead>;

  abstract getWorkflows(tenantId: string): Promise<MarketingWorkflow[]>;
  abstract createWorkflow(
    tenantId: string,
    dto: CreateWorkflowDto,
    actorId: string,
  ): Promise<MarketingWorkflow>;
  abstract updateWorkflowStatus(
    tenantId: string,
    workflowId: string,
    dto: UpdateWorkflowStatusDto,
    actorId: string,
  ): Promise<MarketingWorkflow>;

  abstract getConnectedAccounts(tenantId: string): Promise<MarketingConnectedAccount[]>;
  abstract connectAccount(
    tenantId: string,
    dto: ConnectAccountDto,
    actorId: string,
  ): Promise<MarketingConnectedAccount>;
  abstract updateAccountStatus(
    tenantId: string,
    accountId: string,
    dto: UpdateAccountStatusDto,
    actorId: string,
  ): Promise<MarketingConnectedAccount>;

  abstract getAttribution(tenantId: string): Promise<MarketingAttribution[]>;
  abstract getAlerts(tenantId: string): Promise<MarketingAlert[]>;
  abstract acknowledgeAlert(tenantId: string, alertId: string): Promise<MarketingAlert>;
  abstract runHealthSweep(tenantId: string, actorId: string): Promise<MarketingAlert[]>;

  abstract getAuditEvents(tenantId: string): Promise<MarketingAuditEvent[]>;
}

