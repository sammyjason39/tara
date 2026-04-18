import { Prisma } from '@prisma/client';

export interface SensorData {
  id: string;
  tenant_id: string;
  sensor_id: string;
  sensorType: string;
  value: Prisma.Decimal;
  unit: string;
  timestamp: Date;
  metadata: any;
}

export abstract class FarmingRepository {
  abstract getSensorLogs(tenant_id: string, sensor_id: string): Promise<SensorData[]>;
  
  /**
   * Enterprise Hook: IoT-to-Audit Stream
   * Writes "Livestock Health Sensor" data directly to the SHA-256 hash-chain (AuditLog).
   * Bypasses standard system logging for high-integrity forensics.
   */
  abstract logSensorDataToAuditChain(tenant_id: string, data: SensorData): Promise<string>;
}
