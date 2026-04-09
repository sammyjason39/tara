import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IInventorySubledgerRepository } from './interfaces/inventory-subledger.repository.interface';
import { InventorySubledgerEntry } from '../entities/inventory-subledger-entry.entity';
import { CostLayer } from '../entities/cost-layer.entity';
import { CostSnapshot } from '../entities/cost-snapshot.entity';
import { v4 as uuid } from 'uuid';

@Injectable()
export class InventorySubledgerMockRepository implements IInventorySubledgerRepository {
  private entries: InventorySubledgerEntry[] = [];
  private costLayers: CostLayer[] = [];
  private costSnapshots: CostSnapshot[] = [];

  async createEntry(tenant_id: string, data: Partial<InventorySubledgerEntry>, tx?: Prisma.TransactionClient): Promise<InventorySubledgerEntry> {
    const entry: InventorySubledgerEntry = {
      id: uuid(),
      tenantId: tenant_id,
      status: 'PENDING',
      isSystemGenerated: data.isSystemGenerated ?? true,
      amount: new Prisma.Decimal(data.amount?.toString() || '0'),
      qty: new Prisma.Decimal(data.qty?.toString() || '0'),
      unitCost: new Prisma.Decimal(data.unitCost?.toString() || '0'),
      currency: data.currency || 'USD',
      skuId: data.skuId!,
      locationId: data.locationId!,
      inventoryTransactionId: data.inventoryTransactionId!,
      sourceEventId: data.sourceEventId!,
      postingRequestId: data.postingRequestId!,
      entryType: data.entryType!,
      accountingPeriodId: data.accountingPeriodId!,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as InventorySubledgerEntry;
    
    this.entries.push(entry);
    return entry;
  }

  async getEntryById(tenant_id: string, id: string, tx?: Prisma.TransactionClient): Promise<InventorySubledgerEntry> {
    const entry = this.entries.find(e => e.id === id && e.tenantId === tenant_id);
    if (!entry) throw new Error(`Entry ${id} not found`);
    return entry;
  }

  async findEntryBySourceEvent(tenant_id: string, sourceEventId: string, entryType: string, tx?: Prisma.TransactionClient): Promise<InventorySubledgerEntry | null> {
    return this.entries.find(e => e.tenantId === tenant_id && e.sourceEventId === sourceEventId && e.entryType === entryType) || null;
  }

  async updateEntryStatus(tenant_id: string, id: string, status: any, metadata?: any, tx?: Prisma.TransactionClient): Promise<InventorySubledgerEntry> {
    const entry = await this.getEntryById(tenant_id, id);
    if (!entry) throw new Error('Entry not found');
    
    if (entry.status === 'POSTED') {
      throw new Error(`CRITICAL AUDIT SHIELD: Entry ${id} is POSTED and IMMUTABLE.`);
    }

    entry.status = status;
    if (metadata) {
      Object.assign(entry, metadata);
    }
    entry.updatedAt = new Date();
    return entry;
  }

  async lockEntry(tenant_id: string, id: string, tx?: Prisma.TransactionClient): Promise<InventorySubledgerEntry> {
    return this.updateEntryStatus(tenant_id, id, 'POSTED', undefined, tx);
  }

  async getCostLayers(tenant_id: string, skuId: string, locationId: string, tx?: Prisma.TransactionClient): Promise<CostLayer[]> {
    return this.costLayers.filter(l => l.tenantId === tenant_id && l.skuId === skuId && l.locationId === locationId && l.remainingQty.gt(0));
  }

  async createCostLayer(tenant_id: string, data: Partial<CostLayer>, tx?: Prisma.TransactionClient): Promise<CostLayer> {
    const layer: CostLayer = {
      id: uuid(),
      tenantId: tenant_id,
      skuId: data.skuId!,
      locationId: data.locationId!,
      qty: new Prisma.Decimal(data.qty?.toString() || '0'),
      remainingQty: new Prisma.Decimal(data.remainingQty?.toString() || data.qty?.toString() || '0'),
      unitCost: new Prisma.Decimal(data.unitCost?.toString() || '0'),
      currency: data.currency || 'USD',
      method: data.method || 'FIFO',
      sourceEventId: data.sourceEventId!,
      createdAt: new Date(),
    } as CostLayer;
    this.costLayers.push(layer);
    return layer;
  }

  async updateCostLayer(tenant_id: string, id: string, data: Partial<CostLayer>, tx?: Prisma.TransactionClient): Promise<CostLayer> {
    const index = this.costLayers.findIndex(l => l.id === id);
    if (index === -1) throw new Error('Layer not found');
    this.costLayers[index] = { ...this.costLayers[index], ...data };
    return this.costLayers[index];
  }

  async createCostSnapshot(tenant_id: string, data: Partial<CostSnapshot>, tx?: Prisma.TransactionClient): Promise<CostSnapshot> {
    const snapshot: CostSnapshot = {
      id: uuid(),
      tenantId: tenant_id,
      skuId: data.skuId!,
      locationId: data.locationId!,
      totalQty: new Prisma.Decimal(data.totalQty?.toString() || '0'),
      totalValuation: new Prisma.Decimal(data.totalValuation?.toString() || '0'),
      avgUnitCost: new Prisma.Decimal(data.avgUnitCost?.toString() || '0'),
      currency: data.currency || 'USD',
      snapshotDate: data.snapshotDate || new Date(),
    } as CostSnapshot;
    this.costSnapshots.push(snapshot);
    return snapshot;
  }

  async getCurrentValuation(tenant_id: string, skuId: string, locationId: string, tx?: Prisma.TransactionClient): Promise<{ unitCost: Prisma.Decimal; currency: string; method: string }> {
    const layers = await this.getCostLayers(tenant_id, skuId, locationId);
    if (layers.length === 0) return { unitCost: new Prisma.Decimal(0), currency: 'USD', method: 'FIFO' };
    
    let totalQty = new Prisma.Decimal(0);
    let totalVal = new Prisma.Decimal(0);
    
    for (const l of layers) {
      totalQty = totalQty.plus(l.remainingQty || 0);
      totalVal = totalVal.plus((l.remainingQty || 0).mul(l.unitCost || 0));
    }
    
    return {
      unitCost: totalQty.gt(0) ? totalVal.div(totalQty) : new Prisma.Decimal(0),
      currency: layers[0].currency || 'USD',
      method: 'FIFO',
    };
  }

  seedCostLayer(layer: CostLayer) {
    this.costLayers.push(layer);
  }
}
