export type WorkflowStatus = "draft" | "pending" | "approved" | "rejected" | "returned";

export type WorkflowRequest = {
  id: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  makerDept: string;
  destinationDept: string;
  status: WorkflowStatus;
  requestedBy: string;
  requestedAt: string;
  updatedAt: string;
  notes?: string;
};

export type WorkflowAction = {
  id: string;
  workflowId: string;
  tenantId: string;
  action: "submit" | "approve" | "reject" | "return" | "forward";
  actorId: string;
  actorDept: string;
  notes?: string;
  createdAt: string;
};

export type AuditTrailEntry = {
  id: string;
  workflowId: string;
  tenantId: string;
  action: WorkflowAction["action"];
  actorId: string;
  actorDept: string;
  metadata?: Record<string, string>;
  createdAt: string;
};
