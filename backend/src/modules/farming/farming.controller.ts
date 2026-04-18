import { Controller, Get, Post, Body, Headers, Param, Query, Ip, Req } from '@nestjs/common';
import { FarmingService } from './farming.service';
import { IoTGatewayService } from './iot-gateway.service';

@Controller('v1/farming')
export class FarmingController {
  constructor(
    private readonly farmingService: FarmingService,
    private readonly iotGateway: IoTGatewayService,
  ) {}

  @Get('sensors/:sensor_id/logs')
  async getLogs(
    @Headers('x-tenant-id') tenant_id: string,
    @Param('sensor_id') sensor_id: string,
  ) {
    return this.farmingService.getLogs(tenant_id || 'system', sensor_id);
  }

  /**
   * Enterprise IoT Ingestion Entry Point
   * Handles high-frequency telemetry JSON payloads.
   */
  @Post('iot/ingest')
  async ingestTelemetry(
    @Headers('x-tenant-id') tenant_id: string,
    @Headers('x-device-model') deviceModel: string,
    @Ip() ip: string,
    @Body() payload: any,
  ) {
    return this.iotGateway.handleHttpTelemetry(tenant_id || 'system', payload, { ip, deviceModel });
  }

  @Post('sensors/log')
  async logReading(
    @Headers('x-tenant-id') tenant_id: string,
    @Headers('x-device-model') deviceModel: string,
    @Ip() ip: string,
    @Body() data: any,
  ) {
    return this.farmingService.logReading(tenant_id || 'system', { ...data, metadata: { ...data.metadata, ip, deviceModel } });
  }
}
