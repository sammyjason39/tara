export interface ReceivableInvoice {
  id: string;
  tenantId: string;
  customerName: string;
  amount: number;
  currency: "IDR" | "USD";
  dueDate: string;
  status: "draft" | "issued" | "overdue" | "paid";
  agingBucket: "0-30" | "30-60" | "60+";
  createdAt: string;
  updatedAt: string;
}

export type Receivable = {
  id: string;
  tenantId: string;
  customerName: string;
  amount: number;
  currency: string;
  invoiceDate: string;
  dueDate: string;
  status: "pending" | "approved" | "paid" | "overdue";
  workflowId?: string;
  createdAt: string;
  updatedAt: string;
};
