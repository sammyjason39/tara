import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { PrismaService } from "../../../../persistence/prisma.service";
import { IArInvoiceRepository } from "./interfaces/ar-invoice.repository.interface";
import { IArInvoice, IArInvoiceLine } from "../domain/ar.interfaces";
import { ArInvoiceStatus } from "../domain/ar.constants";

@Injectable()
export class ArInvoiceDbRepository implements IArInvoiceRepository {
  constructor(
    private readonly prisma: PrismaService | Prisma.TransactionClient,
  ) {}

  private get db(): Prisma.TransactionClient {
    return this.prisma as Prisma.TransactionClient;
  }

  async findById(
    tenant_id: string,
    company_id: string,
    id: string,
  ): Promise<IArInvoice | null> {
    const res = await this.db.finance_ar_invoices.findUnique({
      where: { id },
      include: { finance_ar_invoice_lines: true },
    });
    if (!res) return null;
    return this.mapToDomain(res);
  }

  async findByNumber(
    tenant_id: string,
    company_id: string,
    invoiceNumber: string,
  ): Promise<IArInvoice | null> {
    const res = await this.db.finance_ar_invoices.findUnique({
      where: { tenant_id_invoice_number: { tenant_id: tenant_id, invoice_number: invoiceNumber } },
      include: { finance_ar_invoice_lines: true },
    });
    if (!res) return null;
    return this.mapToDomain(res);
  }

  async findByIdempotencyKey(
    tenant_id: string,
    company_id: string,
    key: string,
  ): Promise<IArInvoice | null> {
    const res = await this.db.finance_ar_invoices.findUnique({
      where: { tenant_id_idempotency_key: { tenant_id: tenant_id, idempotency_key: key } },
      include: { finance_ar_invoice_lines: true },
    });
    if (!res) return null;
    return this.mapToDomain(res);
  }

  async findAll(
    tenant_id: string,
    company_id: string,
    customer_id?: string,
  ): Promise<IArInvoice[]> {
    const list = await this.db.finance_ar_invoices.findMany({
      where: { tenant_id: tenant_id, customer_id: customer_id },
      include: { finance_ar_invoice_lines: true },
    });
    return list.map((item: any) => this.mapToDomain(item));
  }

  async create(
    tenant_id: string,
    company_id: string,
    data: any,
  ): Promise<IArInvoice> {
    const created = await this.db.finance_ar_invoices.create({
      data: {
        id: data.id || randomUUID(),
        tenant_id: tenant_id,
        customer_id: data.customer_id,
        invoice_number: data.invoiceNumber,
        status: ArInvoiceStatus.DRAFT,
        currency: data.currency || "USD",
        total_amount: new Prisma.Decimal(data.total_amount),
        outstanding_amount: new Prisma.Decimal(data.total_amount),
        idempotency_key: data.idempotency_key,
        created_at: new Date(),
        updated_at: new Date(),
        due_date: data.dueDate ? new Date(data.dueDate) : undefined,
      },
    });
    return this.mapToDomain(created);
  }

  async createLines(
    tenant_id: string,
    company_id: string,
    invoiceId: string,
    lines: any[],
  ): Promise<IArInvoiceLine[]> {
    const createdLines = await Promise.all(
      lines.map((line: any) =>
        this.db.finance_ar_invoice_lines.create({
          data: {
            id: randomUUID(),
            invoice_id: invoiceId,
            description: line.description,
            quantity: new Prisma.Decimal(line.quantity),
            unit_price: new Prisma.Decimal(line.unit_price),
            total: new Prisma.Decimal(line.total),
          },
        }),
      ),
    );
    return createdLines.map((line: any) => this.mapLineToDomain(line));
  }

  async updateStatus(
    tenant_id: string,
    company_id: string,
    id: string,
    status: ArInvoiceStatus,
    outstandingAmount?: Prisma.Decimal,
    tx?: Prisma.TransactionClient,
  ): Promise<IArInvoice> {
    const targetDb = tx || this.db;
    const updated = await targetDb.finance_ar_invoices.update({
      where: { id },
      data: {
        status: status as any,
        outstanding_amount: outstandingAmount
          ? new Prisma.Decimal(outstandingAmount.toString())
          : undefined,
        issue_date: status === ArInvoiceStatus.ISSUED ? new Date() : undefined,
        updated_at: new Date(),
      },
      include: { finance_ar_invoice_lines: true },
    });
    return this.mapToDomain(updated);
  }

  async getLines(
    tenant_id: string,
    company_id: string,
    invoiceId: string,
  ): Promise<IArInvoiceLine[]> {
    const list = await this.db.finance_ar_invoice_lines.findMany({
      where: { invoice_id: invoiceId },
    });
    return list.map((line: any) => this.mapLineToDomain(line));
  }

  private mapToDomain(item: any): IArInvoice {
    return {
      id: item.id,
      tenant_id: item.tenant_id,
      company_id: item.tenant_id,
      customer_id: item.customer_id,
      invoiceNumber: item.invoice_number,
      status: item.status,
      currency: item.currency,
      issueDate: item.issue_date,
      dueDate: item.due_date,
      total_amount: item.total_amount,
      outstandingAmount: item.outstanding_amount,
      created_at: item.created_at,
      updated_at: item.updated_at,
      lines: item.financeArInvoiceLine ? item.finance_ar_invoice_lines.map((l: any) => this.mapLineToDomain(l)) : [],
    } as unknown as IArInvoice;
  }

  private mapLineToDomain(line: any): IArInvoiceLine {
    return {
      id: line.id,
      description: line.description,
      quantity: line.quantity,
      unit_price: line.unit_price,
      total: line.total,
    } as unknown as IArInvoiceLine;
  }
}
