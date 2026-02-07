import { auditLedger } from "./auditLedger";

export type AuditActor = {
  userId: string;
  role: string;
  departmentId?: string;
};

export type AuditRecord = {
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

export type AuditInput = {
  tenantId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  timestamp?: string;
};

export type LegacyAuditInput = {
  actor: AuditActor;
  tenantId: string;
  entityType: string;
  actionType: string;
  metadata?: Record<string, string>;
};

const AUDIT_KEY = "core.audit.log";

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const append = (entry: AuditRecord) => {
  if (typeof window === "undefined") return entry;
  const current = window.localStorage.getItem(AUDIT_KEY);
  const items = current ? (JSON.parse(current) as AuditRecord[]) : [];
  window.localStorage.setItem(AUDIT_KEY, JSON.stringify([...items, entry]));
  return entry;
};

export const audit = {
  log(input: AuditInput): AuditRecord {
    const entry = append({
      id: createId(),
      tenantId: input.tenantId,
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      before: input.before,
      after: input.after,
      timestamp: input.timestamp ?? new Date().toISOString(),
    });
    auditLedger.logAction({
      tenantId: entry.tenantId,
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      before: entry.before,
      after: entry.after,
      timestamp: entry.timestamp,
    });
    return entry;
  },
};

export function logAction(input: LegacyAuditInput) {
  const entry = append({
    id: createId(),
    tenantId: input.tenantId,
    actorId: input.actor.userId,
    action: input.actionType,
    entityType: input.entityType,
    entityId: input.metadata?.entityId,
    before: input.metadata ? { ...input.metadata } : undefined,
    after: undefined,
    timestamp: new Date().toISOString(),
  });
  auditLedger.logAction({
    tenantId: entry.tenantId,
    actorId: entry.actorId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    before: entry.before,
    after: entry.after,
    timestamp: entry.timestamp,
  });
  return entry;
}
