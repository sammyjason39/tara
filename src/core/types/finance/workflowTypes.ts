export type WorkflowRequest = {
  id: string;
  tenantId: string;
  entityType: "PAYROLL" | "PURCHASE" | "PAYMENT" | "OTHER";
  entityId: string;
  makerDept: string;
  destinationDept: string;
  status: "pending" | "approved" | "rejected";
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
};

export type WorkflowAction = {
  requestId: string;
  actorId: string;
  action: "approve" | "reject" | "delegate";
  notes?: string;
  createdAt: string;
};
