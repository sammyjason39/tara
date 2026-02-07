export type ActivityType =
  | "WORKFLOW_CREATED"
  | "WORKFLOW_APPROVED"
  | "WORKFLOW_REJECTED"
  | "WORKFLOW_RETURNED"
  | "WORKFLOW_FORWARDED";

export type ActivityEvent = {
  id: string;
  tenantId: string;
  type: ActivityType;
  actorId: string;
  actorRole: string;
  entityId?: string;
  entityType?: string;
  metadata?: Record<string, string>;
  createdAt: string;
};
