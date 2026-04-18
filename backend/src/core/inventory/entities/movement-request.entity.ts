export class MovementRequest {
  id: string;
  tenant_id: string;
  product_id: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "PENDING" | "APPROVED" | "REJECTED" | "FULFILLED";
  requested_by: string;
  created_at: Date;
  updated_at: Date;
}
