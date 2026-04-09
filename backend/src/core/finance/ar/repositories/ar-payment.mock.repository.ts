import { Injectable } from '@nestjs/common';
import { IArPaymentRepository } from './interfaces/ar-payment.repository.interface';
import { IArPayment, IArPaymentAllocation } from '../domain/ar.interfaces';
import { v4 as uuid } from 'uuid';
import { Prisma } from '@prisma/client';

@Injectable()
export class ArPaymentMockRepository implements IArPaymentRepository {
  private payments: IArPayment[] = [];
  private allocations: IArPaymentAllocation[] = [];

  async findById(tenantId: string, companyId: string, id: string): Promise<IArPayment | null> {
    return this.payments.find(p => p.tenantId === tenantId && p.companyId === companyId && p.id === id) || null;
  }

  async findByIdempotencyKey(tenantId: string, companyId: string, key: string): Promise<IArPayment | null> {
    return this.payments.find(p => p.tenantId === tenantId && p.companyId === companyId && p.idempotencyKey === key) || null;
  }

  async create(tenantId: string, companyId: string, data: any): Promise<IArPayment> {
    const payment: IArPayment = {
      id: uuid(),
      tenantId,
      companyId,
      customerId: data.customerId,
      paymentDate: new Date(),
      amount: new Prisma.Decimal(data.amount || 0),
      paymentMethod: data.paymentMethod,
      reference: data.reference,
      paymentReference: data.paymentReference || `PAY-${Date.now()}`,
      idempotencyKey: data.idempotencyKey,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.payments.push(payment);
    return payment;
  }

  async createAllocation(tenantId: string, companyId: string, data: any): Promise<IArPaymentAllocation> {
    const allocation: IArPaymentAllocation = {
      id: uuid(),
      paymentId: data.paymentId,
      invoiceId: data.invoiceId,
      amountAllocated: new Prisma.Decimal(data.amountAllocated || data.amount || 0),
      idempotencyKey: data.idempotencyKey,
      createdAt: new Date(),
    };
    this.allocations.push(allocation);
    return allocation;
  }

  async findAllocationByIdempotencyKey(tenantId: string, companyId: string, key: string): Promise<IArPaymentAllocation | null> {
    return this.allocations.find(a => a.idempotencyKey === key) || null;
  }

  async findAllocationsByInvoice(tenantId: string, companyId: string, invoiceId: string): Promise<IArPaymentAllocation[]> {
    return this.allocations.filter(a => a.invoiceId === invoiceId);
  }

  async findAllocationsByPayment(tenantId: string, companyId: string, paymentId: string): Promise<IArPaymentAllocation[]> {
    return this.allocations.filter(a => a.paymentId === paymentId);
  }
}
