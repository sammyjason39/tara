import { Injectable, NotFoundException } from "@nestjs/common";
import {
  ISalesRepository,
  SalesDashboard,
  SalesManagerMetrics,
  SalesExecutiveForecast,
} from "./sales.repository.interface";
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
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(tenant_id: string): Promise<SalesDashboard> {
    const [leads, opportunities, quotes, alerts] = await Promise.all([
      this.prisma.sales_leads.count({ where: { tenant_id: tenant_id, status: "NEW" } }),
      this.prisma.sales_opportunities.findMany({ where: { tenant_id: tenant_id } }),
      this.prisma.sales_quotes.count({
        where: { tenant_id: tenant_id, status: "PENDING_APPROVAL" },
      }),
      this.prisma.sales_alerts.count({
        where: { tenant_id: tenant_id, acknowledged: false },
      }),
    ]);

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
      slaDueToday: 0, // Placeholder
      overdueFollowUps: 0, // Placeholder
      openOpportunities: opportunities.length,
      pipelineValue,
      weightedPipelineValue: weightedValue,
      pendingQuoteApprovals: quotes,
      dealRiskCount: alerts,
    };
  }

  async getManagerMetrics(tenant_id: string): Promise<SalesManagerMetrics> {
    const opportunities = await this.prisma.sales_opportunities.findMany({
      where: { tenant_id: tenant_id },
    });
    return {
      totalReps: 5,
      openPipeline: opportunities.reduce(
        (sum: number, op: any) => sum + Number(op.amount),
        0,
      ),
      weightedForecast: opportunities.reduce(
        (sum: number, op: any) => sum + Number(op.amount) * (op.probability / 100),
        0,
      ),
      stalledDeals: 2,
      slaBreaches: 1,
      approvalsPending: 3,
    };
  }

  async getExecutiveForecast(
    tenant_id: string,
  ): Promise<SalesExecutiveForecast> {
    return {
      openPipelineValue: 500000000,
      weightedForecastValue: 350000000,
      wonThisPeriod: 150000000,
      lostThisPeriod: 20000000,
      conversionRate: 65,
      avgDealCycleDays: 14,
      forecastAccuracy: 92,
    };
  }

  async getNextBestActions(tenant_id: string): Promise<any[]> {
    return [];
  }

  async getSalesAnalytics(tenant_id: string): Promise<any> {
    return {};
  }

  async getForecast(tenant_id: string): Promise<any> {
    return {};
  }

  async getPipelineVelocity(tenant_id: string): Promise<any> {
    return {};
  }

  async getSLAPerformance(tenant_id: string): Promise<any> {
    return {};
  }

  async getLeads(tenant_id: string): Promise<SalesLead[]> {
    return this.prisma.sales_leads.findMany({ where: { tenant_id: tenant_id } }) as any;
  }

  async createLead(tenant_id: string, dto: CreateLeadDto, tx?: any): Promise<SalesLead> {
    return (tx || this.prisma).sales_leads.create({
      data: {
        id: 'pw28wagj',
        updated_at: new Date(),
        tenant_id,
        ...dto,
        amount: dto.potential_value, // Map potential_value if needed or use schema field
        sla_due_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // Default 24h SLA
      } as any,
    }) as any;
  }

  async updateLeadStatus(
    tenant_id: string,
    lead_id: string,
    dto: UpdateLeadStatusDto,
  ): Promise<SalesLead> {
    return this.prisma.sales_leads.update({
      where: { id: lead_id },
      data: { status: dto.status },
    }) as any;
  }

  async convertLead(
    tenant_id: string,
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
        tenant_id: tenant_id,
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

  async getOpportunities(tenant_id: string): Promise<SalesOpportunity[]> {
    return this.prisma.sales_opportunities.findMany({
      where: { tenant_id: tenant_id },
    }) as any;
  }

  async createOpportunity(
    tenant_id: string,
    dto: CreateOpportunityDto,
    tx?: any
  ): Promise<SalesOpportunity> {
    return (tx || this.prisma).sales_opportunities.create({
      data: {
        id: '1n82ax4i',
        updated_at: new Date(),
        tenant_id,
        ...dto,
      } as any,
    }) as any;
  }

  async moveOpportunityStage(
    tenant_id: string,
    opportunityId: string,
    dto: MoveOpportunityStageDto,
  ): Promise<SalesOpportunity> {
    return this.prisma.sales_opportunities.update({
      where: { id: opportunityId },
      data: { stage: dto.stage },
    }) as any;
  }

  async closeOpportunity(
    tenant_id: string,
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
          tenant_id: tenant_id,
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

  async getQuotes(tenant_id: string): Promise<SalesQuote[]> {
    return this.prisma.sales_quotes.findMany({ where: { tenant_id: tenant_id } }) as any;
  }

  async createQuote(
    tenant_id: string,
    dto: CreateQuoteDto,
  ): Promise<SalesQuote> {
    return this.prisma.sales_quotes.create({
      data: {
        id: 'c7ms6sin',
        updated_at: new Date(),
        tenant_id,
        ...dto,
      } as any,
    }) as any;
  }

  async submitQuote(tenant_id: string, quoteId: string): Promise<SalesQuote> {
    return this.prisma.sales_quotes.update({
      where: { id: quoteId },
      data: { status: "PENDING_APPROVAL" },
    }) as any;
  }

  async decideQuote(
    tenant_id: string,
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

  async getTimeline(tenant_id: string): Promise<SalesTimelineEvent[]> {
    return this.prisma.sales_timeline_events.findMany({
      where: { tenant_id: tenant_id },
    }) as any;
  }

  async createTimelineEvent(
    tenant_id: string,
    dto: CreateTimelineEventDto,
  ): Promise<SalesTimelineEvent> {
    return this.prisma.sales_timeline_events.create({
      data: {
        id: 'r7o3tw1n',
        updated_at: new Date(),
        tenant_id,
        ...dto,
      } as any,
    }) as any;
  }

  async getTasks(tenant_id: string): Promise<SalesTask[]> {
    return this.prisma.sales_tasks.findMany({ where: { tenant_id: tenant_id } }) as any;
  }

  async createTask(tenant_id: string, dto: CreateTaskDto): Promise<SalesTask> {
    return this.prisma.sales_tasks.create({
      data: {
        id: 't8rtxr3e',
        updated_at: new Date(),
        tenant_id,
        ...dto,
      } as any,
    }) as any;
  }

  async getDeals(tenant_id: string): Promise<any[]> {
    return this.prisma.sales_opportunities.findMany({ where: { tenant_id } });
  }

  async createDeal(tenant_id: string, dto: any, tx?: any): Promise<any> {
    return (tx || this.prisma).sales_opportunities.create({
      data: {
        id: `DEAL-${Date.now()}`,
        updated_at: new Date(),
        tenant_id,
        ...dto,
      },
    });
  }

  async completeTask(tenant_id: string, taskId: string): Promise<SalesTask> {
    return this.prisma.sales_tasks.update({
      where: { id: taskId },
      data: { status: "COMPLETED", completed_at: new Date() },
    }) as any;
  }

  async getOrders(tenant_id: string): Promise<SalesOrder[]> {
    return this.prisma.sales_orders.findMany({ where: { tenant_id: tenant_id } }) as any;
  }

  async getAlerts(tenant_id: string): Promise<SalesAlert[]> {
    return this.prisma.sales_alerts.findMany({ where: { tenant_id: tenant_id } }) as any;
  }

  async runSlaSweep(tenant_id: string, actor_id: string): Promise<SalesAlert[]> {
    return [];
  }

  async getAuditEvents(tenant_id: string): Promise<SalesAuditEvent[]> {
    return this.prisma.sales_audit_events.findMany({ where: { tenant_id: tenant_id } }) as any;
  }
}
