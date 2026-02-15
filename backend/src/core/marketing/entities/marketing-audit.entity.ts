export class MarketingAuditEvent {
  id: string;
  tenantId: string;
  actorId: string;
  action: string;
  entityType: 'campaign' | 'execution' | 'lead' | 'workflow' | 'account' | 'attribution' | 'alert';
  entityId: string;
  detail: string;
  createdAt: Date;
}

