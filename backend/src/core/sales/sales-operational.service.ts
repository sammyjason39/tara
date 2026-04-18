import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../persistence/prisma.service";
import { ISalesRepository } from "./repositories/sales.repository.interface";
import { AuditService } from "../../shared/audit/audit.service";
import { EventBusService } from "../../shared/events/event-bus.service";
import { Lead, Opportunity, Deal, SalesQuote } from "./entities/sales.entity";

@Injectable()
export class SalesOperationalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly salesRepository: ISalesRepository,
    private readonly auditService: AuditService,
    private readonly eventBus: EventBusService,
  ) {}

  async getLeads(tenant_id: string, status?: string): Promise<Lead[]> {
    return this.salesRepository.getLeads(tenant_id, status);
  }

  async createLead(tenant_id: string, data: any, user_id?: string): Promise<Lead> {
    const event_reference_id = `EVT-SALES-LEAD-NEW-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const lead = await this.salesRepository.createLead(tenant_id, data, tx);
      await this.auditService.log({
        tenant_id, user_id: user_id || "SYSTEM", module: "SALES", action: "CREATE", entity_type: "LEAD", entity_id: lead.id, after_state: lead, event_reference_id,
      }, tx);
      await this.eventBus.publish({
        event_type: "SALES.LEAD_CREATED", tenant_id, entity_id: lead.id, entity_type: "LEAD", source_module: "SALES", user_id, event_reference_id, payload: data,
      }, tx);
      return lead;
    });
  }

  async getOpportunities(tenant_id: string, stage?: string): Promise<Opportunity[]> {
    return this.salesRepository.getOpportunities(tenant_id);
  }

  async createOpportunity(tenant_id: string, data: any, user_id?: string): Promise<Opportunity> {
    const event_reference_id = `EVT-SALES-OPP-NEW-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const opportunity = await this.salesRepository.createOpportunity(tenant_id, data, tx);
      await this.auditService.log({
        tenant_id, user_id: user_id || "SYSTEM", module: "SALES", action: "CREATE", entity_type: "OPPORTUNITY", entity_id: opportunity.id, after_state: opportunity, event_reference_id,
      }, tx);
      return opportunity;
    });
  }

  async getDeals(tenant_id: string, status?: string): Promise<Deal[]> {
    return this.salesRepository.getDeals(tenant_id);
  }

  async createDeal(tenant_id: string, data: any, user_id?: string): Promise<Deal> {
    const event_reference_id = `EVT-SALES-DEAL-NEW-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
       const deal = await this.salesRepository.createDeal(tenant_id, data, tx);
       await this.auditService.log({
         tenant_id, user_id: user_id || "SYSTEM", module: "SALES", action: "CREATE", entity_type: "DEAL", entity_id: deal.id, after_state: deal, event_reference_id,
       }, tx);
       return deal;
    });
  }

  async getQuotes(tenant_id: string, dealId?: string): Promise<SalesQuote[]> {
    return this.salesRepository.getQuotes(tenant_id);
  }

  async createQuote(tenant_id: string, data: any, user_id?: string): Promise<SalesQuote> {
    return this.salesRepository.createQuote(tenant_id, data);
  }
}
