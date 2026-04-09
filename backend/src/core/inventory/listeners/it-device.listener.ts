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
    const { tenantId, payload, correlationId, userId, id: eventId } = event;
    const { code, type, locationId } = payload;

    // 0. Logic-level de-duplication (5 second window per code per device)
    const scanKey = `${tenantId}:${payload.deviceId}:${code}`;
    const now = Date.now();
    if (this.lastScans.has(scanKey) && now - this.lastScans.get(scanKey)! < 5000) {
        console.log(`[ITDeviceListener] Skipping duplicate scan for ${code} within window.`);
        return;
    }
    this.lastScans.set(scanKey, now);

    // 1. Resolve Product by Barcode or SKU
    const itemMaster = await this.prisma.itemMaster.findFirst({
        where: {
            tenantId,
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
        tenantId,
        {
          itemId: itemMaster.id,
          locationId: locationId || 'SCAN_LOCATION',
          quantity: 1, // Default scan quantity
          referenceId: eventId, // Standardized: referenceId = deviceEventId
          referenceType: 'DEVICE_SCAN',
        } as any,
        userId,
        null,
        correlationId
    );
  }
}
