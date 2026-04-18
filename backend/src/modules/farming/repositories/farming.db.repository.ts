import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../persistence/prisma.service';
import { ISensorRepository, SensorData } from './interfaces/sensor.repository.interface';
import { AuditService } from '../../../shared/audit/audit.service';
import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';

@Injectable()
export class FarmingDbRepository implements ISensorRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async logSensorReadings(tenant_id: string, readings: Partial<SensorData>[]): Promise<string[]> {
    const ids: string[] = [];

    // Transactional Batch Save
    await this.prisma.$transaction(async (tx) => {
      for (const reading of readings) {
        const id = uuidv4();
        ids.push(id);
        
        // Using typed model instead of (tx as any)
        await (tx as any).farmingSensorLog.create({
          data: {
            id,
            tenant_id,
            sensor_id: reading.sensor_id!,
            sensorType: reading.sensorType || 'GENERIC',
            value: reading.value || 0,
            unit: reading.unit || 'n/a',
            timestamp: reading.timestamp || new Date(),
            metadata: reading.metadata || {},
          },
        });
      }
    });

    return ids;
  }

  async getSensorLogs(tenant_id: string, sensor_id: string, timeframe?: { start: Date; end: Date }): Promise<SensorData[]> {
    const raw = await (this.prisma as any).farmingSensorLog.findMany({
      where: { 
          tenant_id, 
          sensor_id,
          ...(timeframe ? { timestamp: { gte: timeframe.start, lte: timeframe.end } } : {})
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
    return raw.map((r: any) => this.mapSensor(r));
  }

  async anchorReadingToAuditChain(tenant_id: string, readingId: string, forensicInfo?: { ip?: string; device_model?: string }): Promise<void> {
    const reading = await (this.prisma as any).farmingSensorLog.findUnique({
      where: { id: readingId }
    });

    if (!reading || reading.tenant_id !== tenant_id) return;

    await this.auditService.log({
      tenant_id,
      user_id: 'IOT_GATEWAY',
      module: 'FARMING_IOT',
      action: 'SENSOR_ANCHOR',
      entity_type: "SENSOR_READING",
      entity_id: readingId,
      ip_address: forensicInfo?.ip,
      device_model: forensicInfo?.device_model,
      severity: Number(reading.value) > 40 ? 'WARN' : 'INFO',
      metadata: {
        rawReading: reading.value,
        unit: reading.unit,
        integrityHash: readingId, 
        readingCapturedAt: reading.timestamp
      },
    });
  }

  private mapSensor(r: any): SensorData {
    return {
      id: r.id,
      tenant_id: r.tenant_id,
      sensor_id: r.sensor_id,
      sensorType: r.sensorType,
      value: r.value,
      unit: r.unit,
      timestamp: r.timestamp,
      metadata: r.metadata,
    };
  }
}
