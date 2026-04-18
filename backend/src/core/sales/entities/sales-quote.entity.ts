export class SalesQuote {
  id: string;
  tenant_id: string;
  opportunityId: string;
  account_name: string;
  version: number;
  amount: number;
  discountPercent: number;
  netAmount: number;
  currency: "IDR" | "USD";
  status:
    | "draft"
    | "pending_approval"
    | "approved"
    | "rejected"
    | "sent"
    | "accepted"
    | "expired";
  validUntil: Date;
  approvalBy?: string;
  approvalAt?: Date;
  notes?: string;
  createdBy: string;
  created_at: Date;
  updated_at: Date;
}
