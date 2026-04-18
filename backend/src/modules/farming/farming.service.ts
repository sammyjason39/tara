import { Injectable, Logger, Inject } from '@nestjs/common';
import { ISensorRepository, SensorData } from './repositories/interfaces/sensor.repository.interface';

@Injectable()
export class FarmingService {
  private readonly logger = new Logger(FarmingService.name);

  constructor(
    @Inject('ISensorRepository')
    private readonly repository: ISensorRepository
  ) {}

  async getLogs(tenant_id: string, sensor_id: string): Promise<SensorData[]> {
    return this.repository.getSensorLogs(tenant_id, sensor_id);
  }

  async logReading(tenant_id: string, data: Partial<SensorData>): Promise<string> {
    this.logger.log(`Anchoring IoT Reading for sensor ${data.sensor_id} into Audit Chain`);
    const ids = await this.repository.logSensorReadings(tenant_id, [data]);
    await this.repository.anchorReadingToAuditChain(tenant_id, ids[0]);
    return ids[0];
  }
}
