export type PaymentMethod =
  | "QRIS"
  | "GOPAY"
  | "OVO"
  | "DANA"
  | "SHOPEEPAY"
  | "BANK_TRANSFER"
  | "CARD";

export interface PaymentRequest {
  id: string;
  tenantId: string;
  amount: number;
  currency: "IDR" | "USD";
  method: PaymentMethod;
  destination: string;
  purpose: string;
  status: "draft" | "pending" | "approved" | "rejected" | "executed";
  workflowId?: string;
  createdAt: string;
  updatedAt: string;
}

export type Payment = {
  id: string;
  tenantId: string;
  amount: number;
  currency: string;
  method: "bank" | "qris" | "pos";
  destination: string;
  purpose: string;
  status: "pending" | "approved" | "executed" | "failed";
  workflowId?: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentApproval = {
  paymentId: string;
  approverId: string;
  status: "approved" | "rejected";
  notes?: string;
};
