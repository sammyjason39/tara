export type MarketingChannel =
  | "META_ADS"
  | "GOOGLE_ADS"
  | "EMAIL"
  | "WHATSAPP"
  | "WEBINAR"
  | "LANDING_PAGE"
  | "EVENT";

export type CampaignStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "ACTIVE"
  | "PAUSED"
  | "COMPLETED"
  | "FAILED";

export type CampaignObjective =
  | "LEAD_GENERATION"
  | "AWARENESS"
  | "NURTURE"
  | "REMARKETING";

export type CaptureSource =
  | "LANDING_PAGE"
  | "EMBEDDED_FORM"
  | "CHATBOT"
  | "WEBINAR"
  | "META_LEAD_ADS"
  | "GOOGLE_ADS"
  | "PARTNER_API";

export type IntentLevel = "LOW" | "MEDIUM" | "HIGH";

export type LeadLifecycleStatus =
  | "CAPTURED"
  | "ENRICHED"
  | "SCORED"
  | "QUALIFIED"
  | "HANDOFF_READY"
  | "HANDOFF_SENT";

export type ConnectedProvider = "META" | "GOOGLE";
export type ConnectionStatus = "CONNECTED" | "EXPIRED" | "DISCONNECTED";

export type NurtureWorkflowStatus = "DRAFT" | "ACTIVE" | "PAUSED";

export type MarketingAlertType =
  | "LEAD_SPIKE"
  | "CAMPAIGN_FAILURE"
  | "TOKEN_EXPIRY"
  | "HANDOFF_DELAY";

export type MarketingAlertSeverity = "LOW" | "MEDIUM" | "HIGH";

export type MarketingCampaign = {
  id: string;
  tenantId: string;
  name: string;
  objective: CampaignObjective;
  channelMix: MarketingChannel[];
  ownerId: string;
  ownerName: string;
  budget: number;
  currency: "IDR" | "USD";
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  audience: string;
  aiRecommendation?: string;
  createdAt: string;
  updatedAt: string;
};

export type CampaignExecutionRun = {
  id: string;
  tenantId: string;
  campaignId: string;
  channel: MarketingChannel;
  scheduledAt: string;
  status: "SCHEDULED" | "RUNNING" | "COMPLETED" | "FAILED";
  leadsGenerated: number;
  spend: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type MarketingLead = {
  id: string;
  tenantId: string;
  campaignId?: string;
  source: CaptureSource;
  companyName: string;
  contactName: string;
  email?: string;
  phone?: string;
  country?: string;
  industry?: string;
  employeeBand?: string;
  dedupKey: string;
  score: number;
  intent: IntentLevel;
  status: LeadLifecycleStatus;
  qualificationReason: string;
  salesHandoffId?: string;
  createdAt: string;
  updatedAt: string;
};

export type NurtureWorkflow = {
  id: string;
  tenantId: string;
  name: string;
  status: NurtureWorkflowStatus;
  trigger: "NEW_LEAD" | "SCORE_BELOW_THRESHOLD" | "REENGAGEMENT";
  steps: Array<{
    id: string;
    order: number;
    channel: "EMAIL" | "WHATSAPP" | "RETARGETING";
    waitHours: number;
    messageTemplate: string;
  }>;
  aiSuggestion?: string;
  createdAt: string;
  updatedAt: string;
};

export type ConnectedAccount = {
  id: string;
  tenantId: string;
  provider: ConnectedProvider;
  accountName: string;
  status: ConnectionStatus;
  tokenExpiresAt: string;
  scopes: string[];
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type AttributionRecord = {
  id: string;
  tenantId: string;
  campaignId: string;
  leadId: string;
  opportunityId?: string;
  salesOrderId?: string;
  revenueAttributed: number;
  spend: number;
  roiPercent: number;
  createdAt: string;
};

export type MarketingAlert = {
  id: string;
  tenantId: string;
  type: MarketingAlertType;
  severity: MarketingAlertSeverity;
  entityType: "CAMPAIGN" | "LEAD" | "ACCOUNT" | "WORKFLOW";
  entityId: string;
  message: string;
  acknowledged: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MarketingAuditEvent = {
  id: string;
  tenantId: string;
  actorId: string;
  action: string;
  entityType:
    | "CAMPAIGN"
    | "LEAD"
    | "WORKFLOW"
    | "ACCOUNT"
    | "ATTRIBUTION"
    | "EXECUTION"
    | "ALERT";
  entityId: string;
  detail: string;
  createdAt: string;
};

export type MarketingFunnel = {
  id: string;
  tenantId: string;
  name: string;
  status: "active" | "draft";
  steps: Array<{
    id: string;
    name: string;
    type: "landing" | "checkout" | "upsell" | "thankyou";
    conversionRate: number;
    order: number;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type MarketingDashboardMetrics = {
  activeCampaigns: number;
  leadsToday: number;
  qualifiedLeads: number;
  handoffReady: number;
  spendToDate: number;
  attributedRevenue: number;
  blendedRoiPercent: number;
  connectedAccountsHealthy: number;
  moduleContributions?: {
    retail?: {
      walkInCustomers: number;
      loyaltyActive: number;
    };
  };
};

export type ChannelPerformance = {
  channel: string;
  leads: number;
  spend: number;
  cpl: number;
};
