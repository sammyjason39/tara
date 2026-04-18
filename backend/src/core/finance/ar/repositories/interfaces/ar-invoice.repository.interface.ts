import { IArInvoice, IArInvoiceLine } from '../../domain/ar.interfaces';
import { Prisma } from '@prisma/client';

export interface IArInvoiceRepository {
  findById(tenant_id: string, company_id: string, id: string): Promise<IArInvoice | null>;
  findByNumber(tenant_id: string, company_id: string, invoiceNumber: string): Promise<IArInvoice | null>;
  findByIdempotencyKey(tenant_id: string, company_id: string, key: string): Promise<IArInvoice | null>;
  findAll(tenant_id: string, company_id: string, customer_id?: string): Promise<IArInvoice[]>;
  create(tenant_id: string, company_id: string, data: any): Promise<IArInvoice>;
  createLines(tenant_id: string, company_id: string, invoiceId: string, lines: any[]): Promise<IArInvoiceLine[]>;
  updateStatus(tenant_id: string, company_id: string, id: string, status: string, outstandingAmount?: Prisma.Decimal, tx?: Prisma.TransactionClient): Promise<IArInvoice>;
  getLines(tenant_id: string, company_id: string, invoiceId: string): Promise<IArInvoiceLine[]>;
}
