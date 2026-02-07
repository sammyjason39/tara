import type { AuditTrailEntry, WorkflowAction, WorkflowRequest, WorkflowStatus } from "./types";

const WORKFLOW_KEY = "core.workflow.requests";
const AUDIT_KEY = "core.workflow.audit";

const createId = (prefix: string) =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const readRequests = (): WorkflowRequest[] => {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(WORKFLOW_KEY);
  return raw ? (JSON.parse(raw) as WorkflowRequest[]) : [];
};

const writeRequests = (items: WorkflowRequest[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WORKFLOW_KEY, JSON.stringify(items));
};

const readAudit = (): AuditTrailEntry[] => {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(AUDIT_KEY);
  return raw ? (JSON.parse(raw) as AuditTrailEntry[]) : [];
};

const writeAudit = (items: AuditTrailEntry[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUDIT_KEY, JSON.stringify(items));
};

export function submitRequest(
  payload: Omit<WorkflowRequest, "id" | "status" | "requestedAt" | "updatedAt">,
): WorkflowRequest {
  const now = new Date().toISOString();
  const request: WorkflowRequest = {
    ...payload,
    id: createId("wf"),
    status: "pending",
    requestedAt: now,
    updatedAt: now,
  };
  writeRequests([...readRequests(), request]);
  appendAudit({
    workflowId: request.id,
    tenantId: request.tenantId,
    action: "submit",
    actorId: request.requestedBy,
    actorDept: request.makerDept,
  });
  return request;
}

export function listRequests(tenantId: string, status?: WorkflowStatus): WorkflowRequest[] {
  return readRequests().filter(
    (item) => item.tenantId === tenantId && (!status || item.status === status),
  );
}

export function updateStatus(
  tenantId: string,
  workflowId: string,
  status: WorkflowStatus,
  action: WorkflowAction["action"],
  actorId: string,
  actorDept: string,
  notes?: string,
): WorkflowRequest | undefined {
  const items = readRequests();
  const current = items.find((item) => item.tenantId === tenantId && item.id === workflowId);
  if (!current) return undefined;
  const next: WorkflowRequest = {
    ...current,
    status,
    updatedAt: new Date().toISOString(),
    notes: notes ?? current.notes,
  };
  writeRequests(items.map((item) => (item.id === workflowId ? next : item)));
  appendAudit({ workflowId, tenantId, action, actorId, actorDept, metadata: notes ? { notes } : undefined });
  return next;
}

export function listAudit(tenantId: string, workflowId: string): AuditTrailEntry[] {
  return readAudit().filter(
    (entry) => entry.tenantId === tenantId && entry.workflowId === workflowId,
  );
}

function appendAudit(input: Omit<AuditTrailEntry, "id" | "createdAt">) {
  const entry: AuditTrailEntry = {
    ...input,
    id: createId("audit"),
    createdAt: new Date().toISOString(),
  };
  writeAudit([...readAudit(), entry]);
  return entry;
}
