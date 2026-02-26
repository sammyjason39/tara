import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    tenantId: string;
    userId: string;
    module: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: any;
    changes?: any;
  }) {
    return this.prisma.auditLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        module: params.module,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: params.metadata || {},
        changes: params.changes || {},
      },
    });
  }
}
