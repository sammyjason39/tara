export type NotificationType =
  | "WORKFLOW_PENDING"
  | "WORKFLOW_APPROVED"
  | "WORKFLOW_REJECTED"
  | "WORKFLOW_RETURNED"
  | "WORKFLOW_FORWARDED";

export type NotificationItem = {
  id: string;
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  read: boolean;
  createdAt: string;
};
