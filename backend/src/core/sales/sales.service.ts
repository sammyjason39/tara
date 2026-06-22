import { TenantScope } from "../../shared/scope/tenant-scope";
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
import { AtomicOperationService } from "../shared/atomic";

/**
 * Sales service (Phase 3).
 *
 * Every method receives a validated {@link TenantScope} resolved by the
 * controller from the verified `TenantContext` (Requirements 2.1, 2.2, 2.5),
 * never a raw client-supplied tenant id. The actor `user_id` is passed
 * separately and is always sourced from `TenantContext.user_id` in the
 * controller (Requirement 2.10) — there is no header/`"system"` fallback at the
 * controller boundary. Scoped reads and writes are filtered by the scope's
 * `tenant_id` (and any permitted company/location/branch) in the repository.
 *
 * Lead conversion and every Sales_Pipeline/quote transition run inside a single
 * {@link AtomicOperationService} transaction (Task 6.3): the repository write,
 * the Audit_Trail entry, and the Integration_Log outbox event all commit
 * together or roll back together (Requirements 10.3, 10.4, 10.5, 4.1, 4.2, 6.5,
 * 6.6). Each transition validates the entity's CURRENT state inside the
 * transaction before writing and rejects an invalid transition with a 400 that
 * names the current and target state, leaving the entity unchanged
 * (Requirement 10.6).
 */
@Injectable()
export class SalesService {
  constructor(
    private readonly repository: ISalesRepository,
    private readonly auditService: AuditService,
    private readonly eventBus: EventBusService,
    private readonly atomic: AtomicOperationService,
  ) {}

  async getDashboard(ctx: TenantScope) {
    return this.repository.getDashboard(ctx);
  }

  async getManagerMetrics(ctx: TenantScope) {
    return this.repository.getManagerMetrics(ctx);
  }

  async getExecutiveForecast(ctx: TenantScope) {
    return this.repository.getExecutiveForecast(ctx);
  }

  async getNextBestActions(ctx: TenantScope) {
    return this.repository.getNextBestActions(ctx);
  }

  async getForecast(ctx: TenantScope) {
    return this.repository.getForecast(ctx);
  }

  async getSalesAnalytics(ctx: TenantScope) {
    return this.repository.getSalesAnalytics(ctx);
  }

  async getPipeline(ctx: TenantScope) {
    return this.repository.getPipeline(ctx);
  }

  async getLeads(ctx: TenantScope) {
    return this.repository.getLeads(ctx);
  }

  async createLead(ctx: TenantScope, dto: CreateLeadDto, user_id?: string) {
    const lead = await this.repository.createLead(ctx, dto, user_id);
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

  async updateLeadStatus(ctx: TenantScope,
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

  async convertLead(ctx: TenantScope, lead_id: string, actor_id: string) {
    // Create the opportunity and update the lead in ONE Atomic_Operation so both
    // commit together or neither; any failure rolls both back and the lead
    // remains unconverted (Requirements 10.3, 10.4).
    return this.atomic.run(async ({ tx, audit, outbox }) => {
      const opportunity = await this.repository.convertLead(
        ctx,
        lead_id,
        actor_id,
        tx,
      );
      await audit({
        tenant_id: ctx.tenant_id,
        user_id: actor_id,
        module: "sales",
        action: "CONVERT",
        entity_type: "LEAD",
        entity_id: lead_id,
        metadata: { opportunityId: opportunity.id },
      });
      await outbox({
        tenant_id: ctx.tenant_id,
        type: "sales.lead.converted.v1",
        payload: { lead_id, opportunity_id: opportunity.id },
        company_id: ctx.company_id,
      });
      return opportunity;
    });
  }

  async getOpportunities(ctx: TenantScope) {
    return this.repository.getOpportunities(ctx);
  }

  async createOpportunity(ctx: TenantScope,
    dto: CreateOpportunityDto,
    user_id?: string,
  ) {
    const opportunity = await this.repository.createOpportunity(ctx, dto, user_id);
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

  async moveOpportunityStage(ctx: TenantScope,
    opportunityId: string,
    dto: MoveOpportunityStageDto,
    user_id?: string,
  ) {
    // The stage move and its audit/outbox enrol in one Atomic_Operation; the
    // transition is validated against the opportunity's current stage inside the
    // transaction (Requirements 10.5, 10.6).
    return this.atomic.run(async ({ tx, audit, outbox }) => {
      const opportunity = await this.repository.moveOpportunityStage(
        ctx,
        opportunityId,
        dto,
        tx,
      );
      await audit({
        tenant_id: ctx.tenant_id,
        user_id: user_id || "SYSTEM",
        module: "sales",
        action: "MOVE_STAGE",
        entity_type: "OPPORTUNITY",
        entity_id: opportunityId,
        metadata: { stage: dto.stage },
      });
      await outbox({
        tenant_id: ctx.tenant_id,
        type: "sales.opportunity.stage_moved.v1",
        payload: { opportunity_id: opportunityId, stage: dto.stage },
        company_id: ctx.company_id,
      });
      return opportunity;
    });
  }

  async closeOpportunity(ctx: TenantScope,
    opportunityId: string,
    dto: CloseOpportunityDto,
    user_id?: string,
  ) {
    // The close, its resulting order (on win), the audit entry, the outbox event
    // and the incentive-engine domain event all enrol in one Atomic_Operation;
    // the transition is validated against the opportunity's current stage inside
    // the transaction (Requirements 10.5, 10.6).
    return this.atomic.run(async ({ tx, audit, outbox, publish }) => {
      const result = await this.repository.closeOpportunity(
        ctx,
        opportunityId,
        dto,
        tx,
      );
      await audit({
        tenant_id: ctx.tenant_id,
        user_id: user_id || "SYSTEM",
        module: "sales",
        action: "CLOSE",
        entity_type: "OPPORTUNITY",
        entity_id: opportunityId,
        metadata: { status: dto.result, reason: dto.reason },
      });
      await outbox({
        tenant_id: ctx.tenant_id,
        type: "sales.opportunity.closed.v1",
        payload: { opportunity_id: opportunityId, result: dto.result },
        company_id: ctx.company_id,
      });

      // Trigger Incentive Engine if Won, inside the same transaction so the
      // event is discarded if the close rolls back.
      if (dto.result === "won") {
        await publish({
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
    });
  }

  async getQuotes(ctx: TenantScope) {
    return this.repository.getQuotes(ctx);
  }

  async createQuote(ctx: TenantScope, dto: CreateQuoteDto, user_id?: string) {
    const quote = await this.repository.createQuote(ctx, dto, user_id);
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

  async submitQuote(ctx: TenantScope, quoteId: string, user_id?: string) {
    // The submission and its audit/outbox enrol in one Atomic_Operation; the
    // transition is validated against the quote's current status inside the
    // transaction (Requirements 10.5, 10.6).
    return this.atomic.run(async ({ tx, audit, outbox }) => {
      const quote = await this.repository.submitQuote(ctx, quoteId, tx);
      await audit({
        tenant_id: ctx.tenant_id,
        user_id: user_id || "SYSTEM",
        module: "sales",
        action: "SUBMIT",
        entity_type: "QUOTE",
        entity_id: quoteId,
      });
      await outbox({
        tenant_id: ctx.tenant_id,
        type: "sales.quote.submitted.v1",
        payload: { quote_id: quoteId },
        company_id: ctx.company_id,
      });
      return quote;
    });
  }

  async decideQuote(ctx: TenantScope,
    quoteId: string,
    dto: QuoteDecisionDto,
    user_id?: string,
  ) {
    // The decision and its audit/outbox enrol in one Atomic_Operation; the
    // transition is validated against the quote's current status inside the
    // transaction (Requirements 10.5, 10.6).
    return this.atomic.run(async ({ tx, audit, outbox }) => {
      const quote = await this.repository.decideQuote(ctx, quoteId, dto, tx);
      await audit({
        tenant_id: ctx.tenant_id,
        user_id: user_id || "SYSTEM",
        module: "sales",
        action: "DECIDE",
        entity_type: "QUOTE",
        entity_id: quoteId,
        metadata: { approved: dto.approved },
      });
      await outbox({
        tenant_id: ctx.tenant_id,
        type: "sales.quote.decided.v1",
        payload: { quote_id: quoteId, approved: dto.approved },
        company_id: ctx.company_id,
      });
      return quote;
    });
  }

  async getTimeline(ctx: TenantScope) {
    return this.repository.getTimeline(ctx);
  }

  async createTimelineEvent(ctx: TenantScope,
    dto: CreateTimelineEventDto,
    user_id?: string,
  ) {
    const event = await this.repository.createTimelineEvent(ctx, dto, user_id);
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

  async getTasks(ctx: TenantScope) {
    return this.repository.getTasks(ctx);
  }

  async createTask(ctx: TenantScope, dto: CreateTaskDto, user_id?: string) {
    const task = await this.repository.createTask(ctx, dto, user_id);
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

  async completeTask(ctx: TenantScope, taskId: string, user_id?: string) {
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

  async getOrders(ctx: TenantScope) {
    return this.repository.getOrders(ctx);
  }

  async getAlerts(ctx: TenantScope) {
    return this.repository.getAlerts(ctx);
  }

  async runSlaSweep(ctx: TenantScope, actor_id: string) {
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

  async getAuditEvents(ctx: TenantScope) {
    return this.repository.getAuditEvents(ctx);
  }

  async recordConsolidatedSale(ctx: TenantScope, data: any) {
    return this.repository.recordConsolidatedSale(ctx, data);
  }

  async getOverview(ctx: TenantScope) {
    return this.repository.getOverview(ctx);
  }
}
