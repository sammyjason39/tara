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
export { SalesNextAction };

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
  abstract getDashboard( ctx: TenantContext): Promise<SalesDashboard>;
  abstract getManagerMetrics( ctx: TenantContext): Promise<SalesManagerMetrics>;
  abstract getExecutiveForecast( ctx: TenantContext,
  ): Promise<SalesExecutiveForecast>;
  abstract getNextBestActions( ctx: TenantContext): Promise<SalesNextAction[]>;

  abstract getSalesAnalytics( ctx: TenantContext, period?: string): Promise<any>;
  abstract getForecast( ctx: TenantContext): Promise<any>;
  abstract getPipelineVelocity( ctx: TenantContext): Promise<any>;
  abstract getSLAPerformance( ctx: TenantContext): Promise<any>;
  abstract getPipeline( ctx: TenantContext): Promise<any[]>;

  abstract getLeads( ctx: TenantContext, status?: string): Promise<SalesLead[]>;
  abstract createLead( ctx: TenantContext, dto: CreateLeadDto, tx?: any): Promise<SalesLead>;
  abstract updateLeadStatus( ctx: TenantContext,
    lead_id: string,
    dto: UpdateLeadStatusDto,
  ): Promise<SalesLead>;
  abstract convertLead( ctx: TenantContext,
    lead_id: string,
    actor_id: string,
  ): Promise<SalesOpportunity>;

  abstract getOpportunities( ctx: TenantContext, stage?: string): Promise<SalesOpportunity[]>;
  abstract createOpportunity( ctx: TenantContext,
    dto: CreateOpportunityDto,
    tx?: any
  ): Promise<SalesOpportunity>;
  abstract moveOpportunityStage( ctx: TenantContext,
    opportunityId: string,
    dto: MoveOpportunityStageDto,
  ): Promise<SalesOpportunity>;
  abstract closeOpportunity( ctx: TenantContext,
    opportunityId: string,
    dto: CloseOpportunityDto,
  ): Promise<SalesOpportunity | SalesOrder>;

  abstract getQuotes( ctx: TenantContext, dealId?: string): Promise<SalesQuote[]>;
  abstract createQuote( ctx: TenantContext,
    dto: CreateQuoteDto,
  ): Promise<SalesQuote>;
  abstract submitQuote( ctx: TenantContext, quoteId: string): Promise<SalesQuote>;
  abstract decideQuote( ctx: TenantContext,
    quoteId: string,
    dto: QuoteDecisionDto,
  ): Promise<SalesQuote>;

  abstract getTimeline( ctx: TenantContext): Promise<SalesTimelineEvent[]>;
  abstract createTimelineEvent( ctx: TenantContext,
    dto: CreateTimelineEventDto,
  ): Promise<SalesTimelineEvent>;

  abstract getTasks( ctx: TenantContext): Promise<SalesTask[]>;
  abstract createTask( ctx: TenantContext, dto: CreateTaskDto): Promise<SalesTask>;
  abstract completeTask( ctx: TenantContext, taskId: string): Promise<SalesTask>;

  abstract getDeals( ctx: TenantContext, status?: string): Promise<any[]>;
  abstract createDeal( ctx: TenantContext, dto: any, tx?: any): Promise<any>;

  abstract getOrders( ctx: TenantContext): Promise<SalesOrder[]>;

  abstract getAlerts( ctx: TenantContext): Promise<SalesAlert[]>;
  abstract runSlaSweep( ctx: TenantContext,
    actor_id: string,
  ): Promise<SalesAlert[]>;

  abstract getAuditEvents( ctx: TenantContext): Promise<SalesAuditEvent[]>;
  abstract recordConsolidatedSale(ctx: TenantContext, data: any): Promise<void>;
}
