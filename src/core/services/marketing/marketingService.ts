import { audit } from "@/core/logging/audit";
import { mockMarketingRepo } from "@/core/repositories/marketing/mockMarketingRepo";
import type { SessionContext } from "@/core/security/session";
import { salesService } from "@/core/services/sales/salesService";
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

const repo = mockMarketingRepo;

const nowIso = () => new Date().toISOString();
const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
const addDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

const ownerPool = [
  { id: "mkt-jessie", name: "Jessie Allan" },
  { id: "mkt-ava", name: "Ava Reynolds" },
  { id: "mkt-henry", name: "Henry Pham" },
];

const ensureTenant = (tenantId: string, session: SessionContext) => {
  if (session.role === "SUPERADMIN") return;
  if (tenantId !== session.tenantId) throw new Error("Tenant access denied");
};

const toAuditRecord = (value: unknown): Record<string, unknown> =>
  JSON.parse(JSON.stringify(value)) as Record<string, unknown>;

const estimateLeadScore = (lead: {
  source: MarketingLead["source"];
  industry?: string;
  employeeBand?: string;
}) => {
  const sourceBase: Record<MarketingLead["source"], number> = {
    LANDING_PAGE: 68,
    EMBEDDED_FORM: 64,
    CHATBOT: 62,
    WEBINAR: 75,
    META_LEAD_ADS: 72,
    GOOGLE_ADS: 70,
    PARTNER_API: 74,
  };
  const industryBoost =
    lead.industry && ["Manufacturing", "Retail", "Technology"].includes(lead.industry)
      ? 8
      : 0;
  const sizeBoost =
    lead.employeeBand && ["201-500", "501-1000", "1001+"].includes(lead.employeeBand)
      ? 6
      : 0;
  return Math.max(1, Math.min(99, sourceBase[lead.source] + industryBoost + sizeBoost));
};

const pickOwner = (tenantId: string) => {
  const campaigns = repo.listCampaigns(tenantId);
  const load = campaigns.reduce<Record<string, number>>((acc, item) => {
    acc[item.ownerId] = (acc[item.ownerId] ?? 0) + 1;
    return acc;
  }, {});
  return [...ownerPool].sort((a, b) => (load[a.id] ?? 0) - (load[b.id] ?? 0))[0];
};

const writeAudit = (
  tenantId: string,
  actorId: string,
  action: string,
  entityType: MarketingAuditEvent["entityType"],
  entityId: string,
  detail: string,
) => {
  const event: MarketingAuditEvent = {
    id: createId("mkt-audit"),
    tenantId,
    actorId,
    action,
    entityType,
    entityId,
    detail,
    createdAt: nowIso(),
  };
  repo.createAuditEvent(tenantId, event);
  audit.log({
    tenantId,
    actorId,
    action: `marketing.${action}`,
    entityType: entityType.toLowerCase(),
    entityId,
    after: toAuditRecord(event),
  });
};

const upsertAlert = (
  tenantId: string,
  payload: Omit<MarketingAlert, "id" | "createdAt" | "updatedAt">,
) => {
  const existing = repo
    .listAlerts(tenantId)
    .find(
      (item) =>
        item.type === payload.type &&
        item.entityType === payload.entityType &&
        item.entityId === payload.entityId &&
        !item.acknowledged,
    );
  if (existing) return existing;
  return repo.createAlert(tenantId, {
    id: createId("mkt-alert"),
    ...payload,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
};

export const marketingService = {
  listCampaigns: (tenantId: string) => repo.listCampaigns(tenantId),
  listExecutions: (tenantId: string) => repo.listExecutions(tenantId),
  listLeads: (tenantId: string) => repo.listLeads(tenantId),
  listWorkflows: (tenantId: string) => repo.listWorkflows(tenantId),
  listConnectedAccounts: (tenantId: string) => repo.listConnectedAccounts(tenantId),
  listAttribution: (tenantId: string) => repo.listAttribution(tenantId),
  listAlerts: (tenantId: string) => repo.listAlerts(tenantId),
  listAuditEvents: (tenantId: string) => repo.listAuditEvents(tenantId),

  getDashboard(tenantId: string): MarketingDashboardMetrics {
    const campaigns = repo.listCampaigns(tenantId);
    const leads = repo.listLeads(tenantId);
    const executions = repo.listExecutions(tenantId);
    const accounts = repo.listConnectedAccounts(tenantId);
    const attribution = repo.listAttribution(tenantId);
    const spendToDate = executions.reduce((sum, item) => sum + item.spend, 0);
    const attributedRevenue = attribution.reduce(
      (sum, item) => sum + item.revenueAttributed,
      0,
    );
    const blendedRoiPercent =
      spendToDate > 0 ? ((attributedRevenue - spendToDate) / spendToDate) * 100 : 0;
    return {
      activeCampaigns: campaigns.filter((item) => item.status === "ACTIVE").length,
      leadsToday: leads.filter((item) => {
        const date = new Date(item.createdAt);
        const now = new Date();
        return (
          date.getFullYear() === now.getFullYear() &&
          date.getMonth() === now.getMonth() &&
          date.getDate() === now.getDate()
        );
      }).length,
      qualifiedLeads: leads.filter((item) => item.status === "QUALIFIED").length,
      handoffReady: leads.filter((item) => item.status === "HANDOFF_READY").length,
      spendToDate,
      attributedRevenue,
      blendedRoiPercent: Number(blendedRoiPercent.toFixed(2)),
      connectedAccountsHealthy: accounts.filter((item) => item.status === "CONNECTED").length,
    };
  },

  getChannelPerformance(tenantId: string) {
    const executions = repo.listExecutions(tenantId);
    const byChannel = executions.reduce<
      Record<CampaignExecutionRun["channel"], { leads: number; spend: number }>
    >(
      (acc, item) => {
        if (!acc[item.channel]) acc[item.channel] = { leads: 0, spend: 0 };
        acc[item.channel].leads += item.leadsGenerated;
        acc[item.channel].spend += item.spend;
        return acc;
      },
      {
        META_ADS: { leads: 0, spend: 0 },
        GOOGLE_ADS: { leads: 0, spend: 0 },
        EMAIL: { leads: 0, spend: 0 },
        WHATSAPP: { leads: 0, spend: 0 },
        WEBINAR: { leads: 0, spend: 0 },
        LANDING_PAGE: { leads: 0, spend: 0 },
        EVENT: { leads: 0, spend: 0 },
      },
    );
    return Object.entries(byChannel).map(([channel, value]) => ({
      channel: channel as CampaignExecutionRun["channel"],
      leads: value.leads,
      spend: value.spend,
      cpl: value.leads > 0 ? Number((value.spend / value.leads).toFixed(2)) : 0,
    }));
  },

  createCampaign(
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
  ): MarketingCampaign {
    ensureTenant(tenantId, session);
    const owner = pickOwner(tenantId);
    const created: MarketingCampaign = {
      id: createId("cmp"),
      tenantId,
      name: payload.name,
      objective: payload.objective,
      channelMix: payload.channelMix,
      ownerId: owner.id,
      ownerName: owner.name,
      budget: Math.max(0, payload.budget),
      currency: payload.currency ?? "USD",
      status: "DRAFT",
      startDate: payload.startDate,
      endDate: payload.endDate,
      audience: payload.audience,
      aiRecommendation: "Start with high-intent segment and allocate 60% spend to best-performing channel.",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    repo.createCampaign(tenantId, created);
    writeAudit(
      tenantId,
      session.userId,
      "campaign.created",
      "CAMPAIGN",
      created.id,
      created.name,
    );
    return created;
  },

  updateCampaignStatus(
    tenantId: string,
    session: SessionContext,
    campaignId: string,
    status: MarketingCampaign["status"],
  ) {
    ensureTenant(tenantId, session);
    const updated = repo.updateCampaign(tenantId, campaignId, {
      status,
      updatedAt: nowIso(),
    });
    if (!updated) throw new Error("Campaign not found.");
    writeAudit(
      tenantId,
      session.userId,
      "campaign.status_changed",
      "CAMPAIGN",
      campaignId,
      status,
    );
    return updated;
  },

  scheduleExecution(
    tenantId: string,
    session: SessionContext,
    payload: {
      campaignId: string;
      channel: CampaignExecutionRun["channel"];
      scheduledAt: string;
      notes?: string;
    },
  ): CampaignExecutionRun {
    ensureTenant(tenantId, session);
    const campaign = repo.listCampaigns(tenantId).find((item) => item.id === payload.campaignId);
    if (!campaign) throw new Error("Campaign not found.");
    const execution: CampaignExecutionRun = {
      id: createId("exec"),
      tenantId,
      campaignId: campaign.id,
      channel: payload.channel,
      scheduledAt: payload.scheduledAt,
      status: "SCHEDULED",
      leadsGenerated: 0,
      spend: 0,
      notes: payload.notes,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    repo.createExecution(tenantId, execution);
    writeAudit(
      tenantId,
      session.userId,
      "execution.scheduled",
      "EXECUTION",
      execution.id,
      `${execution.channel} for ${campaign.name}`,
    );
    return execution;
  },

  runExecution(
    tenantId: string,
    session: SessionContext,
    executionId: string,
    payload?: { leadsGenerated?: number; spend?: number; failed?: boolean },
  ) {
    ensureTenant(tenantId, session);
    const execution = repo.listExecutions(tenantId).find((item) => item.id === executionId);
    if (!execution) throw new Error("Execution not found.");
    const status = payload?.failed ? "FAILED" : "COMPLETED";
    const leadsGenerated = payload?.leadsGenerated ?? Math.max(8, Math.round(Math.random() * 60));
    const spend = payload?.spend ?? Math.max(1500, Math.round(Math.random() * 12000));
    const updated = repo.updateExecution(tenantId, executionId, {
      status,
      leadsGenerated,
      spend,
      updatedAt: nowIso(),
    });
    if (!updated) throw new Error("Unable to update execution.");
    if (status === "FAILED") {
      upsertAlert(tenantId, {
        tenantId,
        type: "CAMPAIGN_FAILURE",
        severity: "HIGH",
        entityType: "CAMPAIGN",
        entityId: execution.campaignId,
        message: `Execution ${execution.id} failed on channel ${execution.channel}.`,
        acknowledged: false,
      });
    }
    writeAudit(
      tenantId,
      session.userId,
      "execution.ran",
      "EXECUTION",
      executionId,
      `${status}, leads=${leadsGenerated}, spend=${spend}`,
    );
    return updated;
  },

  captureLead(
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
  ): MarketingLead {
    ensureTenant(tenantId, session);
    const dedupKey = `${payload.companyName}-${payload.email ?? payload.phone ?? payload.contactName}`
      .trim()
      .toLowerCase();
    const existing = repo.listLeads(tenantId).find((item) => item.dedupKey === dedupKey);
    if (existing) {
      const refreshed = repo.updateLead(tenantId, existing.id, {
        updatedAt: nowIso(),
      });
      if (!refreshed) throw new Error("Unable to refresh lead.");
      return refreshed;
    }
    const score = estimateLeadScore({
      source: payload.source,
      industry: payload.industry,
      employeeBand: payload.employeeBand,
    });
    const intent: MarketingLead["intent"] =
      score >= 80 ? "HIGH" : score >= 65 ? "MEDIUM" : "LOW";
    const status: MarketingLead["status"] = score >= 75 ? "QUALIFIED" : "SCORED";
    const created: MarketingLead = {
      id: createId("mlead"),
      tenantId,
      campaignId: payload.campaignId,
      source: payload.source,
      companyName: payload.companyName,
      contactName: payload.contactName,
      email: payload.email,
      phone: payload.phone,
      country: payload.country,
      industry: payload.industry,
      employeeBand: payload.employeeBand,
      dedupKey,
      score,
      intent,
      status,
      qualificationReason:
        score >= 75
          ? "High score from source quality + firmographic fit."
          : "Lead captured and scored; nurture sequence recommended.",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    repo.createLead(tenantId, created);
    writeAudit(
      tenantId,
      session.userId,
      "lead.captured",
      "LEAD",
      created.id,
      `${created.companyName} (${created.source})`,
    );
    return created;
  },

  markLeadHandoffReady(
    tenantId: string,
    session: SessionContext,
    leadId: string,
  ): MarketingLead {
    ensureTenant(tenantId, session);
    const updated = repo.updateLead(tenantId, leadId, {
      status: "HANDOFF_READY",
      updatedAt: nowIso(),
    });
    if (!updated) throw new Error("Lead not found.");
    writeAudit(
      tenantId,
      session.userId,
      "lead.handoff_ready",
      "LEAD",
      leadId,
      updated.companyName,
    );
    return updated;
  },

  handoffLeadToSales(
    tenantId: string,
    session: SessionContext,
    leadId: string,
  ): MarketingLead {
    ensureTenant(tenantId, session);
    const lead = repo.listLeads(tenantId).find((item) => item.id === leadId);
    if (!lead) throw new Error("Lead not found.");
    if (!["QUALIFIED", "HANDOFF_READY"].includes(lead.status)) {
      throw new Error("Lead is not qualified for handoff.");
    }
    const salesLead = salesService.syncLeadFromMarketing(tenantId, session, {
      campaignName:
        repo.listCampaigns(tenantId).find((item) => item.id === lead.campaignId)?.name ??
        "Marketing campaign",
      companyName: lead.companyName,
      contactName: lead.contactName,
      contactEmail: lead.email,
      potentialValue: Math.max(5000, Math.round(lead.score * 1500)),
    });
    const updated = repo.updateLead(tenantId, lead.id, {
      status: "HANDOFF_SENT",
      salesHandoffId: salesLead.id,
      updatedAt: nowIso(),
    });
    if (!updated) throw new Error("Unable to update lead.");
    writeAudit(
      tenantId,
      session.userId,
      "lead.handoff_sent",
      "LEAD",
      lead.id,
      `Handoff to Sales lead ${salesLead.id}`,
    );

    const campaignId = lead.campaignId;
    if (campaignId) {
      const executionSpend = repo
        .listExecutions(tenantId)
        .filter((item) => item.campaignId === campaignId)
        .reduce((sum, item) => sum + item.spend, 0);
      const attributedRevenue = Math.max(0, Math.round((lead.score / 100) * 300000));
      const roiPercent =
        executionSpend > 0
          ? Number((((attributedRevenue - executionSpend) / executionSpend) * 100).toFixed(2))
          : 0;
      repo.createAttribution(tenantId, {
        id: createId("attr"),
        tenantId,
        campaignId,
        leadId: lead.id,
        opportunityId: salesLead.id,
        revenueAttributed: attributedRevenue,
        spend: executionSpend,
        roiPercent,
        createdAt: nowIso(),
      });
      writeAudit(
        tenantId,
        session.userId,
        "attribution.recorded",
        "ATTRIBUTION",
        lead.id,
        `Revenue ${attributedRevenue.toLocaleString()} attributed.`,
      );
    }

    return updated;
  },

  createWorkflow(
    tenantId: string,
    session: SessionContext,
    payload: Pick<NurtureWorkflow, "name" | "trigger" | "steps">,
  ): NurtureWorkflow {
    ensureTenant(tenantId, session);
    const created: NurtureWorkflow = {
      id: createId("wf"),
      tenantId,
      name: payload.name,
      trigger: payload.trigger,
      status: "DRAFT",
      steps: payload.steps,
      aiSuggestion: "Use branch condition for high-intent contacts after step 2.",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    repo.createWorkflow(tenantId, created);
    writeAudit(
      tenantId,
      session.userId,
      "workflow.created",
      "WORKFLOW",
      created.id,
      created.name,
    );
    return created;
  },

  updateWorkflowStatus(
    tenantId: string,
    session: SessionContext,
    workflowId: string,
    status: NurtureWorkflow["status"],
  ) {
    ensureTenant(tenantId, session);
    const updated = repo.updateWorkflow(tenantId, workflowId, {
      status,
      updatedAt: nowIso(),
    });
    if (!updated) throw new Error("Workflow not found.");
    writeAudit(
      tenantId,
      session.userId,
      "workflow.status_changed",
      "WORKFLOW",
      workflowId,
      status,
    );
    return updated;
  },

  connectAccount(
    tenantId: string,
    session: SessionContext,
    payload: { provider: ConnectedProvider; accountName: string; scopes: string[] },
  ): ConnectedAccount {
    ensureTenant(tenantId, session);
    const created: ConnectedAccount = {
      id: createId("acct"),
      tenantId,
      provider: payload.provider,
      accountName: payload.accountName,
      status: "CONNECTED",
      tokenExpiresAt: addDays(20),
      scopes: payload.scopes,
      lastSyncAt: nowIso(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    repo.createConnectedAccount(tenantId, created);
    writeAudit(
      tenantId,
      session.userId,
      "account.connected",
      "ACCOUNT",
      created.id,
      `${created.provider}:${created.accountName}`,
    );
    return created;
  },

  updateAccountStatus(
    tenantId: string,
    session: SessionContext,
    accountId: string,
    status: ConnectionStatus,
  ) {
    ensureTenant(tenantId, session);
    const updated = repo.updateConnectedAccount(tenantId, accountId, {
      status,
      updatedAt: nowIso(),
    });
    if (!updated) throw new Error("Account not found.");
    writeAudit(
      tenantId,
      session.userId,
      "account.status_changed",
      "ACCOUNT",
      accountId,
      status,
    );
    return updated;
  },

  acknowledgeAlert(tenantId: string, session: SessionContext, alertId: string) {
    ensureTenant(tenantId, session);
    const updated = repo.updateAlert(tenantId, alertId, {
      acknowledged: true,
      updatedAt: nowIso(),
    });
    if (!updated) throw new Error("Alert not found.");
    return updated;
  },

  runHealthSweep(tenantId: string, session: SessionContext) {
    ensureTenant(tenantId, session);
    const now = Date.now();
    repo.listConnectedAccounts(tenantId).forEach((account) => {
      const expiresInHours =
        (new Date(account.tokenExpiresAt).getTime() - now) / (1000 * 60 * 60);
      if (expiresInHours <= 72) {
        upsertAlert(tenantId, {
          tenantId,
          type: "TOKEN_EXPIRY",
          severity: expiresInHours <= 24 ? "HIGH" : "MEDIUM",
          entityType: "ACCOUNT",
          entityId: account.id,
          message: `${account.provider} token expires soon.`,
          acknowledged: false,
        });
      }
    });

    repo.listLeads(tenantId).forEach((lead) => {
      if (lead.status === "HANDOFF_READY" && new Date(lead.updatedAt).getTime() < now - 1000 * 60 * 60 * 4) {
        upsertAlert(tenantId, {
          tenantId,
          type: "HANDOFF_DELAY",
          severity: "HIGH",
          entityType: "LEAD",
          entityId: lead.id,
          message: `Qualified lead ${lead.companyName} not handed off within SLA.`,
          acknowledged: false,
        });
      }
    });

    writeAudit(
      tenantId,
      session.userId,
      "health.sweep",
      "ALERT",
      "health-sweep",
      "Marketing health checks executed.",
    );
    return repo.listAlerts(tenantId);
  },
};
