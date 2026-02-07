type AuditLedgerEntry = {
  id: string;
  tenantId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  timestamp: string;
};

const LEDGER_KEY = "core.audit.ledger";

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `ledger-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const read = (): AuditLedgerEntry[] => {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(LEDGER_KEY);
  return raw ? (JSON.parse(raw) as AuditLedgerEntry[]) : [];
};

const write = (items: AuditLedgerEntry[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LEDGER_KEY, JSON.stringify(items));
};

export const auditLedger = {
  logAction(input: Omit<AuditLedgerEntry, "id" | "timestamp"> & { timestamp?: string }) {
    const entry: AuditLedgerEntry = {
      id: createId(),
      tenantId: input.tenantId,
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      before: input.before,
      after: input.after,
      timestamp: input.timestamp ?? new Date().toISOString(),
    };
    const items = read();
    write([...items, entry]);
    return entry;
  },

  list(tenantId: string): AuditLedgerEntry[] {
    return read().filter((entry) => entry.tenantId === tenantId);
  },

  buildIsoEvidencePack(tenantId: string) {
    const entries = read().filter((entry) => entry.tenantId === tenantId);
    return {
      tenantId,
      generatedAt: new Date().toISOString(),
      totalEntries: entries.length,
      checksum: entries.length ? `${tenantId}:${entries[0]?.id}` : `${tenantId}:empty`,
    };
  },
};
