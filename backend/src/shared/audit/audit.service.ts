import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: any, _extra?: any) {
    try {
      // Accept both the new params object and old positional arguments
      const raw = typeof params === 'string'
        ? { action_type: params, target_entity_type: 'unknown' }
        : params;

      // Normalize field names from various callers to match Prisma schema:
      //   user_id    → actor_id
      //   action     → action_type
      //   entity_type → target_entity_type
      //   entity_id  → target_entity_id
      const data = {
        action_type: raw.action_type ?? raw.action ?? 'unknown',
        actor_id: raw.actor_id ?? raw.user_id ?? null,
        actor_role: raw.actor_role ?? null,
        target_entity_type: raw.target_entity_type ?? raw.entity_type ?? 'unknown',
        target_entity_id: raw.target_entity_id ?? raw.entity_id ?? null,
        action_context: raw.action_context ?? raw.context ?? null,
        changes: raw.changes ?? raw.metadata ?? null,
        ip_address: raw.ip_address ?? null,
        user_agent: raw.user_agent ?? null,
      };
      await this.prisma.auditLog.create({ data });
    } catch (error) {
      this.logger.error(`Failed to write audit log: ${error.message}`);
    }
  }
}
