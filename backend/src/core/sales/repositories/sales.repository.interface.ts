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

export type SalesDashboard = {
  openLeads: number;
  slaDueToday: number;
  overdueFollowUps: number;
  openOpportunities: number;
  pipelineValue: number;
  weightedPipelineValue: number;
  pendingQuoteApprovals: number;
  dealRiskCount: number;
};

export type SalesManagerMetrics = {
  totalReps: number;
  openPipeline: number;
  weightedForecast: number;
  stalledDeals: number;
  slaBreaches: number;
  approvalsPending: number;
};

export type SalesExecutiveForecast = {
  openPipelineValue: number;
  weightedForecastValue: number;
  wonThisPeriod: number;
  lostThisPeriod: number;
  conversionRate: number;
  avgDealCycleDays: number;
  forecastAccuracy: number;
};

export abstract class ISalesRepository {
  abstract getDashboard(tenant_id: string): Promise<SalesDashboard>;
  abstract getManagerMetrics(tenant_id: string): Promise<SalesManagerMetrics>;
  abstract getExecutiveForecast(
    tenant_id: string,
  ): Promise<SalesExecutiveForecast>;
  abstract getNextBestActions(tenant_id: string): Promise<SalesNextAction[]>;

  abstract getSalesAnalytics(tenant_id: string, period?: string): Promise<any>;
  abstract getForecast(tenant_id: string, user_id?: string): Promise<any>;
  abstract getPipelineVelocity(tenant_id: string): Promise<any>;
  abstract getSLAPerformance(tenant_id: string): Promise<any>;

  abstract getLeads(tenant_id: string, status?: string): Promise<SalesLead[]>;
  abstract createLead(tenant_id: string, dto: CreateLeadDto, tx?: any): Promise<SalesLead>;
  abstract updateLeadStatus(
    tenant_id: string,
    lead_id: string,
    dto: UpdateLeadStatusDto,
  ): Promise<SalesLead>;
  abstract convertLead(
    tenant_id: string,
    lead_id: string,
    actor_id: string,
  ): Promise<SalesOpportunity>;

  abstract getOpportunities(tenant_id: string, stage?: string): Promise<SalesOpportunity[]>;
  abstract createOpportunity(
    tenant_id: string,
    dto: CreateOpportunityDto,
    tx?: any
  ): Promise<SalesOpportunity>;
  abstract moveOpportunityStage(
    tenant_id: string,
    opportunityId: string,
    dto: MoveOpportunityStageDto,
  ): Promise<SalesOpportunity>;
  abstract closeOpportunity(
    tenant_id: string,
    opportunityId: string,
    dto: CloseOpportunityDto,
  ): Promise<SalesOpportunity | SalesOrder>;

  abstract getQuotes(tenant_id: string, dealId?: string): Promise<SalesQuote[]>;
  abstract createQuote(
    tenant_id: string,
    dto: CreateQuoteDto,
  ): Promise<SalesQuote>;
  abstract submitQuote(tenant_id: string, quoteId: string): Promise<SalesQuote>;
  abstract decideQuote(
    tenant_id: string,
    quoteId: string,
    dto: QuoteDecisionDto,
  ): Promise<SalesQuote>;

  abstract getTimeline(tenant_id: string): Promise<SalesTimelineEvent[]>;
  abstract createTimelineEvent(
    tenant_id: string,
    dto: CreateTimelineEventDto,
  ): Promise<SalesTimelineEvent>;

  abstract getTasks(tenant_id: string): Promise<SalesTask[]>;
  abstract createTask(tenant_id: string, dto: CreateTaskDto): Promise<SalesTask>;
  abstract completeTask(tenant_id: string, taskId: string): Promise<SalesTask>;

  abstract getDeals(tenant_id: string, status?: string): Promise<any[]>;
  abstract createDeal(tenant_id: string, dto: any, tx?: any): Promise<any>;

  abstract getOrders(tenant_id: string): Promise<SalesOrder[]>;

  abstract getAlerts(tenant_id: string): Promise<SalesAlert[]>;
  abstract runSlaSweep(
    tenant_id: string,
    actor_id: string,
  ): Promise<SalesAlert[]>;

  abstract getAuditEvents(tenant_id: string): Promise<SalesAuditEvent[]>;
}
