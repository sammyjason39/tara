import { Injectable } from '@nestjs/common';
import { IArPaymentRepository } from './interfaces/ar-payment.repository.interface';
import { IArPayment, IArPaymentAllocation } from '../domain/ar.interfaces';
import { v4 as uuid } from 'uuid';
import { Prisma } from '@prisma/client';

@Injectable()
export class ArPaymentMockRepository implements IArPaymentRepository {
  private payments: IArPayment[] = [];
  private allocation: IArPaymentAllocation[] = [];

  async findById(tenant_id: string, company_id: string, id: string): Promise<IArPayment | null> {
    return this.payments.find(p => p.tenant_id === tenant_id && p.company_id === company_id && p.id === id) || null;
  }

  async findByIdempotencyKey(tenant_id: string, company_id: string, key: string): Promise<IArPayment | null> {
    return this.payments.find(p => p.tenant_id === tenant_id && p.company_id === company_id && p.idempotency_key === key) || null;
  }

  async create(tenant_id: string, company_id: string, data: any): Promise<IArPayment> {
    const payment: IArPayment = {
      id: uuid(),
      tenant_id,
      company_id,
      customer_id: data.customer_id,
      paymentDate: new Date(),
      amount: new Prisma.Decimal(data.amount || 0),
      payment_method: data.payment_method,
      reference: data.reference,
      paymentReference: data.paymentReference || `PAY-${Date.now()}`,
      idempotency_key: data.idempotency_key,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.payments.push(payment);
    return payment;
  }

  async createAllocation(tenant_id: string, company_id: string, data: any): Promise<IArPaymentAllocation> {
    const allocation: IArPaymentAllocation = {
      id: uuid(),
      paymentId: data.paymentId,
      invoiceId: data.invoiceId,
      amountAllocated: new Prisma.Decimal(data.amountAllocated || data.amount || 0),
      idempotency_key: data.idempotency_key,
      created_at: new Date(),
    };
    this.allocation.push(allocation);
    return allocation;
  }

  async findAllocationByIdempotencyKey(tenant_id: string, company_id: string, key: string): Promise<IArPaymentAllocation | null> {
    return this.allocation.find((a: any) => a.idempotency_key === key) || null;
  }

  async findAllocationsByInvoice(tenant_id: string, company_id: string, invoiceId: string): Promise<IArPaymentAllocation[]> {
    return this.allocation.filter((a: any) => a.invoiceId === invoiceId);
  }

  async findAllocationsByPayment(tenant_id: string, company_id: string, paymentId: string): Promise<IArPaymentAllocation[]> {
    return this.allocation.filter((a: any) => a.paymentId === paymentId);
  }

  async findOrphanedEntries(tenant_id: string, company_id: string): Promise<any[]> {
    return this.payments.filter(p => {
      const allocations = this.allocation.filter(a => a.paymentId === p.id);
      return allocations.length === 0;
    });
  }
}
