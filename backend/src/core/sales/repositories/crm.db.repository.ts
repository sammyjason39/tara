import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../persistence/prisma.service';
import { ILeadRepository, IOpportunityRepository } from './interfaces/crm.repository.interface';
import { SalesLead } from '../entities/sales-lead.entity';
import { SalesOpportunity } from '../entities/sales-opportunity.entity';
import { CreateLeadDto } from '../dto/create-lead.dto';
import { UpdateLeadStatusDto } from '../dto/update-lead-status.dto';
import { CreateOpportunityDto } from '../dto/create-opportunity.dto';
import { MoveOpportunityStageDto } from '../dto/move-opportunity-stage.dto';
import { CloseOpportunityDto } from '../dto/close-opportunity.dto';
import { SalesOrder } from '../entities/sales-order.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CrmDbRepository implements ILeadRepository, IOpportunityRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService | Prisma.TransactionClient
  ) {}

  private get db(): Prisma.TransactionClient {
    return (this.prisma as Prisma.TransactionClient);
  }

  // --- ILeadRepository ---

  async findAllLeads(tenant_id: string, status?: string): Promise<SalesLead[]> {
    return this.db.sales_leads.findMany({
      where: { tenant_id: tenant_id, ...(status ? { status } : {}) }
    }) as unknown as SalesLead[];
  }

  async findLeadById(tenant_id: string, id: string): Promise<SalesLead | null> {
    return this.db.sales_leads.findFirst({
      where: { id, tenant_id: tenant_id }
    }) as unknown as SalesLead;
  }

  async createLead(tenant_id: string, dto: CreateLeadDto, tx?: any): Promise<SalesLead> {
    const db = tx || this.db;
    return db.sales_leads.create({
      data: {
        id: uuidv4(),
        tenant_id,
        ...dto,
        amount: dto.potential_value,
        sla_due_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    }) as unknown as SalesLead;
  }

  async updateStatus(tenant_id: string, id: string, dto: UpdateLeadStatusDto): Promise<SalesLead> {
    return this.db.sales_leads.update({
      where: { id, tenant_id: tenant_id },
      data: { status: dto.status },
    }) as unknown as SalesLead;
  }

  async convert(tenant_id: string, lead_id: string, actor_id: string): Promise<SalesOpportunity> {
    const prismaService = this.prisma instanceof PrismaService ? this.prisma : null;
    if (!prismaService) throw new Error("Transaction required for conversion");

    return prismaService.$transaction(async (tx) => {
      const lead = await tx.sales_leads.findUnique({
        where: { id: lead_id },
      });
      if (!lead || lead.tenant_id !== tenant_id) throw new NotFoundException("Lead not found");

      await tx.sales_leads.update({
        where: { id: lead_id },
        data: { status: 'CONVERTED' }
      });

      return tx.sales_opportunities.create({
        data: {
          id: uuidv4(),
          tenant_id: tenant_id,
          lead_id: lead_id,
          account_name: lead.company_name,
          owner_id: lead.owner_id || actor_id,
          owner_name: lead.owner_name || "System",
          amount: lead.potential_value,
          currency: lead.currency,
          expected_close_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      }) as unknown as SalesOpportunity;
    });
  }

  async runSlaSweep(tenant_id: string, actor_id: string): Promise<any[]> {
    const overdueLeads = await this.db.sales_leads.findMany({
      where: {
        tenant_id: tenant_id,
        sla_due_at: { lt: new Date() },
        first_response_at: null,
        status: { notIn: ['CONVERTED', 'REJECTED'] }
      }
    });

    return Promise.all(overdueLeads.map(lead =>
      this.db.sales_alerts.create({
        data: {
          id: uuidv4(),
          tenant_id: tenant_id,
          type: 'SLA_BREACH',
          entity_type: 'LEAD',
          entity_id: lead.id,
          message: `Lead ${lead.contact_name} (${lead.company_name}) has exceeded the 24h follow-up SLA.`,
          severity: 'HIGH',
          acknowledged: false
        }
      })
    ));
  }

  // --- IOpportunityRepository ---

  async findAllOpportunities(tenant_id: string, stage?: string): Promise<SalesOpportunity[]> {
    return this.db.sales_opportunities.findMany({
      where: { tenant_id: tenant_id, ...(stage ? { stage } : {}) }
    }) as unknown as SalesOpportunity[];
  }

  async findOpportunityById(tenant_id: string, id: string): Promise<SalesOpportunity | null> {
    return this.db.sales_opportunities.findFirst({
      where: { id, tenant_id: tenant_id }
    }) as unknown as SalesOpportunity;
  }

  async createOpportunity(tenant_id: string, dto: CreateOpportunityDto, tx?: any): Promise<SalesOpportunity> {
    const db = tx || this.db;
    return db.sales_opportunities.create({
      data: {
        id: uuidv4(),
        tenant_id,
        ...dto,
      },
    }) as unknown as SalesOpportunity;
  }

  async moveStage(tenant_id: string, id: string, dto: MoveOpportunityStageDto): Promise<SalesOpportunity> {
    return this.db.sales_opportunities.update({
      where: { id, tenant_id: tenant_id },
      data: {
        stage: dto.stage,
        last_activity_at: new Date()
      },
    }) as unknown as SalesOpportunity;
  }

  async close(tenant_id: string, id: string, dto: CloseOpportunityDto): Promise<SalesOpportunity | SalesOrder> {
    const prismaService = this.prisma instanceof PrismaService ? this.prisma : null;
    if (!prismaService) throw new Error("Transaction required for closing");

    return prismaService.$transaction(async (tx) => {
      const result = await tx.sales_opportunities.update({
        where: { id, tenant_id: tenant_id },
        data: {
          stage: dto.result === "won" ? "CLOSED_WON" : "CLOSED_LOST",
          probability: dto.result === "won" ? 100 : 0,
          last_activity_at: new Date()
        },
      });

      if (dto.result === "won") {
        return tx.sales_orders.create({
          data: {
            id: uuidv4(),
            tenant_id: tenant_id,
            opportunity_id: id,
            customer_name: result.account_name,
            amount: result.amount,
            currency: result.currency as any,
            created_by: "system",
            status: "draft"
          },
        }) as unknown as SalesOrder;
      }
      return result as unknown as SalesOpportunity;
    });
  }
}
