import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { HermesDisabledGuard } from '../../ai/hermes-disabled.guard';
import { HermesApiKeyGuard } from './hermes-api-key.guard';
import { PrismaService } from '../../../persistence/prisma.service';
import { HermesAuditService } from './hermes-audit.service';

/**
 * Hermes Events Controller
 *
 * Provides event replay and audit log access for Hermes agents.
 *
 * Endpoints:
 *   GET /api/hermes/events/replay    — Replay events since a timestamp
 *   GET /api/hermes/events/audit     — View action audit logs
 *   GET /api/hermes/events/stats     — Daily action stats
 */
@Controller('hermes/events')
@UseGuards(HermesDisabledGuard, HermesApiKeyGuard)
export class HermesEventsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: HermesAuditService,
  ) {}

  /**
   * GET /api/hermes/events/replay
   *
   * Allows Hermes to catch up on missed events after a disconnection.
   * Returns events since a given timestamp, optionally filtered by type.
   *
   * Query params:
   *   - since (required): ISO 8601 timestamp
   *   - types (optional): comma-separated event type filters (supports wildcards)
   *   - limit (optional): max events to return (default 200, max 1000)
   */
  @Get('replay')
  @HttpCode(HttpStatus.OK)
  async replayEvents(
    @Query('since') since: string,
    @Query('types') types?: string,
    @Query('limit') limit?: string,
  ) {
    if (!since) {
      throw new BadRequestException('Query parameter "since" is required (ISO 8601 timestamp)');
    }

    const sinceDate = new Date(since);
    if (isNaN(sinceDate.getTime())) {
      throw new BadRequestException('Invalid "since" date format. Use ISO 8601.');
    }

    const maxLimit = Math.min(parseInt(limit || '200', 10), 1000);
    const typeFilters = types ? types.split(',').map((t) => t.trim()) : [];

    // Build query
    const where: any = {
      event_timestamp: { gte: sinceDate },
      delivery_status: 'delivered',
    };

    // Apply type filters (supports exact match and prefix wildcards)
    if (typeFilters.length > 0) {
      const exactTypes = typeFilters.filter((t) => !t.endsWith('.*'));
      const prefixTypes = typeFilters
        .filter((t) => t.endsWith('.*'))
        .map((t) => t.slice(0, -2)); // Remove .* suffix

      const orConditions: any[] = [];
      if (exactTypes.length > 0) {
        orConditions.push({ event_type: { in: exactTypes } });
      }
      for (const prefix of prefixTypes) {
        orConditions.push({ event_type: { startsWith: prefix } });
      }

      if (orConditions.length > 0) {
        where.OR = orConditions;
      }
    }

    const events = await this.prisma.eventBusLog.findMany({
      where,
      orderBy: { event_timestamp: 'asc' },
      take: maxLimit,
      select: {
        id: true,
        event_type: true,
        event_version: true,
        actor_id: true,
        actor_type: true,
        entity_id: true,
        entity_type: true,
        event_payload: true,
        event_timestamp: true,
      },
    });

    return {
      success: true,
      since: sinceDate.toISOString(),
      count: events.length,
      has_more: events.length === maxLimit,
      events: events.map((e) => ({
        event_id: e.id,
        event_type: e.event_type,
        event_version: e.event_version,
        timestamp: e.event_timestamp,
        actor: { id: e.actor_id, type: e.actor_type },
        entity: { id: e.entity_id, type: e.entity_type },
        payload: e.event_payload,
      })),
    };
  }

  /**
   * GET /api/hermes/events/audit
   *
   * Returns Hermes action audit logs for the calling agent.
   */
  @Get('audit')
  @HttpCode(HttpStatus.OK)
  async getAuditLogs(
    @Request() req: any,
    @Query('since') since?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    const agent = req.hermesAgent;
    const logs = await this.auditService.getAgentLogs(agent.id, {
      since: since ? new Date(since) : undefined,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return { success: true, agent_id: agent.id, data: logs };
  }

  /**
   * GET /api/hermes/events/stats
   *
   * Returns daily action statistics.
   */
  @Get('stats')
  @HttpCode(HttpStatus.OK)
  async getDailyStats(@Request() req: any) {
    const agent = req.hermesAgent;
    const stats = await this.auditService.getDailyStats(agent.id);
    return { success: true, data: stats };
  }
}
