import {
  ensureSeed,
  loadFromStorage,
  saveToStorage,
} from "@/core/repositories/hr/storage";
import type { MarketingRepository } from "@/core/repositories/marketing/marketingRepository";
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

const nowIso = () => new Date().toISOString();

const campaignsKey = (tenantId: string) => `mkt:${tenantId}:campaigns`;
const executionsKey = (tenantId: string) => `mkt:${tenantId}:executions`;
const leadsKey = (tenantId: string) => `mkt:${tenantId}:leads`;
const workflowsKey = (tenantId: string) => `mkt:${tenantId}:workflows`;
const accountsKey = (tenantId: string) => `mkt:${tenantId}:accounts`;
const attributionKey = (tenantId: string) => `mkt:${tenantId}:attribution`;
const alertsKey = (tenantId: string) => `mkt:${tenantId}:alerts`;
const auditKey = (tenantId: string) => `mkt:${tenantId}:audit`;

const seedCampaigns = (tenantId: string): MarketingCampaign[] => [
  {
    id: `${tenantId}-cmp-001`,
    tenantId,
    name: "Q2 Enterprise Expansion",
    objective: "LEAD_GENERATION",
    channelMix: ["META_ADS", "GOOGLE_ADS", "EMAIL"],
    ownerId: "mkt-jessie",
    ownerName: "Jessie Allan",
    budget: 120000,
    currency: "USD",
    status: "ACTIVE",
    startDate: "2026-04-01",
    endDate: "2026-06-30",
    audience: "Mid-market retail and manufacturing leaders",
    aiRecommendation: "Increase retargeting weight for high-intent website visitors.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    updatedAt: nowIso(),
  },
  {
    id: `${tenantId}-cmp-002`,
    tenantId,
    name: "Ops Summit Webinar",
    objective: "NURTURE",
    channelMix: ["WEBINAR", "EMAIL", "WHATSAPP"],
    ownerId: "mkt-ava",
    ownerName: "Ava Reynolds",
    budget: 45000,
    currency: "USD",
    status: "SCHEDULED",
    startDate: "2026-05-10",
    endDate: "2026-05-31",
    audience: "COO and finance transformation teams",
    aiRecommendation: "Use 2-touch reminder sequence to improve attendance.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 32).toISOString(),
    updatedAt: nowIso(),
  },
];

const seedExecutions = (tenantId: string): CampaignExecutionRun[] => [
  {
    id: `${tenantId}-exec-001`,
    tenantId,
    campaignId: `${tenantId}-cmp-001`,
    channel: "META_ADS",
    scheduledAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    status: "RUNNING",
    leadsGenerated: 84,
    spend: 18000,
    notes: "Creative set B currently outperforming by 23%.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    updatedAt: nowIso(),
  },
  {
    id: `${tenantId}-exec-002`,
    tenantId,
    campaignId: `${tenantId}-cmp-002`,
    channel: "EMAIL",
    scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString(),
    status: "SCHEDULED",
    leadsGenerated: 0,
    spend: 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

const seedLeads = (tenantId: string): MarketingLead[] => [
  {
    id: `${tenantId}-lead-001`,
    tenantId,
    campaignId: `${tenantId}-cmp-001`,
    source: "META_LEAD_ADS",
    companyName: "Orion Manufacturing",
    contactName: "Mia Chen",
    email: "mia.chen@orion.example",
    phone: "+1-202-555-0192",
    country: "US",
    industry: "Manufacturing",
    employeeBand: "201-500",
    dedupKey: "orion-manufacturing-mia.chen@orion.example",
    score: 86,
    intent: "HIGH",
    status: "HANDOFF_READY",
    qualificationReason: "High intent from pricing + demo request signal.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    updatedAt: nowIso(),
  },
  {
    id: `${tenantId}-lead-002`,
    tenantId,
    campaignId: `${tenantId}-cmp-001`,
    source: "LANDING_PAGE",
    companyName: "Northline Group",
    contactName: "Carlos Nguyen",
    email: "carlos@northline.example",
    country: "US",
    industry: "Retail",
    employeeBand: "51-200",
    dedupKey: "northline-group-carlos@northline.example",
    score: 72,
    intent: "MEDIUM",
    status: "SCORED",
    qualificationReason: "Strong campaign engagement, no buying window stated.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    updatedAt: nowIso(),
  },
];

const seedWorkflows = (tenantId: string): NurtureWorkflow[] => [
  {
    id: `${tenantId}-wf-001`,
    tenantId,
    name: "High intent follow-up",
    status: "ACTIVE",
    trigger: "NEW_LEAD",
    steps: [
      {
        id: `${tenantId}-wf-001-step-1`,
        order: 1,
        channel: "EMAIL",
        waitHours: 0,
        messageTemplate: "welcome-high-intent",
      },
      {
        id: `${tenantId}-wf-001-step-2`,
        order: 2,
        channel: "WHATSAPP",
        waitHours: 12,
        messageTemplate: "demo-reminder",
      },
    ],
    aiSuggestion: "Add retargeting touchpoint for no-reply branch.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 40).toISOString(),
    updatedAt: nowIso(),
  },
];

const seedAccounts = (tenantId: string): ConnectedAccount[] => [
  {
    id: `${tenantId}-acct-meta`,
    tenantId,
    provider: "META",
    accountName: "Zenvix Meta Business",
    status: "CONNECTED",
    tokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 20).toISOString(),
    scopes: ["ads_read", "leads_retrieval"],
    lastSyncAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
    updatedAt: nowIso(),
  },
  {
    id: `${tenantId}-acct-google`,
    tenantId,
    provider: "GOOGLE",
    accountName: "Zenvix Google Ads",
    status: "CONNECTED",
    tokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15).toISOString(),
    scopes: ["https://www.googleapis.com/auth/adwords"],
    lastSyncAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
    updatedAt: nowIso(),
  },
];

const seedAttribution = (tenantId: string): AttributionRecord[] => [
  {
    id: `${tenantId}-attr-001`,
    tenantId,
    campaignId: `${tenantId}-cmp-001`,
    leadId: `${tenantId}-lead-001`,
    revenueAttributed: 230000,
    spend: 18000,
    roiPercent: 1177.78,
    createdAt: nowIso(),
  },
];

const seedAlerts = (tenantId: string): MarketingAlert[] => [
  {
    id: `${tenantId}-alert-001`,
    tenantId,
    type: "LEAD_SPIKE",
    severity: "MEDIUM",
    entityType: "CAMPAIGN",
    entityId: `${tenantId}-cmp-001`,
    message: "Lead volume 42% above baseline in the last 6 hours.",
    acknowledged: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

const seedAudit = (tenantId: string): MarketingAuditEvent[] => [
  {
    id: `${tenantId}-audit-001`,
    tenantId,
    actorId: "mkt-jessie",
    action: "campaign.published",
    entityType: "CAMPAIGN",
    entityId: `${tenantId}-cmp-001`,
    detail: "Campaign moved to ACTIVE and execution started.",
    createdAt: nowIso(),
  },
];

const updateById = <T extends { id: string }>(
  items: T[],
  id: string,
  patch: Partial<T>,
): { updated: T | null; next: T[] } => {
  let updated: T | null = null;
  const next = items.map((item) => {
    if (item.id !== id) return item;
    updated = { ...item, ...patch };
    return updated;
  });
  return { updated, next };
};

export const mockMarketingRepo: MarketingRepository = {
  listCampaigns(tenantId) {
    return ensureSeed<MarketingCampaign[]>(campaignsKey(tenantId), seedCampaigns(tenantId));
  },
  createCampaign(tenantId, payload) {
    const next = [payload, ...this.listCampaigns(tenantId)];
    saveToStorage(campaignsKey(tenantId), next);
    return payload;
  },
  updateCampaign(tenantId, id, patch) {
    const { updated, next } = updateById(this.listCampaigns(tenantId), id, patch);
    if (updated) saveToStorage(campaignsKey(tenantId), next);
    return updated;
  },

  listExecutions(tenantId) {
    return ensureSeed<CampaignExecutionRun[]>(
      executionsKey(tenantId),
      seedExecutions(tenantId),
    );
  },
  createExecution(tenantId, payload) {
    const next = [payload, ...this.listExecutions(tenantId)];
    saveToStorage(executionsKey(tenantId), next);
    return payload;
  },
  updateExecution(tenantId, id, patch) {
    const { updated, next } = updateById(this.listExecutions(tenantId), id, patch);
    if (updated) saveToStorage(executionsKey(tenantId), next);
    return updated;
  },

  listLeads(tenantId) {
    return ensureSeed<MarketingLead[]>(leadsKey(tenantId), seedLeads(tenantId));
  },
  createLead(tenantId, payload) {
    const next = [payload, ...this.listLeads(tenantId)];
    saveToStorage(leadsKey(tenantId), next);
    return payload;
  },
  updateLead(tenantId, id, patch) {
    const { updated, next } = updateById(this.listLeads(tenantId), id, patch);
    if (updated) saveToStorage(leadsKey(tenantId), next);
    return updated;
  },

  listWorkflows(tenantId) {
    return ensureSeed<NurtureWorkflow[]>(workflowsKey(tenantId), seedWorkflows(tenantId));
  },
  createWorkflow(tenantId, payload) {
    const next = [payload, ...this.listWorkflows(tenantId)];
    saveToStorage(workflowsKey(tenantId), next);
    return payload;
  },
  updateWorkflow(tenantId, id, patch) {
    const { updated, next } = updateById(this.listWorkflows(tenantId), id, patch);
    if (updated) saveToStorage(workflowsKey(tenantId), next);
    return updated;
  },

  listConnectedAccounts(tenantId) {
    return ensureSeed<ConnectedAccount[]>(accountsKey(tenantId), seedAccounts(tenantId));
  },
  createConnectedAccount(tenantId, payload) {
    const next = [payload, ...this.listConnectedAccounts(tenantId)];
    saveToStorage(accountsKey(tenantId), next);
    return payload;
  },
  updateConnectedAccount(tenantId, id, patch) {
    const { updated, next } = updateById(this.listConnectedAccounts(tenantId), id, patch);
    if (updated) saveToStorage(accountsKey(tenantId), next);
    return updated;
  },

  listAttribution(tenantId) {
    return ensureSeed<AttributionRecord[]>(attributionKey(tenantId), seedAttribution(tenantId));
  },
  createAttribution(tenantId, payload) {
    const next = [payload, ...this.listAttribution(tenantId)];
    saveToStorage(attributionKey(tenantId), next);
    return payload;
  },

  listAlerts(tenantId) {
    return ensureSeed<MarketingAlert[]>(alertsKey(tenantId), seedAlerts(tenantId));
  },
  createAlert(tenantId, payload) {
    const next = [payload, ...this.listAlerts(tenantId)];
    saveToStorage(alertsKey(tenantId), next);
    return payload;
  },
  updateAlert(tenantId, id, patch) {
    const { updated, next } = updateById(this.listAlerts(tenantId), id, patch);
    if (updated) saveToStorage(alertsKey(tenantId), next);
    return updated;
  },

  listAuditEvents(tenantId) {
    return ensureSeed<MarketingAuditEvent[]>(auditKey(tenantId), seedAudit(tenantId));
  },
  createAuditEvent(tenantId, payload) {
    const next = [payload, ...this.listAuditEvents(tenantId)];
    saveToStorage(auditKey(tenantId), next);
    return payload;
  },
};
