import { Injectable, Inject } from '@nestjs/common';
import { Prisma, inventory_audit_cycles as AuditCycle, inventory_adjustments as InventoryAdjustment } from '@prisma/client';
import { PrismaService } from '../../../persistence/prisma.service';
import { IInventoryAuditRepository } from './interfaces/inventory-audit.repository.interface';
import { CreateAdjustmentDto } from '../dto/create-adjustment.dto';
import { v4 as uuidv4 } from 'uuid';
import { TenantContext } from '../../../gateway/tenant-context.interface';
import { MultiTenancyUtil } from '../../../shared/utils/multi-tenancy.util';

@Injectable()
export class InventoryAuditDbRepository implements IInventoryAuditRepository {
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

  async createAuditCycle(ctx: TenantContext, data: any): Promise<AuditCycle> {
    return this.db.inventory_audit_cycles.create({
      data: {
        id: uuidv4(),
        tenant_id: ctx.tenant_id,
        ...(ctx.company_id && { company_id: ctx.company_id }),
        location_code: data.location_id || data.location_code, 
        scope: data.title || data.scope || 'FULL',
        status: 'OPEN',
        opened_by: data.openedBy || data.opened_by || 'system',
      }
    });
  }

  async getAuditCycles(ctx: TenantContext): Promise<AuditCycle[]> {
    return this.db.inventory_audit_cycles.findMany({
      where: {
        tenant_id: ctx.tenant_id,
        ...(ctx.company_id && { company_id: ctx.company_id }),
      },
      orderBy: { created_at: 'desc' } 
    });
  }

  async finalizeAudit(ctx: TenantContext, cycleId: string, performedBy: string): Promise<AuditCycle> {
    return this.db.inventory_audit_cycles.update({
      where: { 
        id: cycleId, 
        tenant_id: ctx.tenant_id 
      },
      data: {
        status: 'COMPLETED',
        closed_by: performedBy,
      }
    });
  }

  async createAdjustment(ctx: TenantContext, data: CreateAdjustmentDto, providedTx?: any): Promise<InventoryAdjustment> {
    const db = providedTx || this.db;
    return db.inventory_adjustments.create({
      data: {
        id: uuidv4(),
        ...MultiTenancyUtil.getScope(ctx),
        item_id: data.item_id,
        location_id: data.location_id,
        department_id: data.department_id || null,
        requested_delta: data.requested_delta,
        reason: data.reason,
        status: "PENDING_APPROVAL",
        requested_by: data.requested_by || "system",
        updated_at: new Date(),
      }
    });
  }

  async approveAdjustment(ctx: TenantContext, id: string, approvedBy: string): Promise<InventoryAdjustment> {
    const prismaService = this.prisma instanceof PrismaService ? this.prisma : null;
    if (!prismaService) throw new Error("Transaction required for approveAdjustment");

    return prismaService.$transaction(async (tx) => {
      // 1. Update adjustment record
      const adj = await tx.inventory_adjustments.update({
        where: { id, ...MultiTenancyUtil.getScope(ctx) },
        data: {
          status: "APPROVED",
          approved_by: approvedBy,
          approved_at: new Date(),
          updated_at: new Date(),
        }
      });

      // 2. Update stock level
      await tx.stock_levels.upsert({
        where: {
          tenant_id_location_id_product_id_department_id: {
            tenant_id: ctx.tenant_id,
            location_id: adj.location_id,
            product_id: adj.item_id,
            department_id: adj.department_id ?? (null as any),
          },
        },
        create: {
          id: uuidv4(),
          ...MultiTenancyUtil.getScope(ctx),
          location_id: adj.location_id,
          department_id: adj.department_id || null,
          product_id: adj.item_id,
          on_hand: adj.requested_delta,
          available: adj.requested_delta,
          updated_at: new Date(),
        },
        update: {
          on_hand: { increment: adj.requested_delta },
          available: { increment: adj.requested_delta },
          updated_at: new Date(),
        }
      });

      // 3. Create movement log
      await tx.stock_movements.create({
        data: {
          id: uuidv4(),
          ...MultiTenancyUtil.getScope(ctx),
          product_id: adj.item_id,
          location_id: adj.location_id,
          to_location_id: adj.location_id,
          quantity: Math.abs(Number(adj.requested_delta)),
          type: Number(adj.requested_delta) > 0 ? "ADJUSTMENT_PLUS" : "ADJUSTMENT_MINUS",
          reference_id: `ADJ-${adj.id}`,
          reference_type: "ADJUSTMENT",
          performed_by: approvedBy,
        }
      });

      return adj;
    });
  }

  async getAdjustments(ctx: TenantContext, filters?: any): Promise<InventoryAdjustment[]> {
    return this.db.inventory_adjustments.findMany({
      where: { ...filters, ...MultiTenancyUtil.getScope(ctx) },
      orderBy: { created_at: 'desc' },
      take: filters?.take || 100
    });
  }
}
