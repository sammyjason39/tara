import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../persistence/prisma.service';
import { IInventorySubledgerRepository } from './interfaces/inventory-subledger.repository.interface';
import { InventorySubledgerEntry } from '../entities/inventory-subledger-entry.entity';
import { CostLayer } from '../entities/cost-layer.entity';
import { CostSnapshot } from '../entities/cost-snapshot.entity';
import { Prisma } from '@prisma/client';

@Injectable()
export class InventorySubledgerDbRepository implements IInventorySubledgerRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToEntity(dbEntry: any): InventorySubledgerEntry {
    const meta = (dbEntry.metadata as any) || {};
    return {
      id: dbEntry.id,
      tenant_id: dbEntry.tenant_id,
      inventoryTransactionId: meta.inventoryTransactionId || dbEntry.inventoryTransactionId,
      sourceEventId: dbEntry.source_event_id,
      postingRequestId: meta.postingRequestId || dbEntry.postingRequestId,
      entryType: dbEntry.entry_type as any,
      status: dbEntry.status as any,
      amount: new Prisma.Decimal(meta.amount?.toString() || '0'),
      currency: meta.currency || 'USD',
      qty: new Prisma.Decimal(meta.qty?.toString() || '0'),
      unitCost: new Prisma.Decimal(meta.unitCost?.toString() || '0'),
      baseAmount: meta.baseAmount ? new Prisma.Decimal(meta.baseAmount.toString()) : undefined,
      baseCurrency: meta.baseCurrency,
      exchangeRate: meta.exchangeRate ? new Prisma.Decimal(meta.exchangeRate.toString()) : undefined,
      debitAccountId: meta.debitAccountId,
      creditAccountId: meta.creditAccountId,
      glJournalId: meta.glJournalId,
      postedAt: dbEntry.posted_at,
      accountingPeriodId: meta.accountingPeriodId,
      postedPeriodId: meta.postedPeriodId,
      skuId: meta.skuId,
      location_id: meta.location_id,
      isSystemGenerated: dbEntry.is_system_generated,
      costVersionId: meta.costVersionId,
      reversedEntryId: dbEntry.reversed_entry_id,
      failureType: meta.failureType as any,
      referenceType: meta.referenceType,
      referenceId: meta.referenceId,
      created_at: dbEntry.created_at,
      updated_at: dbEntry.updated_at,
    };
  }

  private mapToCostLayer(dbLayer: any): CostLayer {
    return {
      id: dbLayer.id,
      tenant_id: dbLayer.tenant_id,
      skuId: dbLayer.sku_id,
      location_id: dbLayer.location_id,
      qty: new Prisma.Decimal(dbLayer.qty.toString()),
      remainingQty: new Prisma.Decimal(dbLayer.remaining_qty.toString()),
      unitCost: new Prisma.Decimal(dbLayer.unit_cost.toString()),
      currency: dbLayer.currency,
      method: dbLayer.method as any,
      sourceEventId: dbLayer.source_event_id,
      created_at: dbLayer.created_at,
    };
  }

  async createEntry(tenant_id: string, data: Partial<InventorySubledgerEntry>, tx?: Prisma.TransactionClient): Promise<InventorySubledgerEntry> {
    const db = tx ?? this.prisma;
    
    const dbEntry = await db.inventory_subledger_entries.create({
      data: {
        id: require('crypto').randomUUID(),
        tenant_id: tenant_id,
        source_event_id: data.sourceEventId || `inv-${Date.now()}`,
        entry_type: data.entryType!,
        status: data.status || 'PENDING',
        is_system_generated: data.isSystemGenerated ?? true,
        reversed_entry_id: data.reversedEntryId,
        updated_at: new Date(),
        metadata: {
          inventoryTransactionId: data.inventoryTransactionId,
          postingRequestId: data.postingRequestId,
          amount: data.amount,
          currency: data.currency,
          qty: data.qty,
          unitCost: data.unitCost,
          accountingPeriodId: data.accountingPeriodId,
          skuId: data.skuId,
          location_id: data.location_id,
          referenceType: data.referenceType,
          referenceId: data.referenceId,
        } as any
      },
    });

    return this.mapToEntity(dbEntry);
  }

  async getEntryById(tenant_id: string, id: string, tx?: Prisma.TransactionClient): Promise<InventorySubledgerEntry> {
    const db = tx ?? this.prisma;
    const dbEntry = await db.inventory_subledger_entries.findFirst({
      where: { id, tenant_id: tenant_id },
    });
    if (!dbEntry) throw new Error(`Subledger Entry ${id} not found`);
    return this.mapToEntity(dbEntry);
  }

  async findEntryBySourceEvent(tenant_id: string, sourceEventId: string, entryType: string, tx?: Prisma.TransactionClient): Promise<InventorySubledgerEntry | null> {
    const db = tx ?? this.prisma;
    const dbEntry = await db.inventory_subledger_entries.findFirst({
      where: { tenant_id: tenant_id, source_event_id: sourceEventId, entry_type: entryType },
    });
    return dbEntry ? this.mapToEntity(dbEntry) : null;
  }

  async updateEntryStatus(tenant_id: string, id: string, status: string, additionalMetadata?: any, tx?: Prisma.TransactionClient): Promise<InventorySubledgerEntry> {
    const db = tx ?? this.prisma;
    
    const dbEntry = await db.inventory_subledger_entries.update({
      where: { id },
      data: {
        status,
        posted_at: status === 'POSTED' ? new Date() : undefined,
        
      },
    });
    return this.mapToEntity(dbEntry);
  }

  async lockEntry(tenant_id: string, id: string, tx?: Prisma.TransactionClient): Promise<InventorySubledgerEntry> {
    return this.updateEntryStatus(tenant_id, id, 'POSTED', undefined, tx);
  }

  async getCostLayers(tenant_id: string, skuId: string, location_id: string, tx?: Prisma.TransactionClient): Promise<CostLayer[]> {
    const db = tx ?? this.prisma;
    const dbLayers = await db.cost_layers.findMany({
      where: {
        tenant_id: tenant_id,
        sku_id: skuId,
        location_id: location_id,
        remaining_qty: { gt: 0 },
      },
      orderBy: { created_at: 'asc' }, // FIFO default
    });
    return dbLayers.map((l: any) => this.mapToCostLayer(l));
  }

  async createCostLayer(tenant_id: string, data: Partial<CostLayer>, tx?: Prisma.TransactionClient): Promise<CostLayer> {
    const db = tx ?? this.prisma;
    const dbLayer = await db.cost_layers.create({
      data: {
        id: require('crypto').randomUUID(),
        tenant_id: tenant_id,
        sku_id: data.skuId!,
        location_id: data.location_id!,
        qty: Number(data.qty?.toString() || '0'),
        remaining_qty: Number((data.remainingQty ?? data.qty!).toString()),
        unit_cost: new Prisma.Decimal(data.unitCost!.toString()),
        currency: data.currency || 'USD',
        method: data.method || 'FIFO',
        source_event_id: data.sourceEventId!,
      },
    });
    return this.mapToCostLayer(dbLayer);
  }

  async updateCostLayer(tenant_id: string, id: string, data: Partial<CostLayer>, tx?: Prisma.TransactionClient): Promise<CostLayer> {
    const db = tx ?? this.prisma;
    const dbLayer = await db.cost_layers.update({
      where: { id },
      data: {
        remaining_qty: data.remainingQty !== undefined ? Number(data.remainingQty.toString()) : undefined,
      },
    });
    return this.mapToCostLayer(dbLayer);
  }

  async createCostSnapshot(tenant_id: string, data: Partial<CostSnapshot>, tx?: Prisma.TransactionClient): Promise<CostSnapshot> {
    const db = tx ?? this.prisma;
    const dbSnapshot = await db.cost_snapshots.create({
      data: {
        id: require('crypto').randomUUID(),
        tenant_id: tenant_id,
        sku_id: data.skuId!,
        location_id: data.location_id!,
        total_qty: Number(data.totalQty?.toString() || '0'),
        total_valuation: new Prisma.Decimal(data.totalValuation!.toString()),
        avg_unit_cost: new Prisma.Decimal(data.avgUnitCost!.toString()),
        currency: data.currency || 'USD',
      },
    });

    return {
      id: dbSnapshot.id,
      tenant_id: dbSnapshot.tenant_id,
      skuId: dbSnapshot.sku_id,
      location_id: dbSnapshot.location_id,
      totalQty: new Prisma.Decimal(dbSnapshot.total_qty.toString()),
      totalValuation: new Prisma.Decimal(dbSnapshot.total_valuation.toString()),
      avgUnitCost: new Prisma.Decimal(dbSnapshot.avg_unit_cost.toString()),
      currency: dbSnapshot.currency,
      snapshotDate: dbSnapshot.snapshot_date,
    };
  }

  async getCurrentValuation(tenant_id: string, skuId: string, location_id: string, tx?: Prisma.TransactionClient): Promise<{ unitCost: Prisma.Decimal; currency: string; method: string }> {
    const layers = await this.getCostLayers(tenant_id, skuId, location_id, tx);
    if (layers.length === 0) return { unitCost: new Prisma.Decimal(0), currency: 'USD', method: 'FIFO' };
    
    let totalQty = new Prisma.Decimal(0);
    let totalVal = new Prisma.Decimal(0);
    
    for (const l of layers) {
      totalQty = totalQty.plus(l.remainingQty);
      totalVal = totalVal.plus(l.remainingQty.mul(l.unitCost));
    }
    
    return {
      unitCost: totalQty.gt(0) ? totalVal.div(totalQty) : new Prisma.Decimal(0),
      currency: layers[0].currency,
      method: 'FIFO',
    };
  }
}
