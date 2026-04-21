import { Injectable, Logger, Inject } from '@nestjs/common';
import { IIoTRepository, TelemetryReading } from './repositories/iot.repository.interface';
import { AuditService } from '../audit/audit.service';
import { EventBusService } from '../events/event-bus.service';

@Injectable()
export class UniversalIoTService {
  private readonly logger = new Logger(UniversalIoTService.name);

  constructor(
    private readonly repository: IIoTRepository,
    private readonly auditService: AuditService,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Universal Entry Point for High-Frequency Telemetry.
   * Logic:
   * 1. Log to High-Frequency Operational Store (Sub-system).
   * 2. Audit only if threshold is exceeded OR at specific intervals.
   * 3. Publish event for industry modules (e.g. Farming) to react.
   */
  async handleTelemetry(
    tenant_id: string, 
    payload: any, 
    forensicInfo?: { ip?: string; deviceModel?: string }
  ) {
    const readings: TelemetryReading[] = Array.isArray(payload) ? payload : [payload];
    
    // 1. High-Frequency Operational Log (Full Record)
    const ids = await this.repository.logTelemetry(tenant_id, readings);

    // 2. Intelligence & Event Loop
    for (const reading of readings) {
        // Example logic: High moisture or temperature threshold check
        const isCritical = Number(reading.value) > 40 || Number(reading.value) < 5;
        
        if (isCritical) {
            // Audit Critical Events to Main System
            await this.auditService.log({
                tenant_id,
                user_id: 'IOT_UNIVERSAL_GATEWAY',
                module: 'KERNEL_IOT',
                action: 'THRESHOLD_EXCEEDED',
                entity_type: 'SENSOR',
                entity_id: reading.sensor_id,
                severity: 'WARN',
                metadata: {
                    reading_id: ids[readings.indexOf(reading)],
                    value: reading.value,
                    type: reading.sensor_type,
                    ...forensicInfo
                }
            });

            // Publish for Industry Logic
            await this.eventBus.publish({
                event_type: 'SENSOR_THRESHOLD_EXCEEDED',
                tenant_id,
                entity_id: reading.sensor_id,
                entity_type: 'SENSOR',
                source_module: 'kernel_iot',
                payload: { ...reading, reading_id: ids[readings.indexOf(reading)] },
                user_id: 'system'
            });
        }
    }

    return { status: 'SUCCESS', record_count: ids.length };
  }

  /**
   * Normalization Agent: Syncs aggregated telemetry to the Main DB for long-term reporting.
   */
  async syncNormalizedData(tenant_id: string, sensor_id: string) {
    // This would be triggered by a CRON or specific workflow
    const report = await this.repository.getAggregatedReport(
        tenant_id,
        sensor_id,
        'HOUR',
        { start: new Date(Date.now() - 3600000), end: new Date() }
    );

    if (report) {
         await this.auditService.log({
            tenant_id,
            user_id: 'IOT_NORMALIZER',
            module: 'KERNEL_IOT',
            action: 'TELEMETRY_BATCH_SYNC',
            entity_type: 'SENSOR_REPORT',
            entity_id: sensor_id,
            metadata: report
        });
    }

    return report;
  }
}
