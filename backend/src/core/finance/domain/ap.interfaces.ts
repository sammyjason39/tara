export enum BillStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  CANCELLED = 'CANCELLED',
  VOIDED = 'VOIDED',
}

export interface APBillLine {
  id: string;
  accountId: string; // Target expense/asset account
  description: string;
  amount: number;
}

export interface APVendorBill {
  id: string;
  tenant_id: string;
  company_id: string;
  vendorId: string;
  billNumber: string;
  status: BillStatus;
  currency: string;
  total_amount: number;
  balanceDue: number;
  issueDate: Date;
  dueDate: Date;
  lines: APBillLine[];
}

export interface APVendorPayment {
  id: string;
  tenant_id: string;
  company_id: string;
  vendorId: string;
  paymentNumber: string;
  amount: number;
  currency: string;
  paymentDate: Date;
  method: string;
}

export interface APVendorAgingBucket {
  vendorId: string;
  bucket0_30: number;
  bucket31_60: number;
  bucket61_90: number;
  bucket91_plus: number;
  updated_at: Date;
}
