export interface InventoryAdjustment {
  id: string;
  tenant_id: string;
  item_id: string;
  location_id: string;
  departmentId?: string;
  requestedDelta: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  requested_by: string;
  approvedBy?: string;
  approvedAt?: Date;
  created_at: Date;
  updated_at: Date;
}
