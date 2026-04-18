export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export interface ARInvoiceLine {
  id: string;
  product_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  tax_amount: number;
}

export interface ARInvoice {
  id: string;
  tenant_id: string;
  company_id: string;
  customer_id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  currency: string;
  total_amount: number;
  balanceDue: number;
  issueDate: Date;
  dueDate: Date;
  lines: ARInvoiceLine[];
}

export interface ARPayment {
  id: string;
  tenant_id: string;
  company_id: string;
  customer_id: string;
  paymentNumber: string;
  amount: number;
  unallocatedAmount: number;
  currency: string;
  paymentDate: Date;
  method: string;
}

export interface ARPaymentAllocation {
  id: string;
  paymentId: string;
  invoiceId: string;
  amount: number;
  allocatedAt: Date;
}

export interface ARAgingBucket {
  customer_id: string;
  bucket0_30: number;
  bucket31_60: number;
  bucket61_90: number;
  bucket91_plus: number;
  updated_at: Date;
}

export interface ARCustomerBalance {
  customer_id: string;
  tenant_id: string;
  company_id: string;
  totalBalance: number;
  unallocatedPayments: number;
  creditLimit: number;
  overdueBalance: number;
  lastUpdated: Date;
}
