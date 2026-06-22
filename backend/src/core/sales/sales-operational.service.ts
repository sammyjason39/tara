import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../persistence/prisma.service";
import { ISalesRepository } from "./repositories/sales.repository.interface";
import { AuditService } from "../../shared/audit/audit.service";
import { EventBusService } from "../../shared/events/event-bus.service";
import { Lead, Opportunity, Deal, SalesQuote } from "./entities/sales.entity";
import { TenantContext } from "../../gateway/tenant-context.interface";

@Injectable()
export class SalesOperationalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly salesRepository: ISalesRepository,
    private readonly auditService: AuditService,
    private readonly eventBus: EventBusService,
  ) {}

  async getLeads(ctx: TenantContext, status?: string): Promise<Lead[]> {
    return this.salesRepository.getLeads(ctx, status);
  }

  async createLead(ctx: TenantContext, data: any, user_id?: string): Promise<Lead> {
    const event_reference_id = `EVT-SALES-LEAD-NEW-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const lead = await this.salesRepository.createLead(ctx, data, user_id, tx);
      await this.auditService.log({
        tenant_id: ctx.tenant_id, user_id: user_id || "SYSTEM", module: "SALES", action: "CREATE", entity_type: "LEAD", entity_id: lead.id, after_state: lead, event_reference_id,
      }, tx);
      await this.eventBus.publish({
        event_type: "SALES.LEAD_CREATED", tenant_id: ctx.tenant_id, entity_id: lead.id, entity_type: "LEAD", source_module: "SALES", user_id, event_reference_id, payload: data,
      }, tx);
      return lead;
    });
  }

  async getOpportunities(ctx: TenantContext, stage?: string): Promise<Opportunity[]> {
    return this.salesRepository.getOpportunities(ctx);
  }

  async createOpportunity(ctx: TenantContext, data: any, user_id?: string): Promise<Opportunity> {
    const event_reference_id = `EVT-SALES-OPP-NEW-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
      const opportunity = await this.salesRepository.createOpportunity(ctx, data, user_id, tx);
      await this.auditService.log({
        tenant_id: ctx.tenant_id, user_id: user_id || "SYSTEM", module: "SALES", action: "CREATE", entity_type: "OPPORTUNITY", entity_id: opportunity.id, after_state: opportunity, event_reference_id,
      }, tx);
      return opportunity;
    });
  }

  async getDeals(ctx: TenantContext, status?: string): Promise<Deal[]> {
    return this.salesRepository.getDeals(ctx);
  }

  async createDeal(ctx: TenantContext, data: any, user_id?: string): Promise<Deal> {
    const event_reference_id = `EVT-SALES-DEAL-NEW-${Date.now()}`;
    return this.prisma.$transaction(async (tx: any) => {
       const deal = await this.salesRepository.createDeal(ctx, data, tx);
       await this.auditService.log({
         tenant_id: ctx.tenant_id, user_id: user_id || "SYSTEM", module: "SALES", action: "CREATE", entity_type: "DEAL", entity_id: deal.id, after_state: deal, event_reference_id,
       }, tx);
       return deal;
    });
  }

  async getQuotes(ctx: TenantContext, dealId?: string): Promise<SalesQuote[]> {
    return this.salesRepository.getQuotes(ctx);
  }

  async createQuote(ctx: TenantContext, data: any, user_id?: string): Promise<SalesQuote> {
    return this.salesRepository.createQuote(ctx, data, user_id);
  }
}
