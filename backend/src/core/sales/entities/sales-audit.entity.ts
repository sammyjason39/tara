export class SalesAuditEvent {
  id: string;
  tenantId: string;
  actorId: string;
  action: string;
  entityType:
    | 'lead'
    | 'opportunity'
    | 'quote'
    | 'timeline'
    | 'task'
    | 'order'
    | 'alert';
  entityId: string;
  detail: string;
  createdAt: Date;
}
