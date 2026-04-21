import { apiRequest } from "@/core/api/apiClient";
import type { SessionContext } from "@/core/security/session";
import type {
  AttributionRecord,
  CampaignExecutionRun,
  ConnectedAccount,
  ConnectedProvider,
  ConnectionStatus,
  MarketingAlert,
  MarketingAuditEvent,
  MarketingCampaign,
  MarketingDashboardMetrics,
  MarketingLead,
  NurtureWorkflow,
} from "@/core/types/marketing/marketing";

export const marketingService = {
  listCampaigns: async (tenantId: string, session: SessionContext) => 
    apiRequest<MarketingCampaign[]>("/v1/marketing/campaigns", "GET", session),
  
  listExecutions: async (tenantId: string, session: SessionContext) => 
    apiRequest<CampaignExecutionRun[]>("/v1/marketing/executions", "GET", session),
  
  listLeads: async (tenantId: string, session: SessionContext) => 
    apiRequest<MarketingLead[]>("/v1/marketing/leads", "GET", session),
  
  listWorkflows: async (tenantId: string, session: SessionContext) => 
    apiRequest<NurtureWorkflow[]>("/v1/marketing/workflows", "GET", session),
  
  listConnectedAccounts: async (tenantId: string, session: SessionContext) => 
    apiRequest<ConnectedAccount[]>("/v1/marketing/accounts", "GET", session),
  
  listAttribution: async (tenantId: string, session: SessionContext) => 
    apiRequest<AttributionRecord[]>("/v1/marketing/attribution", "GET", session),
  
  listAlerts: async (tenantId: string, session: SessionContext) => 
    apiRequest<MarketingAlert[]>("/v1/marketing/alerts", "GET", session),
  
  listAuditEvents: async (tenantId: string, session: SessionContext) => 
    apiRequest<MarketingAuditEvent[]>("/v1/marketing/audit-events", "GET", session),

  async getDashboard(tenantId: string, session: SessionContext): Promise<MarketingDashboardMetrics> {
    return apiRequest<MarketingDashboardMetrics>("/v1/marketing/dashboard", "GET", session);
  },

  async getChannelPerformance(tenantId: string, session: SessionContext) {
    return apiRequest<any[]>("/v1/marketing/channel-performance", "GET", session);
  },

  async createCampaign(
    tenantId: string,
    session: SessionContext,
    payload: {
      name: string;
      objective: MarketingCampaign["objective"];
      channelMix: MarketingCampaign["channelMix"];
      budget: number;
      currency?: "IDR" | "USD";
      startDate: string;
      endDate: string;
      audience: string;
    },
  ): Promise<MarketingCampaign> {
    return apiRequest<MarketingCampaign>("/v1/marketing/campaigns", "POST", session, payload);
  },

  async updateCampaignStatus(
    tenantId: string,
    session: SessionContext,
    campaignId: string,
    status: MarketingCampaign["status"],
  ) {
    return apiRequest<MarketingCampaign>(`/marketing/campaigns/${campaignId}/status`, "PUT", session, { status });
  },

  async scheduleExecution(
    tenantId: string,
    session: SessionContext,
    payload: {
      campaignId: string;
      channel: CampaignExecutionRun["channel"];
      scheduledAt: string;
      notes?: string;
    },
  ): Promise<CampaignExecutionRun> {
    return apiRequest<CampaignExecutionRun>("/v1/marketing/executions", "POST", session, payload);
  },

  async runExecution(
    tenantId: string,
    session: SessionContext,
    executionId: string,
    payload?: { leadsGenerated?: number; spend?: number; failed?: boolean },
  ) {
    return apiRequest<CampaignExecutionRun>(`/marketing/executions/${executionId}/run`, "PUT", session, payload);
  },

  async captureLead(
    tenantId: string,
    session: SessionContext,
    payload: {
      source: MarketingLead["source"];
      companyName: string;
      contactName: string;
      email?: string;
      phone?: string;
      campaignId?: string;
      country?: string;
      industry?: string;
      employeeBand?: string;
    },
  ): Promise<MarketingLead> {
    return apiRequest<MarketingLead>("/v1/leads", "POST", session, payload);
  },

  async markLeadHandoffReady(
    tenantId: string,
    session: SessionContext,
    leadId: string,
  ): Promise<MarketingLead> {
    return apiRequest<MarketingLead>(`/marketing/leads/${leadId}/handoff-ready`, "PUT", session);
  },

  async handoffLeadToSales(
    tenantId: string,
    session: SessionContext,
    leadId: string,
  ): Promise<MarketingLead> {
    return apiRequest<MarketingLead>(`/marketing/leads/${leadId}/handoff-sales`, "PUT", session);
  },

  async createWorkflow(
    tenantId: string,
    session: SessionContext,
    payload: Pick<NurtureWorkflow, "name" | "trigger" | "steps">,
  ): Promise<NurtureWorkflow> {
    return apiRequest<NurtureWorkflow>("/v1/marketing/workflows", "POST", session, payload);
  },

  async updateWorkflowStatus(
    tenantId: string,
    session: SessionContext,
    workflowId: string,
    status: NurtureWorkflow["status"],
  ) {
    return apiRequest<NurtureWorkflow>(`/marketing/workflows/${workflowId}/status`, "PUT", session, { status });
  },

  async connectAccount(
    tenantId: string,
    session: SessionContext,
    payload: { provider: ConnectedProvider; accountName: string; scopes: string[] },
  ): Promise<ConnectedAccount> {
    return apiRequest<ConnectedAccount>("/v1/marketing/accounts", "POST", session, payload);
  },

  async updateAccountStatus(
    tenantId: string,
    session: SessionContext,
    accountId: string,
    status: ConnectionStatus,
  ) {
    return apiRequest<ConnectedAccount>(`/marketing/accounts/${accountId}/status`, "PUT", session, { status });
  },

  async acknowledgeAlert(tenantId: string, session: SessionContext, alertId: string) {
    return apiRequest<MarketingAlert>(`/marketing/alerts/${alertId}/ack`, "PUT", session);
  },

  async runHealthSweep(tenantId: string, session: SessionContext) {
    return apiRequest<MarketingAlert[]>("/v1/marketing/health-sweep", "POST", session);
  },
};

