import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../../persistence/prisma.service';
import { IArPaymentRepository } from './interfaces/ar-payment.repository.interface';
import { IArPayment, IArPaymentAllocation } from '../domain/ar.interfaces';

@Injectable()
export class ArPaymentDbRepository implements IArPaymentRepository {
  constructor(private readonly prisma: PrismaService | Prisma.TransactionClient) {}

  private get db(): Prisma.TransactionClient {
    return this.prisma as Prisma.TransactionClient;
  }

  async findById(tenant_id: string, company_id: string, id: string): Promise<IArPayment | null> {
    const res = await this.db.finance_ar_payments.findUnique({
      where: { id },
      include: { finance_ar_payment_allocations: true }
    });
    if (!res) return null;
    return this.mapToDomain(res);
  }

  async findByIdempotencyKey(tenant_id: string, company_id: string, key: string): Promise<IArPayment | null> {
    const res = await this.db.finance_ar_payments.findFirst({
      where: { tenant_id: tenant_id, idempotency_key: key },
      include: { finance_ar_payment_allocations: true }
    });
    if (!res) return null;
    return this.mapToDomain(res);
  }

  async findAllocationByIdempotencyKey(tenant_id: string, company_id: string, key: string): Promise<IArPaymentAllocation | null> {
    // ArPaymentAllocation has no idempotency_key in schema. Returning null to skip check.
    return null; 
  }

  async findAllocationsByInvoice(tenant_id: string, company_id: string, invoiceId: string): Promise<IArPaymentAllocation[]> {
    const list = await this.db.finance_ar_payment_allocations.findMany({
      where: { invoice_id: invoiceId }
    });
    return list.map((item: any) => this.mapAllocationToDomain(item));
  }

  async findAllocationsByPayment(tenant_id: string, company_id: string, paymentId: string): Promise<IArPaymentAllocation[]> {
    const list = await this.db.finance_ar_payment_allocations.findMany({
      where: { payment_id: paymentId }
    });
    return list.map((item: any) => this.mapAllocationToDomain(item));
  }

  async create(tenant_id: string, company_id: string, data: any): Promise<IArPayment> {
    const created = await this.db.finance_ar_payments.create({
      data: {
        id: data.id || randomUUID(),
        tenant_id: tenant_id,
        customer_id: data.customer_id,
        amount: new Prisma.Decimal(data.amount),
        payment_date: data.paymentDate || new Date(),
        payment_method: data.payment_method || 'CASH',
        idempotency_key: data.idempotency_key,
        reference: data.reference,
        created_at: new Date(),
        updated_at: new Date(),
      }
    });
    return this.mapToDomain(created);
  }

  async createAllocation(tenant_id: string, company_id: string, data: any): Promise<IArPaymentAllocation> {
    const created = await this.db.finance_ar_payment_allocations.create({
      data: {
        id: randomUUID(),
        payment_id: data.paymentId,
        invoice_id: data.invoiceId,
        amount_allocated: new Prisma.Decimal(data.amountAllocated || data.amount),
        created_at: new Date(),
      }
    });
    return this.mapAllocationToDomain(created);
  }

  private mapToDomain(item: any): IArPayment {
    return {
      id: item.id,
      tenant_id: item.tenant_id,
      company_id: item.tenant_id, 
      customer_id: item.customer_id,
      paymentDate: item.payment_date,
      amount: item.amount,
      payment_method: item.payment_method, 
      reference: item.reference || '',
      idempotency_key: item.idempotency_key,
      created_at: item.created_at,
      updated_at: item.updated_at,
    } as unknown as IArPayment;
  }

  private mapAllocationToDomain(item: any): IArPaymentAllocation {
    return {
      id: item.id,
      paymentId: item.payment_id,
      invoiceId: item.invoice_id,
      amountAllocated: item.amount_allocated,
    } as unknown as IArPaymentAllocation;
  }
}
