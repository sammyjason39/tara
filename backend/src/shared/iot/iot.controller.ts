import { Controller, Post, Get, Body, Headers, Query, UseInterceptors } from '@nestjs/common';
import { PrintQueueService } from './print-queue.service';
import { DevicePairingService } from './device-pairing.service';
import { UniversalIoTService } from './universal-iot.service';
import { PaginationPipe, PaginationParams } from '../pipes/pagination.pipe';
import { CacheInterceptor, CacheTTL, CacheInvalidationHelper } from '../cache';

@Controller('kernel/iot')
export class IotController {
  constructor(
    private readonly printQueue: PrintQueueService,
    private readonly devicePairing: DevicePairingService,
    private readonly universalIot: UniversalIoTService,
    private readonly cacheHelper: CacheInvalidationHelper,
  ) {}

  @Get('devices')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30)
  async getDevices(
    @Headers('x-tenant-id') tenantId: string,
    @Query(PaginationPipe) pagination: PaginationParams,
  ) {
    if (!tenantId) throw new Error("Missing tenant contextual isolation");
    return this.devicePairing.getDevicesPaginated(tenantId, pagination);
  }

  @Get('telemetry/readings')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30)
  async getTelemetryReadings(
    @Headers('x-tenant-id') tenantId: string,
    @Query(PaginationPipe) pagination: PaginationParams,
    @Query('sensor_id') sensorId?: string,
  ) {
    if (!tenantId) throw new Error("Missing tenant contextual isolation");
    return this.universalIot.getReadingsPaginated(tenantId, pagination, sensorId);
  }

  @Post('print')
  async dispatchPrintJob(
    @Headers('x-tenant-id') tenantId: string,
    @Body() payload: { device_id: string; shift_summary_json: any }
  ) {
    if (!tenantId) throw new Error("Missing tenant contextual isolation");
    const result = await this.printQueue.dispatchJob(tenantId, payload.device_id, payload.shift_summary_json);
    await this.cacheHelper.invalidateAll();
    return result;
  }

  @Post('pair')
  async pairDevice(
    @Headers('x-tenant-id') tenantId: string,
    @Body() payload: { mac_address: string; type: string }
  ) {
    if (!tenantId) throw new Error("Missing tenant contextual isolation");
    const result = await this.devicePairing.issueToken(tenantId, payload.mac_address, payload.type);
    await this.cacheHelper.invalidateAll();
    return result;
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
    const result = await (this as any).universalIot.handleTelemetry(tenant_id || 'system', payload, { deviceModel });
    await this.cacheHelper.invalidateAll();
    return result;
  }
}
