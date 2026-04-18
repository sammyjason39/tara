import { Injectable, Logger, Inject } from '@nestjs/common';
import { IInventorySubledgerRepository } from './repositories/interfaces/inventory-subledger.repository.interface';
import { InventorySubledgerEntry } from './entities/inventory-subledger-entry.entity';
import { InventoryAccountingIntegrationService } from './inventory-accounting-integration.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CostingEngineService {
  private readonly logger = new Logger(CostingEngineService.name);

  constructor(
    @Inject('IInventorySubledgerRepository')
    private readonly repository: IInventorySubledgerRepository,
    private readonly integration: InventoryAccountingIntegrationService,
  ) {}

  async processEntry(tenant_id: string, entryId: string, tx?: any, correlation_id?: string): Promise<void> {
    const entry = await this.repository.getEntryById(tenant_id, entryId, tx);
    
    // Hardening Rule: Process only PENDING entries
    if (!entry || entry.status !== 'PENDING') {
      return;
    }

    this.logger.log(`Processing costing for entry ${entryId} (SKU: ${entry.skuId})`);

    try {
      await this.repository.updateEntryStatus(tenant_id, entryId, 'POSTING', undefined, tx); // Mark as transition state

      if (entry.entryType === 'PROVISIONAL_ADJUSTMENT') {
        await this.processInbound(tenant_id, entry, tx, correlation_id);
      } else if (entry.entryType === 'INVENTORY_ISSUE') {
        await this.processOutbound(tenant_id, entry, tx, correlation_id);
      }

    } catch (error) {
      this.logger.error(`Failed to cost entry ${entryId}: ${error.message}`);
      await this.repository.updateEntryStatus(tenant_id, entryId, 'FAILED', {
        failureType: 'SYSTEM_ERROR'
      }, tx);
    }
  }

  private async processInbound(tenant_id: string, entry: InventorySubledgerEntry, tx?: any, correlation_id?: string): Promise<void> {
    const unitCost = entry.unitCost || new Prisma.Decimal(0);
    
    const total_amount = unitCost.mul(entry.qty.abs());
    
    const snapshot = await this.repository.createCostSnapshot(tenant_id, {
      skuId: entry.skuId,
      location_id: entry.location_id,
      avgUnitCost: unitCost,
      totalQty: entry.qty.abs(),
      totalValuation: total_amount,
      currency: entry.currency || 'USD',
    }, tx);

    // CRITICAL: Create the actual Cost Layer for future FIFO/LIFO tracking
    await this.repository.createCostLayer(tenant_id, {
      skuId: entry.skuId,
      location_id: entry.location_id,
      qty: entry.qty.abs(),
      remainingQty: entry.qty.abs(),
      unitCost: unitCost,
      sourceEventId: entry.sourceEventId,
      method: 'FIFO',
      currency: entry.currency || 'USD',
    }, tx);

    await this.repository.updateEntryStatus(tenant_id, entry.id, 'COSTED', {
      costVersionId: snapshot.id,
      amount: total_amount, // Standardized as positive
    }, tx);

    // Trigger UFPG Integration
    await this.integration.handleCostFinalized(tenant_id, entry, snapshot, correlation_id);
  }

  private async processOutbound(tenant_id: string, entry: InventorySubledgerEntry, tx?: any, correlation_id?: string): Promise<void> {
    const layers = await this.repository.getCostLayers(tenant_id, entry.skuId, entry.location_id, tx);
    let remainingToCost = entry.qty.abs();
    let totalCost = new Prisma.Decimal(0);
    const usedLayers: { layerId: string; qty: Prisma.Decimal }[] = [];

    for (const layer of layers) {
      if (remainingToCost.lte(0)) break;
      const take = Prisma.Decimal.min(layer.remainingQty, remainingToCost);
      layer.remainingQty = layer.remainingQty.minus(take);
      totalCost = totalCost.plus(take.mul(layer.unitCost));
      usedLayers.push({ layerId: layer.id, qty: take });
      remainingToCost = remainingToCost.minus(take);

      // Persist the depletion back to the DB
      await this.repository.updateCostLayer(tenant_id, layer.id, {
        remainingQty: layer.remainingQty
      }, tx);
    }

    // Handle stock-outs with last known cost
    if (remainingToCost.gt(0)) {
      const lastCost = layers.length > 0 ? layers[layers.length - 1].unitCost : new Prisma.Decimal(0);
      totalCost = totalCost.plus(remainingToCost.mul(lastCost));
    }

    const avgUnitCost = totalCost.div(entry.qty.abs());

    const snapshot = await this.repository.createCostSnapshot(tenant_id, {
      skuId: entry.skuId,
      location_id: entry.location_id,
      avgUnitCost: avgUnitCost,
      totalQty: entry.qty.abs(),
      totalValuation: totalCost,
      currency: entry.currency || 'USD',
      
    }, tx);

    await this.repository.updateEntryStatus(tenant_id, entry.id, 'COSTED', {
      costVersionId: snapshot.id,
      amount: totalCost, // Standardized as positive
      unitCost: avgUnitCost
    }, tx);

    // Trigger UFPG Integration
    await this.integration.handleCostFinalized(tenant_id, entry, snapshot, correlation_id);
  }
}
