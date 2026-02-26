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
import { SalesNextAction } from '../entities/sales-next-action.entity';

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
  abstract getDashboard(tenantId: string): Promise<SalesDashboard>;
  abstract getManagerMetrics(tenantId: string): Promise<SalesManagerMetrics>;
  abstract getExecutiveForecast(tenantId: string): Promise<SalesExecutiveForecast>;
  abstract getNextBestActions(tenantId: string): Promise<SalesNextAction[]>;

  abstract getLeads(tenantId: string): Promise<SalesLead[]>;
  abstract createLead(tenantId: string, dto: CreateLeadDto): Promise<SalesLead>;
  abstract updateLeadStatus(
    tenantId: string,
    leadId: string,
    dto: UpdateLeadStatusDto,
  ): Promise<SalesLead>;
  abstract convertLead(tenantId: string, leadId: string, actorId: string): Promise<SalesOpportunity>;

  abstract getOpportunities(tenantId: string): Promise<SalesOpportunity[]>;
  abstract createOpportunity(tenantId: string, dto: CreateOpportunityDto): Promise<SalesOpportunity>;
  abstract moveOpportunityStage(
    tenantId: string,
    opportunityId: string,
    dto: MoveOpportunityStageDto,
  ): Promise<SalesOpportunity>;
  abstract closeOpportunity(
    tenantId: string,
    opportunityId: string,
    dto: CloseOpportunityDto,
  ): Promise<SalesOpportunity | SalesOrder>;

  abstract getQuotes(tenantId: string): Promise<SalesQuote[]>;
  abstract createQuote(tenantId: string, dto: CreateQuoteDto): Promise<SalesQuote>;
  abstract submitQuote(tenantId: string, quoteId: string): Promise<SalesQuote>;
  abstract decideQuote(
    tenantId: string,
    quoteId: string,
    dto: QuoteDecisionDto,
  ): Promise<SalesQuote>;

  abstract getTimeline(tenantId: string): Promise<SalesTimelineEvent[]>;
  abstract createTimelineEvent(
    tenantId: string,
    dto: CreateTimelineEventDto,
  ): Promise<SalesTimelineEvent>;

  abstract getTasks(tenantId: string): Promise<SalesTask[]>;
  abstract createTask(tenantId: string, dto: CreateTaskDto): Promise<SalesTask>;
  abstract completeTask(tenantId: string, taskId: string): Promise<SalesTask>;

  abstract getOrders(tenantId: string): Promise<SalesOrder[]>;

  abstract getAlerts(tenantId: string): Promise<SalesAlert[]>;
  abstract runSlaSweep(tenantId: string, actorId: string): Promise<SalesAlert[]>;

  abstract getAuditEvents(tenantId: string): Promise<SalesAuditEvent[]>;
}
