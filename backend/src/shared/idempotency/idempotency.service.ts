/**
 * Idempotency Service — Phase 1.6
 * ZENVIX_MASTER_AUDIT_2026
 *
 * Prevents duplicate creation of critical Procurement records when
 * the same request is retried (network failure, user double-click, etc.).
 *
 * Storage: Uses the existing SysIdempotencyKey model (@map "sys_idempotency_keys")
 * which already exists in the backend/prisma/schema.prisma.
 *
 * Contract:
 *   - Keys are scoped to (tenant_id, key) — endpoint stored in the key for disambiguation
 *   - TTL: 24 hours from first successful response
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma.service';
import { v4 as uuidv4 } from 'uuid';

export const IDEMPOTENCY_TTL_HOURS = 24;

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if a key has already been processed for this tenant + endpoint.
   * Returns the cached response JSON if found and not expired; null otherwise.
   */
  async check(
    tenant_id: string,
    key: string,
    endpoint: string,
  ): Promise<any | null> {
    // Scope key by endpoint prefix to avoid collision between different routes
    const scopedKey = `${endpoint}::${key}`;

    const record = await this.prisma.sys_idempotency_keys.findFirst({
      where: { 
        tenant_id: tenant_id, 
        key: scopedKey 
      },
    });

    if (!record) return null;

    // TTL check: expired keys are treated as non-existent
    if (record.expires_at < new Date()) {
      // Lazy delete — fire-and-forget, don't block the request
      this.prisma.sys_idempotency_keys
        .delete({ where: { id: record.id } })
        .catch(() => {});
      return null;
    }

    return record.response_snapshot;
  }

  /**
   * Persist a successful response for idempotency replay.
   * Uses upsert to handle race conditions from concurrent identical requests.
   */
  async save(
    tenant_id: string,
    key: string,
    endpoint: string,
    response: any,
  ): Promise<void> {
    const scopedKey = `${endpoint}::${key}`;
    const expires_at = new Date();
    expires_at.setHours(expires_at.getHours() + IDEMPOTENCY_TTL_HOURS);

    await this.prisma.sys_idempotency_keys.upsert({
      where: {
        // SysIdempotencyKey unique: [tenant_id, key]
        tenant_id_key: { 
          tenant_id: tenant_id, 
          key: scopedKey 
        },
      },
      create: {
        id: uuidv4(),
        tenant_id: tenant_id,
        key: scopedKey,
        endpoint,
        response_snapshot: response,
        status: 'COMPLETED',
        expires_at,
      },
      update: {
        response_snapshot: response,
        status: 'COMPLETED',
        expires_at,
      },
    });
  }
}
