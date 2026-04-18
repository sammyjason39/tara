import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma.service';
import { LogQueryDto } from './dto/log-query.dto';

export interface LogParams {
  tenant_id?: string;
  module: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  event: string;
  message: string;
  payload?: any;
  errorStack?: string;
  request_id?: string;
  correlation_id?: string;
  user_id?: string;
  ip_address?: string;
  durationMs?: number;
}

@Injectable()
export class LoggerService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: LogParams): Promise<void> {
    try {
      await this.prisma.system_logs.create({
        data: {
          updated_at: new Date(),
        id: uuidv4(),
        
          tenant_id: params.tenant_id ?? undefined,
          module: params.module,
          level: params.level,
          event: params.event,
          message: params.message,
          payload: params.payload ?? undefined,
          error_stack: params.errorStack ?? undefined,
          request_id: params.request_id ?? undefined,
          user_id: params.user_id ?? undefined,
          ip_address: params.ip_address ?? undefined,
          duration_ms: params.durationMs ?? undefined,
        },
      });
    } catch {
      // Intentional: never throw from logger
    }
  }

  async query(tenant_id: string, filters: LogQueryDto) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 200);
    const skip = (page - 1) * limit;

    const where: any = { tenant_id };
    if (filters.module) where.module = filters.module;
    if (filters.level) where.level = filters.level;
    if (filters.event) where.event = { contains: filters.event, mode: 'insensitive' };
    if (filters.user_id) where.user_id = filters.user_id;
    if (filters.start_date || filters.end_date) {
      where.created_at = {};
      if (filters.start_date) where.created_at.gte = new Date(filters.start_date);
      if (filters.end_date) where.created_at.lte = new Date(filters.end_date);
    }

    const [data, total] = await Promise.all([
      this.prisma.system_logs.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.system_logs.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async prune(olderThanDays: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);
    const result = await this.prisma.system_logs.deleteMany({
      where: { created_at: { lt: cutoff } },
    });
    return result.count;
  }
}
