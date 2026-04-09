import { ArInvoiceStatus } from './ar.constants';
import { Prisma } from '@prisma/client';

export interface IArCustomer {
  id: string;
  tenantId: string;
  companyId: string;
  name: string;
  email: string;
  phone?: string;
  currentBalance: Prisma.Decimal;
  creditLimit: Prisma.Decimal;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IArInvoice {
  id: string;
  tenantId: string;
  companyId: string;
  customerId: string;
  invoiceNumber: string;
  status: ArInvoiceStatus;
  currency: string;
  issueDate?: Date;
  dueDate?: Date;
  totalAmount: Prisma.Decimal;
  outstandingAmount: Prisma.Decimal;
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt: Date;
  lines?: IArInvoiceLine[];
  allocations?: IArPaymentAllocation[];
}

export interface IArInvoiceLine {
  id: string;
  invoiceId: string;
  description: string;
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  total: Prisma.Decimal;
}

export interface IArPayment {
  id: string;
  tenantId: string;
  companyId: string;
  customerId: string;
  paymentDate: Date;
  amount: Prisma.Decimal;
  paymentMethod: string;
  reference?: string;
  paymentReference?: string;
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IArPaymentAllocation {
  id: string;
  paymentId: string;
  invoiceId: string;
  amountAllocated: Prisma.Decimal;
  idempotencyKey?: string;
  createdAt: Date;
}

export interface IArCreditMemo {
  id: string;
  tenantId: string;
  companyId: string;
  customerId: string;
  creditAmount: Prisma.Decimal;
  reason: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICustomerCreditBalance {
  id: string;
  tenantId: string;
  companyId: string;
  customerId: string;
  balance: Prisma.Decimal;
  updatedAt: Date;
}
