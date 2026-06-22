import { Controller, Get, Post, Param, Query, Headers, UseInterceptors } from '@nestjs/common';
import { EventBusService } from './event-bus.service';
import { PaginationPipe, PaginationParams } from '../pipes/pagination.pipe';
import { CacheInterceptor, CacheTTL, CacheInvalidationHelper } from '../cache';
import { PrismaService } from '../../persistence/prisma.service';

@Controller('events')
export class EventsController {
  constructor(
    private readonly eventBusService: EventBusService,
    private readonly prisma: PrismaService,
    private readonly cacheHelper: CacheInvalidationHelper,
  ) {}

  /**
   * Get paginated list of domain events for a tenant.
   */
  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30)
  async getEvents(
    @Headers('x-tenant-id') tenantId: string,
    @Query(PaginationPipe) pagination: PaginationParams,
    @Query('status') status?: string,
    @Query('event_type') eventType?: string,
  ) {
    const skip = (pagination.page - 1) * pagination.pageSize;
    const where: any = { tenant_id: tenantId };
    if (status) where.status = status;
    if (eventType) where.event_type = eventType;

    const [data, totalCount] = await Promise.all([
      this.prisma.domain_events.findMany({
        where,
        skip,
        take: pagination.pageSize,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.domain_events.count({ where }),
    ]);

    return {
      data,
      totalCount,
      currentPage: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(totalCount / pagination.pageSize),
    };
  }

  /**
   * Get paginated list of failed/DLQ events for a tenant.
   */
  @Get('failed')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30)
  async getFailedEvents(
    @Headers('x-tenant-id') tenantId: string,
    @Query(PaginationPipe) pagination: PaginationParams,
  ) {
    const skip = (pagination.page - 1) * pagination.pageSize;
    const where = { tenant_id: tenantId, status: 'FAILED' };

    const [data, totalCount] = await Promise.all([
      this.prisma.domain_events.findMany({
        where,
        include: { event_deliveries: { where: { status: 'DLQ' } } },
        skip,
        take: pagination.pageSize,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.domain_events.count({ where }),
    ]);

    return {
      data,
      totalCount,
      currentPage: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(totalCount / pagination.pageSize),
    };
  }

  /**
   * Get paginated deliveries for a specific event.
   */
  @Get(':eventId/deliveries')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30)
  async getEventDeliveries(
    @Param('eventId') eventId: string,
    @Query(PaginationPipe) pagination: PaginationParams,
  ) {
    const skip = (pagination.page - 1) * pagination.pageSize;
    const where = { event_id: eventId };

    const [data, totalCount] = await Promise.all([
      this.prisma.event_deliveries.findMany({
        where,
        skip,
        take: pagination.pageSize,
        orderBy: { created_at: 'asc' },
      }),
      this.prisma.event_deliveries.count({ where }),
    ]);

    return {
      data,
      totalCount,
      currentPage: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(totalCount / pagination.pageSize),
    };
  }

  /**
   * Replay a failed event - cache invalidation on write.
   */
  @Post(':eventId/replay')
  async replayEvent(
    @Headers('x-tenant-id') tenantId: string,
    @Param('eventId') eventId: string,
  ) {
    const result = await this.eventBusService.replayEvent(tenantId, eventId);
    await this.cacheHelper.invalidateAll();
    return result;
  }
}
