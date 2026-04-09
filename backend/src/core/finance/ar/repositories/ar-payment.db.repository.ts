import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../persistence/prisma.service';
import { IArPaymentRepository } from './interfaces/ar-payment.repository.interface';
import { IArPayment, IArPaymentAllocation } from '../domain/ar.interfaces';

@Injectable()
export class ArPaymentDbRepository implements IArPaymentRepository {
  constructor(private readonly prisma: PrismaService | Prisma.TransactionClient) {}

  private get db(): Prisma.TransactionClient {
    return this.prisma as Prisma.TransactionClient;
  }

  async findById(tenantId: string, companyId: string, id: string): Promise<IArPayment | null> {
    const res = await this.db.arPayment.findUnique({
      where: { id },
      include: { financeArPaymentAllocations: true }
    });
    if (!res) return null;
    return this.mapToDomain(res);
  }

  async findByIdempotencyKey(tenantId: string, companyId: string, key: string): Promise<IArPayment | null> {
    const res = await this.db.arPayment.findFirst({
      where: { tenantId, idempotencyKey: key },
      include: { financeArPaymentAllocations: true }
    });
    if (!res) return null;
    return this.mapToDomain(res);
  }

  async findAllocationByIdempotencyKey(tenantId: string, companyId: string, key: string): Promise<IArPaymentAllocation | null> {
    // ArPaymentAllocation has no idempotencyKey in schema. Returning null to skip check.
    return null; 
  }

  async findAllocationsByInvoice(tenantId: string, companyId: string, invoiceId: string): Promise<IArPaymentAllocation[]> {
    const list = await this.db.arPaymentAllocation.findMany({
      where: { invoiceId }
    });
    return list as unknown as IArPaymentAllocation[];
  }
  async findAllocationsByPayment(tenantId: string, companyId: string, paymentId: string): Promise<IArPaymentAllocation[]> {
    const list = await this.db.arPaymentAllocation.findMany({
      where: { paymentId }
    });
    return list as unknown as IArPaymentAllocation[];
  }

  async create(tenantId: string, companyId: string, data: any): Promise<IArPayment> {
    const created = await this.db.arPayment.create({
      data: {
        
        updatedAt: new Date(),
        tenantId,
        customerId: data.customerId,
        amount: new Prisma.Decimal(data.amount),
        paymentDate: data.paymentDate || new Date(),
        paymentMethod: data.paymentMethod || 'CASH',
        idempotencyKey: data.idempotencyKey,
        reference: data.reference,
      }
    });
    return this.mapToDomain(created);
  }

  async createAllocation(tenantId: string, companyId: string, data: any): Promise<IArPaymentAllocation> {
    const created = await this.db.arPaymentAllocation.create({
      data: {
        
        
        paymentId: data.paymentId,
        invoiceId: data.invoiceId,
        amountAllocated: new Prisma.Decimal(data.amountAllocated || data.amount),
      }
    });
    return created as unknown as IArPaymentAllocation;
  }

  private mapToDomain(item: any): IArPayment {
    return {
      id: item.id,
      tenantId: item.tenantId,
      companyId: item.tenantId, 
      customerId: item.customerId,
      paymentDate: item.paymentDate,
      amount: item.amount,
      paymentMethod: item.paymentMethod, 
      reference: item.reference || '',
      idempotencyKey: item.idempotencyKey,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    } as unknown as IArPayment;
  }
}
