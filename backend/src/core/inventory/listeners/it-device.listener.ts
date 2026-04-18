import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBusService, DomainEvent } from '../../../shared/events/event-bus.service';
import { InventoryService } from '../inventory.service';
import { PrismaService } from '../../../persistence/prisma.service';

@Injectable()
export class ITDeviceListener implements OnModuleInit {
  constructor(
    private readonly eventBus: EventBusService,
    private readonly inventoryService: InventoryService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('DEVICE_EVENT_CREATED', 'ITDeviceListener', async (event: DomainEvent) => {
      await this.handleDeviceEvent(event);
    });
  }

  private lastScans = new Map<string, number>();

  private async handleDeviceEvent(event: any) {
    const { tenant_id, payload, correlation_id, user_id, id: eventId } = event;
    const { code, type, location_id } = payload;

    // 0. Logic-level de-duplication (5 second window per code per device)
    const scanKey = `${tenant_id}:${payload.device_id}:${code}`;
    const now = Date.now();
    if (this.lastScans.has(scanKey) && now - this.lastScans.get(scanKey)! < 5000) {
        console.log(`[ITDeviceListener] Skipping duplicate scan for ${code} within window.`);
        return;
    }
    this.lastScans.set(scanKey, now);

    // 1. Resolve Product by Barcode or SKU
    const itemMaster = await this.prisma.item_masters.findFirst({
        where: {
            tenant_id: tenant_id,
            OR: [
                { barcode: code },
                { sku: code }
            ]
        }
    });

    if (!itemMaster) {
        console.warn(`[ITDeviceListener] Product not found for code: ${code}`);
        return;
    }

    // 2. Perform Intake
    await this.inventoryService.intakeStock(
        tenant_id,
        {
          item_id: itemMaster.id,
          location_id: location_id || 'SCAN_LOCATION',
          quantity: 1, // Default scan quantity
          referenceId: eventId, // Standardized: referenceId = deviceEventId
          referenceType: 'DEVICE_SCAN',
        } as any,
        user_id,
        null,
        correlation_id
    );
  }
}
