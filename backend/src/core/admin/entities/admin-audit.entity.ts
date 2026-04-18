export class AdminAuditEvent {
  id: string;
  tenant_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  actor_id: string;
  created_at: Date;
}
