import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService, DomainEvent } from '../../shared/events/event-bus.service';
import { ReplenishmentService } from './replenishment.service';
import { AnomalyDetectorService } from './anomaly-detector.service';
import { IInventoryRepository } from '../../core/inventory/repositories/inventory.repository.interface';

@Injectable()
export class InventoryAgentListener implements OnModuleInit {
  private readonly logger = new Logger(InventoryAgentListener.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly replenishment: ReplenishmentService,
    private readonly anomalyDetector: AnomalyDetectorService,
    private readonly inventoryRepo: IInventoryRepository,
  ) {}

  onModuleInit() {
    this.logger.log('Inventory Agent Listener Initializing...');
    
    // 1. Listen for Stock Movements to detect anomalies and update forecasts
    this.eventBus.subscribe('STOCK_MOVEMENT_CREATED', 'InventoryAgent.Anomalies', async (event: DomainEvent) => {
      await this.handleStockMovement(event);
    });

    // 2. Listen for Low Stock Alerts to trigger replenishment evaluation
    this.eventBus.subscribe('INVENTORY_ALERT_CREATED', 'InventoryAgent.Replenish', async (event: DomainEvent) => {
      await this.handleAlert(event);
    });
  }

  private async handleStockMovement(event: DomainEvent) {
    const { tenant_id, payload } = event;
    const { product_id, location_id, quantity } = payload;

    this.logger.debug(`Agent analyzing movement: ${quantity} for Product ${product_id}`);

    // Check for spikes
    const isSpike = await this.anomalyDetector.detectSpike(tenant_id, product_id, location_id, quantity);
    if (isSpike) {
      await this.inventoryRepo.createAgenticEvent(tenant_id, {
        event_type: 'STOCK_SPIKE_DETECTED',
        entity_id: product_id,
        entity_type: 'PRODUCT',
        payload: {
          location_id,
          qty: quantity,
          correlation_id: event.correlation_id,
        },
      });
    }

    // Trigger proactive replenishment check
    const recommendation = await this.replenishment.evaluateReplenishment(tenant_id, product_id, location_id);
    if (recommendation) {
      this.logger.log(`Replenishment recommended: ${recommendation.recommendedQty} for Product ${product_id}`);
      await this.inventoryRepo.createAgenticEvent(tenant_id, {
        event_type: 'REPLENISHMENT_RECOMMENDED',
        entity_id: product_id,
        entity_type: 'PRODUCT',
        payload: recommendation,
      });
    }
  }

  private async handleAlert(event: DomainEvent) {
    // Similar logic for alert-driven triggers
  }
}
