export class SalesAlert {
  id: string;
  tenant_id: string;
  type:
    | "lead_sla_breach"
    | "follow_up_overdue"
    | "deal_risk"
    | "quote_approval_delay";
  severity: "low" | "medium" | "high";
  entity_type: "lead" | "opportunity" | "quote" | "task";
  entity_id: string;
  message: string;
  acknowledged: boolean;
  created_at: Date;
  updated_at: Date;
}
