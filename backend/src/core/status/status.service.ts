import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../persistence/prisma.service';
import { AiConfigService } from '../ai/ai-config.service';
import {
  ComponentStatus,
  DailyUptime,
  OVERALL_BANNER,
  PublicStatusPayload,
  StatusComponentProbe,
  StatusIncident,
  StatusSnapshotComponents,
  worstStatus,
} from './status.types';

const APP_VERSION = '2.0.0';
const RETENTION_DAYS = 120;
const SNAPSHOT_INTERVAL_MINUTES = 5;

@Injectable()
export class StatusService implements OnModuleInit {
  private readonly logger = new Logger(StatusService.name);
  private lastSnapshotAt = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiConfig: AiConfigService,
  ) {}

  async onModuleInit() {
    this.recordSnapshot().catch((err) =>
      this.logger.warn(`Initial status snapshot failed: ${err.message}`),
    );
  }

  /** Record snapshot every 5 minutes */
  @Cron('*/5 * * * *')
  async scheduledSnapshot(): Promise<void> {
    await this.recordSnapshot();
  }

  /** Lightweight probe used by Docker / monitors */
  async getLiveness(): Promise<{ status: string; service: string; version: string; timestamp: string }> {
    return {
      status: 'ok',
      service: 'tara-backend',
      version: APP_VERSION,
      timestamp: new Date().toISOString(),
    };
  }

  async getPublicStatus(): Promise<PublicStatusPayload> {
    const components = await this.probeAllComponents();
    const overallStatus = worstStatus(Object.values(components).map((c) => c.status));
    const now = new Date();

    await this.maybeRecordSnapshot(components, overallStatus);

    const since90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const snapshots = await this.prisma.statusSnapshot.findMany({
      where: { checked_at: { gte: since90 } },
      orderBy: { checked_at: 'asc' },
    });

    const dailyUptime = this.buildDailyUptime(snapshots, 90);
    const incidents = this.buildIncidents(snapshots);

    return {
      page_title: 'TARA System Status',
      overall: {
        status: overallStatus,
        label: OVERALL_BANNER[overallStatus],
        updated_at: now.toISOString(),
      },
      components: Object.values(components),
      uptime: {
        '90d': this.calcUptimePct(snapshots, 90),
        '30d': this.calcUptimePct(snapshots, 30),
        '7d': this.calcUptimePct(snapshots, 7),
      },
      daily_uptime: dailyUptime,
      incidents,
      version: APP_VERSION,
    };
  }

  async recordSnapshot(): Promise<void> {
    const components = await this.probeAllComponents();
    const overall = worstStatus(Object.values(components).map((c) => c.status));
    await this.persistSnapshot(components, overall);
    await this.pruneOldSnapshots();
  }

  private async maybeRecordSnapshot(
    components: StatusSnapshotComponents,
    overall: ComponentStatus,
  ): Promise<void> {
    const now = Date.now();
    if (now - this.lastSnapshotAt < SNAPSHOT_INTERVAL_MINUTES * 60 * 1000 - 5000) return;
    await this.persistSnapshot(components, overall);
    this.lastSnapshotAt = now;
  }

  private async persistSnapshot(
    components: StatusSnapshotComponents,
    overall: ComponentStatus,
  ): Promise<void> {
    try {
      await this.prisma.statusSnapshot.create({
        data: {
          overall,
          components: components as object,
        },
      });
      this.lastSnapshotAt = Date.now();
    } catch (err) {
      this.logger.warn(`Failed to persist status snapshot: ${(err as Error).message}`);
    }
  }

  private async pruneOldSnapshots(): Promise<void> {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    await this.prisma.statusSnapshot.deleteMany({
      where: { checked_at: { lt: cutoff } },
    });
  }

  private async probeAllComponents(): Promise<StatusSnapshotComponents> {
    const [database, redis, aiMetrics] = await Promise.all([
      this.probeDatabase(),
      this.probeRedis(),
      this.probeAiAssistant(),
    ]);

    const api: StatusComponentProbe = {
      id: 'api',
      name: 'API Server',
      status: 'operational',
      latency_ms: 0,
      message: 'Application server is running',
    };

    const whatsappCfg = this.aiConfig.getWhatsAppConfig();
    const whatsapp: StatusComponentProbe = {
      id: 'whatsapp',
      name: 'WhatsApp Gateway',
      status: whatsappCfg.enabled && whatsappCfg.kapsoApiKey ? 'operational' : 'degraded',
      message:
        whatsappCfg.enabled && whatsappCfg.kapsoApiKey
          ? 'WhatsApp integration configured'
          : 'WhatsApp not configured or disabled',
    };

    const overallFromInfra = worstStatus([
      api.status,
      database.status,
      redis.status,
      aiMetrics.status,
      whatsapp.status,
    ]);

    if (overallFromInfra === 'major_outage' && api.status === 'operational') {
      api.status = 'degraded';
      api.message = 'Dependent services are unavailable';
    }

    return {
      api,
      database,
      redis,
      ai_assistant: aiMetrics,
      whatsapp,
    };
  }

  private async probeDatabase(): Promise<StatusComponentProbe> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;
      return {
        id: 'database',
        name: 'Database',
        status: latency > 500 ? 'degraded' : 'operational',
        latency_ms: latency,
        message: 'PostgreSQL connected',
      };
    } catch (err) {
      return {
        id: 'database',
        name: 'Database',
        status: 'major_outage',
        latency_ms: null,
        message: (err as Error).message,
      };
    }
  }

  private async probeRedis(): Promise<StatusComponentProbe> {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      return {
        id: 'redis',
        name: 'Cache (Redis)',
        status: 'degraded',
        message: 'Redis URL not configured',
      };
    }

    const start = Date.now();
    try {
      const { createClient } = await import('redis');
      const client = createClient({ url: redisUrl });
      client.on('error', () => undefined);
      await client.connect();
      const pong = await client.ping();
      await client.quit();
      const latency = Date.now() - start;
      return {
        id: 'redis',
        name: 'Cache (Redis)',
        status: pong === 'PONG' ? (latency > 300 ? 'degraded' : 'operational') : 'degraded',
        latency_ms: latency,
        message: 'Redis connected',
      };
    } catch (err) {
      return {
        id: 'redis',
        name: 'Cache (Redis)',
        status: 'partial_outage',
        latency_ms: Date.now() - start,
        message: (err as Error).message,
      };
    }
  }

  private async probeAiAssistant(): Promise<StatusComponentProbe> {
    const enabled = this.aiConfig.isAiEnabled();
    if (!enabled) {
      return {
        id: 'ai_assistant',
        name: 'AI Assistant',
        status: 'degraded',
        message: 'AI assistant disabled or API key missing',
        metrics: { enabled: false },
      };
    }

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [total, errors, latencyAgg] = await Promise.all([
      this.prisma.aiAgentLog.count({ where: { created_at: { gte: since24h } } }),
      this.prisma.aiAgentLog.count({
        where: { created_at: { gte: since24h }, status: { not: 'success' } },
      }),
      this.prisma.aiAgentLog.aggregate({
        where: { created_at: { gte: since24h }, latency_ms: { not: null } },
        _avg: { latency_ms: true },
      }),
    ]);

    const avgLatency = Math.round(latencyAgg._avg.latency_ms ?? 0);
    const successRate = total > 0 ? (total - errors) / total : 1;

    let status: ComponentStatus = 'operational';
    if (successRate < 0.5) status = 'major_outage';
    else if (successRate < 0.9 || avgLatency > 15000) status = 'degraded';
    else if (avgLatency > 8000) status = 'degraded';

    return {
      id: 'ai_assistant',
      name: 'AI Assistant',
      status,
      latency_ms: avgLatency || null,
      message:
        total > 0
          ? `${total} responses in last 24h · ${Math.round(successRate * 100)}% success`
          : 'No AI traffic in last 24h',
      metrics: {
        enabled: true,
        requests_24h: total,
        success_rate_24h: Math.round(successRate * 1000) / 10,
        avg_response_ms: avgLatency,
      },
    };
  }

  private calcUptimePct(
    snapshots: Array<{ overall: string; checked_at: Date }>,
    days: number,
  ): number {
    if (snapshots.length === 0) return 100;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const relevant = snapshots.filter((s) => s.checked_at >= cutoff);
    if (relevant.length === 0) return 100;
    const ok = relevant.filter((s) => s.overall === 'operational').length;
    return Math.round((ok / relevant.length) * 10000) / 100;
  }

  private buildDailyUptime(
    snapshots: Array<{ overall: string; checked_at: Date }>,
    days: number,
  ): DailyUptime[] {
    const result: DailyUptime[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const day = new Date(now);
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - i);
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);

      const daySnaps = snapshots.filter(
        (s) => s.checked_at >= day && s.checked_at < nextDay,
      );

      let uptime_pct = 100;
      let status: ComponentStatus = 'operational';

      if (daySnaps.length > 0) {
        const ok = daySnaps.filter((s) => s.overall === 'operational').length;
        uptime_pct = Math.round((ok / daySnaps.length) * 10000) / 100;
        const statuses = daySnaps.map((s) => s.overall as ComponentStatus);
        status = worstStatus(statuses);
      }

      result.push({
        date: day.toISOString().slice(0, 10),
        uptime_pct,
        status: daySnaps.length === 0 ? 'operational' : status,
      });
    }

    return result;
  }

  private buildIncidents(
    snapshots: Array<{ id: string; overall: string; checked_at: Date; components: unknown }>,
  ): StatusIncident[] {
    if (snapshots.length === 0) return [];

    const incidents: StatusIncident[] = [];
    let current: StatusIncident | null = null;

    for (const snap of snapshots) {
      const isBad = snap.overall !== 'operational';
      if (isBad && !current) {
        const components = snap.components as StatusSnapshotComponents;
        const affected = Object.values(components)
          .filter((c) => c.status !== 'operational')
          .map((c) => c.id);
        current = {
          id: snap.id,
          title: OVERALL_BANNER[snap.overall as ComponentStatus] || 'Service disruption',
          impact: snap.overall as ComponentStatus,
          status: 'investigating',
          started_at: snap.checked_at.toISOString(),
          resolved_at: null,
          duration_minutes: null,
          components: affected.length > 0 ? affected : ['api'],
        };
      } else if (!isBad && current) {
        current.resolved_at = snap.checked_at.toISOString();
        current.status = 'resolved';
        current.duration_minutes = Math.max(
          1,
          Math.round(
            (snap.checked_at.getTime() - new Date(current.started_at).getTime()) / 60000,
          ),
        );
        incidents.push(current);
        current = null;
      }
    }

    if (current) {
      current.duration_minutes = Math.max(
        1,
        Math.round((Date.now() - new Date(current.started_at).getTime()) / 60000),
      );
      incidents.push(current);
    }

    return incidents.reverse().slice(0, 20);
  }
}
