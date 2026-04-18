export class Supplier {
  id: string;
  tenant_id: string;
  name: string;
  taxId: string;
  category: string;
  branchCode: string;
  complianceStatus: "pending" | "verified" | "expired";
  rating: number;
  created_at: Date;
  updated_at: Date;
}
