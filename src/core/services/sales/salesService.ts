import { audit } from "@/core/logging/audit";
import { mockSalesRepo } from "@/core/repositories/sales/mockSalesRepo";
import type { SessionContext } from "@/core/security/session";
import { financeService } from "@/core/services/finance/financeService";
import { inventoryService } from "@/core/services/inventory/inventoryService";
import { workflowService } from "@/core/services/hr/workflowService";
import type {
  LeadStatus,
  OpportunityHealth,
  OpportunityStage,
  SalesAlert,
  SalesAuditEvent,
  SalesDashboardMetrics,
  SalesExecutiveForecast,
  SalesLead,
  SalesManagerMetrics,
  SalesNextAction,
  SalesOpportunity,
  SalesOrder,
  SalesQuote,
  SalesTask,
  SalesTimelineEvent,
} from "@/core/types/sales/sales";

const repo = mockSalesRepo;

const nowIso = () => new Date().toISOString();
const addDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};
const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const STAGE_PROBABILITY: Record<OpportunityStage, number> = {
  NEW: 10,
  CONTACTED: 20,
  QUALIFIED: 40,
  PROPOSAL: 60,
  NEGOTIATION: 80,
  CLOSED_WON: 100,
  CLOSED_LOST: 0,
};

const SALES_REPS = [
  { userId: "rep-jessie", name: "Jessie Allan" },
  { userId: "rep-ava", name: "Ava Reynolds" },
  { userId: "rep-henry", name: "Henry Pham" },
  { userId: "rep-olivia", name: "Olivia Tan" },
];

const hoursSince = (timestamp: string) =>
  Math.max(0, (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60));

const toAuditRecord = (value: unknown): Record<string, unknown> =>
  JSON.parse(JSON.stringify(value)) as Record<string, unknown>;

const ensureTenant = (tenantId: string, session: SessionContext) => {
  if (session.role === "SUPERADMIN") return;
  if (session.tenantId !== tenantId) throw new Error("Tenant access denied");
};

const ownerLoad = (tenantId: string): Record<string, number> => {
  const opportunities = repo
    .listOpportunities(tenantId)
    .filter((item) => item.stage !== "CLOSED_WON" && item.stage !== "CLOSED_LOST");
  return opportunities.reduce<Record<string, number>>((acc, item) => {
    acc[item.ownerId] = (acc[item.ownerId] ?? 0) + 1;
    return acc;
  }, {});
};

const pickOwner = (tenantId: string) => {
  const load = ownerLoad(tenantId);
  const sorted = [...SALES_REPS].sort(
    (a, b) => (load[a.userId] ?? 0) - (load[b.userId] ?? 0),
  );
  return sorted[0];
};

const inferOpportunityHealth = (item: SalesOpportunity): OpportunityHealth => {
  if (item.stage === "CLOSED_WON" || item.stage === "CLOSED_LOST") return "LOW_RISK";
  const staleHours = hoursSince(item.lastActivityAt);
  if (item.probability < 40 || staleHours > 72) return "HIGH_RISK";
  if (item.probability < 65 || staleHours > 24) return "MEDIUM_RISK";
  return "LOW_RISK";
};

const writeAudit = (
  tenantId: string,
  actorId: string,
  action: string,
  entityType: SalesAuditEvent["entityType"],
  entityId: string,
  detail: string,
) => {
  const event: SalesAuditEvent = {
    id: createId("sales-audit"),
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
    action: `sales.${action}`,
    entityType: entityType.toLowerCase(),
    entityId,
    after: toAuditRecord(event),
  });
};

const createAlertIfMissing = (
  tenantId: string,
  payload: Omit<SalesAlert, "id" | "createdAt" | "updatedAt">,
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
  const alert: SalesAlert = {
    id: createId("sales-alert"),
    ...payload,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  return repo.createAlert(tenantId, alert);
};

export const salesService = {
  listLeads: (tenantId: string) => repo.listLeads(tenantId),
  listOpportunities: (tenantId: string) => repo.listOpportunities(tenantId),
  listQuotes: (tenantId: string) => repo.listQuotes(tenantId),
  listTimelineEvents: (tenantId: string) => repo.listTimelineEvents(tenantId),
  listTasks: (tenantId: string) => repo.listTasks(tenantId),
  listAlerts: (tenantId: string) => repo.listAlerts(tenantId),
  listOrders: (tenantId: string) => repo.listOrders(tenantId),
  listAuditEvents: (tenantId: string) => repo.listAuditEvents(tenantId),

  getDashboard(tenantId: string): SalesDashboardMetrics {
    const leads = repo.listLeads(tenantId);
    const opportunities = repo.listOpportunities(tenantId);
    const quotes = repo.listQuotes(tenantId);
    const tasks = repo.listTasks(tenantId);
    const alerts = repo.listAlerts(tenantId);
    const openOpportunities = opportunities.filter(
      (item) => item.stage !== "CLOSED_WON" && item.stage !== "CLOSED_LOST",
    );
    return {
      openLeads: leads.filter((item) => item.status !== "DISQUALIFIED" && item.status !== "CONVERTED")
        .length,
      slaDueToday: leads.filter((item) => {
        const due = new Date(item.slaDueAt);
        const now = new Date();
        return (
          due.getFullYear() === now.getFullYear() &&
          due.getMonth() === now.getMonth() &&
          due.getDate() === now.getDate()
        );
      }).length,
      overdueFollowUps: tasks.filter((item) => item.status === "OVERDUE").length,
      openOpportunities: openOpportunities.length,
      pipelineValue: openOpportunities.reduce((sum, item) => sum + item.amount, 0),
      weightedPipelineValue: Math.round(
        openOpportunities.reduce((sum, item) => sum + item.amount * (item.probability / 100), 0),
      ),
      pendingQuoteApprovals: quotes.filter((item) => item.status === "PENDING_APPROVAL").length,
      dealRiskCount: alerts.filter(
        (item) => item.type === "DEAL_RISK" && !item.acknowledged,
      ).length,
    };
  },

  getManagerMetrics(tenantId: string): SalesManagerMetrics {
    const opportunities = repo.listOpportunities(tenantId);
    const quotes = repo.listQuotes(tenantId);
    const alerts = repo.listAlerts(tenantId);
    const reps = new Set(opportunities.map((item) => item.ownerId));
    const open = opportunities.filter(
      (item) => item.stage !== "CLOSED_WON" && item.stage !== "CLOSED_LOST",
    );
    return {
      totalReps: Math.max(reps.size, SALES_REPS.length),
      openPipeline: open.reduce((sum, item) => sum + item.amount, 0),
      weightedForecast: Math.round(
        open.reduce((sum, item) => sum + item.amount * (item.probability / 100), 0),
      ),
      stalledDeals: open.filter((item) => hoursSince(item.lastActivityAt) > 72).length,
      slaBreaches: alerts.filter((item) => item.type === "LEAD_SLA_BREACH").length,
      approvalsPending: quotes.filter((item) => item.status === "PENDING_APPROVAL").length,
    };
  },

  getExecutiveForecast(tenantId: string): SalesExecutiveForecast {
    const opportunities = repo.listOpportunities(tenantId);
    const open = opportunities.filter(
      (item) => item.stage !== "CLOSED_WON" && item.stage !== "CLOSED_LOST",
    );
    const won = opportunities.filter((item) => item.stage === "CLOSED_WON");
    const lost = opportunities.filter((item) => item.stage === "CLOSED_LOST");
    const totalClosed = won.length + lost.length;
    const conversionRate = totalClosed ? (won.length / totalClosed) * 100 : 0;
    return {
      openPipelineValue: open.reduce((sum, item) => sum + item.amount, 0),
      weightedForecastValue: Math.round(
        open.reduce((sum, item) => sum + item.amount * (item.probability / 100), 0),
      ),
      wonThisPeriod: won.reduce((sum, item) => sum + item.amount, 0),
      lostThisPeriod: lost.reduce((sum, item) => sum + item.amount, 0),
      conversionRate: Number(conversionRate.toFixed(2)),
      avgDealCycleDays: 21,
      forecastAccuracy: 91.4,
    };
  },

  getPipelineByStage(tenantId: string) {
    const opportunities = repo.listOpportunities(tenantId);
    return {
      NEW: opportunities.filter((item) => item.stage === "NEW"),
      CONTACTED: opportunities.filter((item) => item.stage === "CONTACTED"),
      QUALIFIED: opportunities.filter((item) => item.stage === "QUALIFIED"),
      PROPOSAL: opportunities.filter((item) => item.stage === "PROPOSAL"),
      NEGOTIATION: opportunities.filter((item) => item.stage === "NEGOTIATION"),
      CLOSED_WON: opportunities.filter((item) => item.stage === "CLOSED_WON"),
      CLOSED_LOST: opportunities.filter((item) => item.stage === "CLOSED_LOST"),
    };
  },

  getNextBestActions(tenantId: string): SalesNextAction[] {
    const actions: SalesNextAction[] = [];
    const overdueLead = repo
      .listLeads(tenantId)
      .find((item) => ["NEW", "ASSIGNED"].includes(item.status) && new Date(item.slaDueAt).getTime() < Date.now());
    if (overdueLead) {
      actions.push({
        id: createId("nba"),
        priority: "P1",
        title: `Respond to ${overdueLead.companyName} immediately`,
        detail: "Lead SLA is breached. Send first response and log activity.",
        targetRoute: "/core/sales/leads",
      });
    }

    const pendingQuote = repo
      .listQuotes(tenantId)
      .find((item) => item.status === "PENDING_APPROVAL");
    if (pendingQuote) {
      actions.push({
        id: createId("nba"),
        priority: "P1",
        title: `Escalate quote ${pendingQuote.id} for approval`,
        detail: "Quote waiting for approval; risk of delay in proposal stage.",
        targetRoute: "/core/sales/quotes",
      });
    }

    const staleOpp = repo
      .listOpportunities(tenantId)
      .find(
        (item) =>
          item.stage !== "CLOSED_WON" &&
          item.stage !== "CLOSED_LOST" &&
          hoursSince(item.lastActivityAt) > 48,
      );
    if (staleOpp) {
      actions.push({
        id: createId("nba"),
        priority: "P2",
        title: `Follow up ${staleOpp.accountName}`,
        detail: "Opportunity has no recent activity and may stall.",
        targetRoute: "/core/sales/timeline",
      });
    }

    if (!actions.length) {
      actions.push({
        id: createId("nba"),
        priority: "P3",
        title: "Pipeline is healthy",
        detail: "No critical actions currently due.",
        targetRoute: "/core/sales/forecast",
      });
    }

    return actions;
  },

  createLead(
    tenantId: string,
    session: SessionContext,
    payload: {
      companyName: string;
      contactName: string;
      contactEmail?: string;
      contactPhone?: string;
      source: SalesLead["source"];
      potentialValue: number;
      currency?: "IDR" | "USD";
      priority?: SalesLead["priority"];
    },
  ): SalesLead {
    ensureTenant(tenantId, session);
    const owner = pickOwner(tenantId);
    const created: SalesLead = {
      id: createId("lead"),
      tenantId,
      companyName: payload.companyName,
      contactName: payload.contactName,
      contactEmail: payload.contactEmail,
      contactPhone: payload.contactPhone,
      source: payload.source,
      ownerId: owner.userId,
      ownerName: owner.name,
      score: Math.max(45, Math.min(99, Math.round(55 + Math.random() * 35))),
      potentialValue: Math.max(payload.potentialValue, 0),
      currency: payload.currency ?? "USD",
      priority: payload.priority ?? "MEDIUM",
      status: "NEW",
      slaDueAt: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    repo.createLead(tenantId, created);
    writeAudit(
      tenantId,
      session.userId,
      "lead.created",
      "LEAD",
      created.id,
      `${created.companyName} (${created.source})`,
    );
    return created;
  },

  syncLeadFromMarketing(
    tenantId: string,
    session: SessionContext,
    payload: {
      campaignName: string;
      companyName: string;
      contactName: string;
      contactEmail?: string;
      potentialValue: number;
    },
  ): SalesLead {
    const lead = this.createLead(tenantId, session, {
      companyName: payload.companyName,
      contactName: payload.contactName,
      contactEmail: payload.contactEmail,
      source: "MARKETING",
      potentialValue: payload.potentialValue,
      priority: "HIGH",
    });
    this.addTimelineEvent(tenantId, session, {
      leadId: lead.id,
      opportunityId: "",
      channel: "NOTE",
      direction: "INTERNAL",
      summary: "Marketing handoff received",
      detail: `Campaign: ${payload.campaignName}`,
    });
    return lead;
  },

  updateLeadStatus(
    tenantId: string,
    session: SessionContext,
    leadId: string,
    status: LeadStatus,
  ) {
    ensureTenant(tenantId, session);
    const lead = repo.listLeads(tenantId).find((item) => item.id === leadId);
    if (!lead) throw new Error("Lead not found.");
    const patch: Partial<SalesLead> = { status, updatedAt: nowIso() };
    if (status === "CONTACTED" && !lead.firstResponseAt) {
      patch.firstResponseAt = nowIso();
    }
    const updated = repo.updateLead(tenantId, leadId, patch);
    if (!updated) throw new Error("Unable to update lead.");
    writeAudit(
      tenantId,
      session.userId,
      "lead.status_changed",
      "LEAD",
      leadId,
      `Status -> ${status}`,
    );
    return updated;
  },

  convertLeadToOpportunity(
    tenantId: string,
    session: SessionContext,
    leadId: string,
  ): SalesOpportunity {
    ensureTenant(tenantId, session);
    const lead = repo.listLeads(tenantId).find((item) => item.id === leadId);
    if (!lead) throw new Error("Lead not found.");
    const created: SalesOpportunity = {
      id: createId("opp"),
      tenantId,
      leadId: lead.id,
      accountName: lead.companyName,
      ownerId: lead.ownerId,
      ownerName: lead.ownerName,
      stage: "QUALIFIED",
      probability: STAGE_PROBABILITY.QUALIFIED,
      amount: lead.potentialValue,
      currency: lead.currency,
      expectedCloseDate: addDays(30),
      health: "MEDIUM_RISK",
      nextAction: "Book discovery and prepare proposal draft.",
      lastActivityAt: nowIso(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    repo.createOpportunity(tenantId, created);
    repo.updateLead(tenantId, lead.id, {
      status: "CONVERTED",
      updatedAt: nowIso(),
    });
    this.addTimelineEvent(tenantId, session, {
      leadId: lead.id,
      opportunityId: created.id,
      channel: "NOTE",
      direction: "INTERNAL",
      summary: "Lead converted to opportunity",
      detail: `Opportunity ${created.id} opened for ${created.accountName}.`,
    });
    writeAudit(
      tenantId,
      session.userId,
      "lead.converted",
      "OPPORTUNITY",
      created.id,
      `Converted from lead ${lead.id}`,
    );
    return created;
  },

  moveOpportunityStage(
    tenantId: string,
    session: SessionContext,
    opportunityId: string,
    stage: OpportunityStage,
  ): SalesOpportunity {
    ensureTenant(tenantId, session);
    const current = repo.listOpportunities(tenantId).find((item) => item.id === opportunityId);
    if (!current) throw new Error("Opportunity not found.");
    const patch: Partial<SalesOpportunity> = {
      stage,
      probability: STAGE_PROBABILITY[stage],
      updatedAt: nowIso(),
      lastActivityAt: nowIso(),
    };
    const updated = repo.updateOpportunity(tenantId, opportunityId, patch);
    if (!updated) throw new Error("Unable to update opportunity.");
    const health = inferOpportunityHealth(updated);
    const synced = repo.updateOpportunity(tenantId, opportunityId, { health });
    if (!synced) throw new Error("Unable to recalculate opportunity health.");
    if (stage === "NEGOTIATION" && synced.amount >= 500000) {
      createAlertIfMissing(tenantId, {
        tenantId,
        type: "DEAL_RISK",
        severity: "MEDIUM",
        entityType: "OPPORTUNITY",
        entityId: synced.id,
        message: "High-value deal in negotiation requires close monitoring.",
        acknowledged: false,
      });
    }
    writeAudit(
      tenantId,
      session.userId,
      "opportunity.stage_changed",
      "OPPORTUNITY",
      opportunityId,
      `${current.stage} -> ${stage}`,
    );
    return synced;
  },

  createQuote(
    tenantId: string,
    session: SessionContext,
    payload: {
      opportunityId: string;
      amount: number;
      discountPercent: number;
      validDays?: number;
      notes?: string;
    },
  ): SalesQuote {
    ensureTenant(tenantId, session);
    const opportunity = repo
      .listOpportunities(tenantId)
      .find((item) => item.id === payload.opportunityId);
    if (!opportunity) throw new Error("Opportunity not found.");
    const versions = repo
      .listQuotes(tenantId)
      .filter((item) => item.opportunityId === opportunity.id)
      .map((item) => item.version);
    const version = versions.length ? Math.max(...versions) + 1 : 1;
    const discount = Math.max(0, Math.min(payload.discountPercent, 100));
    const netAmount = Math.max(0, payload.amount - payload.amount * (discount / 100));
    const created: SalesQuote = {
      id: createId("quote"),
      tenantId,
      opportunityId: opportunity.id,
      accountName: opportunity.accountName,
      version,
      amount: payload.amount,
      discountPercent: discount,
      netAmount,
      currency: opportunity.currency,
      status: "DRAFT",
      validUntil: addDays(payload.validDays ?? 14),
      notes: payload.notes,
      createdBy: session.userId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    repo.createQuote(tenantId, created);
    writeAudit(
      tenantId,
      session.userId,
      "quote.created",
      "QUOTE",
      created.id,
      `v${created.version} ${created.netAmount.toLocaleString()} ${created.currency}`,
    );
    return created;
  },

  submitQuoteForApproval(
    tenantId: string,
    session: SessionContext,
    quoteId: string,
  ) {
    ensureTenant(tenantId, session);
    const quote = repo.listQuotes(tenantId).find((item) => item.id === quoteId);
    if (!quote) throw new Error("Quote not found.");
    const updated = repo.updateQuote(tenantId, quote.id, {
      status: "PENDING_APPROVAL",
      updatedAt: nowIso(),
    });
    if (!updated) throw new Error("Unable to update quote.");
    workflowService.createRequest(tenantId, session, {
      entityType: "PAYMENT",
      entityId: quote.id,
      makerDept: session.departmentId,
      destinationDept: "FINANCE",
      notes: `Quote ${quote.id} approval request`,
      metadata: { quoteAmount: quote.netAmount, accountName: quote.accountName },
    });
    createAlertIfMissing(tenantId, {
      tenantId,
      type: "QUOTE_APPROVAL_DELAY",
      severity: "MEDIUM",
      entityType: "QUOTE",
      entityId: quote.id,
      message: "Quote is waiting for approval.",
      acknowledged: false,
    });
    writeAudit(
      tenantId,
      session.userId,
      "quote.submitted_for_approval",
      "QUOTE",
      quote.id,
      "Approval workflow routed to Finance",
    );
    return updated;
  },

  decideQuoteApproval(
    tenantId: string,
    session: SessionContext,
    quoteId: string,
    approved: boolean,
  ) {
    ensureTenant(tenantId, session);
    const quote = repo.listQuotes(tenantId).find((item) => item.id === quoteId);
    if (!quote) throw new Error("Quote not found.");
    const status = approved ? "APPROVED" : "REJECTED";
    const updated = repo.updateQuote(tenantId, quote.id, {
      status,
      approvalBy: session.userId,
      approvalAt: nowIso(),
      updatedAt: nowIso(),
    });
    if (!updated) throw new Error("Unable to update quote.");
    repo
      .listAlerts(tenantId)
      .filter((item) => item.entityType === "QUOTE" && item.entityId === quote.id)
      .forEach((item) => {
        repo.updateAlert(tenantId, item.id, {
          acknowledged: true,
          updatedAt: nowIso(),
        });
      });
    writeAudit(
      tenantId,
      session.userId,
      approved ? "quote.approved" : "quote.rejected",
      "QUOTE",
      quote.id,
      `Status -> ${status}`,
    );
    return updated;
  },

  sendQuoteToCustomer(tenantId: string, session: SessionContext, quoteId: string) {
    ensureTenant(tenantId, session);
    const quote = repo.listQuotes(tenantId).find((item) => item.id === quoteId);
    if (!quote) throw new Error("Quote not found.");
    if (quote.status !== "APPROVED") throw new Error("Quote must be approved before sending.");
    const updated = repo.updateQuote(tenantId, quote.id, {
      status: "SENT",
      updatedAt: nowIso(),
    });
    if (!updated) throw new Error("Unable to update quote.");
    this.addTimelineEvent(tenantId, session, {
      opportunityId: quote.opportunityId,
      channel: "EMAIL",
      direction: "OUTBOUND",
      summary: `Quote ${quote.id} sent to customer`,
      detail: `Net amount ${quote.netAmount.toLocaleString()} ${quote.currency}.`,
    });
    return updated;
  },

  closeWonOpportunity(
    tenantId: string,
    session: SessionContext,
    opportunityId: string,
    quoteId?: string,
  ): SalesOrder {
    ensureTenant(tenantId, session);
    const opportunity = repo
      .listOpportunities(tenantId)
      .find((item) => item.id === opportunityId);
    if (!opportunity) throw new Error("Opportunity not found.");
    const inventory = inventoryService.getDashboard(tenantId);
    const inventoryCheck =
      inventory.lowStockCount > 20
        ? "UNAVAILABLE"
        : inventory.lowStockCount > 5
          ? "PARTIAL"
          : "AVAILABLE";
    const receivable = financeService.createReceivable(tenantId, session, {
      customer: opportunity.accountName,
      amount: opportunity.amount,
      dueDate: addDays(30),
      currency: opportunity.currency,
    });
    const order: SalesOrder = {
      id: createId("so"),
      tenantId,
      opportunityId: opportunity.id,
      quoteId,
      customerName: opportunity.accountName,
      amount: opportunity.amount,
      currency: opportunity.currency,
      status: "INVOICED",
      inventoryCheck,
      financeInvoiceId: receivable.id,
      createdBy: session.userId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    repo.createOrder(tenantId, order);
    repo.updateOpportunity(tenantId, opportunity.id, {
      stage: "CLOSED_WON",
      probability: 100,
      health: "LOW_RISK",
      lastActivityAt: nowIso(),
      updatedAt: nowIso(),
    });
    this.addTimelineEvent(tenantId, session, {
      opportunityId: opportunity.id,
      leadId: opportunity.leadId,
      channel: "NOTE",
      direction: "INTERNAL",
      summary: "Deal closed won and invoiced",
      detail: `Sales order ${order.id}, invoice ${receivable.id}`,
    });
    writeAudit(
      tenantId,
      session.userId,
      "opportunity.closed_won",
      "ORDER",
      order.id,
      `Opportunity ${opportunity.id} converted to order`,
    );
    return order;
  },

  closeLostOpportunity(
    tenantId: string,
    session: SessionContext,
    opportunityId: string,
    reason: string,
  ) {
    ensureTenant(tenantId, session);
    const opportunity = repo
      .listOpportunities(tenantId)
      .find((item) => item.id === opportunityId);
    if (!opportunity) throw new Error("Opportunity not found.");
    const updated = repo.updateOpportunity(tenantId, opportunity.id, {
      stage: "CLOSED_LOST",
      probability: 0,
      health: "LOW_RISK",
      nextAction: "Closed lost",
      updatedAt: nowIso(),
      lastActivityAt: nowIso(),
    });
    if (!updated) throw new Error("Unable to close opportunity.");
    this.addTimelineEvent(tenantId, session, {
      opportunityId: opportunity.id,
      leadId: opportunity.leadId,
      channel: "NOTE",
      direction: "INTERNAL",
      summary: "Deal closed lost",
      detail: reason,
    });
    writeAudit(
      tenantId,
      session.userId,
      "opportunity.closed_lost",
      "OPPORTUNITY",
      opportunity.id,
      reason,
    );
    return updated;
  },

  addTimelineEvent(
    tenantId: string,
    session: SessionContext,
    payload: {
      opportunityId: string;
      leadId?: string;
      channel: SalesTimelineEvent["channel"];
      direction: SalesTimelineEvent["direction"];
      summary: string;
      detail?: string;
    },
  ): SalesTimelineEvent {
    ensureTenant(tenantId, session);
    const event: SalesTimelineEvent = {
      id: createId("timeline"),
      tenantId,
      opportunityId: payload.opportunityId,
      leadId: payload.leadId,
      channel: payload.channel,
      direction: payload.direction,
      summary: payload.summary,
      detail: payload.detail,
      createdBy: session.userId,
      createdAt: nowIso(),
    };
    repo.createTimelineEvent(tenantId, event);
    return event;
  },

  createTask(
    tenantId: string,
    session: SessionContext,
    payload: {
      title: string;
      ownerId?: string;
      ownerName?: string;
      dueAt: string;
      priority?: SalesTask["priority"];
      opportunityId?: string;
      leadId?: string;
    },
  ) {
    ensureTenant(tenantId, session);
    const created: SalesTask = {
      id: createId("sales-task"),
      tenantId,
      opportunityId: payload.opportunityId,
      leadId: payload.leadId,
      title: payload.title,
      ownerId: payload.ownerId ?? session.userId,
      ownerName: payload.ownerName ?? session.userId,
      status: "PENDING",
      priority: payload.priority ?? "MEDIUM",
      dueAt: payload.dueAt,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    repo.createTask(tenantId, created);
    writeAudit(
      tenantId,
      session.userId,
      "task.created",
      "TASK",
      created.id,
      created.title,
    );
    return created;
  },

  markTaskDone(tenantId: string, session: SessionContext, taskId: string) {
    ensureTenant(tenantId, session);
    const updated = repo.updateTask(tenantId, taskId, {
      status: "DONE",
      completedAt: nowIso(),
      updatedAt: nowIso(),
    });
    if (!updated) throw new Error("Task not found.");
    writeAudit(
      tenantId,
      session.userId,
      "task.completed",
      "TASK",
      taskId,
      updated.title,
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

  runSlaSweep(tenantId: string, session: SessionContext) {
    ensureTenant(tenantId, session);
    const now = Date.now();

    repo.listLeads(tenantId).forEach((lead) => {
      if (["NEW", "ASSIGNED"].includes(lead.status) && new Date(lead.slaDueAt).getTime() < now) {
        createAlertIfMissing(tenantId, {
          tenantId,
          type: "LEAD_SLA_BREACH",
          severity: "HIGH",
          entityType: "LEAD",
          entityId: lead.id,
          message: `Lead SLA breached for ${lead.companyName}.`,
          acknowledged: false,
        });
      }
    });

    repo.listTasks(tenantId).forEach((task) => {
      if (["PENDING", "IN_PROGRESS"].includes(task.status) && new Date(task.dueAt).getTime() < now) {
        repo.updateTask(tenantId, task.id, { status: "OVERDUE", updatedAt: nowIso() });
        createAlertIfMissing(tenantId, {
          tenantId,
          type: "FOLLOW_UP_OVERDUE",
          severity: task.priority === "URGENT" ? "HIGH" : "MEDIUM",
          entityType: "TASK",
          entityId: task.id,
          message: `Follow-up overdue: ${task.title}`,
          acknowledged: false,
        });
      }
    });

    repo.listOpportunities(tenantId).forEach((opportunity) => {
      if (
        opportunity.stage !== "CLOSED_WON" &&
        opportunity.stage !== "CLOSED_LOST" &&
        hoursSince(opportunity.lastActivityAt) > 72
      ) {
        repo.updateOpportunity(tenantId, opportunity.id, {
          health: "HIGH_RISK",
          updatedAt: nowIso(),
        });
        createAlertIfMissing(tenantId, {
          tenantId,
          type: "DEAL_RISK",
          severity: "HIGH",
          entityType: "OPPORTUNITY",
          entityId: opportunity.id,
          message: `Deal appears stalled: ${opportunity.accountName}.`,
          acknowledged: false,
        });
      }
    });

    writeAudit(
      tenantId,
      session.userId,
      "sla.sweep",
      "ALERT",
      "sla-run",
      "SLA enforcement executed",
    );
    return repo.listAlerts(tenantId);
  },
};
