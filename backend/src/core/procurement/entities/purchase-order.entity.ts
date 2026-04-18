export class PurchaseOrder {
  id: string;
  tenant_id: string;
  requisitionId: string;
  supplierId: string;
  branchCode: string;
  total_amount: number;
  status: "released" | "delivering" | "received" | "closed";
  issuedAt: Date;
  created_at: Date;
  updated_at: Date;
}
