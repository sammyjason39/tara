export type WorkflowEntityType =
  | "PAYROLL"
  | "LEAVE"
  | "CONTRACT"
  | "PURCHASE"
  | "RECRUITMENT"
  | "TRAINING"
  | "PERFORMANCE"
  | "CASE";

export type WorkflowStatus = "PENDING" | "APPROVED" | "REJECTED" | "RETURNED" | "MODIFIED";

export type WorkflowActionType =
  | "CREATE"
  | "APPROVE"
  | "REJECT"
  | "RETURN"
  | "MODIFY"
  | "FORWARD";

export type WorkflowStepStatus = "PENDING" | "APPROVED" | "REJECTED" | "RETURNED" | "SKIPPED";

export type WorkflowStep = {
  id: string;
  label: string;
  dept: string;
  status: WorkflowStepStatus;
  decidedBy?: string;
  decidedAt?: string;
  notes?: string;
};

export type WorkflowRouteNode = {
  id: string;
  dept: string;
  label: string;
};

export type WorkflowRouteEdge = {
  from: string;
  to: string;
  condition?: string;
};

export type WorkflowRouteGraph = {
  nodes: WorkflowRouteNode[];
  edges: WorkflowRouteEdge[];
  startNodeId: string;
  endNodeId?: string;
};

export type WorkflowRequest = {
  id: string;
  tenantId: string;
  entityType: WorkflowEntityType;
  entityId: string;
  makerDept: string;
  destinationDept: string;
  status: WorkflowStatus;
  requestedBy: string;
  requestedAt: string;
  updatedAt: string;
  cycle: number;
  steps: WorkflowStep[];
  route: WorkflowRouteGraph;
  currentStepId: string;
  lastAction?: WorkflowActionType;
  notes?: string;
  metadata?: Record<string, string>;
};
