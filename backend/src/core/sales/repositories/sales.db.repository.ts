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

  async getDashboard(tenantId: string): Promise<SalesDashboard> {
    const [leads, opportunities, quotes, alerts] = await Promise.all([
      this.prisma.salesLead.count({ where: { tenantId, status: "NEW" } }),
      this.prisma.salesOpportunity.findMany({ where: { tenantId } }),
      this.prisma.salesQuote.count({
        where: { tenantId, status: "PENDING_APPROVAL" },
      }),
      this.prisma.salesAlert.count({
        where: { tenantId, acknowledged: false },
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

  async getManagerMetrics(tenantId: string): Promise<SalesManagerMetrics> {
    const opportunities = await this.prisma.salesOpportunity.findMany({
      where: { tenantId },
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
    tenantId: string,
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

  async getNextBestActions(tenantId: string): Promise<any[]> {
    return [];
  }

  async getLeads(tenantId: string): Promise<SalesLead[]> {
    return this.prisma.salesLead.findMany({ where: { tenantId } }) as any;
  }

  async createLead(tenantId: string, dto: CreateLeadDto): Promise<SalesLead> {
    return this.prisma.salesLead.create({
      data: {
        id: 'pw28wagj',
        updatedAt: new Date(),
        tenantId,
        ...dto,
        amount: dto.potentialValue, // Map potentialValue if needed or use schema field
        slaDueAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Default 24h SLA
      } as any,
    }) as any;
  }

  async updateLeadStatus(
    tenantId: string,
    leadId: string,
    dto: UpdateLeadStatusDto,
  ): Promise<SalesLead> {
    return this.prisma.salesLead.update({
      where: { id: leadId },
      data: { status: dto.status },
    }) as any;
  }

  async convertLead(
    tenantId: string,
    leadId: string,
    actorId: string,
  ): Promise<SalesOpportunity> {
    const lead = await this.prisma.salesLead.findUnique({
      where: { id: leadId },
    });
    if (!lead) throw new NotFoundException("Lead not found");

    return this.prisma.salesOpportunity.create({
      data: {
        id: '3hwpa82g',
        updatedAt: new Date(),
        tenantId,
        leadId,
        accountName: lead.companyName,
        ownerId: lead.ownerId,
        ownerName: lead.ownerName,
        amount: lead.potentialValue,
        currency: lead.currency,
        expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    }) as any;
  }

  async getOpportunities(tenantId: string): Promise<SalesOpportunity[]> {
    return this.prisma.salesOpportunity.findMany({
      where: { tenantId },
    }) as any;
  }

  async createOpportunity(
    tenantId: string,
    dto: CreateOpportunityDto,
  ): Promise<SalesOpportunity> {
    return this.prisma.salesOpportunity.create({
      data: {
        id: '1n82ax4i',
        updatedAt: new Date(),
        tenantId,
        ...dto,
      } as any,
    }) as any;
  }

  async moveOpportunityStage(
    tenantId: string,
    opportunityId: string,
    dto: MoveOpportunityStageDto,
  ): Promise<SalesOpportunity> {
    return this.prisma.salesOpportunity.update({
      where: { id: opportunityId },
      data: { stage: dto.stage },
    }) as any;
  }

  async closeOpportunity(
    tenantId: string,
    opportunityId: string,
    dto: CloseOpportunityDto,
  ): Promise<SalesOpportunity | SalesOrder> {
    const result = await this.prisma.salesOpportunity.update({
      where: { id: opportunityId },
      data: { stage: dto.result === "won" ? "CLOSED_WON" : "CLOSED_LOST" },
    });

    if (dto.result === "won") {
      return this.prisma.salesOrder.create({
        data: {
        id: 'k6yujvxm',
        updatedAt: new Date(),
          tenantId,
          opportunityId,
          customerName: result.accountName,
          amount: result.amount,
          currency: result.currency,
          createdBy: "system",
        },
      }) as any;
    }
    return result as any;
  }

  async getQuotes(tenantId: string): Promise<SalesQuote[]> {
    return this.prisma.salesQuote.findMany({ where: { tenantId } }) as any;
  }

  async createQuote(
    tenantId: string,
    dto: CreateQuoteDto,
  ): Promise<SalesQuote> {
    return this.prisma.salesQuote.create({
      data: {
        id: 'c7ms6sin',
        updatedAt: new Date(),
        tenantId,
        ...dto,
      } as any,
    }) as any;
  }

  async submitQuote(tenantId: string, quoteId: string): Promise<SalesQuote> {
    return this.prisma.salesQuote.update({
      where: { id: quoteId },
      data: { status: "PENDING_APPROVAL" },
    }) as any;
  }

  async decideQuote(
    tenantId: string,
    quoteId: string,
    dto: QuoteDecisionDto,
  ): Promise<SalesQuote> {
    return this.prisma.salesQuote.update({
      where: { id: quoteId },
      data: {
        status: dto.approved ? "APPROVED" : "REJECTED",
        approvalBy: "manager",
        approvalAt: new Date(),
      },
    }) as any;
  }

  async getTimeline(tenantId: string): Promise<SalesTimelineEvent[]> {
    return this.prisma.salesTimelineEvent.findMany({
      where: { tenantId },
    }) as any;
  }

  async createTimelineEvent(
    tenantId: string,
    dto: CreateTimelineEventDto,
  ): Promise<SalesTimelineEvent> {
    return this.prisma.salesTimelineEvent.create({
      data: {
        id: 'r7o3tw1n',
        updatedAt: new Date(),
        tenantId,
        ...dto,
      } as any,
    }) as any;
  }

  async getTasks(tenantId: string): Promise<SalesTask[]> {
    return this.prisma.salesTask.findMany({ where: { tenantId } }) as any;
  }

  async createTask(tenantId: string, dto: CreateTaskDto): Promise<SalesTask> {
    return this.prisma.salesTask.create({
      data: {
        id: 't8rtxr3e',
        updatedAt: new Date(),
        tenantId,
        ...dto,
      } as any,
    }) as any;
  }

  async completeTask(tenantId: string, taskId: string): Promise<SalesTask> {
    return this.prisma.salesTask.update({
      where: { id: taskId },
      data: { status: "COMPLETED", completedAt: new Date() },
    }) as any;
  }

  async getOrders(tenantId: string): Promise<SalesOrder[]> {
    return this.prisma.salesOrder.findMany({ where: { tenantId } }) as any;
  }

  async getAlerts(tenantId: string): Promise<SalesAlert[]> {
    return this.prisma.salesAlert.findMany({ where: { tenantId } }) as any;
  }

  async runSlaSweep(tenantId: string, actorId: string): Promise<SalesAlert[]> {
    return [];
  }

  async getAuditEvents(tenantId: string): Promise<SalesAuditEvent[]> {
    return this.prisma.salesAuditEvent.findMany({ where: { tenantId } }) as any;
  }
}
