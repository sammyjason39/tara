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

@Injectable()
export class SalesService {
  constructor(
    private readonly repository: ISalesRepository,
    private readonly auditService: AuditService,
  ) {}

  async getDashboard(tenant_id: string) {
    return this.repository.getDashboard(tenant_id);
  }

  async getManagerMetrics(tenant_id: string) {
    return this.repository.getManagerMetrics(tenant_id);
  }

  async getExecutiveForecast(tenant_id: string) {
    return this.repository.getExecutiveForecast(tenant_id);
  }

  async getNextBestActions(tenant_id: string) {
    return this.repository.getNextBestActions(tenant_id);
  }

  async getLeads(tenant_id: string) {
    return this.repository.getLeads(tenant_id);
  }

  async createLead(tenant_id: string, dto: CreateLeadDto, user_id?: string) {
    const lead = await this.repository.createLead(tenant_id, dto);
    if (user_id) {
      await this.auditService.log({
        tenant_id,
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

  async updateLeadStatus(
    tenant_id: string,
    lead_id: string,
    dto: UpdateLeadStatusDto,
    user_id?: string,
  ) {
    const lead = await this.repository.updateLeadStatus(tenant_id, lead_id, dto);
    if (user_id) {
      await this.auditService.log({
        tenant_id,
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

  async convertLead(tenant_id: string, lead_id: string, actor_id: string) {
    const opportunity = await this.repository.convertLead(
      tenant_id,
      lead_id,
      actor_id,
    );
    await this.auditService.log({
      tenant_id,
      user_id: actor_id,
      module: "sales",
      action: "CONVERT",
      entity_type: "LEAD",
      entity_id: lead_id,
      metadata: { opportunityId: opportunity.id },
    });
    return opportunity;
  }

  async getOpportunities(tenant_id: string) {
    return this.repository.getOpportunities(tenant_id);
  }

  async createOpportunity(
    tenant_id: string,
    dto: CreateOpportunityDto,
    user_id?: string,
  ) {
    const opportunity = await this.repository.createOpportunity(tenant_id, dto);
    if (user_id) {
      await this.auditService.log({
        tenant_id,
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

  async moveOpportunityStage(
    tenant_id: string,
    opportunityId: string,
    dto: MoveOpportunityStageDto,
    user_id?: string,
  ) {
    const opportunity = await this.repository.moveOpportunityStage(
      tenant_id,
      opportunityId,
      dto,
    );
    if (user_id) {
      await this.auditService.log({
        tenant_id,
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

  async closeOpportunity(
    tenant_id: string,
    opportunityId: string,
    dto: CloseOpportunityDto,
    user_id?: string,
  ) {
    const opportunity = await this.repository.closeOpportunity(
      tenant_id,
      opportunityId,
      dto,
    );
    if (user_id) {
      await this.auditService.log({
        tenant_id,
        user_id,
        module: "sales",
        action: "CLOSE",
        entity_type: "OPPORTUNITY",
        entity_id: opportunityId,
        metadata: { status: dto.result, reason: dto.reason },
      });
    }
    return opportunity;
  }

  async getQuotes(tenant_id: string) {
    return this.repository.getQuotes(tenant_id);
  }

  async createQuote(tenant_id: string, dto: CreateQuoteDto, user_id?: string) {
    const quote = await this.repository.createQuote(tenant_id, dto);
    if (user_id) {
      await this.auditService.log({
        tenant_id,
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

  async submitQuote(tenant_id: string, quoteId: string, user_id?: string) {
    const quote = await this.repository.submitQuote(tenant_id, quoteId);
    if (user_id) {
      await this.auditService.log({
        tenant_id,
        user_id,
        module: "sales",
        action: "SUBMIT",
        entity_type: "QUOTE",
        entity_id: quoteId,
      });
    }
    return quote;
  }

  async decideQuote(
    tenant_id: string,
    quoteId: string,
    dto: QuoteDecisionDto,
    user_id?: string,
  ) {
    const quote = await this.repository.decideQuote(tenant_id, quoteId, dto);
    if (user_id) {
      await this.auditService.log({
        tenant_id,
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

  async getTimeline(tenant_id: string) {
    return this.repository.getTimeline(tenant_id);
  }

  async createTimelineEvent(
    tenant_id: string,
    dto: CreateTimelineEventDto,
    user_id?: string,
  ) {
    const event = await this.repository.createTimelineEvent(tenant_id, dto);
    if (user_id) {
      await this.auditService.log({
        tenant_id,
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

  async getTasks(tenant_id: string) {
    return this.repository.getTasks(tenant_id);
  }

  async createTask(tenant_id: string, dto: CreateTaskDto, user_id?: string) {
    const task = await this.repository.createTask(tenant_id, dto);
    if (user_id) {
      await this.auditService.log({
        tenant_id,
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

  async completeTask(tenant_id: string, taskId: string, user_id?: string) {
    const task = await this.repository.completeTask(tenant_id, taskId);
    if (user_id) {
      await this.auditService.log({
        tenant_id,
        user_id,
        module: "sales",
        action: "COMPLETE",
        entity_type: "TASK",
        entity_id: taskId,
      });
    }
    return task;
  }

  async getOrders(tenant_id: string) {
    return this.repository.getOrders(tenant_id);
  }

  async getAlerts(tenant_id: string) {
    return this.repository.getAlerts(tenant_id);
  }

  async runSlaSweep(tenant_id: string, actor_id: string) {
    const alerts = await this.repository.runSlaSweep(tenant_id, actor_id);
    await this.auditService.log({
      tenant_id,
      user_id: actor_id,
      module: "sales",
      action: "RUN_SLA_SWEEP",
      entity_type: "SYSTEM",
      entity_id: "sla-engine",
      metadata: { alertsFound: alerts.length },
    });
    return alerts;
  }

  async getAuditEvents(tenant_id: string) {
    return this.repository.getAuditEvents(tenant_id);
  }
}
