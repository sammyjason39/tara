export class MarketingAlert {
  id: string;
  tenant_id: string;
  type: "lead_spike" | "campaign_failure" | "token_expiry" | "handoff_delay";
  severity: "low" | "medium" | "high";
  entity_type: "campaign" | "lead" | "account" | "workflow";
  entity_id: string;
  message: string;
  acknowledged: boolean;
  created_at: Date;
  updated_at: Date;
  branch_id?: string;
  ecommerce_id?: string;
}


