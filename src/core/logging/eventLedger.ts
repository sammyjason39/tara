// src/core/logging/eventLedger.ts

import { prisma } from "@/core/persistence/database/client";
import { RetailEvent } from "@/core/events/retailEvents";

/**
 * appendRetailEvent
 *
 * Writes events into the Postgres Audit Ledger Table.
 */
export async function appendRetailEvent(event: RetailEvent) {
  const auditEntry = await prisma.auditLog.create({
    data: {
      tenantId: event.scope.tenantId,
      module: "retail",
      action: event.type,
      entityType: "event",
      entityId: event.audit?.traceId ?? crypto.randomUUID(),
      userId: event.actor.id,
      changes: event.payload as any, // Cast to any for Json compatibility if needed, or rely on Prisma types
      metadata: {
        scope: event.scope,
        timestamp: event.timestamp,
        actorType: event.actor.type,
      } as any,
      createdAt: new Date(),
    },
  });

  return {
    key: `audit:retail:${auditEntry.id}`,
    count: 1, // implementation detail change, but API signature remains similar enough
  };
}
