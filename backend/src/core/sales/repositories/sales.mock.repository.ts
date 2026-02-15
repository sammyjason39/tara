import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CloseOpportunityDto } from '../dto/close-opportunity.dto';
import { CreateLeadDto } from '../dto/create-lead.dto';
import { CreateOpportunityDto } from '../dto/create-opportunity.dto';
import { CreateQuoteDto } from '../dto/create-quote.dto';
import { CreateTaskDto } from '../dto/create-task.dto';
import { CreateTimelineEventDto } from '../dto/create-timeline-event.dto';
import { MoveOpportunityStageDto } from '../dto/move-opportunity-stage.dto';
import { QuoteDecisionDto } from '../dto/quote-decision.dto';
import { UpdateLeadStatusDto } from '../dto/update-lead-status.dto';
import { SalesAlert } from '../entities/sales-alert.entity';
import { SalesAuditEvent } from '../entities/sales-audit.entity';
import { SalesLead } from '../entities/sales-lead.entity';
import { SalesOpportunity } from '../entities/sales-opportunity.entity';
import { SalesOrder } from '../entities/sales-order.entity';
import { SalesQuote } from '../entities/sales-quote.entity';
import { SalesTask } from '../entities/sales-task.entity';
import { SalesTimelineEvent } from '../entities/sales-timeline-event.entity';
import {
  ISalesRepository,
  SalesDashboard,
  SalesExecutiveForecast,
  SalesManagerMetrics,
} from './sales.repository.interface';

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

const STAGE_PROBABILITY: Record<SalesOpportunity['stage'], number> = {
  new: 10,
  contacted: 20,
  qualified: 40,
  proposal: 60,
  negotiation: 80,
  closed_won: 100,
  closed_lost: 0,
};

const SALES_REPS = [
  { id: 'rep-jessie', name: 'Jessie Allan' },
  { id: 'rep-ava', name: 'Ava Reynolds' },
  { id: 'rep-henry', name: 'Henry Pham' },
  { id: 'rep-olivia', name: 'Olivia Tan' },
];

@Injectable()
export class SalesMockRepository extends ISalesRepository {
  private readonly store = new Map<string, TenantSalesStore>();

  constructor() {
    super();
    this.ensureTenant('tenant-001');
    this.ensureTenant('tenant-002');
  }

  private now() {
    return new Date();
  }

  private nowIso() {
    return this.now().toISOString();
  }

  private id(prefix: string) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }

  private addDays(days: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  private ensureTenant(tenantId: string): TenantSalesStore {
    const existing = this.store.get(tenantId);
    if (existing) return existing;

    const leads: SalesLead[] = [
      {
        id: `${tenantId}-lead-1`,
        tenantId,
        companyName: 'Acme Retail',
        contactName: 'Lena Ward',
        contactEmail: 'lena.ward@acmeretail.example',
        source: 'marketing',
        ownerId: 'rep-jessie',
        ownerName: 'Jessie Allan',
        score: 88,
        potentialValue: 420000,
        currency: 'USD',
        priority: 'high',
        status: 'contacted',
        slaDueAt: this.addDays(0),
        firstResponseAt: this.now(),
        createdAt: this.addDays(-1),
        updatedAt: this.now(),
      },
      {
        id: `${tenantId}-lead-2`,
        tenantId,
        companyName: 'Northline Group',
        contactName: 'Carlos Nguyen',
        source: 'referral',
        ownerId: 'rep-ava',
        ownerName: 'Ava Reynolds',
        score: 74,
        potentialValue: 260000,
        currency: 'USD',
        priority: 'medium',
        status: 'new',
        slaDueAt: this.addDays(0),
        createdAt: this.addDays(-1),
        updatedAt: this.now(),
      },
    ];

    const opportunities: SalesOpportunity[] = [
      {
        id: `${tenantId}-opp-1`,
        tenantId,
        leadId: `${tenantId}-lead-1`,
        accountName: 'Acme Retail',
        ownerId: 'rep-jessie',
        ownerName: 'Jessie Allan',
        stage: 'proposal',
        probability: 60,
        amount: 420000,
        currency: 'USD',
        expectedCloseDate: this.addDays(21),
        health: 'medium_risk',
        nextAction: 'Send revised implementation timeline',
        lastActivityAt: this.now(),
        createdAt: this.addDays(-2),
        updatedAt: this.now(),
      },
    ];

    const quotes: SalesQuote[] = [
      {
        id: `${tenantId}-quote-1`,
        tenantId,
        opportunityId: `${tenantId}-opp-1`,
        accountName: 'Acme Retail',
        version: 1,
        amount: 420000,
        discountPercent: 5,
        netAmount: 399000,
        currency: 'USD',
        status: 'pending_approval',
        validUntil: this.addDays(14),
        createdBy: 'rep-jessie',
        createdAt: this.addDays(-1),
        updatedAt: this.now(),
      },
    ];

    const timeline: SalesTimelineEvent[] = [
      {
        id: `${tenantId}-timeline-1`,
        tenantId,
        opportunityId: `${tenantId}-opp-1`,
        leadId: `${tenantId}-lead-1`,
        channel: 'email',
        direction: 'outbound',
        summary: 'Proposal sent',
        detail: 'Shared v1 proposal and timeline.',
        createdBy: 'rep-jessie',
        createdAt: this.now(),
      },
    ];

    const tasks: SalesTask[] = [
      {
        id: `${tenantId}-task-1`,
        tenantId,
        opportunityId: `${tenantId}-opp-1`,
        title: 'Follow-up call with buyer',
        ownerId: 'rep-jessie',
        ownerName: 'Jessie Allan',
        status: 'pending',
        priority: 'high',
        dueAt: this.addDays(1),
        createdAt: this.now(),
        updatedAt: this.now(),
      },
    ];

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
    this.store.set(tenantId, seeded);
    return seeded;
  }

  private getStore(tenantId: string): TenantSalesStore {
    return this.ensureTenant(tenantId);
  }

  private addAudit(
    tenantId: string,
    actorId: string,
    action: string,
    entityType: SalesAuditEvent['entityType'],
    entityId: string,
    detail: string,
  ) {
    const store = this.getStore(tenantId);
    const item: SalesAuditEvent = {
      id: this.id('sales-audit'),
      tenantId,
      actorId,
      action,
      entityType,
      entityId,
      detail,
      createdAt: this.now(),
    };
    store.audit.unshift(item);
  }

  private findRepWithLowestLoad(tenantId: string) {
    const store = this.getStore(tenantId);
    const load = store.opportunities
      .filter((item) => item.stage !== 'closed_won' && item.stage !== 'closed_lost')
      .reduce<Record<string, number>>((acc, item) => {
        acc[item.ownerId] = (acc[item.ownerId] ?? 0) + 1;
        return acc;
      }, {});
    return [...SALES_REPS].sort((a, b) => (load[a.id] ?? 0) - (load[b.id] ?? 0))[0];
  }

  private findLead(tenantId: string, leadId: string): SalesLead {
    const lead = this.getStore(tenantId).leads.find((item) => item.id === leadId);
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  private findOpportunity(tenantId: string, opportunityId: string): SalesOpportunity {
    const opportunity = this.getStore(tenantId).opportunities.find((item) => item.id === opportunityId);
    if (!opportunity) throw new NotFoundException('Opportunity not found');
    return opportunity;
  }

  private findQuote(tenantId: string, quoteId: string): SalesQuote {
    const quote = this.getStore(tenantId).quotes.find((item) => item.id === quoteId);
    if (!quote) throw new NotFoundException('Quote not found');
    return quote;
  }

  private createAlertIfMissing(
    tenantId: string,
    type: SalesAlert['type'],
    entityType: SalesAlert['entityType'],
    entityId: string,
    message: string,
    severity: SalesAlert['severity'],
  ) {
    const store = this.getStore(tenantId);
    const existing = store.alerts.find(
      (item) =>
        item.type === type &&
        item.entityType === entityType &&
        item.entityId === entityId &&
        !item.acknowledged,
    );
    if (existing) return existing;
    const created: SalesAlert = {
      id: this.id('sales-alert'),
      tenantId,
      type,
      severity,
      entityType,
      entityId,
      message,
      acknowledged: false,
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    store.alerts.unshift(created);
    return created;
  }

  async getDashboard(tenantId: string): Promise<SalesDashboard> {
    const store = this.getStore(tenantId);
    const now = new Date();
    const openOpps = store.opportunities.filter(
      (item) => item.stage !== 'closed_won' && item.stage !== 'closed_lost',
    );
    return {
      openLeads: store.leads.filter((item) => item.status !== 'disqualified' && item.status !== 'converted').length,
      slaDueToday: store.leads.filter((item) => {
        return (
          item.slaDueAt.getFullYear() === now.getFullYear() &&
          item.slaDueAt.getMonth() === now.getMonth() &&
          item.slaDueAt.getDate() === now.getDate()
        );
      }).length,
      overdueFollowUps: store.tasks.filter((item) => item.status === 'overdue').length,
      openOpportunities: openOpps.length,
      pipelineValue: openOpps.reduce((sum, item) => sum + item.amount, 0),
      weightedPipelineValue: Math.round(
        openOpps.reduce((sum, item) => sum + item.amount * (item.probability / 100), 0),
      ),
      pendingQuoteApprovals: store.quotes.filter((item) => item.status === 'pending_approval').length,
      dealRiskCount: store.alerts.filter((item) => item.type === 'deal_risk' && !item.acknowledged).length,
    };
  }

  async getManagerMetrics(tenantId: string): Promise<SalesManagerMetrics> {
    const store = this.getStore(tenantId);
    const openOpps = store.opportunities.filter(
      (item) => item.stage !== 'closed_won' && item.stage !== 'closed_lost',
    );
    const reps = new Set(openOpps.map((item) => item.ownerId));
    return {
      totalReps: Math.max(reps.size, SALES_REPS.length),
      openPipeline: openOpps.reduce((sum, item) => sum + item.amount, 0),
      weightedForecast: Math.round(
        openOpps.reduce((sum, item) => sum + item.amount * (item.probability / 100), 0),
      ),
      stalledDeals: openOpps.filter((item) => this.hoursSince(item.lastActivityAt) > 72).length,
      slaBreaches: store.alerts.filter((item) => item.type === 'lead_sla_breach').length,
      approvalsPending: store.quotes.filter((item) => item.status === 'pending_approval').length,
    };
  }

  async getExecutiveForecast(tenantId: string): Promise<SalesExecutiveForecast> {
    const store = this.getStore(tenantId);
    const openOpps = store.opportunities.filter(
      (item) => item.stage !== 'closed_won' && item.stage !== 'closed_lost',
    );
    const wonOpps = store.opportunities.filter((item) => item.stage === 'closed_won');
    const lostOpps = store.opportunities.filter((item) => item.stage === 'closed_lost');
    const closed = wonOpps.length + lostOpps.length;
    const conversionRate = closed ? (wonOpps.length / closed) * 100 : 0;
    return {
      openPipelineValue: openOpps.reduce((sum, item) => sum + item.amount, 0),
      weightedForecastValue: Math.round(
        openOpps.reduce((sum, item) => sum + item.amount * (item.probability / 100), 0),
      ),
      wonThisPeriod: wonOpps.reduce((sum, item) => sum + item.amount, 0),
      lostThisPeriod: lostOpps.reduce((sum, item) => sum + item.amount, 0),
      conversionRate: Number(conversionRate.toFixed(2)),
      avgDealCycleDays: 21,
      forecastAccuracy: 91.4,
    };
  }

  async getLeads(tenantId: string): Promise<SalesLead[]> {
    return this.getStore(tenantId).leads;
  }

  async createLead(tenantId: string, dto: CreateLeadDto): Promise<SalesLead> {
    const store = this.getStore(tenantId);
    const owner = this.findRepWithLowestLoad(tenantId);
    const created: SalesLead = {
      id: this.id(`${tenantId}-lead`),
      tenantId,
      companyName: dto.companyName,
      contactName: dto.contactName,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
      source: dto.source ?? 'marketing',
      ownerId: owner.id,
      ownerName: owner.name,
      score: Math.round(60 + Math.random() * 30),
      potentialValue: dto.potentialValue,
      currency: dto.currency ?? 'USD',
      priority: dto.priority ?? 'medium',
      status: 'new',
      slaDueAt: this.addDays(0),
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    store.leads.unshift(created);
    this.addAudit(tenantId, 'system', 'lead.created', 'lead', created.id, created.companyName);
    return created;
  }

  async updateLeadStatus(
    tenantId: string,
    leadId: string,
    dto: UpdateLeadStatusDto,
  ): Promise<SalesLead> {
    const lead = this.findLead(tenantId, leadId);
    lead.status = dto.status;
    lead.updatedAt = this.now();
    if (dto.status === 'contacted' && !lead.firstResponseAt) {
      lead.firstResponseAt = this.now();
    }
    this.addAudit(tenantId, 'system', 'lead.status_changed', 'lead', lead.id, lead.status);
    return lead;
  }

  async convertLead(tenantId: string, leadId: string, actorId: string): Promise<SalesOpportunity> {
    const lead = this.findLead(tenantId, leadId);
    if (lead.status !== 'qualified' && lead.status !== 'contacted') {
      throw new BadRequestException('Lead must be contacted or qualified first.');
    }
    const store = this.getStore(tenantId);
    const created: SalesOpportunity = {
      id: this.id(`${tenantId}-opp`),
      tenantId,
      leadId: lead.id,
      accountName: lead.companyName,
      ownerId: lead.ownerId,
      ownerName: lead.ownerName,
      stage: 'qualified',
      probability: STAGE_PROBABILITY.qualified,
      amount: lead.potentialValue,
      currency: lead.currency,
      expectedCloseDate: this.addDays(30),
      health: 'medium_risk',
      nextAction: 'Book discovery and prepare proposal.',
      lastActivityAt: this.now(),
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    lead.status = 'converted';
    lead.updatedAt = this.now();
    store.opportunities.unshift(created);
    this.addAudit(tenantId, actorId, 'lead.converted', 'opportunity', created.id, `from ${lead.id}`);
    return created;
  }

  async getOpportunities(tenantId: string): Promise<SalesOpportunity[]> {
    return this.getStore(tenantId).opportunities;
  }

  async createOpportunity(tenantId: string, dto: CreateOpportunityDto): Promise<SalesOpportunity> {
    const store = this.getStore(tenantId);
    const owner =
      dto.ownerId && dto.ownerName
        ? { id: dto.ownerId, name: dto.ownerName }
        : this.findRepWithLowestLoad(tenantId);
    const created: SalesOpportunity = {
      id: this.id(`${tenantId}-opp`),
      tenantId,
      leadId: dto.leadId,
      accountName: dto.accountName,
      ownerId: owner.id,
      ownerName: owner.name,
      stage: 'new',
      probability: STAGE_PROBABILITY.new,
      amount: dto.amount,
      currency: dto.currency ?? 'USD',
      expectedCloseDate: this.addDays(30),
      health: 'medium_risk',
      nextAction: dto.nextAction ?? 'Initiate first discovery call.',
      lastActivityAt: this.now(),
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    store.opportunities.unshift(created);
    this.addAudit(tenantId, 'system', 'opportunity.created', 'opportunity', created.id, created.accountName);
    return created;
  }

  async moveOpportunityStage(
    tenantId: string,
    opportunityId: string,
    dto: MoveOpportunityStageDto,
  ): Promise<SalesOpportunity> {
    const opportunity = this.findOpportunity(tenantId, opportunityId);
    opportunity.stage = dto.stage;
    opportunity.probability = STAGE_PROBABILITY[dto.stage];
    opportunity.lastActivityAt = this.now();
    opportunity.updatedAt = this.now();
    if (dto.stage === 'closed_won' || dto.stage === 'closed_lost') {
      opportunity.health = 'low_risk';
    } else if (opportunity.probability < 40) {
      opportunity.health = 'high_risk';
    } else if (opportunity.probability < 65) {
      opportunity.health = 'medium_risk';
    } else {
      opportunity.health = 'low_risk';
    }
    this.addAudit(
      tenantId,
      'system',
      'opportunity.stage_changed',
      'opportunity',
      opportunity.id,
      opportunity.stage,
    );
    return opportunity;
  }

  async closeOpportunity(
    tenantId: string,
    opportunityId: string,
    dto: CloseOpportunityDto,
  ): Promise<SalesOpportunity | SalesOrder> {
    const store = this.getStore(tenantId);
    const opportunity = this.findOpportunity(tenantId, opportunityId);
    const actor = dto.actorId || 'system';
    if (dto.result === 'lost') {
      opportunity.stage = 'closed_lost';
      opportunity.probability = 0;
      opportunity.health = 'low_risk';
      opportunity.nextAction = 'Closed lost';
      opportunity.updatedAt = this.now();
      opportunity.lastActivityAt = this.now();
      this.addAudit(
        tenantId,
        actor,
        'opportunity.closed_lost',
        'opportunity',
        opportunity.id,
        dto.reason || 'No reason provided',
      );
      return opportunity;
    }
    opportunity.stage = 'closed_won';
    opportunity.probability = 100;
    opportunity.health = 'low_risk';
    opportunity.updatedAt = this.now();
    opportunity.lastActivityAt = this.now();
    const order: SalesOrder = {
      id: this.id(`${tenantId}-order`),
      tenantId,
      opportunityId: opportunity.id,
      quoteId: dto.quoteId,
      customerName: opportunity.accountName,
      amount: opportunity.amount,
      currency: opportunity.currency,
      status: 'invoiced',
      inventoryCheck: 'available',
      financeInvoiceId: this.id('invoice'),
      createdBy: actor,
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    store.orders.unshift(order);
    this.addAudit(tenantId, actor, 'opportunity.closed_won', 'order', order.id, opportunity.id);
    return order;
  }

  async getQuotes(tenantId: string): Promise<SalesQuote[]> {
    return this.getStore(tenantId).quotes;
  }

  async createQuote(tenantId: string, dto: CreateQuoteDto): Promise<SalesQuote> {
    const store = this.getStore(tenantId);
    const opportunity = this.findOpportunity(tenantId, dto.opportunityId);
    const versions = store.quotes
      .filter((item) => item.opportunityId === dto.opportunityId)
      .map((item) => item.version);
    const nextVersion = versions.length ? Math.max(...versions) + 1 : 1;
    const discountPercent = Math.max(0, Math.min(100, dto.discountPercent));
    const netAmount = Math.max(0, dto.amount - dto.amount * (discountPercent / 100));
    const created: SalesQuote = {
      id: this.id(`${tenantId}-quote`),
      tenantId,
      opportunityId: dto.opportunityId,
      accountName: opportunity.accountName,
      version: nextVersion,
      amount: dto.amount,
      discountPercent,
      netAmount,
      currency: opportunity.currency,
      status: 'draft',
      validUntil: this.addDays(dto.validDays ?? 14),
      notes: dto.notes,
      createdBy: dto.createdBy || 'system',
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    store.quotes.unshift(created);
    this.addAudit(tenantId, created.createdBy, 'quote.created', 'quote', created.id, `v${created.version}`);
    return created;
  }

  async submitQuote(tenantId: string, quoteId: string): Promise<SalesQuote> {
    const quote = this.findQuote(tenantId, quoteId);
    if (quote.status !== 'draft') {
      throw new BadRequestException('Only draft quotes can be submitted.');
    }
    quote.status = 'pending_approval';
    quote.updatedAt = this.now();
    this.createAlertIfMissing(
      tenantId,
      'quote_approval_delay',
      'quote',
      quote.id,
      `Quote ${quote.id} pending approval`,
      'medium',
    );
    this.addAudit(tenantId, 'system', 'quote.submitted', 'quote', quote.id, quote.accountName);
    return quote;
  }

  async decideQuote(tenantId: string, quoteId: string, dto: QuoteDecisionDto): Promise<SalesQuote> {
    const quote = this.findQuote(tenantId, quoteId);
    if (quote.status !== 'pending_approval') {
      throw new BadRequestException('Quote is not pending approval.');
    }
    quote.status = dto.approved ? 'approved' : 'rejected';
    quote.approvalBy = dto.decidedBy || 'system';
    quote.approvalAt = this.now();
    quote.updatedAt = this.now();
    this.addAudit(
      tenantId,
      quote.approvalBy,
      dto.approved ? 'quote.approved' : 'quote.rejected',
      'quote',
      quote.id,
      quote.status,
    );
    return quote;
  }

  async getTimeline(tenantId: string): Promise<SalesTimelineEvent[]> {
    return this.getStore(tenantId).timeline;
  }

  async createTimelineEvent(
    tenantId: string,
    dto: CreateTimelineEventDto,
  ): Promise<SalesTimelineEvent> {
    this.findOpportunity(tenantId, dto.opportunityId);
    const store = this.getStore(tenantId);
    const created: SalesTimelineEvent = {
      id: this.id(`${tenantId}-timeline`),
      tenantId,
      opportunityId: dto.opportunityId,
      leadId: dto.leadId,
      channel: dto.channel,
      direction: dto.direction,
      summary: dto.summary,
      detail: dto.detail,
      createdBy: dto.createdBy || 'system',
      createdAt: this.now(),
    };
    store.timeline.unshift(created);
    this.addAudit(
      tenantId,
      created.createdBy,
      'timeline.logged',
      'timeline',
      created.id,
      created.summary,
    );
    return created;
  }

  async getTasks(tenantId: string): Promise<SalesTask[]> {
    return this.getStore(tenantId).tasks;
  }

  async createTask(tenantId: string, dto: CreateTaskDto): Promise<SalesTask> {
    const store = this.getStore(tenantId);
    const created: SalesTask = {
      id: this.id(`${tenantId}-task`),
      tenantId,
      opportunityId: dto.opportunityId,
      leadId: dto.leadId,
      title: dto.title,
      ownerId: dto.ownerId || 'system',
      ownerName: dto.ownerName || dto.ownerId || 'system',
      status: 'pending',
      priority: dto.priority || 'medium',
      dueAt: new Date(dto.dueAt),
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    store.tasks.unshift(created);
    this.addAudit(tenantId, created.ownerId, 'task.created', 'task', created.id, created.title);
    return created;
  }

  async completeTask(tenantId: string, taskId: string): Promise<SalesTask> {
    const task = this.getStore(tenantId).tasks.find((item) => item.id === taskId);
    if (!task) throw new NotFoundException('Task not found');
    task.status = 'done';
    task.completedAt = this.now();
    task.updatedAt = this.now();
    this.addAudit(tenantId, task.ownerId, 'task.completed', 'task', task.id, task.title);
    return task;
  }

  async getOrders(tenantId: string): Promise<SalesOrder[]> {
    return this.getStore(tenantId).orders;
  }

  async getAlerts(tenantId: string): Promise<SalesAlert[]> {
    return this.getStore(tenantId).alerts;
  }

  async runSlaSweep(tenantId: string, actorId: string): Promise<SalesAlert[]> {
    const store = this.getStore(tenantId);
    const now = this.now().getTime();
    store.leads.forEach((lead) => {
      if ((lead.status === 'new' || lead.status === 'assigned') && lead.slaDueAt.getTime() < now) {
        this.createAlertIfMissing(
          tenantId,
          'lead_sla_breach',
          'lead',
          lead.id,
          `Lead SLA breached for ${lead.companyName}`,
          'high',
        );
      }
    });
    store.tasks.forEach((task) => {
      if ((task.status === 'pending' || task.status === 'in_progress') && task.dueAt.getTime() < now) {
        task.status = 'overdue';
        task.updatedAt = this.now();
        this.createAlertIfMissing(
          tenantId,
          'follow_up_overdue',
          'task',
          task.id,
          `Follow-up overdue: ${task.title}`,
          task.priority === 'urgent' ? 'high' : 'medium',
        );
      }
    });
    store.opportunities.forEach((opportunity) => {
      const staleHours = this.hoursSince(opportunity.lastActivityAt);
      if (
        opportunity.stage !== 'closed_won' &&
        opportunity.stage !== 'closed_lost' &&
        staleHours > 72
      ) {
        opportunity.health = 'high_risk';
        opportunity.updatedAt = this.now();
        this.createAlertIfMissing(
          tenantId,
          'deal_risk',
          'opportunity',
          opportunity.id,
          `Deal appears stalled for ${opportunity.accountName}`,
          'high',
        );
      }
    });
    this.addAudit(tenantId, actorId, 'sla.sweep', 'alert', 'sla-run', 'SLA sweep executed');
    return store.alerts;
  }

  async getAuditEvents(tenantId: string): Promise<SalesAuditEvent[]> {
    return this.getStore(tenantId).audit;
  }

  private hoursSince(date: Date) {
    return Math.max(0, (this.now().getTime() - date.getTime()) / (1000 * 60 * 60));
  }
}
