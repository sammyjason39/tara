import type {
  AttributionRecord,
  CampaignExecutionRun,
  ConnectedAccount,
  MarketingAlert,
  MarketingAuditEvent,
  MarketingCampaign,
  MarketingLead,
  NurtureWorkflow,
} from "@/core/types/marketing/marketing";

export interface MarketingRepository {
  listCampaigns: (tenantId: string) => MarketingCampaign[];
  createCampaign: (tenantId: string, payload: MarketingCampaign) => MarketingCampaign;
  updateCampaign: (
    tenantId: string,
    id: string,
    patch: Partial<MarketingCampaign>,
  ) => MarketingCampaign | null;

  listExecutions: (tenantId: string) => CampaignExecutionRun[];
  createExecution: (
    tenantId: string,
    payload: CampaignExecutionRun,
  ) => CampaignExecutionRun;
  updateExecution: (
    tenantId: string,
    id: string,
    patch: Partial<CampaignExecutionRun>,
  ) => CampaignExecutionRun | null;

  listLeads: (tenantId: string) => MarketingLead[];
  createLead: (tenantId: string, payload: MarketingLead) => MarketingLead;
  updateLead: (
    tenantId: string,
    id: string,
    patch: Partial<MarketingLead>,
  ) => MarketingLead | null;

  listWorkflows: (tenantId: string) => NurtureWorkflow[];
  createWorkflow: (tenantId: string, payload: NurtureWorkflow) => NurtureWorkflow;
  updateWorkflow: (
    tenantId: string,
    id: string,
    patch: Partial<NurtureWorkflow>,
  ) => NurtureWorkflow | null;

  listConnectedAccounts: (tenantId: string) => ConnectedAccount[];
  createConnectedAccount: (
    tenantId: string,
    payload: ConnectedAccount,
  ) => ConnectedAccount;
  updateConnectedAccount: (
    tenantId: string,
    id: string,
    patch: Partial<ConnectedAccount>,
  ) => ConnectedAccount | null;

  listAttribution: (tenantId: string) => AttributionRecord[];
  createAttribution: (
    tenantId: string,
    payload: AttributionRecord,
  ) => AttributionRecord;

  listAlerts: (tenantId: string) => MarketingAlert[];
  createAlert: (tenantId: string, payload: MarketingAlert) => MarketingAlert;
  updateAlert: (
    tenantId: string,
    id: string,
    patch: Partial<MarketingAlert>,
  ) => MarketingAlert | null;

  listAuditEvents: (tenantId: string) => MarketingAuditEvent[];
  createAuditEvent: (
    tenantId: string,
    payload: MarketingAuditEvent,
  ) => MarketingAuditEvent;
}
