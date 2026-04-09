import { Injectable, OnModuleInit, Logger, Inject } from '@nestjs/common';
import { EventBusService, DomainEvent } from "../../../../shared/events/event-bus.service";
import { IInventorySubledgerRepository } from '../repositories/interfaces/inventory-subledger.repository.interface';
import { CostingEngineService } from '../costing-engine.service';
import { v4 as uuid } from 'uuid';
import { Prisma } from '@prisma/client';

@Injectable()
export class InventoryMovementListener implements OnModuleInit {
  private readonly logger = new Logger(InventoryMovementListener.name);

  constructor(
    private readonly eventBus: EventBusService,
    @Inject('IInventorySubledgerRepository')
    private readonly repository: IInventorySubledgerRepository,
    private readonly costingEngine: CostingEngineService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('STOCK_MOVEMENT_CREATED', 'InventoryMovementListener.handle', async (event: DomainEvent) => {
      if (event.eventType === 'STOCK_MOVEMENT_CREATED') {
        await this.handleStockMovement(event);
      }
    });
  }

  private async handleStockMovement(event: DomainEvent) {
    const { tenantId, entityId: inventoryTransactionId, payload } = event;
    const entryType = this.mapTypeToEntryType(payload.type);
    
    this.logger.log(`Finance Domain: Processing stock movement for transaction ${inventoryTransactionId} (Type: ${entryType})`);
    
    try {
      // 1. Idempotency Check (inventoryTransactionId + entryType)
      const existing = await this.repository.findEntryBySourceEvent(tenantId, inventoryTransactionId, entryType, event.tx);
      if (existing) {
        this.logger.warn(`Duplicate event detected. Skipping processing for movement: ${inventoryTransactionId}`);
        return;
      }

      // 2. Quantity Sign Enforcement
      let qty = payload.qty;
      if (entryType === 'INVENTORY_ISSUE' && qty > 0) {
        qty = -qty; // Enforce negative qty for issues
      }

      // 3. Record in Financial Sub-ledger
      const entry = await this.repository.createEntry(tenantId, {
        inventoryTransactionId,
        sourceEventId: inventoryTransactionId,
        postingRequestId: uuid(),
        entryType,
        status: 'PENDING',
        skuId: payload.skuId,
        locationId: payload.locationId,
        qty,
        unitCost: new Prisma.Decimal((payload.provisionalCost || 0).toString()),
        amount: new Prisma.Decimal((payload.provisionalCost || 0).toString()).mul(Math.abs(qty)),
        currency: payload.currency || 'USD',
        accountingPeriodId: 'PERIOD-2026-03', // TODO: Resolve from date
        isSystemGenerated: true,
        referenceType: payload.referenceType,
        referenceId: payload.referenceId,
      }, event.tx);

      // 4. Trigger Costing Engine (Only for Issues/Movements needing valuation)
      if (entryType === 'INVENTORY_ISSUE') {
        await this.costingEngine.processEntry(tenantId, entry.id, event.tx, event.correlationId);
      } else {
        // Receipts/Adjustments might be auto-costed if provisional is final
        await this.costingEngine.processEntry(tenantId, entry.id, event.tx, event.correlationId);
      }

    } catch (error) {
      this.logger.error(`Failed to handle stock movement in Finance domain: ${error.message}`);
    }
  }

  private mapTypeToEntryType(type: string): 'INVENTORY_ISSUE' | 'COGS_RECOGNITION' | 'INVENTORY_REVALUATION' | 'PROVISIONAL_ADJUSTMENT' {
    switch (type) {
      case 'RECEIPT': return 'PROVISIONAL_ADJUSTMENT'; // Receipts are provisional until verified by audit
      case 'ISSUE': return 'INVENTORY_ISSUE';
      case 'ADJUSTMENT': return 'PROVISIONAL_ADJUSTMENT';
      case 'TRANSFER': return 'INVENTORY_ISSUE'; // Transfers are an issue from one location
      default: return 'INVENTORY_ISSUE';
    }
  }
}
