import { Injectable, Inject, Logger } from '@nestjs/common';
import { ISensorRepository, SensorData } from './repositories/interfaces/sensor.repository.interface';

@Injectable()
export class IoTGatewayService {
  private readonly logger = new Logger(IoTGatewayService.name);

  constructor(
    @Inject('ISensorRepository')
    private readonly sensorRepo: ISensorRepository
  ) {}

  /**
   * Primary HTTP JSON Entry Point.
   * Standardizes incoming telemetry before persistence.
   */
  async handleHttpTelemetry(tenant_id: string, payload: any, forensicInfo?: { ip?: string; deviceModel?: string }): Promise<{ status: string; ids: string[] }> {
    this.logger.log(`IoT Gateway: Standardizing JSON Telemetry for tenant ${tenant_id}`);
    
    const readings: Partial<SensorData>[] = Array.isArray(payload) ? payload : [payload];
    
    const processedReadings = readings.map(r => ({
      sensor_id: r.sensor_id,
      sensorType: r.sensorType || 'IOT_GENERIC',
      value: r.value,
      unit: r.unit || 'n/a',
      timestamp: r.timestamp ? new Date(r.timestamp) : new Date(),
      metadata: { ...r.metadata, ingestionMethod: 'HTTP_JSON' }
    }));

    const ids = await this.sensorRepo.logSensorReadings(tenant_id, processedReadings);

    // Auto-anchor critical readings (e.g., integrity check)
    for (const id of ids) {
        await this.sensorRepo.anchorReadingToAuditChain(tenant_id, id, forensicInfo);
    }

    return { status: 'SUCCESS', ids };
  }

  /**
   * Future MQTT Hook - Placeholder
   * Design is ready for MQTT subscription logic.
   */
  async handleMqttTelemetry(tenant_id: string, topic: string, message: Buffer): Promise<void> {
    this.logger.log(`IoT Gateway: MQTT Hook triggered for topic ${topic} (Ready for implementation)`);
    // Parsing and routing logic would go here
  }
}
