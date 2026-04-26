import { TenantContext } from "../../../gateway/tenant-context.interface";
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
import { MarketingContact } from "../entities/marketing-contact.entity";
import { MarketingFunnel } from "../entities/marketing-funnel.entity";
import { MarketingAppointment } from "../entities/marketing-appointment.entity";
import { MarketingAutomationRule } from "../entities/marketing-automation.entity";
import { MarketingCreativeAsset } from "../entities/marketing-creative-asset.entity";
import { MarketingOmnichannelMessage } from "../entities/marketing-message.entity";

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
  abstract getDashboard( ctx: TenantContext): Promise<MarketingDashboard>;
  abstract getChannelPerformance( ctx: TenantContext,
  ): Promise<MarketingChannelPerformance[]>;

  abstract getCampaigns( ctx: TenantContext): Promise<MarketingCampaign[]>;
  abstract createCampaign( ctx: TenantContext,
    dto: CreateCampaignDto,
    actor_id: string,
  ): Promise<MarketingCampaign>;
  abstract updateCampaignStatus( ctx: TenantContext,
    campaignId: string,
    dto: UpdateCampaignStatusDto,
    actor_id: string,
  ): Promise<MarketingCampaign>;

  abstract getExecutions( ctx: TenantContext): Promise<MarketingExecution[]>;
  abstract scheduleExecution( ctx: TenantContext,
    dto: ScheduleExecutionDto,
    actor_id: string,
  ): Promise<MarketingExecution>;
  abstract runExecution( ctx: TenantContext,
    executionId: string,
    dto: RunExecutionDto,
    actor_id: string,
  ): Promise<MarketingExecution>;

  abstract getLeads( ctx: TenantContext): Promise<MarketingLead[]>;
  abstract captureLead( ctx: TenantContext,
    dto: CaptureLeadDto,
    actor_id: string,
  ): Promise<MarketingLead>;
  abstract markLeadHandoffReady( ctx: TenantContext,
    lead_id: string,
    actor_id: string,
  ): Promise<MarketingLead>;
  abstract handoffLeadToSales( ctx: TenantContext,
    lead_id: string,
    actor_id: string,
  ): Promise<MarketingLead>;

  abstract getWorkflows( ctx: TenantContext): Promise<MarketingWorkflow[]>;
  abstract createWorkflow( ctx: TenantContext,
    dto: CreateWorkflowDto,
    actor_id: string,
  ): Promise<MarketingWorkflow>;
  abstract updateWorkflowStatus( ctx: TenantContext,
    workflowId: string,
    dto: UpdateWorkflowStatusDto,
    actor_id: string,
  ): Promise<MarketingWorkflow>;

  abstract getConnectedAccounts( ctx: TenantContext,
  ): Promise<MarketingConnectedAccount[]>;
  abstract connectAccount( ctx: TenantContext,
    dto: ConnectAccountDto,
    actor_id: string,
  ): Promise<MarketingConnectedAccount>;
  abstract updateAccountStatus( ctx: TenantContext,
    accountId: string,
    dto: UpdateAccountStatusDto,
    actor_id: string,
  ): Promise<MarketingConnectedAccount>;

  abstract getAttribution( ctx: TenantContext): Promise<MarketingAttribution[]>;
  abstract getAlerts( ctx: TenantContext): Promise<MarketingAlert[]>;
  abstract acknowledgeAlert( ctx: TenantContext,
    alertId: string,
  ): Promise<MarketingAlert>;
  abstract runHealthSweep( ctx: TenantContext,
    actor_id: string,
  ): Promise<MarketingAlert[]>;

  abstract getAuditEvents( ctx: TenantContext): Promise<MarketingAuditEvent[]>;

  // --- Growth Engine Extensions ---
  
  abstract getContacts(ctx: TenantContext): Promise<MarketingContact[]>;
  abstract getContactById(ctx: TenantContext, id: string): Promise<MarketingContact>;
  abstract createContact(ctx: TenantContext, data: Partial<MarketingContact>): Promise<MarketingContact>;
  
  abstract getFunnels(ctx: TenantContext): Promise<MarketingFunnel[]>;
  abstract createFunnel(ctx: TenantContext, data: Partial<MarketingFunnel>): Promise<MarketingFunnel>;
  
  abstract getAppointments(ctx: TenantContext): Promise<MarketingAppointment[]>;
  abstract createAppointment(ctx: TenantContext, data: Partial<MarketingAppointment>): Promise<MarketingAppointment>;
  
  abstract getAutomationRules(ctx: TenantContext): Promise<MarketingAutomationRule[]>;
  abstract createAutomationRule(ctx: TenantContext, data: Partial<MarketingAutomationRule>): Promise<MarketingAutomationRule>;
  
  abstract getMessages(ctx: TenantContext, contactId?: string): Promise<MarketingOmnichannelMessage[]>;
  abstract sendMessage(ctx: TenantContext, data: Partial<MarketingOmnichannelMessage>): Promise<MarketingOmnichannelMessage>;
  
  abstract getCreativeAssets(ctx: TenantContext): Promise<MarketingCreativeAsset[]>;
  abstract createCreativeAsset(ctx: TenantContext, data: Partial<MarketingCreativeAsset>): Promise<MarketingCreativeAsset>;
  
  abstract calculateAdvancedAttribution(ctx: TenantContext, model: "FIRST_CLICK" | "LINEAR" | "LAST_CLICK"): Promise<any>;
}
