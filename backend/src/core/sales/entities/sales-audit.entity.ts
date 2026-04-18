export class SalesAuditEvent {
  id: string;
  tenant_id: string;
  actor_id: string;
  action: string;
  entity_type:
    | "lead"
    | "opportunity"
    | "quote"
    | "timeline"
    | "task"
    | "order"
    | "alert";
  entity_id: string;
  detail: string;
  created_at: Date;
}
