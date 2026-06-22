import { TenantScope } from "../../../shared/scope/tenant-scope";
import { CaptureLeadDto } from "../dto/capture-lead.dto";
import { ConnectAccountDto } from "../dto/connect-account.dto";
import { CreateCampaignDto } from "../dto/create-campaign.dto";
import { CreateWorkflowDto } from "../dto/create-workflow.dto";
import { RunExecutionDto } from "../dto/run-execution.dto";
import { ScheduleExecutionDto } from "../dto/schedule-execution.dto";
import { UpdateAccountStatusDto } from "../dto/update-account-status.dto";
import { UpdateAccountSettingsDto } from "../dto/update-account-settings.dto";
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
  abstract getDashboard( ctx: TenantScope): Promise<MarketingDashboard>;
  abstract getChannelPerformance( ctx: TenantScope,
  ): Promise<MarketingChannelPerformance[]>;

  abstract getCampaigns( ctx: TenantScope): Promise<MarketingCampaign[]>;
  abstract createCampaign( ctx: TenantScope,
    dto: CreateCampaignDto,
    actor_id: string,
  ): Promise<MarketingCampaign>;
  abstract updateCampaignStatus( ctx: TenantScope,
    campaignId: string,
    dto: UpdateCampaignStatusDto,
    actor_id?: string,
    tx?: any,
  ): Promise<MarketingCampaign>;

  abstract getExecutions( ctx: TenantScope): Promise<MarketingExecution[]>;
  abstract scheduleExecution( ctx: TenantScope,
    dto: ScheduleExecutionDto,
    actor_id: string,
  ): Promise<MarketingExecution>;
  abstract runExecution( ctx: TenantScope,
    executionId: string,
    dto: RunExecutionDto,
    actor_id: string,
  ): Promise<MarketingExecution>;

  abstract getLeads( ctx: TenantScope): Promise<MarketingLead[]>;
  abstract captureLead( ctx: TenantScope,
    dto: CaptureLeadDto,
    actor_id: string,
  ): Promise<MarketingLead>;
  abstract markLeadHandoffReady( ctx: TenantScope,
    lead_id: string,
    actor_id?: string,
    tx?: any,
  ): Promise<MarketingLead>;
  abstract handoffLeadToSales( ctx: TenantScope,
    lead_id: string,
    actor_id?: string,
    tx?: any,
  ): Promise<MarketingLead>;

  abstract getWorkflows( ctx: TenantScope): Promise<MarketingWorkflow[]>;
  abstract createWorkflow( ctx: TenantScope,
    dto: CreateWorkflowDto,
    actor_id: string,
  ): Promise<MarketingWorkflow>;
  abstract updateWorkflowStatus( ctx: TenantScope,
    workflowId: string,
    dto: UpdateWorkflowStatusDto,
    actor_id?: string,
    tx?: any,
  ): Promise<MarketingWorkflow>;

  abstract getConnectedAccounts( ctx: TenantScope,
  ): Promise<MarketingConnectedAccount[]>;
  abstract connectAccount( ctx: TenantScope,
    dto: ConnectAccountDto,
    actor_id: string,
  ): Promise<MarketingConnectedAccount>;
  abstract updateAccountStatus( ctx: TenantScope,
    accountId: string,
    dto: UpdateAccountStatusDto,
    actor_id?: string,
    tx?: any,
  ): Promise<MarketingConnectedAccount>;
  abstract updateAccountSettings( ctx: TenantScope,
    accountId: string,
    dto: UpdateAccountSettingsDto,
    actor_id: string,
  ): Promise<MarketingConnectedAccount>;
  abstract deleteAccount( ctx: TenantScope,
    accountId: string,
  ): Promise<boolean>;

  abstract getAttribution( ctx: TenantScope): Promise<MarketingAttribution[]>;
  abstract getAlerts( ctx: TenantScope): Promise<MarketingAlert[]>;
  abstract acknowledgeAlert( ctx: TenantScope,
    alertId: string,
  ): Promise<MarketingAlert>;
  abstract runHealthSweep( ctx: TenantScope,
    actor_id: string,
  ): Promise<MarketingAlert[]>;

  abstract getAuditEvents( ctx: TenantScope): Promise<MarketingAuditEvent[]>;

  // --- Growth Engine Extensions ---
  
  abstract getContacts(ctx: TenantScope): Promise<MarketingContact[]>;
  abstract getContactById(ctx: TenantScope, id: string): Promise<MarketingContact>;
  abstract createContact(ctx: TenantScope, data: Partial<MarketingContact>): Promise<MarketingContact>;
  
  abstract getFunnels(ctx: TenantScope): Promise<MarketingFunnel[]>;
  abstract createFunnel(ctx: TenantScope, data: Partial<MarketingFunnel>): Promise<MarketingFunnel>;
  abstract updateFunnel(ctx: TenantScope, id: string, data: Partial<MarketingFunnel>): Promise<MarketingFunnel>;
  
  abstract getAppointments(ctx: TenantScope): Promise<MarketingAppointment[]>;
  abstract createAppointment(ctx: TenantScope, data: Partial<MarketingAppointment>): Promise<MarketingAppointment>;
  
  abstract getAutomationRules(ctx: TenantScope): Promise<MarketingAutomationRule[]>;
  abstract createAutomationRule(ctx: TenantScope, data: Partial<MarketingAutomationRule>): Promise<MarketingAutomationRule>;
  
  abstract getMessages(ctx: TenantScope, contactId?: string): Promise<MarketingOmnichannelMessage[]>;
  abstract sendMessage(ctx: TenantScope, data: Partial<MarketingOmnichannelMessage>): Promise<MarketingOmnichannelMessage>;
  
  abstract getCreativeAssets(ctx: TenantScope): Promise<MarketingCreativeAsset[]>;
  abstract createCreativeAsset(ctx: TenantScope, data: Partial<MarketingCreativeAsset>, tx?: any): Promise<MarketingCreativeAsset>;
  abstract updateCreativeAsset(ctx: TenantScope, id: string, data: Partial<MarketingCreativeAsset>): Promise<MarketingCreativeAsset>;
  
  abstract calculateAdvancedAttribution(ctx: TenantScope, model: "FIRST_CLICK" | "LINEAR" | "LAST_CLICK"): Promise<any>;
}
