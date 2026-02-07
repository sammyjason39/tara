import type { AuditAction, AuditEntry } from "./auditLogTypes";
import { getRepo } from "@/core/persistence/repositoryRegistry";

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`;

type AuditInput = {
  tenantId: string;
  workflowId: string;
  action: AuditAction;
  actorId: string;
  actorRole: string;
  actorDept: string;
  notes?: string;
  cycle: number;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
};

export function appendAuditLog(input: AuditInput): AuditEntry {
  const now = new Date().toISOString();
  const entry: AuditEntry = {
    id: createId(),
    tenantId: input.tenantId,
    workflowId: input.workflowId,
    action: input.action,
    actorId: input.actorId,
    actorRole: input.actorRole,
    actorDept: input.actorDept,
    notes: input.notes,
    cycle: input.cycle,
    before: input.before,
    after: input.after,
    createdAt: now,
  };
  const repo = getRepo("workflow");
  return repo.appendAuditEntry(input.tenantId, entry);
}
