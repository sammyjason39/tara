export interface PayableBill {
  id: string;
  tenantId: string;
  vendorName: string;
  amount: number;
  currency: "IDR" | "USD";
  dueDate: string;
  status: "PENDING" | "APPROVED" | "PAID" | "OVERDUE";
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
  status: "PENDING" | "APPROVED" | "PAID" | "OVERDUE";
  workflowId?: string;
  createdAt: string;
  updatedAt: string;
};

export interface FinancePayableRow {
  id: string;
  vendorName: string;
  billNumber: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: "PENDING" | "APPROVED" | "PAID" | "OVERDUE";
}

