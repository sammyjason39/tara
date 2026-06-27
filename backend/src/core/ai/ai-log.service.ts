import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma.service';

export interface AiLogEntry {
  employeeId?: string;
  sessionId?: string;
  channel?: string;
  userMessage?: string;
  assistantMessage?: string;
  toolsCalled?: string[];
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  status?: string;
  errorMessage?: string;
}

@Injectable()
export class AiLogService {
  private readonly logger = new Logger(AiLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AiLogEntry): Promise<string> {
    const row = await this.prisma.aiAgentLog.create({
      data: {
        employee_id: entry.employeeId,
        session_id: entry.sessionId,
        channel: entry.channel || 'whatsapp',
        user_message: entry.userMessage,
        assistant_message: entry.assistantMessage,
        tools_called: entry.toolsCalled || [],
        model: entry.model,
        input_tokens: entry.inputTokens || 0,
        output_tokens: entry.outputTokens || 0,
        latency_ms: entry.latencyMs,
        status: entry.status || 'success',
        error_message: entry.errorMessage,
      },
    });
    return row.id;
  }

  async findAll(options: {
    page?: number;
    limit?: number;
    employeeId?: string;
    status?: string;
    from?: Date;
    to?: Date;
  }) {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 50, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options.employeeId) where.employee_id = options.employeeId;
    if (options.status) where.status = options.status;
    if (options.from || options.to) {
      where.created_at = {};
      if (options.from) where.created_at.gte = options.from;
      if (options.to) where.created_at.lte = options.to;
    }

    const [items, total] = await Promise.all([
      this.prisma.aiAgentLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
          employee: { select: { id: true, full_name: true, employee_code: true } },
        },
      }),
      this.prisma.aiAgentLog.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getStats(days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [total, success, errors, tokenAgg] = await Promise.all([
      this.prisma.aiAgentLog.count({ where: { created_at: { gte: since } } }),
      this.prisma.aiAgentLog.count({
        where: { created_at: { gte: since }, status: 'success' },
      }),
      this.prisma.aiAgentLog.count({
        where: { created_at: { gte: since }, status: 'error' },
      }),
      this.prisma.aiAgentLog.aggregate({
        where: { created_at: { gte: since } },
        _sum: { input_tokens: true, output_tokens: true },
        _avg: { latency_ms: true },
      }),
    ]);

    return {
      period_days: days,
      total_conversations: total,
      success_count: success,
      error_count: errors,
      total_input_tokens: tokenAgg._sum.input_tokens || 0,
      total_output_tokens: tokenAgg._sum.output_tokens || 0,
      avg_latency_ms: Math.round(tokenAgg._avg.latency_ms || 0),
    };
  }

  async cleanup(retentionDays = 90): Promise<number> {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const result = await this.prisma.aiAgentLog.deleteMany({
      where: { created_at: { lt: cutoff } },
    });
    this.logger.log(`Cleaned up ${result.count} AI logs older than ${retentionDays} days`);
    return result.count;
  }
}
