import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBusService, DomainEvent } from '../../../shared/events/event-bus.service';
import { InventoryService } from '../inventory.service';

@Injectable()
export class InventoryEventListener implements OnModuleInit {
  constructor(
    private readonly eventBus: EventBusService,
    private readonly inventoryService: InventoryService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('INVENTORY_STOCK_INITIALIZED', 'InventoryEventListener', async (event: DomainEvent) => {
      await this.handleStockInitialized(event);
    });
  }

  private async handleStockInitialized(event: any) {
    const { tenant_id, payload, correlation_id, user_id } = event;
    const { sku, location_id, quantity, unitCost } = payload;

    // 1. Resolve product ID from SKU
    // (Assuming the product was created via INVENTORY_ITEM_CREATED listener in Catalog)
    const product = await (this.inventoryService as any).repository.findProductByCode(tenant_id, sku);
    
    if (!product) {
        console.warn(`[InventoryEventListener] Product not found for SKU: ${sku}. Requeuing or skipping.`);
        return;
    }

    // 2. Perform Intake
    await this.inventoryService.intakeStock(
        tenant_id,
        {
          item_id: product.id,
          location_id: location_id,
          quantity: quantity,
          unitCost: unitCost || 0,
          referenceId: `INIT-${sku}`,
          referenceType: 'INITIALIZATION',
        } as any,
        user_id,
        null,
        correlation_id
    );
  }
}
