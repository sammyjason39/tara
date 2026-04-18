import { Controller, Post, Body, Headers } from '@nestjs/common';
import { PrintQueueService } from './print-queue.service';
import { DevicePairingService } from './device-pairing.service';

@Controller('kernel/iot')
export class IotController {
  constructor(
    private readonly printQueue: PrintQueueService,
    private readonly devicePairing: DevicePairingService
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
}
