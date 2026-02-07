import type { AuditEntry } from "./auditLogTypes";
import type { WorkflowRepository } from "./workflowRepository";
import type { WorkflowRequest } from "./workflowTypes";

const WORKFLOW_KEY = "core.workflow.v2.requests";
const AUDIT_KEY = "core.workflow.v2.audit";

const readWorkflows = (): WorkflowRequest[] => {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(WORKFLOW_KEY);
  return raw ? (JSON.parse(raw) as WorkflowRequest[]) : [];
};

const writeWorkflows = (items: WorkflowRequest[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WORKFLOW_KEY, JSON.stringify(items));
};

const readAudits = (): AuditEntry[] => {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(AUDIT_KEY);
  return raw ? (JSON.parse(raw) as AuditEntry[]) : [];
};

const writeAudits = (items: AuditEntry[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUDIT_KEY, JSON.stringify(items));
};

export const mockWorkflowRepo: WorkflowRepository = {
  listWorkflows(tenantId) {
    return readWorkflows().filter((item) => item.tenantId === tenantId);
  },
  getWorkflow(tenantId, workflowId) {
    return readWorkflows().find(
      (item) => item.tenantId === tenantId && item.id === workflowId,
    );
  },
  createWorkflow(tenantId, payload) {
    const items = readWorkflows();
    const next = [...items, payload];
    writeWorkflows(next);
    return payload;
  },
  updateWorkflow(tenantId, payload) {
    const items = readWorkflows();
    const next = items.map((item) =>
      item.tenantId === tenantId && item.id === payload.id ? payload : item,
    );
    writeWorkflows(next);
    return payload;
  },
  listAuditEntries(tenantId, workflowId) {
    return readAudits().filter(
      (entry) => entry.tenantId === tenantId && entry.workflowId === workflowId,
    );
  },
  appendAuditEntry(tenantId, entry) {
    const items = readAudits();
    const next = [...items, entry];
    writeAudits(next);
    return entry;
  },
};
