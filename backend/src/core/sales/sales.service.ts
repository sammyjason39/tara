import { TenantContext } from "../../gateway/tenant-context.interface";
import { Injectable } from "@nestjs/common";
import { CloseOpportunityDto } from "./dto/close-opportunity.dto";
import { CreateLeadDto } from "./dto/create-lead.dto";
import { CreateOpportunityDto } from "./dto/create-opportunity.dto";
import { CreateQuoteDto } from "./dto/create-quote.dto";
import { CreateTaskDto } from "./dto/create-task.dto";
import { CreateTimelineEventDto } from "./dto/create-timeline-event.dto";
import { MoveOpportunityStageDto } from "./dto/move-opportunity-stage.dto";
import { QuoteDecisionDto } from "./dto/quote-decision.dto";
import { UpdateLeadStatusDto } from "./dto/update-lead-status.dto";
import { SalesNextAction } from "./entities/sales-next-action.entity";
import { ISalesRepository } from "./repositories/sales.repository.interface";
import { AuditService } from "../../shared/audit/audit.service";
import { EventBusService } from "../../shared/events/event-bus.service";

@Injectable()
export class SalesService {
  constructor(
    private readonly repository: ISalesRepository,
    private readonly auditService: AuditService,
    private readonly eventBus: EventBusService,
  ) {}

  async getDashboard(ctx: TenantContext) {
    return this.repository.getDashboard(ctx);
  }

  async getManagerMetrics(ctx: TenantContext) {
    return this.repository.getManagerMetrics(ctx);
  }

  async getExecutiveForecast(ctx: TenantContext) {
    return this.repository.getExecutiveForecast(ctx);
  }

  async getNextBestActions(ctx: TenantContext) {
    return this.repository.getNextBestActions(ctx);
  }

  async getForecast(ctx: TenantContext) {
    return this.repository.getForecast(ctx);
  }

  async getSalesAnalytics(ctx: TenantContext) {
    return this.repository.getSalesAnalytics(ctx);
  }

  async getPipeline(ctx: TenantContext) {
    return this.repository.getPipeline(ctx);
  }

  async getLeads(ctx: TenantContext) {
    return this.repository.getLeads(ctx);
  }

  async createLead(ctx: TenantContext, dto: CreateLeadDto, user_id?: string) {
    const lead = await this.repository.createLead(ctx, dto);
    if (user_id) {
      await this.auditService.log({ tenant_id: ctx.tenant_id ,
        user_id,
        module: "sales",
        action: "CREATE",
        entity_type: "LEAD",
        entity_id: lead.id,
        metadata: { name: dto.contact_name, companies: dto.company_name },
      });
    }
    return lead;
  }

  async updateLeadStatus(ctx: TenantContext,
    lead_id: string,
    dto: UpdateLeadStatusDto,
    user_id?: string,
  ) {
    const lead = await this.repository.updateLeadStatus(ctx, lead_id, dto);
    if (user_id) {
      await this.auditService.log({
        tenant_id: ctx.tenant_id,
        user_id,
        module: "sales",
        action: "UPDATE_STATUS",
        entity_type: "LEAD",
        entity_id: lead_id,
        metadata: { status: dto.status },
      });
    }
    return lead;
  }

  async convertLead(ctx: TenantContext, lead_id: string, actor_id: string) {
    const opportunity = await this.repository.convertLead(
      ctx,
      lead_id,
      actor_id,
    );
    await this.auditService.log({ tenant_id: ctx.tenant_id ,
      user_id: actor_id,
      module: "sales",
      action: "CONVERT",
      entity_type: "LEAD",
      entity_id: lead_id,
      metadata: { opportunityId: opportunity.id },
    });
    return opportunity;
  }

  async getOpportunities(ctx: TenantContext) {
    return this.repository.getOpportunities(ctx);
  }

  async createOpportunity(ctx: TenantContext,
    dto: CreateOpportunityDto,
    user_id?: string,
  ) {
    const opportunity = await this.repository.createOpportunity(ctx, dto);
    if (user_id) {
      await this.auditService.log({
        tenant_id: ctx.tenant_id,
        user_id,
        module: "sales",
        action: "CREATE",
        entity_type: "OPPORTUNITY",
        entity_id: opportunity.id,
        metadata: { title: dto.account_name, value: dto.amount },
      });
    }
    return opportunity;
  }

  async moveOpportunityStage(ctx: TenantContext,
    opportunityId: string,
    dto: MoveOpportunityStageDto,
    user_id?: string,
  ) {
    const opportunity = await this.repository.moveOpportunityStage(
      ctx,
      opportunityId,
      dto,
    );
    if (user_id) {
      await this.auditService.log({
        tenant_id: ctx.tenant_id,
        user_id,
        module: "sales",
        action: "MOVE_STAGE",
        entity_type: "OPPORTUNITY",
        entity_id: opportunityId,
        metadata: { stage: dto.stage },
      });
    }
    return opportunity;
  }

  async closeOpportunity(ctx: TenantContext,
    opportunityId: string,
    dto: CloseOpportunityDto,
    user_id?: string,
  ) {
    const result = await this.repository.closeOpportunity(
      ctx,
      opportunityId,
      dto,
    );
    if (user_id) {
      await this.auditService.log({
        tenant_id: ctx.tenant_id,
        user_id,
        module: "sales",
        action: "CLOSE",
        entity_type: "OPPORTUNITY",
        entity_id: opportunityId,
        metadata: { status: dto.result, reason: dto.reason },
      });
    }

    // Trigger Incentive Engine if Won
    if (dto.result === "won") {
        await this.eventBus.publish({
            event_type: "SALES_ORDER_COMPLETED",
            tenant_id: ctx.tenant_id,
            entity_id: (result as any).id,
            entity_type: "SALES_ORDER",
            source_module: "SALES",
            user_id: user_id || "SYSTEM",
            payload: { order_id: (result as any).id },
        });
    }

    return result;
  }

  async getQuotes(ctx: TenantContext) {
    return this.repository.getQuotes(ctx);
  }

  async createQuote(ctx: TenantContext, dto: CreateQuoteDto, user_id?: string) {
    const quote = await this.repository.createQuote(ctx, dto);
    if (user_id) {
      await this.auditService.log({ tenant_id: ctx.tenant_id ,
        user_id,
        module: "sales",
        action: "CREATE",
        entity_type: "QUOTE",
        entity_id: quote.id,
        metadata: {
          opportunityId: dto.opportunityId,
          amount: dto.amount,
        },
      });
    }
    return quote;
  }

  async submitQuote(ctx: TenantContext, quoteId: string, user_id?: string) {
    const quote = await this.repository.submitQuote(ctx, quoteId);
    if (user_id) {
      await this.auditService.log({ tenant_id: ctx.tenant_id ,
        user_id,
        module: "sales",
        action: "SUBMIT",
        entity_type: "QUOTE",
        entity_id: quoteId,
      });
    }
    return quote;
  }

  async decideQuote(ctx: TenantContext,
    quoteId: string,
    dto: QuoteDecisionDto,
    user_id?: string,
  ) {
    const quote = await this.repository.decideQuote(ctx, quoteId, dto);
    if (user_id) {
      await this.auditService.log({
        tenant_id: ctx.tenant_id,
        user_id,
        module: "sales",
        action: "DECIDE",
        entity_type: "QUOTE",
        entity_id: quoteId,
        metadata: { approved: dto.approved },
      });
    }
    return quote;
  }

  async getTimeline(ctx: TenantContext) {
    return this.repository.getTimeline(ctx);
  }

  async createTimelineEvent(ctx: TenantContext,
    dto: CreateTimelineEventDto,
    user_id?: string,
  ) {
    const event = await this.repository.createTimelineEvent(ctx, dto);
    if (user_id) {
      await this.auditService.log({
        tenant_id: ctx.tenant_id,
        user_id,
        module: "sales",
        action: "CREATE_EVENT",
        entity_type: "TIMELINE",
        entity_id: event.id,
        metadata: { channel: dto.channel, summary: dto.summary },
      });
    }
    return event;
  }

  async getTasks(ctx: TenantContext) {
    return this.repository.getTasks(ctx);
  }

  async createTask(ctx: TenantContext, dto: CreateTaskDto, user_id?: string) {
    const task = await this.repository.createTask(ctx, dto);
    if (user_id) {
      await this.auditService.log({ tenant_id: ctx.tenant_id ,
        user_id,
        module: "sales",
        action: "CREATE",
        entity_type: "TASK",
        entity_id: task.id,
        metadata: { title: dto.title, dueAt: dto.dueAt },
      });
    }
    return task;
  }

  async completeTask(ctx: TenantContext, taskId: string, user_id?: string) {
    const task = await this.repository.completeTask(ctx, taskId);
    if (user_id) {
      await this.auditService.log({ tenant_id: ctx.tenant_id ,
        user_id,
        module: "sales",
        action: "COMPLETE",
        entity_type: "TASK",
        entity_id: taskId,
      });
    }
    return task;
  }

  async getOrders(ctx: TenantContext) {
    return this.repository.getOrders(ctx);
  }

  async getAlerts(ctx: TenantContext) {
    return this.repository.getAlerts(ctx);
  }

  async runSlaSweep(ctx: TenantContext, actor_id: string) {
    const alerts = await this.repository.runSlaSweep(ctx, actor_id);
    await this.auditService.log({ tenant_id: ctx.tenant_id ,
      user_id: actor_id,
      module: "sales",
      action: "RUN_SLA_SWEEP",
      entity_type: "SYSTEM",
      entity_id: "sla-engine",
      metadata: { alertsFound: alerts.length },
    });
    return alerts;
  }

  async getAuditEvents(ctx: TenantContext) {
    return this.repository.getAuditEvents(ctx);
  }

  async recordConsolidatedSale(ctx: TenantContext, data: any) {
    return this.repository.recordConsolidatedSale(ctx, data);
  }

  async getOverview(ctx: TenantContext) {
    return this.repository.getOverview(ctx);
  }
}
