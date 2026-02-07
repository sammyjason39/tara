import type { AuditEntry } from "./auditLogTypes";
import type { WorkflowRequest } from "./workflowTypes";

export interface WorkflowRepository {
  listWorkflows: (tenantId: string) => WorkflowRequest[];
  getWorkflow: (tenantId: string, workflowId: string) => WorkflowRequest | undefined;
  createWorkflow: (tenantId: string, payload: WorkflowRequest) => WorkflowRequest;
  updateWorkflow: (tenantId: string, payload: WorkflowRequest) => WorkflowRequest;
  listAuditEntries: (tenantId: string, workflowId: string) => AuditEntry[];
  appendAuditEntry: (tenantId: string, entry: AuditEntry) => AuditEntry;
}
