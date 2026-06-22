import { TenantScope } from "../../../shared/scope/tenant-scope";
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
  abstract getDashboard( ctx: TenantScope): Promise<SalesDashboard>;
  abstract getManagerMetrics( ctx: TenantScope): Promise<SalesManagerMetrics>;
  abstract getExecutiveForecast( ctx: TenantScope,
  ): Promise<SalesExecutiveForecast>;
  abstract getNextBestActions( ctx: TenantScope): Promise<SalesNextAction[]>;

  abstract getSalesAnalytics( ctx: TenantScope, period?: string): Promise<any>;
  abstract getForecast( ctx: TenantScope): Promise<any>;
  abstract getPipelineVelocity( ctx: TenantScope): Promise<any>;
  abstract getSLAPerformance( ctx: TenantScope): Promise<any>;
  abstract getPipeline( ctx: TenantScope): Promise<any[]>;

  abstract getLeads( ctx: TenantScope, status?: string): Promise<SalesLead[]>;
  abstract createLead( ctx: TenantScope, dto: CreateLeadDto, user_id?: string, tx?: any): Promise<SalesLead>;
  abstract updateLeadStatus( ctx: TenantScope,
    lead_id: string,
    dto: UpdateLeadStatusDto,
  ): Promise<SalesLead>;
  abstract convertLead( ctx: TenantScope,
    lead_id: string,
    actor_id: string,
    tx?: any,
  ): Promise<SalesOpportunity>;

  abstract getOpportunities( ctx: TenantScope, stage?: string): Promise<SalesOpportunity[]>;
  abstract createOpportunity( ctx: TenantScope,
    dto: CreateOpportunityDto,
    user_id?: string,
    tx?: any
  ): Promise<SalesOpportunity>;
  abstract moveOpportunityStage( ctx: TenantScope,
    opportunityId: string,
    dto: MoveOpportunityStageDto,
    tx?: any,
  ): Promise<SalesOpportunity>;
  abstract closeOpportunity( ctx: TenantScope,
    opportunityId: string,
    dto: CloseOpportunityDto,
    tx?: any,
  ): Promise<SalesOpportunity | SalesOrder>;

  abstract getQuotes( ctx: TenantScope, dealId?: string): Promise<SalesQuote[]>;
  abstract createQuote( ctx: TenantScope,
    dto: CreateQuoteDto,
    user_id?: string,
  ): Promise<SalesQuote>;
  abstract submitQuote( ctx: TenantScope, quoteId: string, tx?: any): Promise<SalesQuote>;
  abstract decideQuote( ctx: TenantScope,
    quoteId: string,
    dto: QuoteDecisionDto,
    tx?: any,
  ): Promise<SalesQuote>;

  abstract getTimeline( ctx: TenantScope): Promise<SalesTimelineEvent[]>;
  abstract createTimelineEvent( ctx: TenantScope,
    dto: CreateTimelineEventDto,
    user_id?: string,
  ): Promise<SalesTimelineEvent>;

  abstract getTasks( ctx: TenantScope): Promise<SalesTask[]>;
  abstract createTask( ctx: TenantScope, dto: CreateTaskDto, user_id?: string): Promise<SalesTask>;
  abstract completeTask( ctx: TenantScope, taskId: string): Promise<SalesTask>;

  abstract getDeals( ctx: TenantScope, status?: string): Promise<any[]>;
  abstract createDeal( ctx: TenantScope, dto: any, tx?: any): Promise<any>;

  abstract getOrders( ctx: TenantScope): Promise<SalesOrder[]>;

  abstract getAlerts( ctx: TenantScope): Promise<SalesAlert[]>;
  abstract runSlaSweep( ctx: TenantScope,
    actor_id: string,
  ): Promise<SalesAlert[]>;

  abstract getAuditEvents( ctx: TenantScope): Promise<SalesAuditEvent[]>;
  abstract recordConsolidatedSale(ctx: TenantScope, data: any): Promise<void>;
  abstract getOverview(ctx: TenantScope): Promise<any>;
}
