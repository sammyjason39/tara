export interface PayableBill {
  id: string;
  tenantId: string;
  vendorName: string;
  amount: number;
  currency: "IDR" | "USD";
  dueDate: string;
  status: "draft" | "pending" | "approved" | "paid";
  createdAt: string;
  updatedAt: string;
}

export type Payable = {
  id: string;
  tenantId: string;
  vendorName: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: "pending" | "approved" | "paid" | "overdue";
  workflowId?: string;
  createdAt: string;
  updatedAt: string;
};
