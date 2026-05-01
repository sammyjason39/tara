import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import {
  ISalesRepository,
  SalesDashboard,
  SalesManagerMetrics,
  SalesExecutiveForecast,
  SalesNextAction,
} from "./sales.repository.interface";
import { TenantContext } from "../../../gateway/tenant-context.interface";
import { MultiTenancyUtil } from "../../../shared/utils/multi-tenancy.util";
import { PrismaService } from "../../../persistence/prisma.service";
import { SalesLead } from "../entities/sales-lead.entity";
import { SalesOpportunity } from "../entities/sales-opportunity.entity";
import { SalesOrder } from "../entities/sales-order.entity";
import { SalesQuote } from "../entities/sales-quote.entity";
import { SalesTask } from "../entities/sales-task.entity";
import { SalesTimelineEvent } from "../entities/sales-timeline-event.entity";
import { SalesAlert } from "../entities/sales-alert.entity";
import { SalesAuditEvent } from "../entities/sales-audit.entity";
import { CreateLeadDto } from "../dto/create-lead.dto";
import { UpdateLeadStatusDto } from "../dto/update-lead-status.dto";
import { CreateOpportunityDto } from "../dto/create-opportunity.dto";
import { MoveOpportunityStageDto } from "../dto/move-opportunity-stage.dto";
import { CloseOpportunityDto } from "../dto/close-opportunity.dto";
import { CreateQuoteDto } from "../dto/create-quote.dto";
import { QuoteDecisionDto } from "../dto/quote-decision.dto";
import { CreateTimelineEventDto } from "../dto/create-timeline-event.dto";
import { CreateTaskDto } from "../dto/create-task.dto";

@Injectable()
export class SalesDbRepository implements ISalesRepository {
  private readonly logger = new Logger(SalesDbRepository.name);
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(ctx: TenantContext): Promise<SalesDashboard> {
    const scope = MultiTenancyUtil.getScope(ctx);
    this.logger.log(`[getDashboard] tenant=${ctx.tenant_id} company=${ctx.company_id}`);
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const [leads, opportunities, quotes, alerts, followUps] = await Promise.all([
        this.prisma.sales_leads.count({ 
          where: { ...scope, status: "NEW" } 
        }),
        this.prisma.sales_opportunities.findMany({ 
          where: { ...scope, stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] } } 
        }),
        this.prisma.sales_quotes.count({
          where: { ...scope, status: "PENDING_APPROVAL" },
        }),
        this.prisma.sales_alerts.count({
          where: { ...scope, acknowledged: false },
        }),
        this.prisma.sales_tasks.count({
          where: { ...scope, status: { not: "COMPLETED" }, due_at: { lt: now } }
        })
      ]);

      const slaDueToday = await this.prisma.sales_leads.count({
        where: { ...scope, sla_due_at: { gte: startOfToday, lt: new Date(startOfToday.getTime() + 86400000) } }
      });

      const pipelineValue = opportunities.reduce(
        (sum: number, op: any) => sum + Number(op.amount),
        0,
      );
      const weightedValue = opportunities.reduce(
        (sum: number, op: any) => sum + Number(op.amount) * (op.probability / 100),
        0,
      );

      return {
        openLeads: leads,
        slaDueToday,
        overdueFollowUps: followUps,
        openOpportunities: opportunities.length,
        pipelineValue,
        weightedPipelineValue: Math.round(weightedValue),
        pendingQuoteApprovals: quotes,
        dealRiskCount: alerts,
      };
    } catch (err) {
      this.logger.error(
        `[getDashboard] Failed for tenant=${ctx.tenant_id}: ${(err as Error).message}`,
        (err as Error).stack,
      );
      throw err;
    }
  }

  async getManagerMetrics(ctx: TenantContext): Promise<SalesManagerMetrics> {
    const scope = MultiTenancyUtil.getScope(ctx);
    const opportunities = await this.prisma.sales_opportunities.findMany({
      where: { ...scope, stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] } },
    });

    const reps = await this.prisma.sales_opportunities.groupBy({
      by: ['owner_id'],
      where: scope,
      _count: true
    });

    const stalledCount = await this.prisma.sales_opportunities.count({
      where: { 
        ...scope, 
        stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] },
        updated_at: { lt: new Date(Date.now() - 72 * 60 * 60 * 1000) } // 72h no activity
      }
    });

    const breaches = await this.prisma.sales_alerts.count({
      where: { ...scope, type: "lead_sla_breach", acknowledged: false }
    });

    const quotes = await this.prisma.sales_quotes.count({
      where: { ...scope, status: "PENDING_APPROVAL" }
    });

    return {
      totalReps: reps.length,
      openPipeline: opportunities.reduce(
        (sum: number, op: any) => sum + Number(op.amount),
        0,
      ),
      weightedForecast: Math.round(opportunities.reduce(
        (sum: number, op: any) => sum + Number(op.amount) * (op.probability / 100),
        0,
      )),
      stalledDeals: stalledCount,
      slaBreaches: breaches,
      approvalsPending: quotes,
    };
  }

  async getExecutiveForecast(ctx: TenantContext): Promise<SalesExecutiveForecast> {
    const scope = MultiTenancyUtil.getScope(ctx);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);

    const [openOpps, closedOpps] = await Promise.all([
      this.prisma.sales_opportunities.findMany({
        where: { ...scope, stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] } }
      }),
      this.prisma.sales_opportunities.findMany({
        where: { ...scope, stage: { in: ["CLOSED_WON", "CLOSED_LOST"] }, updated_at: { gte: startOfMonth } }
      })
    ]);

    const wonThisPeriod = closedOpps
      .filter(o => o.stage === "CLOSED_WON")
      .reduce((sum, o) => sum + Number(o.amount), 0);

    const lostThisPeriod = closedOpps
      .filter(o => o.stage === "CLOSED_LOST")
      .reduce((sum, o) => sum + Number(o.amount), 0);

    const wonCount = closedOpps.filter(o => o.stage === "CLOSED_WON").length;
    const closedCount = closedOpps.length;
    const conversionRate = closedCount > 0 ? (wonCount / closedCount) * 100 : 0;

    const weightedValue = openOpps.reduce(
      (sum, op) => sum + Number(op.amount) * (op.probability / 100),
      0
    );

    // Avg Deal Cycle calculation (for won deals)
    const wonDealsHistory = await this.prisma.sales_opportunities.findMany({
      where: { ...scope, stage: "CLOSED_WON" },
      select: { created_at: true, updated_at: true }
    });

    let totalDays = 0;
    wonDealsHistory.forEach(d => {
      totalDays += (d.updated_at.getTime() - d.created_at.getTime()) / (1000 * 60 * 60 * 24);
    });
    const avgCycle = wonDealsHistory.length > 0 ? totalDays / wonDealsHistory.length : 0;

    return {
      openPipelineValue: openOpps.reduce((sum, o) => sum + Number(o.amount), 0),
      weightedForecastValue: Math.round(weightedValue),
      wonThisPeriod,
      lostThisPeriod,
      conversionRate: Math.round(conversionRate),
      avgDealCycleDays: Math.round(avgCycle),
      forecastAccuracy: 0, // Needs historical baseline to calculate
    };
  }

  async getNextBestActions(ctx: TenantContext): Promise<any[]> {
    return [];
  }

  async getSalesAnalytics(ctx: TenantContext): Promise<any> {
    const scope = MultiTenancyUtil.getScope(ctx);
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);

    const orders = await this.prisma.sales_orders.findMany({
      where: { ...scope, created_at: { gte: startOfYear } },
      select: { amount: true, created_at: true }
    });

    const revenueByMonth = Array(12).fill(0);
    orders.forEach(o => {
      const month = o.created_at.getMonth();
      revenueByMonth[month] += Number(o.amount);
    });

    const topReps = await this.prisma.sales_opportunities.groupBy({
      by: ['owner_name'],
      where: { ...scope, stage: "CLOSED_WON" },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 5
    });

    return {
      revenueByMonth: revenueByMonth.map((val, idx) => ({ 
        month: new Date(0, idx).toLocaleString('default', { month: 'short' }),
        revenue: val 
      })),
      topReps: topReps.map(r => ({ name: r.owner_name, total: r._sum.amount }))
    };
  }

  async getForecast(ctx: TenantContext): Promise<any> {
    const scope = MultiTenancyUtil.getScope(ctx);
    const now = new Date();
    
    const openOpps = await this.prisma.sales_opportunities.findMany({
      where: { 
        ...scope, 
        stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] },
        expected_close_date: { gte: now }
      },
      select: { amount: true, probability: true, expected_close_date: true }
    });

    // Project 6 months forward
    const projections = Array(6).fill(0).map((_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      return {
        month: date.toLocaleString('default', { month: 'short' }),
        year: date.getFullYear(),
        weighted: 0,
        commit: 0
      };
    });

    openOpps.forEach(op => {
      const monthDiff = (op.expected_close_date.getFullYear() - now.getFullYear()) * 12 + 
                        (op.expected_close_date.getMonth() - now.getMonth());
      if (monthDiff >= 0 && monthDiff < 6) {
        projections[monthDiff].weighted += Number(op.amount) * (op.probability / 100);
        if (op.probability >= 80) {
          projections[monthDiff].commit += Number(op.amount);
        }
      }
    });

    return projections;
  }

  async getPipelineVelocity(ctx: TenantContext): Promise<any> {
    return {};
  }

  async getSLAPerformance(ctx: TenantContext): Promise<any> {
    return {};
  }

  async getPipeline(ctx: TenantContext): Promise<any[]> {
    const scope = MultiTenancyUtil.getScope(ctx);
    this.logger.log(`[getPipeline] tenant=${ctx.tenant_id} company=${ctx.company_id}`);
    try {
      const STAGE_ORDER = [
        "NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION",
        "CLOSED_WON", "CLOSED_LOST",
      ];

      const opportunities = await this.prisma.sales_opportunities.findMany({
        where: scope,
        select: { stage: true, amount: true, probability: true },
      });

      // Aggregate by stage
      const stageMap: Record<string, { count: number; totalAmount: number; weightedAmount: number }> = {};
      for (const op of opportunities) {
        const stage = op.stage;
        if (!stageMap[stage]) {
          stageMap[stage] = { count: 0, totalAmount: 0, weightedAmount: 0 };
        }
        stageMap[stage].count += 1;
        stageMap[stage].totalAmount += Number(op.amount);
        stageMap[stage].weightedAmount += Number(op.amount) * (op.probability / 100);
      }

      // Return sorted by defined stage order, then any unknown stages alphabetically
      const result = STAGE_ORDER
        .filter((s) => stageMap[s])
        .map((stage) => ({
          stage,
          count: stageMap[stage].count,
          totalAmount: Math.round(stageMap[stage].totalAmount),
          weightedAmount: Math.round(stageMap[stage].weightedAmount),
        }));

      // Append any stages not in STAGE_ORDER
      const unknownStages = Object.keys(stageMap).filter((s) => !STAGE_ORDER.includes(s));
      unknownStages.sort().forEach((stage) => {
        result.push({
          stage,
          count: stageMap[stage].count,
          totalAmount: Math.round(stageMap[stage].totalAmount),
          weightedAmount: Math.round(stageMap[stage].weightedAmount),
        });
      });

      return result;
    } catch (err) {
      this.logger.error(
        `[getPipeline] Failed for tenant=${ctx.tenant_id}: ${(err as Error).message}`,
        (err as Error).stack,
      );
      throw err;
    }
  }

  async getLeads(ctx: TenantContext): Promise<SalesLead[]> {
    return this.prisma.sales_leads.findMany({ where: MultiTenancyUtil.getScope(ctx) }) as any;
  }

  async createLead(ctx: TenantContext, dto: CreateLeadDto, tx?: any): Promise<SalesLead> {
    return (tx || this.prisma).sales_leads.create({
      data: {
        id: 'pw28wagj',
        updated_at: new Date(),
        ...MultiTenancyUtil.getScope(ctx),
        ...dto,
        amount: dto.potential_value, // Map potential_value if needed or use schema field
        sla_due_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // Default 24h SLA
      } as any,
    }) as any;
  }

  async updateLeadStatus(ctx: TenantContext,
    lead_id: string,
    dto: UpdateLeadStatusDto,
  ): Promise<SalesLead> {
    return this.prisma.sales_leads.update({
      where: { id: lead_id },
      data: { status: dto.status },
    }) as any;
  }

  async convertLead(ctx: TenantContext,
    lead_id: string,
    actor_id: string,
  ): Promise<SalesOpportunity> {
    const lead = await this.prisma.sales_leads.findUnique({
      where: { id: lead_id },
    });
    if (!lead) throw new NotFoundException("Lead not found");

    return this.prisma.sales_opportunities.create({
      data: {
        id: '3hwpa82g',
        updated_at: new Date(),
        ...MultiTenancyUtil.getScope(ctx),
        lead_id: lead_id,
        account_name: lead.company_name,
        owner_id: lead.owner_id,
        owner_name: lead.owner_name,
        amount: lead.potential_value,
        currency: lead.currency,
        expected_close_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    }) as any;
  }

  async getOpportunities(ctx: TenantContext): Promise<SalesOpportunity[]> {
    return this.prisma.sales_opportunities.findMany({
      where: MultiTenancyUtil.getScope(ctx),
    }) as any;
  }

  async createOpportunity(ctx: TenantContext,
    dto: CreateOpportunityDto,
    tx?: any
  ): Promise<SalesOpportunity> {
    return (tx || this.prisma).sales_opportunities.create({
      data: {
        id: '1n82ax4i',
        updated_at: new Date(),
        ...MultiTenancyUtil.getScope(ctx),
        ...dto,
      } as any,
    }) as any;
  }

  async moveOpportunityStage(ctx: TenantContext,
    opportunityId: string,
    dto: MoveOpportunityStageDto,
  ): Promise<SalesOpportunity> {
    return this.prisma.sales_opportunities.update({
      where: { id: opportunityId },
      data: { stage: dto.stage },
    }) as any;
  }

  async closeOpportunity(ctx: TenantContext,
    opportunityId: string,
    dto: CloseOpportunityDto,
  ): Promise<SalesOpportunity | SalesOrder> {
    const result = await this.prisma.sales_opportunities.update({
      where: { id: opportunityId },
      data: { stage: dto.result === "won" ? "CLOSED_WON" : "CLOSED_LOST" },
    });

    if (dto.result === "won") {
      return this.prisma.sales_orders.create({
        data: {
        id: 'k6yujvxm',
        updated_at: new Date(),
          ...MultiTenancyUtil.getScope(ctx),
          opportunity_id: opportunityId,
          customer_name: result.account_name,
          amount: result.amount,
          currency: result.currency,
          created_by: "system",
        },
      }) as any;
    }
    return result as any;
  }

  async getQuotes(ctx: TenantContext): Promise<SalesQuote[]> {
    return this.prisma.sales_quotes.findMany({ where: MultiTenancyUtil.getScope(ctx) }) as any;
  }

  async createQuote(ctx: TenantContext,
    dto: CreateQuoteDto,
  ): Promise<SalesQuote> {
    return this.prisma.sales_quotes.create({
      data: {
        id: 'c7ms6sin',
        updated_at: new Date(),
        ...MultiTenancyUtil.getScope(ctx),
        ...dto,
      } as any,
    }) as any;
  }

  async submitQuote(ctx: TenantContext, quoteId: string): Promise<SalesQuote> {
    return this.prisma.sales_quotes.update({
      where: { id: quoteId },
      data: { status: "PENDING_APPROVAL" },
    }) as any;
  }

  async decideQuote(ctx: TenantContext,
    quoteId: string,
    dto: QuoteDecisionDto,
  ): Promise<SalesQuote> {
    return this.prisma.sales_quotes.update({
      where: { id: quoteId },
      data: {
        status: dto.approved ? "APPROVED" : "REJECTED",
        approval_by: "manager",
        approval_at: new Date(),
      },
    }) as any;
  }

  async getTimeline(ctx: TenantContext): Promise<SalesTimelineEvent[]> {
    return this.prisma.sales_timeline_events.findMany({
      where: MultiTenancyUtil.getScope(ctx),
    }) as any;
  }

  async createTimelineEvent(ctx: TenantContext,
    dto: CreateTimelineEventDto,
  ): Promise<SalesTimelineEvent> {
    return this.prisma.sales_timeline_events.create({
      data: {
        id: 'r7o3tw1n',
        updated_at: new Date(),
        ...MultiTenancyUtil.getScope(ctx),
        ...dto,
      } as any,
    }) as any;
  }

  async getTasks(ctx: TenantContext): Promise<SalesTask[]> {
    return this.prisma.sales_tasks.findMany({ where: MultiTenancyUtil.getScope(ctx) }) as any;
  }

  async createTask(ctx: TenantContext, dto: CreateTaskDto): Promise<SalesTask> {
    return this.prisma.sales_tasks.create({
      data: {
        id: 't8rtxr3e',
        updated_at: new Date(),
        ...MultiTenancyUtil.getScope(ctx),
        ...dto,
      } as any,
    }) as any;
  }

  async getDeals(ctx: TenantContext): Promise<any[]> {
    return this.prisma.sales_opportunities.findMany({ where: { ...MultiTenancyUtil.getScope(ctx) } });
  }

  async createDeal(ctx: TenantContext, dto: any, tx?: any): Promise<any> {
    return (tx || this.prisma).sales_opportunities.create({
      data: {
        id: `DEAL-${Date.now()}`,
        updated_at: new Date(),
        ...MultiTenancyUtil.getScope(ctx),
        ...dto,
      },
    });
  }

  async completeTask(ctx: TenantContext, taskId: string): Promise<SalesTask> {
    return this.prisma.sales_tasks.update({
      where: { id: taskId },
      data: { status: "COMPLETED", completed_at: new Date() },
    }) as any;
  }

  async getOrders(ctx: TenantContext): Promise<SalesOrder[]> {
    return this.prisma.sales_orders.findMany({ where: MultiTenancyUtil.getScope(ctx) }) as any;
  }

  async getAlerts(ctx: TenantContext): Promise<SalesAlert[]> {
    return this.prisma.sales_alerts.findMany({ where: MultiTenancyUtil.getScope(ctx) }) as any;
  }

  async runSlaSweep(ctx: TenantContext, actor_id: string): Promise<SalesAlert[]> {
    return [];
  }

  async getAuditEvents(ctx: TenantContext): Promise<SalesAuditEvent[]> {
    return this.prisma.sales_audit_events.findMany({ where: MultiTenancyUtil.getScope(ctx) }) as any;
  }

  async recordConsolidatedSale(ctx: TenantContext, data: any): Promise<void> {
    await this.prisma.sales_orders.create({
      data: {
        id: `SALES-${data.external_id || Date.now()}`,
        updated_at: new Date(),
        ...MultiTenancyUtil.getScope(ctx),
        company_id: data.company_id || null,
        ecommerce_id: data.ecommerce_id || null,
        opportunity_id: data.opportunity_id || "EXTERNAL_SYNC",
        customer_name: data.customer_name || 'Retail Customer',
        amount: data.amount,
        currency: data.currency || 'IDR',
        created_by: 'RETAIL_MODULE_SYNC',
        metadata: {
          source: data.source,
          store_id: data.store_id, // Branch level isolation in metadata
          location_id: data.location_id,
          items_count: data.items?.length || 0,
        },
      },
    });
  }
}
