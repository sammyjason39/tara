import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<IArInvoice | null> {
    const res = await this.db.arInvoice.findUnique({
      where: { id },
      include: { financeArInvoiceLines: true },
    });
    return res as unknown as IArInvoice;
  }

  async findByNumber(
    tenantId: string,
    companyId: string,
    invoiceNumber: string,
  ): Promise<IArInvoice | null> {
    const res = await this.db.arInvoice.findUnique({
      where: { tenantId_invoiceNumber: { tenantId, invoiceNumber } },
      include: { financeArInvoiceLines: true },
    });
    return res as unknown as IArInvoice;
  }

  async findByIdempotencyKey(
    tenantId: string,
    companyId: string,
    key: string,
  ): Promise<IArInvoice | null> {
    const res = await this.db.arInvoice.findUnique({
      where: { tenantId_idempotencyKey: { tenantId, idempotencyKey: key } },
      include: { financeArInvoiceLines: true },
    });
    return res as unknown as IArInvoice;
  }

  async findAll(
    tenantId: string,
    companyId: string,
    customerId?: string,
  ): Promise<IArInvoice[]> {
    const list = await this.db.arInvoice.findMany({
      where: { tenantId, customerId },
      include: { financeArInvoiceLines: true },
    });
    return list as unknown as IArInvoice[];
  }

  async create(
    tenantId: string,
    companyId: string,
    data: any,
  ): Promise<IArInvoice> {
    const created = await this.db.arInvoice.create({
      data: {
        
        updatedAt: new Date(),
        tenantId,
        customerId: data.customerId,
        invoiceNumber: data.invoiceNumber,
        status: ArInvoiceStatus.DRAFT,
        currency: data.currency || "USD",
        totalAmount: new Prisma.Decimal(data.totalAmount),
        outstandingAmount: new Prisma.Decimal(data.totalAmount),
        idempotencyKey: data.idempotencyKey,
      },
    });
    return created as unknown as IArInvoice;
  }

  async createLines(
    tenantId: string,
    companyId: string,
    invoiceId: string,
    lines: any[],
  ): Promise<IArInvoiceLine[]> {
    const createdLines = await Promise.all(
      lines.map((line) =>
        this.db.arInvoiceLine.create({
          data: {
            
            invoiceId,
            description: line.description,
            quantity: new Prisma.Decimal(line.quantity),
            unitPrice: new Prisma.Decimal(line.unitPrice),
            total: new Prisma.Decimal(line.total),
          },
        }),
      ),
    );
    return createdLines as unknown as IArInvoiceLine[];
  }

  async updateStatus(
    tenantId: string,
    companyId: string,
    id: string,
    status: ArInvoiceStatus,
    outstandingAmount?: Prisma.Decimal,
    tx?: Prisma.TransactionClient,
  ): Promise<IArInvoice> {
    const targetDb = tx || this.db;
    const updated = await targetDb.arInvoice.update({
      where: { id },
      data: {
        status: status as any,
        outstandingAmount: outstandingAmount
          ? new Prisma.Decimal(outstandingAmount.toString())
          : undefined,
        issueDate: status === ArInvoiceStatus.ISSUED ? new Date() : undefined,
      },
    });
    return updated as unknown as IArInvoice;
  }

  async getLines(
    tenantId: string,
    companyId: string,
    invoiceId: string,
  ): Promise<IArInvoiceLine[]> {
    const list = await this.db.arInvoiceLine.findMany({
      where: { invoiceId },
    });
    return list as unknown as IArInvoiceLine[];
  }
}
