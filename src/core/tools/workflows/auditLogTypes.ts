export type AuditAction =
  | "WORKFLOW_CREATED"
  | "WORKFLOW_APPROVED"
  | "WORKFLOW_REJECTED"
  | "WORKFLOW_RETURNED"
  | "WORKFLOW_MODIFIED"
  | "WORKFLOW_FORWARDED";

export type AuditEntry = {
  id: string;
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
  createdAt: string;
};
