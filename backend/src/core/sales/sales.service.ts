import { Injectable } from '@nestjs/common';
import { CloseOpportunityDto } from './dto/close-opportunity.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { CreateTimelineEventDto } from './dto/create-timeline-event.dto';
import { MoveOpportunityStageDto } from './dto/move-opportunity-stage.dto';
import { QuoteDecisionDto } from './dto/quote-decision.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { SalesNextAction } from './entities/sales-next-action.entity';
import { ISalesRepository } from './repositories/sales.repository.interface';

@Injectable()
export class SalesService {
  constructor(private readonly repository: ISalesRepository) {}

  async getDashboard(tenantId: string) {
    return this.repository.getDashboard(tenantId);
  }

  async getManagerMetrics(tenantId: string) {
    return this.repository.getManagerMetrics(tenantId);
  }

  async getExecutiveForecast(tenantId: string) {
    return this.repository.getExecutiveForecast(tenantId);
  }

  async getNextBestActions(tenantId: string) {
    return this.repository.getNextBestActions(tenantId);
  }

  async getLeads(tenantId: string) {
    return this.repository.getLeads(tenantId);
  }

  async createLead(tenantId: string, dto: CreateLeadDto) {
    return this.repository.createLead(tenantId, dto);
  }

  async updateLeadStatus(tenantId: string, leadId: string, dto: UpdateLeadStatusDto) {
    return this.repository.updateLeadStatus(tenantId, leadId, dto);
  }

  async convertLead(tenantId: string, leadId: string, actorId: string) {
    return this.repository.convertLead(tenantId, leadId, actorId);
  }

  async getOpportunities(tenantId: string) {
    return this.repository.getOpportunities(tenantId);
  }

  async createOpportunity(tenantId: string, dto: CreateOpportunityDto) {
    return this.repository.createOpportunity(tenantId, dto);
  }

  async moveOpportunityStage(
    tenantId: string,
    opportunityId: string,
    dto: MoveOpportunityStageDto,
  ) {
    return this.repository.moveOpportunityStage(tenantId, opportunityId, dto);
  }

  async closeOpportunity(tenantId: string, opportunityId: string, dto: CloseOpportunityDto) {
    return this.repository.closeOpportunity(tenantId, opportunityId, dto);
  }

  async getQuotes(tenantId: string) {
    return this.repository.getQuotes(tenantId);
  }

  async createQuote(tenantId: string, dto: CreateQuoteDto) {
    return this.repository.createQuote(tenantId, dto);
  }

  async submitQuote(tenantId: string, quoteId: string) {
    return this.repository.submitQuote(tenantId, quoteId);
  }

  async decideQuote(tenantId: string, quoteId: string, dto: QuoteDecisionDto) {
    return this.repository.decideQuote(tenantId, quoteId, dto);
  }

  async getTimeline(tenantId: string) {
    return this.repository.getTimeline(tenantId);
  }

  async createTimelineEvent(tenantId: string, dto: CreateTimelineEventDto) {
    return this.repository.createTimelineEvent(tenantId, dto);
  }

  async getTasks(tenantId: string) {
    return this.repository.getTasks(tenantId);
  }

  async createTask(tenantId: string, dto: CreateTaskDto) {
    return this.repository.createTask(tenantId, dto);
  }

  async completeTask(tenantId: string, taskId: string) {
    return this.repository.completeTask(tenantId, taskId);
  }

  async getOrders(tenantId: string) {
    return this.repository.getOrders(tenantId);
  }

  async getAlerts(tenantId: string) {
    return this.repository.getAlerts(tenantId);
  }

  async runSlaSweep(tenantId: string, actorId: string) {
    return this.repository.runSlaSweep(tenantId, actorId);
  }

  async getAuditEvents(tenantId: string) {
    return this.repository.getAuditEvents(tenantId);
  }
}
