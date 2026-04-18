import { Injectable, Inject } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../persistence/prisma.service';
import { ISalesOrderRepository, SalesOrderFilters } from './interfaces/order.repository.interface';
import { SalesOrder } from '../entities/sales-order.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SalesOrderDbRepository implements ISalesOrderRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService | Prisma.TransactionClient
  ) {}

  private get db(): Prisma.TransactionClient {
    if (this.prisma instanceof PrismaService) {
      return (this.prisma as any);
    }
    return this.prisma as Prisma.TransactionClient;
  }

  async findAll(tenant_id: string, filters?: SalesOrderFilters): Promise<SalesOrder[]> {
    return this.db.sales_orders.findMany({
      where: {
        tenant_id: tenant_id,
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.opportunityId ? { opportunity_id: filters.opportunityId } : {}),
        ...(filters?.customerName ? { customerName: { contains: filters.customerName, mode: 'insensitive' } } : {}),
      },
      orderBy: { created_at: 'desc' }
    }) as any;
  }

  async findById(tenant_id: string, id: string): Promise<SalesOrder | null> {
    return this.db.sales_orders.findFirst({
      where: { id, tenant_id: tenant_id }
    }) as any;
  }

  async create(tenant_id: string, data: Partial<SalesOrder>, tx?: any): Promise<SalesOrder> {
    const db = tx || this.db;
    return db.sales_orders.create({
      data: {
        id: uuidv4(),
        tenant_id,
        opportunity_id: data.opportunityId!,
        quoteId: data.quoteId,
        customerName: data.customerName!,
        amount: data.amount!,
        currency: data.currency || 'IDR',
        status: data.status || 'draft',
        created_by: data.createdBy || 'system',
      } as any,
    }) as any;
  }

  async updateStatus(tenant_id: string, id: string, status: string): Promise<SalesOrder> {
    return this.db.sales_orders.update({
      where: { id, tenant_id: tenant_id },
      data: { status: status as any, updated_at: new Date() }
    }) as any;
  }

  async linkInvoice(tenant_id: string, id: string, invoiceId: string): Promise<SalesOrder> {
    return this.db.sales_orders.update({
      where: { id, tenant_id: tenant_id },
      data: { finance_invoice_id: invoiceId, status: 'invoiced', updated_at: new Date() }
    }) as any;
  }

  async setFulfillmentLocation(tenant_id: string, id: string, location_id: string): Promise<SalesOrder> {
    // This method is the hook for Inventory Sync
    return this.db.sales_orders.update({
      where: { id, tenant_id: tenant_id },
      data: { 
          // Note: If the schema doesn't have fulfillmentLocationId yet, we can use metadata or a specific field.
          // For now, let's assume we update the order status to trigger the sync.
          status: 'pending_finance_handoff',
          updated_at: new Date() 
      }
    }) as any;
  }
}
