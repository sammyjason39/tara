import { Prisma } from '@prisma/client';

export interface TelemetryReading {
  sensor_id: string;
  sensor_type: string;
  value: Prisma.Decimal;
  unit: string;
  timestamp: Date;
  metadata?: any;
}

export abstract class IIoTRepository {
  /**
   * High-Frequency Ingestion (Operational Sub-system).
   * Persists full record to specialized storage.
   */
  abstract logTelemetry(
    tenant_id: string, 
    readings: TelemetryReading[]
  ): Promise<string[]>;

  /**
   * Retrieves full history for specialized audit/analysis.
   */
  abstract getFullHistory(
    tenant_id: string,
    sensor_id: string,
    timeframe: { start: Date; end: Date }
  ): Promise<TelemetryReading[]>;

  /**
   * Normalization Hook: Aggregates high-frequency data for main system reporting.
   */
  abstract getAggregatedReport(
    tenant_id: string,
    sensor_id: string,
    interval: 'HOUR' | 'DAY',
    timeframe: { start: Date; end: Date }
  ): Promise<any>;
}
