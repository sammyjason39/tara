import { Controller, Post, Body, Headers } from '@nestjs/common';
import { PrintQueueService } from './print-queue.service';
import { DevicePairingService } from './device-pairing.service';
import { UniversalIoTService } from './universal-iot.service';

@Controller('v1/kernel/iot')
export class IotController {
  constructor(
    private readonly printQueue: PrintQueueService,
    private readonly devicePairing: DevicePairingService,
    private readonly universalIot: UniversalIoTService
  ) {}

  @Post('print')
  async dispatchPrintJob(
    @Headers('x-tenant-id') tenantId: string,
    @Body() payload: { device_id: string; shift_summary_json: any }
  ) {
    if (!tenantId) throw new Error("Missing tenant contextual isolation");
    return this.printQueue.dispatchJob(tenantId, payload.device_id, payload.shift_summary_json);
  }

  @Post('pair')
  async pairDevice(
    @Headers('x-tenant-id') tenantId: string,
    @Body() payload: { mac_address: string; type: string }
  ) {
    if (!tenantId) throw new Error("Missing tenant contextual isolation");
    return this.devicePairing.issueToken(tenantId, payload.mac_address, payload.type);
  }

  /**
   * Universal Telemetry Ingestion (V1 Interface).
   * Supports high-frequency operational division.
   */
  @Post('telemetry')
  async ingestTelemetry(
    @Headers('x-tenant-id') tenant_id: string,
    @Headers('x-device-model') deviceModel: string,
    @Body() payload: any,
  ) {
    // Note: UniversalIoTService will handle the separation of high-frequency data
    return (this as any).universalIot.handleTelemetry(tenant_id || 'system', payload, { deviceModel });
  }
}
