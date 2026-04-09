import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma.service';
import { LogQueryDto } from './dto/log-query.dto';

export interface LogParams {
  tenantId?: string;
  module: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  event: string;
  message: string;
  payload?: any;
  errorStack?: string;
  requestId?: string;
  correlationId?: string;
  userId?: string;
  ipAddress?: string;
  durationMs?: number;
}

@Injectable()
export class LoggerService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: LogParams): Promise<void> {
    try {
      await this.prisma.systemLog.create({
        data: {
        id: uuidv4(),
        
          tenantId: params.tenantId ?? undefined,
          module: params.module,
          level: params.level,
          event: params.event,
          message: params.message,
          payload: params.payload ?? undefined,
          errorStack: params.errorStack ?? undefined,
          requestId: params.requestId ?? undefined,
          userId: params.userId ?? undefined,
          ipAddress: params.ipAddress ?? undefined,
          durationMs: params.durationMs ?? undefined,
        },
      });
    } catch {
      // Intentional: never throw from logger
    }
  }

  async query(tenantId: string, filters: LogQueryDto) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 200);
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (filters.module) where.module = filters.module;
    if (filters.level) where.level = filters.level;
    if (filters.event) where.event = { contains: filters.event, mode: 'insensitive' };
    if (filters.userId) where.userId = filters.userId;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.systemLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.systemLog.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async prune(olderThanDays: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);
    const result = await this.prisma.systemLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    return result.count;
  }
}
