export class MarketingAuditEvent {
  id: string;
  tenant_id: string;
  actor_id: string;
  action: string;
  entity_type:
    | "campaign"
    | "execution"
    | "lead"
    | "workflow"
    | "account"
    | "attribution"
    | "alert";
  entity_id: string;
  detail: string;
  created_at: Date;
}
