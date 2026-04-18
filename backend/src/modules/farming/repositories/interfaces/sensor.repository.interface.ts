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

export interface ISensorRepository {
  /**
   * High-frequency telemetry ingestion.
   */
  logSensorReadings(tenant_id: string, readings: Partial<SensorData>[]): Promise<string[]>;

  /**
   * Historical telemetry retrieval.
   */
  getSensorLogs(tenant_id: string, sensor_id: string, timeframe?: { start: Date; end: Date }): Promise<SensorData[]>;

  /**
   * Enterprise Integrity Hook: Direct Audit Anchoring.
   */
  anchorReadingToAuditChain(tenant_id: string, readingId: string, forensicInfo?: { ip?: string; deviceModel?: string }): Promise<void>;
}
