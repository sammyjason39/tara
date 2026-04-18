import { ArInvoiceStatus } from './ar.constants';
import { Prisma } from '@prisma/client';

export interface IArCustomer {
  id: string;
  tenant_id: string;
  company_id: string;
  name: string;
  email: string;
  phone?: string;
  currentBalance: Prisma.Decimal;
  creditLimit: Prisma.Decimal;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface IArInvoice {
  id: string;
  tenant_id: string;
  company_id: string;
  customer_id: string;
  invoiceNumber: string;
  status: ArInvoiceStatus;
  currency: string;
  issueDate?: Date;
  dueDate?: Date;
  total_amount: Prisma.Decimal;
  outstandingAmount: Prisma.Decimal;
  idempotency_key?: string;
  created_at: Date;
  updated_at: Date;
  lines?: IArInvoiceLine[];
  allocations?: IArPaymentAllocation[];
}

export interface IArInvoiceLine {
  id: string;
  invoiceId: string;
  description: string;
  quantity: Prisma.Decimal;
  unit_price: Prisma.Decimal;
  total: Prisma.Decimal;
}

export interface IArPayment {
  id: string;
  tenant_id: string;
  company_id: string;
  customer_id: string;
  paymentDate: Date;
  amount: Prisma.Decimal;
  payment_method: string;
  reference?: string;
  paymentReference?: string;
  idempotency_key?: string;
  created_at: Date;
  updated_at: Date;
}

export interface IArPaymentAllocation {
  id: string;
  paymentId: string;
  invoiceId: string;
  amountAllocated: Prisma.Decimal;
  idempotency_key?: string;
  created_at: Date;
}

export interface IArCreditMemo {
  id: string;
  tenant_id: string;
  company_id: string;
  customer_id: string;
  creditAmount: Prisma.Decimal;
  reason: string;
  created_at: Date;
  updated_at: Date;
}

export interface ICustomerCreditBalance {
  id: string;
  tenant_id: string;
  company_id: string;
  customer_id: string;
  balance: Prisma.Decimal;
  updated_at: Date;
}
