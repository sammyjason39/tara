export class AdminAuditEvent {
  id: string;
  tenantId: string;
  action: string;
  entityType: string;
  entityId: string;
  actorId: string;
  createdAt: Date;
}

