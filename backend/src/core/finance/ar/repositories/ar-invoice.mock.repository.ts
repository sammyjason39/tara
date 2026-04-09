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

  async findById(tenantId: string, companyId: string, id: string): Promise<IArInvoice | null> {
    return this.invoices.find(i => i.tenantId === tenantId && i.companyId === companyId && i.id === id) || null;
  }

  async findByNumber(tenantId: string, companyId: string, invoiceNumber: string): Promise<IArInvoice | null> {
    return this.invoices.find(i => i.tenantId === tenantId && i.companyId === companyId && i.invoiceNumber === invoiceNumber) || null;
  }

  async findByIdempotencyKey(tenantId: string, companyId: string, key: string): Promise<IArInvoice | null> {
    return this.invoices.find(i => i.tenantId === tenantId && i.companyId === companyId && i.idempotencyKey === key) || null;
  }

  async findAll(tenantId: string, companyId: string, customerId?: string): Promise<IArInvoice[]> {
    return this.invoices.filter(i => i.tenantId === tenantId && i.companyId === companyId && (!customerId || i.customerId === customerId));
  }

  async create(tenantId: string, companyId: string, data: any): Promise<IArInvoice> {
    const invoice: IArInvoice = {
      id: uuid(),
      tenantId,
      companyId,
      customerId: data.customerId,
      invoiceNumber: data.invoiceNumber,
      status: ArInvoiceStatus.DRAFT,
      currency: data.currency || 'USD',
      totalAmount: new Prisma.Decimal(data.totalAmount),
      outstandingAmount: new Prisma.Decimal(data.totalAmount),
      idempotencyKey: data.idempotencyKey,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.invoices.push(invoice);
    return invoice;
  }

  async createLines(tenantId: string, companyId: string, invoiceId: string, lines: any[]): Promise<IArInvoiceLine[]> {
    const createdLines = lines.map(l => ({
      id: uuid(),
      invoiceId,
      description: l.description,
      quantity: new Prisma.Decimal(l.quantity || 0),
      unitPrice: new Prisma.Decimal(l.unitPrice || 0),
      total: new Prisma.Decimal(l.total || 0),
    }));
    this.lines.push(...createdLines);
    return createdLines;
  }

  async updateStatus(tenantId: string, companyId: string, id: string, status: ArInvoiceStatus, outstandingAmount?: Prisma.Decimal): Promise<IArInvoice> {
    const invoice = await this.findById(tenantId, companyId, id);
    if (!invoice) throw new Error('Invoice not found');
    
    invoice.status = status;
    if (outstandingAmount !== undefined) invoice.outstandingAmount = outstandingAmount;
    if (status === ArInvoiceStatus.ISSUED && !invoice.issueDate) invoice.issueDate = new Date();
    
    invoice.updatedAt = new Date();
    return invoice;
  }

  async getLines(tenantId: string, companyId: string, invoiceId: string): Promise<IArInvoiceLine[]> {
    return this.lines.filter(l => l.invoiceId === invoiceId);
  }
}
