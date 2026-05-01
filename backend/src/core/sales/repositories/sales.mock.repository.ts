import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { TenantContext } from "../../../gateway/tenant-context.interface";
import { CloseOpportunityDto } from "../dto/close-opportunity.dto";
import { CreateLeadDto } from "../dto/create-lead.dto";
import { CreateOpportunityDto } from "../dto/create-opportunity.dto";
import { CreateQuoteDto } from "../dto/create-quote.dto";
import { CreateTaskDto } from "../dto/create-task.dto";
import { CreateTimelineEventDto } from "../dto/create-timeline-event.dto";
import { MoveOpportunityStageDto } from "../dto/move-opportunity-stage.dto";
import { QuoteDecisionDto } from "../dto/quote-decision.dto";
import { UpdateLeadStatusDto } from "../dto/update-lead-status.dto";
import { SalesAlert } from "../entities/sales-alert.entity";
import { SalesAuditEvent } from "../entities/sales-audit.entity";
import { SalesLead } from "../entities/sales-lead.entity";
import { SalesOpportunity } from "../entities/sales-opportunity.entity";
import { SalesOrder } from "../entities/sales-order.entity";
import { SalesQuote } from "../entities/sales-quote.entity";
import { SalesTask } from "../entities/sales-task.entity";
import { SalesTimelineEvent } from "../entities/sales-timeline-event.entity";
import { SalesNextAction } from "../entities/sales-next-action.entity";
import {
  ISalesRepository,
  SalesDashboard,
  SalesExecutiveForecast,
  SalesManagerMetrics,
} from "./sales.repository.interface";

type TenantSalesStore = {
  leads: SalesLead[];
  opportunities: SalesOpportunity[];
  quotes: SalesQuote[];
  timeline: SalesTimelineEvent[];
  tasks: SalesTask[];
  alerts: SalesAlert[];
  orders: SalesOrder[];
  audit: SalesAuditEvent[];
};

const STAGE_PROBABILITY: Record<SalesOpportunity["stage"], number> = {
  new: 10,
  contacted: 20,
  qualified: 40,
  proposal: 60,
  negotiation: 80,
  closed_won: 100,
  closed_lost: 0,
};

const SALES_REPS = [
  { id: "rep-jessie", name: "Jessie Allan" },
  { id: "rep-ava", name: "Ava Reynolds" },
  { id: "rep-henry", name: "Henry Pham" },
  { id: "rep-olivia", name: "Olivia Tan" },
];

@Injectable()
export class SalesMockRepository extends ISalesRepository {
  private readonly store = new Map<string, TenantSalesStore>();

  constructor() {
    super();
    this.ensureTenant("tenant-001");
    this.ensureTenant("tenant-002");
  }

  private now() {
    return new Date();
  }

  private id(prefix: string) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }

  private addDays(days: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  private ensureTenant(tenant_id: string): TenantSalesStore {
    const existing = this.store.get(tenant_id);
    if (existing) return existing;

    const leads: SalesLead[] = [
      {
        id: `${tenant_id}-lead-1`,
        tenant_id,
        company_name: "Acme Retail",
        contact_name: "Lena Ward",
        contact_email: "lena.ward@acmeretail.example",
        source: "marketing",
        owner_id: "rep-jessie",
        owner_name: "Jessie Allan",
        score: 88,
        potential_value: 420000,
        currency: "USD",
        priority: "high",
        status: "contacted",
        sla_due_at: this.addDays(0),
        firstResponseAt: this.now(),
        created_at: this.addDays(-1),
        updated_at: this.now(),
      },
    ];

    const opportunities: SalesOpportunity[] = [
      {
        id: `${tenant_id}-opp-1`,
        tenant_id,
        lead_id: `${tenant_id}-lead-1`,
        account_name: "Acme Retail",
        owner_id: "rep-jessie",
        owner_name: "Jessie Allan",
        stage: "proposal",
        probability: 60,
        amount: 420000,
        currency: "USD",
        expected_close_date: this.addDays(21),
        health: "medium_risk",
        nextAction: "Send revised implementation timeline",
        lastActivityAt: this.now(),
        created_at: this.addDays(-2),
        updated_at: this.now(),
      },
    ];

    const quotes: SalesQuote[] = [];
    const timeline: SalesTimelineEvent[] = [];
    const tasks: SalesTask[] = [];
    const alerts: SalesAlert[] = [];
    const orders: SalesOrder[] = [];
    const audit: SalesAuditEvent[] = [];

    const seeded: TenantSalesStore = {
      leads,
      opportunities,
      quotes,
      timeline,
      tasks,
      alerts,
      orders,
      audit,
    };
    this.store.set(tenant_id, seeded);
    return seeded;
  }

  private getStore(tenant_id: string): TenantSalesStore {
    return this.ensureTenant(tenant_id);
  }

  private addAudit(
    tenant_id: string,
    actor_id: string,
    action: string,
    entity_type: SalesAuditEvent["entity_type"],
    entity_id: string,
    detail: string,
  ) {
    const store = this.getStore(tenant_id);
    const item: SalesAuditEvent = {
      id: this.id("sales-audit"),
      tenant_id,
      actor_id,
      action,
      entity_type,
      entity_id,
      detail,
      created_at: this.now(),
    };
    store.audit.unshift(item);
  }

  private findRepWithLowestLoad(tenant_id: string) {
    const store = this.getStore(tenant_id);
    const load = store.opportunities
      .filter(
        (item) => item.stage !== "closed_won" && item.stage !== "closed_lost",
      )
      .reduce<Record<string, number>>((acc, item) => {
        acc[item.owner_id] = (acc[item.owner_id] ?? 0) + 1;
        return acc;
      }, {});
    return [...SALES_REPS].sort(
      (a, b) => (load[a.id] ?? 0) - (load[b.id] ?? 0),
    )[0];
  }

  private findLead(tenant_id: string, lead_id: string): SalesLead {
    const lead = this.getStore(tenant_id).leads.find(
      (item) => item.id === lead_id,
    );
    if (!lead) throw new NotFoundException("Lead not found");
    return lead;
  }

  private findOpportunity(
    tenant_id: string,
    opportunityId: string,
  ): SalesOpportunity {
    const opportunity = this.getStore(tenant_id).opportunities.find(
      (item) => item.id === opportunityId,
    );
    if (!opportunity) throw new NotFoundException("Opportunity not found");
    return opportunity;
  }

  private findQuote(tenant_id: string, quoteId: string): SalesQuote {
    const quote = this.getStore(tenant_id).quotes.find(
      (item) => item.id === quoteId,
    );
    if (!quote) throw new NotFoundException("Quote not found");
    return quote;
  }

  private createAlertIfMissing(
    tenant_id: string,
    type: SalesAlert["type"],
    entity_type: SalesAlert["entity_type"],
    entity_id: string,
    message: string,
    severity: SalesAlert["severity"],
  ) {
    const store = this.getStore(tenant_id);
    const existing = store.alerts.find(
      (item) =>
        item.type === type &&
        item.entity_type === entity_type &&
        item.entity_id === entity_id &&
        !item.acknowledged,
    );
    if (existing) return existing;
    const created: SalesAlert = {
      id: this.id("sales-alert"),
      tenant_id,
      type,
      severity,
      entity_type,
      entity_id,
      message,
      acknowledged: false,
      created_at: this.now(),
      updated_at: this.now(),
    };
    store.alerts.unshift(created);
    return created;
  }

  async getDashboard(ctx: TenantContext): Promise<SalesDashboard> {
    const store = this.getStore(ctx.tenant_id);
    const now = new Date();
    const openOpps = store.opportunities.filter(
      (item) => item.stage !== "closed_won" && item.stage !== "closed_lost",
    );
    return {
      openLeads: store.leads.filter(
        (item) => item.status !== "disqualified" && item.status !== "converted",
      ).length,
      slaDueToday: store.leads.filter((item) => {
        return (
          item.sla_due_at.getFullYear() === now.getFullYear() &&
          item.sla_due_at.getMonth() === now.getMonth() &&
          item.sla_due_at.getDate() === now.getDate()
        );
      }).length,
      overdueFollowUps: store.tasks.filter((item) => item.status === "overdue")
        .length,
      openOpportunities: openOpps.length,
      pipelineValue: openOpps.reduce((sum, item) => sum + item.amount, 0),
      weightedPipelineValue: Math.round(
        openOpps.reduce(
          (sum, item) => sum + item.amount * (item.probability / 100),
          0,
        ),
      ),
      pendingQuoteApprovals: store.quotes.filter(
        (item) => item.status === "pending_approval",
      ).length,
      dealRiskCount: store.alerts.filter(
        (item) => item.type === "deal_risk" && !item.acknowledged,
      ).length,
    };
  }

  async getManagerMetrics(ctx: TenantContext): Promise<SalesManagerMetrics> {
    const store = this.getStore(ctx.tenant_id);
    const openOpps = store.opportunities.filter(
      (item) => item.stage !== "closed_won" && item.stage !== "closed_lost",
    );
    const reps = new Set(openOpps.map((item) => item.owner_id));
    return {
      totalReps: Math.max(reps.size, SALES_REPS.length),
      openPipeline: openOpps.reduce((sum, item) => sum + item.amount, 0),
      weightedForecast: Math.round(
        openOpps.reduce(
          (sum, item) => sum + item.amount * (item.probability / 100),
          0,
        ),
      ),
      stalledDeals: openOpps.filter(
        (item) => this.hoursSince(item.lastActivityAt) > 72,
      ).length,
      slaBreaches: store.alerts.filter(
        (item) => item.type === "lead_sla_breach",
      ).length,
      approvalsPending: store.quotes.filter(
        (item) => item.status === "pending_approval",
      ).length,
    };
  }

  async getExecutiveForecast(
    ctx: TenantContext,
  ): Promise<SalesExecutiveForecast> {
    const store = this.getStore(ctx.tenant_id);
    const openOpps = store.opportunities.filter(
      (item) => item.stage !== "closed_won" && item.stage !== "closed_lost",
    );
    const wonOpps = store.opportunities.filter(
      (item) => item.stage === "closed_won",
    );
    const lostOpps = store.opportunities.filter(
      (item) => item.stage === "closed_lost",
    );
    const closed = wonOpps.length + lostOpps.length;
    const conversionRate = closed ? (wonOpps.length / closed) * 100 : 0;
    return {
      openPipelineValue: openOpps.reduce((sum, item) => sum + item.amount, 0),
      weightedForecastValue: Math.round(
        openOpps.reduce(
          (sum, item) => sum + item.amount * (item.probability / 100),
          0,
        ),
      ),
      wonThisPeriod: wonOpps.reduce((sum, item) => sum + item.amount, 0),
      lostThisPeriod: lostOpps.reduce((sum, item) => sum + item.amount, 0),
      conversionRate: Number(conversionRate.toFixed(2)),
      avgDealCycleDays: 21,
      forecastAccuracy: 91.4,
    };
  }

  async getNextBestActions(ctx: TenantContext): Promise<SalesNextAction[]> {
    const store = this.getStore(ctx.tenant_id);
    return [
      {
        id: this.id("nba"),
        title: "Follow up on proposal",
        detail:
          "Acme Retail proposal was sent 3 days ago. Recommended action: call decision maker.",
        priority: "P1",
        opportunityId: store.opportunities[0]?.id,
      },
    ];
  }

  async getSalesAnalytics(ctx: TenantContext): Promise<any> {
    return {
      revenueByMonth: [],
      topReps: [],
    };
  }

  async getForecast(ctx: TenantContext): Promise<any> {
    return {
      forecastedValue: 1200000,
      confidence: 85,
    };
  }

  async getPipelineVelocity(ctx: TenantContext): Promise<any> {
    return {
      avgDaysPerStage: {},
      totalDaysToClose: 24,
    };
  }

  async getSLAPerformance(ctx: TenantContext): Promise<any> {
    return {
      metRate: 94,
      breachCount: 2,
    };
  }

  async getPipeline(ctx: TenantContext): Promise<any[]> {
    const opportunities = this.getStore(ctx.tenant_id).opportunities;
    const stageMap: Record<string, { count: number; totalAmount: number; weightedAmount: number }> = {};

    for (const op of opportunities) {
      const stage = op.stage;
      if (!stageMap[stage]) {
        stageMap[stage] = { count: 0, totalAmount: 0, weightedAmount: 0 };
      }
      stageMap[stage].count += 1;
      stageMap[stage].totalAmount += op.amount;
      stageMap[stage].weightedAmount += op.amount * (op.probability / 100);
    }

    return Object.entries(stageMap).map(([stage, data]) => ({
      stage,
      count: data.count,
      totalAmount: Math.round(data.totalAmount),
      weightedAmount: Math.round(data.weightedAmount),
    }));
  }

  async getLeads(ctx: TenantContext, status?: string): Promise<SalesLead[]> {
    const leads = this.getStore(ctx.tenant_id).leads;
    return status ? leads.filter((item) => item.status === status) : leads;
  }

  async createLead(ctx: TenantContext, dto: CreateLeadDto): Promise<SalesLead> {
    const store = this.getStore(ctx.tenant_id);
    const owner = this.findRepWithLowestLoad(ctx.tenant_id);
    const created: SalesLead = {
      id: this.id(`${ctx.tenant_id}-lead`),
      tenant_id: ctx.tenant_id,
      company_name: dto.company_name,
      contact_name: dto.contact_name,
      contact_email: dto.contact_email,
      contactPhone: dto.contactPhone,
      source: dto.source ?? "marketing",
      owner_id: owner.id,
      owner_name: owner.name,
      score: Math.round(60 + Math.random() * 30),
      potential_value: dto.potential_value,
      currency: dto.currency ?? "USD",
      priority: dto.priority ?? "medium",
      status: "new",
      sla_due_at: this.addDays(0),
      created_at: this.now(),
      updated_at: this.now(),
    };
    store.leads.unshift(created);
    this.addAudit(
      ctx.tenant_id,
      "system",
      "lead.created",
      "lead",
      created.id,
      created.company_name,
    );
    return created;
  }

  async updateLeadStatus(
    ctx: TenantContext,
    lead_id: string,
    dto: UpdateLeadStatusDto,
  ): Promise<SalesLead> {
    const lead = this.findLead(ctx.tenant_id, lead_id);
    lead.status = dto.status;
    lead.updated_at = this.now();
    if (dto.status === "contacted" && !lead.firstResponseAt) {
      lead.firstResponseAt = this.now();
    }
    this.addAudit(
      ctx.tenant_id,
      "system",
      "lead.status_changed",
      "lead",
      lead.id,
      lead.status,
    );
    return lead;
  }

  async convertLead(
    ctx: TenantContext,
    lead_id: string,
    actor_id: string,
  ): Promise<SalesOpportunity> {
    const lead = this.findLead(ctx.tenant_id, lead_id);
    if (lead.status !== "qualified" && lead.status !== "contacted") {
      throw new BadRequestException(
        "Lead must be contacted or qualified first.",
      );
    }
    const store = this.getStore(ctx.tenant_id);
    const created: SalesOpportunity = {
      id: this.id(`${ctx.tenant_id}-opp`),
      tenant_id: ctx.tenant_id,
      lead_id: lead.id,
      account_name: lead.company_name,
      owner_id: lead.owner_id,
      owner_name: lead.owner_name,
      stage: "qualified",
      probability: STAGE_PROBABILITY.qualified,
      amount: lead.potential_value,
      currency: lead.currency,
      expected_close_date: this.addDays(30),
      health: "medium_risk",
      nextAction: "Book discovery and prepare proposal.",
      lastActivityAt: this.now(),
      created_at: this.now(),
      updated_at: this.now(),
    };
    lead.status = "converted";
    lead.updated_at = this.now();
    store.opportunities.unshift(created);
    this.addAudit(
      ctx.tenant_id,
      actor_id,
      "lead.converted",
      "opportunity",
      created.id,
      `from ${lead.id}`,
    );
    return created;
  }

  async getOpportunities(ctx: TenantContext, stage?: string): Promise<SalesOpportunity[]> {
    const opps = this.getStore(ctx.tenant_id).opportunities;
    return stage ? opps.filter((item) => item.stage === stage) : opps;
  }

  async createOpportunity(
    ctx: TenantContext,
    dto: CreateOpportunityDto,
  ): Promise<SalesOpportunity> {
    const store = this.getStore(ctx.tenant_id);
    const owner =
      dto.owner_id && dto.owner_name
        ? { id: dto.owner_id, name: dto.owner_name }
        : this.findRepWithLowestLoad(ctx.tenant_id);
    const created: SalesOpportunity = {
      id: this.id(`${ctx.tenant_id}-opp`),
      tenant_id: ctx.tenant_id,
      lead_id: dto.lead_id,
      account_name: dto.account_name,
      owner_id: owner.id,
      owner_name: owner.name,
      stage: "new",
      probability: STAGE_PROBABILITY.new,
      amount: dto.amount,
      currency: dto.currency ?? "USD",
      expected_close_date: this.addDays(30),
      health: "medium_risk",
      nextAction: dto.nextAction ?? "Initiate first discovery call.",
      lastActivityAt: this.now(),
      created_at: this.now(),
      updated_at: this.now(),
    };
    store.opportunities.unshift(created);
    this.addAudit(
      ctx.tenant_id,
      "system",
      "opportunity.created",
      "opportunity",
      created.id,
      created.account_name,
    );
    return created;
  }

  async moveOpportunityStage(
    ctx: TenantContext,
    opportunityId: string,
    dto: MoveOpportunityStageDto,
  ): Promise<SalesOpportunity> {
    const opportunity = this.findOpportunity(ctx.tenant_id, opportunityId);
    opportunity.stage = dto.stage;
    opportunity.probability = STAGE_PROBABILITY[dto.stage];
    opportunity.lastActivityAt = this.now();
    opportunity.updated_at = this.now();
    this.addAudit(
      ctx.tenant_id,
      "system",
      "opportunity.stage_changed",
      "opportunity",
      opportunity.id,
      opportunity.stage,
    );
    return opportunity;
  }

  async closeOpportunity(
    ctx: TenantContext,
    opportunityId: string,
    dto: CloseOpportunityDto,
  ): Promise<SalesOpportunity | SalesOrder> {
    const store = this.getStore(ctx.tenant_id);
    const opportunity = this.findOpportunity(ctx.tenant_id, opportunityId);
    const actor = dto.actor_id || "system";
    if (dto.result === "lost") {
      opportunity.stage = "closed_lost";
      opportunity.probability = 0;
      opportunity.updated_at = this.now();
      this.addAudit(
        ctx.tenant_id,
        actor,
        "opportunity.closed_lost",
        "opportunity",
        opportunity.id,
        dto.reason || "No reason provided",
      );
      return opportunity;
    }
    opportunity.stage = "closed_won";
    opportunity.probability = 100;
    opportunity.updated_at = this.now();
    const order: SalesOrder = {
      id: this.id(`${ctx.tenant_id}-order`),
      tenant_id: ctx.tenant_id,
      opportunityId: opportunity.id,
      quoteId: dto.quoteId,
      customerName: opportunity.account_name,
      amount: opportunity.amount,
      currency: opportunity.currency,
      status: "invoiced",
      inventoryCheck: "available",
      financeInvoiceId: this.id("invoice"),
      createdBy: actor,
      created_at: this.now(),
      updated_at: this.now(),
    };
    store.orders.unshift(order);
    this.addAudit(
      ctx.tenant_id,
      actor,
      "opportunity.closed_won",
      "order",
      order.id,
      opportunity.id,
    );
    return order;
  }

  async getQuotes(ctx: TenantContext, dealId?: string): Promise<SalesQuote[]> {
    const quotes = this.getStore(ctx.tenant_id).quotes;
    return dealId ? quotes.filter((item) => item.opportunityId === dealId) : quotes;
  }

  async createQuote(
    ctx: TenantContext,
    dto: CreateQuoteDto,
  ): Promise<SalesQuote> {
    const store = this.getStore(ctx.tenant_id);
    const opportunity = this.findOpportunity(ctx.tenant_id, dto.opportunityId);
    const versions = store.quotes
      .filter((item) => item.opportunityId === dto.opportunityId)
      .map((item) => item.version);
    const nextVersion = versions.length ? Math.max(...versions) + 1 : 1;
    const discountPercent = Math.max(0, Math.min(100, dto.discountPercent));
    const netAmount = Math.max(
      0,
      dto.amount - dto.amount * (discountPercent / 100),
    );
    const created: SalesQuote = {
      id: this.id(`${ctx.tenant_id}-quote`),
      tenant_id: ctx.tenant_id,
      opportunityId: dto.opportunityId,
      account_name: opportunity.account_name,
      version: nextVersion,
      amount: dto.amount,
      discountPercent,
      netAmount,
      currency: opportunity.currency,
      status: "draft",
      validUntil: this.addDays(dto.validDays ?? 14),
      notes: dto.notes,
      createdBy: dto.createdBy || "system",
      created_at: this.now(),
      updated_at: this.now(),
    };
    store.quotes.unshift(created);
    this.addAudit(
      ctx.tenant_id,
      created.createdBy,
      "quote.created",
      "quote",
      created.id,
      `v${created.version}`,
    );
    return created;
  }

  async submitQuote(ctx: TenantContext, quoteId: string): Promise<SalesQuote> {
    const quote = this.findQuote(ctx.tenant_id, quoteId);
    if (quote.status !== "draft") {
      throw new BadRequestException("Only draft quotes can be submitted.");
    }
    quote.status = "pending_approval";
    quote.updated_at = this.now();
    this.addAudit(
      ctx.tenant_id,
      "system",
      "quote.submitted",
      "quote",
      quote.id,
      quote.account_name,
    );
    return quote;
  }

  async decideQuote(
    ctx: TenantContext,
    quoteId: string,
    dto: QuoteDecisionDto,
  ): Promise<SalesQuote> {
    const quote = this.findQuote(ctx.tenant_id, quoteId);
    if (quote.status !== "pending_approval") {
      throw new BadRequestException("Quote is not pending approval.");
    }
    quote.status = dto.approved ? "approved" : "rejected";
    quote.approvalBy = dto.decidedBy || "system";
    quote.approvalAt = this.now();
    quote.updated_at = this.now();
    this.addAudit(
      ctx.tenant_id,
      quote.approvalBy,
      dto.approved ? "quote.approved" : "quote.rejected",
      "quote",
      quote.id,
      quote.status,
    );
    return quote;
  }

  async getTimeline(ctx: TenantContext): Promise<SalesTimelineEvent[]> {
    return this.getStore(ctx.tenant_id).timeline;
  }

  async createTimelineEvent(
    ctx: TenantContext,
    dto: CreateTimelineEventDto,
  ): Promise<SalesTimelineEvent> {
    this.findOpportunity(ctx.tenant_id, dto.opportunityId);
    const store = this.getStore(ctx.tenant_id);
    const created: SalesTimelineEvent = {
      id: this.id(`${ctx.tenant_id}-timeline`),
      tenant_id: ctx.tenant_id,
      opportunityId: dto.opportunityId,
      lead_id: dto.lead_id,
      channel: dto.channel,
      direction: dto.direction,
      summary: dto.summary,
      detail: dto.detail,
      createdBy: dto.createdBy || "system",
      created_at: this.now(),
    };
    store.timeline.unshift(created);
    this.addAudit(
      ctx.tenant_id,
      created.createdBy,
      "timeline.logged",
      "timeline",
      created.id,
      created.summary,
    );
    return created;
  }

  async getDeals(ctx: TenantContext, status?: string): Promise<any[]> {
    const orders = this.getStore(ctx.tenant_id).orders;
    return status ? orders.filter((o) => o.status === status) : orders;
  }

  async createDeal(ctx: TenantContext, dto: any): Promise<any> {
    const store = this.getStore(ctx.tenant_id);
    const created = {
      id: this.id("deal"),
      tenant_id: ctx.tenant_id,
      ...dto,
      created_at: this.now(),
      updated_at: this.now(),
    };
    store.orders.unshift(created as any);
    return created;
  }

  async getTasks(ctx: TenantContext): Promise<SalesTask[]> {
    return this.getStore(ctx.tenant_id).tasks;
  }

  async createTask(ctx: TenantContext, dto: CreateTaskDto): Promise<SalesTask> {
    const store = this.getStore(ctx.tenant_id);
    const created: SalesTask = {
      id: this.id(`${ctx.tenant_id}-task`),
      tenant_id: ctx.tenant_id,
      opportunityId: dto.opportunityId,
      lead_id: dto.lead_id,
      title: dto.title,
      owner_id: dto.owner_id || "system",
      owner_name: dto.owner_name || dto.owner_id || "system",
      status: "pending",
      priority: dto.priority || "medium",
      dueAt: new Date(dto.dueAt),
      created_at: this.now(),
      updated_at: this.now(),
    };
    store.tasks.unshift(created);
    this.addAudit(
      ctx.tenant_id,
      created.owner_id,
      "task.created",
      "task",
      created.id,
      created.title,
    );
    return created;
  }

  async completeTask(ctx: TenantContext, taskId: string): Promise<SalesTask> {
    const task = this.getStore(ctx.tenant_id).tasks.find(
      (item) => item.id === taskId,
    );
    if (!task) throw new NotFoundException("Task not found");
    task.status = "done";
    task.completedAt = this.now();
    task.updated_at = this.now();
    this.addAudit(
      ctx.tenant_id,
      task.owner_id,
      "task.completed",
      "task",
      task.id,
      task.title,
    );
    return task;
  }

  async getOrders(ctx: TenantContext): Promise<SalesOrder[]> {
    return this.getStore(ctx.tenant_id).orders;
  }

  async getAlerts(ctx: TenantContext): Promise<SalesAlert[]> {
    return this.getStore(ctx.tenant_id).alerts;
  }

  async runSlaSweep(ctx: TenantContext, actor_id: string): Promise<SalesAlert[]> {
    const store = this.getStore(ctx.tenant_id);
    const now = this.now().getTime();
    store.leads.forEach((lead) => {
      if (
        (lead.status === "new" || lead.status === "assigned") &&
        lead.sla_due_at.getTime() < now
      ) {
        this.createAlertIfMissing(
          ctx.tenant_id,
          "lead_sla_breach",
          "lead",
          lead.id,
          `Lead SLA breached for ${lead.company_name}`,
          "high",
        );
      }
    });
    this.addAudit(
      ctx.tenant_id,
      actor_id,
      "sla.sweep",
      "alert",
      "sla-run",
      "SLA sweep executed",
    );
    return store.alerts;
  }

  async getAuditEvents(ctx: TenantContext): Promise<SalesAuditEvent[]> {
    return this.getStore(ctx.tenant_id).audit;
  }

  private hoursSince(date: Date) {
    return Math.max(
      0,
      (this.now().getTime() - date.getTime()) / (1000 * 60 * 60),
    );
  }

  async recordConsolidatedSale(ctx: TenantContext, data: any): Promise<void> {
    // Mock implementation
    console.log("Mock consolidated sale recorded", data);
  }
}
