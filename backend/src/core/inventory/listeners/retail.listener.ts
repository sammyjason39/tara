import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InventoryService } from "../inventory.service";
import { EventBusService } from "../../../shared/events/event-bus.service";

@Injectable()
export class RetailListener implements OnModuleInit {
  private readonly logger = new Logger(RetailListener.name);

  constructor(
    private readonly inventoryService: InventoryService,
    private readonly eventBus: EventBusService
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('RETAIL_SALE_COMPLETED', 'RetailListener.handle', async (event: any) => {
      switch (event.event_type) {
        case "RETAIL_SALE_COMPLETED":
          return this.handleRetailSale(event);
        case "RETAIL_RETURN_COMPLETED":
          return this.handleRetailReturn(event);
        case "RETAIL_OPNAME_SUBMITTED":
          return this.handleRetailOpname(event);
        case "RETAIL_GOODS_RECEIVED":
          return this.handleRetailGoodsReceived(event);
      }
    });
  }

  async handleRetailSale(event: any) {
    this.logger.log(`Received RETAIL_SALE_COMPLETED for order ${event.payload?.order_id}`);
    try {
      const { tenant_id, payload, user_id } = event;
      
      for (const move of payload.movements) {
        await this.inventoryService.consumeStock(
          tenant_id,
          {
            item_id: move.product_id,
            location_id: move.fromLocationId,
            quantity: move.quantity,
            reason: "RETAIL_SALE",
            referenceId: payload.order_id,
            referenceType: "RETAIL_ORDER",
          },
          user_id,
          event.tx,
          event.correlation_id
        );
      }
    } catch (error) {
      this.logger.error(`Failed to process RETAIL_SALE_COMPLETED: ${error.message}`);
    }
  }

  async handleRetailReturn(event: any) {
    this.logger.log(`Received RETAIL_RETURN_COMPLETED for order ${event.payload?.order_id}`);
    try {
      const { tenant_id, payload, user_id } = event;
      
      for (const item of payload.returnedItems) {
        await this.inventoryService.intakeStock(
          tenant_id,
          {
            item_id: item.product_id,
            location_id: payload.store_id,
            quantity: item.quantity,
            unitCost: item.unit_price,
            reason: "CUSTOMER_RETURN",
            referenceId: `RETAIL_RETURN_${payload.order_id}`,
          },
          user_id,
          event.tx,
          event.correlation_id
        );
      }
    } catch (error) {
      this.logger.error(`Failed to process RETAIL_RETURN_COMPLETED: ${error.message}`);
    }
  }

  async handleRetailOpname(event: any) {
    this.logger.log(`Received RETAIL_OPNAME_SUBMITTED for store ${event.payload?.store_id}`);
    try {
      const { tenant_id, payload, user_id } = event;
      
      for (const adj of payload.adjustments) {
        await this.inventoryService.createAdjustment(
          tenant_id,
          {
            item_id: adj.product_id,
            location_id: payload.store_id,
            requestedDelta: adj.variance,
            reason: `RETAIL_OPNAME_${payload.sessionId}`,
          },
          user_id,
          event.tx,
          event.correlation_id
        );
      }
    } catch (error) {
      this.logger.error(`Failed to process RETAIL_OPNAME_SUBMITTED: ${error.message}`);
    }
  }

  async handleRetailGoodsReceived(event: any) {
    this.logger.log(`Received RETAIL_GOODS_RECEIVED for shipment ${event.payload?.shipment_id}`);
    try {
      const { tenant_id, payload, user_id } = event;
      
      for (const item of payload.items) {
        await this.inventoryService.intakeStock(
          tenant_id,
          {
            item_id: item.product_id,
            location_id: payload.store_id,
            quantity: item.quantity,
            unitCost: item.unitCost || 0,
            reason: "RETAIL_STOCK_INTAKE",
            referenceId: `RETAIL_INTAKE_${payload.shipment_id}`,
          },
          user_id,
          event.tx,
          event.correlation_id
        );
      }
    } catch (error) {
      this.logger.error(`Failed to process RETAIL_GOODS_RECEIVED: ${error.message}`);
    }
  }
}
