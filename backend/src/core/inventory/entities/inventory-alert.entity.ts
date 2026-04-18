export class InventoryAlert {
  id: string;
  tenant_id: string;
  alertType: "low_stock" | "expiry_warning" | "anomaly" | "adjustment_approval";
  severity: "low" | "medium" | "high";
  status: "open" | "acknowledged" | "resolved";
  entity_id: string;
  message: string;
  created_at: Date;
  updated_at: Date;
}
