import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma.service';

export interface AuditLogParams {
  tenantId: string;
  userId: string;
  module: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: any;
  changes?: any;
  ipAddress?: string;
  userAgent?: string;
  severity?: 'INFO' | 'WARN' | 'CRITICAL';
}

export interface AuditQueryDto {
  module?: string;
  action?: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  severity?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: AuditLogParams) {
    return this.prisma.auditLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        module: params.module,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: params.metadata ?? {},
        changes: params.changes ?? {},
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        severity: params.severity ?? 'INFO',
      },
    });
  }

  async query(tenantId: string, filters: AuditQueryDto) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 200);
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (filters.module) where.module = filters.module;
    if (filters.action) where.action = filters.action;
    if (filters.userId) where.userId = filters.userId;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.severity) where.severity = filters.severity;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page, limit };
  }
}
