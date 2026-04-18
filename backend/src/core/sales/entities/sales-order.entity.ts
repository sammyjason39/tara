export class SalesOrder {
  id: string;
  tenant_id: string;
  opportunityId: string;
  quoteId?: string;
  customerName: string;
  amount: number;
  currency: "IDR" | "USD";
  status: "draft" | "pending_finance_handoff" | "invoiced" | "closed";
  inventoryCheck: "available" | "partial" | "unavailable";
  financeInvoiceId?: string;
  createdBy: string;
  created_at: Date;
  updated_at: Date;
}
