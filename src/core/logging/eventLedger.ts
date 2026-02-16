// src/core/logging/eventLedger.ts

import { ensureSeed, saveToStorage } from "@/core/repositories/hr/storage";
import { RetailEvent } from "@/core/events/retailEvents";

/**
 * Retail Event Ledger (Immutable Audit)
 *
 * Purpose:
 * - Every ecommerce activity is recorded permanently
 * - Company A cannot mix with Company B
 * - Branch A cannot mix with Branch B
 * - Ecommerce A cannot mix with Ecommerce B
 *
 * Trial Storage:
 * - JSON ledger files under .db/
 *
 * Future Upgrade:
 * - Postgres Audit Ledger Table (append-only)
 */

/**
 * appendRetailEvent
 *
 * Writes event into immutable audit ledger.
 *
 * Ledger Partitioning:
 * - Company scoped
 * - Daily partitioned
 *
 * Example Key:
 * audit:retail:comp-A:2026-02-16
 */
export function appendRetailEvent(event: RetailEvent) {
  const day = new Date().toISOString().split("T")[0];

  // Tenant Isolation Required
  if (!event.scope?.companyId) {
    throw new Error("RetailEvent missing scope.companyId");
  }

  const companyId = event.scope.companyId;

  // Immutable Daily Ledger Key (Company Scoped)
  const key = `audit:retail:${companyId}:${day}`;

  // Ensure ledger exists
  const logs = ensureSeed<RetailEvent[]>(key, []);

  // Enrich Event with Audit Metadata
  const enriched: RetailEvent = {
    ...event,

    audit: {
      traceId: `evt-${Date.now()}`,
      receivedAt: new Date().toISOString(),
    },
  };

  // Append immutably (copy pattern)
  const next = [...logs, enriched];

  // Persist
  saveToStorage(key, next);

  return {
    key,
    traceId: enriched.audit.traceId,
    count: next.length,
  };
}
