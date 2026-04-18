export class ProcurementRisk {
  id: string;
  tenant_id: string;
  code:
    | "price_spike"
    | "approval_bypass"
    | "duplicate_invoice"
    | "supplier_risk";
  severity: "low" | "medium" | "high";
  status: "open" | "acknowledged" | "resolved";
  entity_id: string;
  detail: string;
  created_at: Date;
  updated_at: Date;
}
