import { Injectable } from '@nestjs/common';
import { ILeadRepository, IOpportunityRepository } from './interfaces/crm.repository.interface';
import { ISalesOrderRepository, SalesOrderFilters } from './interfaces/order.repository.interface';
import { SalesLead } from '../entities/sales-lead.entity';
import { SalesOpportunity } from '../entities/sales-opportunity.entity';
import { SalesOrder } from '../entities/sales-order.entity';

@Injectable()
export class CrmMockRepository implements ILeadRepository, IOpportunityRepository {
  async findAllLeads(tenant_id: string) { return []; }
  async findLeadById(tenant_id: string, id: string) { return null; }
  async createLead(tenant_id: string, dto: any) { return {} as any; }
  async updateStatus(tenant_id: string, id: string, dto: any) { return {} as any; }
  async convert(tenant_id: string, lead_id: string) { return {} as any; }
  async runSlaSweep(tenant_id: string) { return []; }

  async findAllOpportunities(tenant_id: string) { return []; }
  async findOpportunityById(tenant_id: string, id: string) { return null; }
  async createOpportunity(tenant_id: string, dto: any) { return {} as any; }
  async moveStage(tenant_id: string, id: string) { return {} as any; }
  async close(tenant_id: string, id: string) { return {} as any; }
}

@Injectable()
export class SalesOrderMockRepository implements ISalesOrderRepository {
  async findAll(tenant_id: string) { return []; }
  async findById(tenant_id: string, id: string) { return null; }
  async create(tenant_id: string, data: any) { return {} as any; }
  async updateStatus(tenant_id: string, id: string, status: string) { return {} as any; }
  async linkInvoice(tenant_id: string, id: string, invoiceId: string) { return {} as any; }
  async setFulfillmentLocation(tenant_id: string, id: string, location_id: string) { return {} as any; }
}
