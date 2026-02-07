export type ActivityType = "comment" | "mention" | "attachment" | "status";

export type ActivityEntry = {
  id: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  actorId: string;
  message: string;
  type: ActivityType;
  createdAt: string;
};
