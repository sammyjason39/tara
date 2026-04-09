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
    return {
      id: dbEntry.id,
      tenantId: dbEntry.tenantId,
      inventoryTransactionId: dbEntry.inventoryTransactionId,
      sourceEventId: dbEntry.sourceEventId,
      postingRequestId: dbEntry.postingRequestId,
      entryType: dbEntry.entryType as any,
      status: dbEntry.status as any,
      amount: new Prisma.Decimal(dbEntry.amount.toString()),
      currency: dbEntry.currency,
      qty: new Prisma.Decimal(dbEntry.qty.toString()),
      unitCost: new Prisma.Decimal(dbEntry.unitCost.toString()),
      baseAmount: dbEntry.baseAmount ? new Prisma.Decimal(dbEntry.baseAmount.toString()) : undefined,
      baseCurrency: dbEntry.baseCurrency,
      exchangeRate: dbEntry.exchangeRate ? new Prisma.Decimal(dbEntry.exchangeRate.toString()) : undefined,
      debitAccountId: dbEntry.debitAccountId,
      creditAccountId: dbEntry.creditAccountId,
      glJournalId: dbEntry.glJournalId,
      postedAt: dbEntry.postedAt,
      accountingPeriodId: dbEntry.accountingPeriodId,
      postedPeriodId: dbEntry.postedPeriodId,
      skuId: dbEntry.skuId,
      locationId: dbEntry.locationId,
      isSystemGenerated: dbEntry.isSystemGenerated,
      costVersionId: dbEntry.costVersionId,
      reversedEntryId: dbEntry.reversedEntryId,
      failureType: dbEntry.failureType as any,
      referenceType: dbEntry.referenceType,
      referenceId: dbEntry.referenceId,
      createdAt: dbEntry.createdAt,
      updatedAt: dbEntry.updatedAt,
    };
  }

  private mapToCostLayer(dbLayer: any): CostLayer {
    return {
      id: dbLayer.id,
      tenantId: dbLayer.tenantId,
      skuId: dbLayer.skuId,
      locationId: dbLayer.locationId,
      qty: new Prisma.Decimal(dbLayer.qty.toString()),
      remainingQty: new Prisma.Decimal(dbLayer.remainingQty.toString()),
      unitCost: new Prisma.Decimal(dbLayer.unitCost.toString()),
      currency: dbLayer.currency,
      method: dbLayer.method as any,
      sourceEventId: dbLayer.sourceEventId,
      createdAt: dbLayer.createdAt,
    };
  }

  async createEntry(tenant_id: string, data: Partial<InventorySubledgerEntry>, tx?: Prisma.TransactionClient): Promise<InventorySubledgerEntry> {
    const db = tx ?? this.prisma;
    
    const dbEntry = await db.inventorySubledgerEntry.create({
      data: {
        id: 'rnf658sr',
        tenantId: tenant_id,
        inventoryTransactionId: data.inventoryTransactionId!,
        sourceEventId: data.sourceEventId!,
        postingRequestId: data.postingRequestId!,
        entryType: data.entryType!,
        status: data.status || 'PENDING',
        amount: new Prisma.Decimal(data.amount?.toString() || '0'),
        currency: data.currency!,
        qty: new Prisma.Decimal(data.qty?.toString() || '0'),
        unitCost: new Prisma.Decimal(data.unitCost?.toString() || '0'),
        accountingPeriodId: data.accountingPeriodId!,
        skuId: data.skuId!,
        locationId: data.locationId!,
        isSystemGenerated: data.isSystemGenerated ?? true,
        reversedEntryId: data.reversedEntryId,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
      },
    });

    return this.mapToEntity(dbEntry);
  }

  async getEntryById(tenant_id: string, id: string, tx?: Prisma.TransactionClient): Promise<InventorySubledgerEntry> {
    const db = tx ?? this.prisma;
    const dbEntry = await db.inventorySubledgerEntry.findFirst({
      where: { id, tenantId: tenant_id },
    });
    if (!dbEntry) throw new Error(`Subledger Entry ${id} not found`);
    return this.mapToEntity(dbEntry);
  }

  async findEntryBySourceEvent(tenant_id: string, sourceEventId: string, entryType: string, tx?: Prisma.TransactionClient): Promise<InventorySubledgerEntry | null> {
    const db = tx ?? this.prisma;
    const dbEntry = await db.inventorySubledgerEntry.findFirst({
      where: { tenantId: tenant_id, sourceEventId, entryType },
    });
    return dbEntry ? this.mapToEntity(dbEntry) : null;
  }

  async updateEntryStatus(tenant_id: string, id: string, status: string, additionalMetadata?: any, tx?: Prisma.TransactionClient): Promise<InventorySubledgerEntry> {
    const db = tx ?? this.prisma;
    
    const dbEntry = await db.inventorySubledgerEntry.update({
      where: { id },
      data: {
        status,
        postedAt: status === 'POSTED' ? new Date() : undefined,
        
      },
    });
    return this.mapToEntity(dbEntry);
  }

  async lockEntry(tenant_id: string, id: string, tx?: Prisma.TransactionClient): Promise<InventorySubledgerEntry> {
    return this.updateEntryStatus(tenant_id, id, 'POSTED', undefined, tx);
  }

  async getCostLayers(tenant_id: string, skuId: string, locationId: string, tx?: Prisma.TransactionClient): Promise<CostLayer[]> {
    const db = tx ?? this.prisma;
    const dbLayers = await db.costLayer.findMany({
      where: {
        tenantId: tenant_id,
        skuId,
        locationId,
        remainingQty: { gt: 0 },
      },
      orderBy: { createdAt: 'asc' }, // FIFO default
    });
    return dbLayers.map((l: any) => this.mapToCostLayer(l));
  }

  async createCostLayer(tenant_id: string, data: Partial<CostLayer>, tx?: Prisma.TransactionClient): Promise<CostLayer> {
    const db = tx ?? this.prisma;
    const dbLayer = await db.costLayer.create({
      data: {
        id: 'n2sl342q',
        
        tenantId: tenant_id,
        skuId: data.skuId!,
        locationId: data.locationId!,
        qty: new Prisma.Decimal(data.qty!.toString()),
        remainingQty: new Prisma.Decimal((data.remainingQty ?? data.qty!).toString()),
        unitCost: new Prisma.Decimal(data.unitCost!.toString()),
        currency: data.currency || 'USD',
        method: data.method || 'FIFO',
        sourceEventId: data.sourceEventId!,
      },
    });
    return this.mapToCostLayer(dbLayer);
  }

  async updateCostLayer(tenant_id: string, id: string, data: Partial<CostLayer>, tx?: Prisma.TransactionClient): Promise<CostLayer> {
    const db = tx ?? this.prisma;
    const dbLayer = await db.costLayer.update({
      where: { id },
      data: {
        remainingQty: data.remainingQty,
      },
    });
    return this.mapToCostLayer(dbLayer);
  }

  async createCostSnapshot(tenant_id: string, data: Partial<CostSnapshot>, tx?: Prisma.TransactionClient): Promise<CostSnapshot> {
    const db = tx ?? this.prisma;
    const dbSnapshot = await db.costSnapshot.create({
      data: {
        id: 'her761hd',
        
        tenantId: tenant_id,
        skuId: data.skuId!,
        locationId: data.locationId!,
        totalQty: new Prisma.Decimal(data.totalQty!.toString()),
        totalValuation: new Prisma.Decimal(data.totalValuation!.toString()),
        avgUnitCost: new Prisma.Decimal(data.avgUnitCost!.toString()),
        currency: data.currency || 'USD',
      },
    });

    return {
      id: dbSnapshot.id,
      tenantId: dbSnapshot.tenantId,
      skuId: dbSnapshot.skuId,
      locationId: dbSnapshot.locationId,
      totalQty: new Prisma.Decimal(dbSnapshot.totalQty.toString()),
      totalValuation: new Prisma.Decimal(dbSnapshot.totalValuation.toString()),
      avgUnitCost: new Prisma.Decimal(dbSnapshot.avgUnitCost.toString()),
      currency: dbSnapshot.currency,
      snapshotDate: dbSnapshot.snapshotDate,
    };
  }

  async getCurrentValuation(tenant_id: string, skuId: string, locationId: string, tx?: Prisma.TransactionClient): Promise<{ unitCost: Prisma.Decimal; currency: string; method: string }> {
    const layers = await this.getCostLayers(tenant_id, skuId, locationId, tx);
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
