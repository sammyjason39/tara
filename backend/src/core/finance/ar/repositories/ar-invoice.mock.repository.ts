import { Injectable } from '@nestjs/common';
import { IArInvoiceRepository } from './interfaces/ar-invoice.repository.interface';
import { IArInvoice, IArInvoiceLine } from '../domain/ar.interfaces';
import { ArInvoiceStatus } from '../domain/ar.constants';
import { v4 as uuid } from 'uuid';
import { Prisma } from '@prisma/client';

@Injectable()
export class ArInvoiceMockRepository implements IArInvoiceRepository {
  private invoices: IArInvoice[] = [];
  private lines: IArInvoiceLine[] = [];

  async findById(tenant_id: string, company_id: string, id: string): Promise<IArInvoice | null> {
    return this.invoices.find(i => i.tenant_id === tenant_id && i.company_id === company_id && i.id === id) || null;
  }

  async findByNumber(tenant_id: string, company_id: string, invoiceNumber: string): Promise<IArInvoice | null> {
    return this.invoices.find(i => i.tenant_id === tenant_id && i.company_id === company_id && i.invoiceNumber === invoiceNumber) || null;
  }

  async findByIdempotencyKey(tenant_id: string, company_id: string, key: string): Promise<IArInvoice | null> {
    return this.invoices.find(i => i.tenant_id === tenant_id && i.company_id === company_id && i.idempotency_key === key) || null;
  }

  async findAll(tenant_id: string, company_id: string, customer_id?: string): Promise<IArInvoice[]> {
    return this.invoices.filter(i => i.tenant_id === tenant_id && i.company_id === company_id && (!customer_id || i.customer_id === customer_id));
  }

  async create(tenant_id: string, company_id: string, data: any): Promise<IArInvoice> {
    const invoice: IArInvoice = {
      id: uuid(),
      tenant_id,
      company_id,
      customer_id: data.customer_id,
      invoiceNumber: data.invoiceNumber,
      status: ArInvoiceStatus.DRAFT,
      currency: data.currency || 'USD',
      total_amount: new Prisma.Decimal(data.total_amount),
      outstandingAmount: new Prisma.Decimal(data.total_amount),
      idempotency_key: data.idempotency_key,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.invoices.push(invoice);
    return invoice;
  }

  async createLines(tenant_id: string, company_id: string, invoiceId: string, lines: any[]): Promise<IArInvoiceLine[]> {
    const createdLines = lines.map(l => ({
      id: uuid(),
      invoiceId,
      description: l.description,
      quantity: new Prisma.Decimal(l.quantity || 0),
      unit_price: new Prisma.Decimal(l.unit_price || 0),
      total: new Prisma.Decimal(l.total || 0),
    }));
    this.lines.push(...createdLines);
    return createdLines;
  }

  async updateStatus(tenant_id: string, company_id: string, id: string, status: ArInvoiceStatus, outstandingAmount?: Prisma.Decimal): Promise<IArInvoice> {
    const invoice = await this.findById(tenant_id, company_id, id);
    if (!invoice) throw new Error('Invoice not found');
    
    invoice.status = status;
    if (outstandingAmount !== undefined) invoice.outstandingAmount = outstandingAmount;
    if (status === ArInvoiceStatus.ISSUED && !invoice.issueDate) invoice.issueDate = new Date();
    
    invoice.updated_at = new Date();
    return invoice;
  }

  async getLines(tenant_id: string, company_id: string, invoiceId: string): Promise<IArInvoiceLine[]> {
    return this.lines.filter(l => l.invoiceId === invoiceId);
  }
}
