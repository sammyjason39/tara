import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../../persistence/prisma.service';
import { IArCustomerRepository } from './interfaces/ar-customer.repository.interface';
import { IArCustomer } from '../domain/ar.interfaces';

@Injectable()
export class ArCustomerDbRepository implements IArCustomerRepository {
  constructor(private readonly prisma: PrismaService | Prisma.TransactionClient) {}

  private get db(): Prisma.TransactionClient {
    return this.prisma as Prisma.TransactionClient;
  }

  async findById(tenant_id: string, company_id: string, id: string): Promise<IArCustomer | null> {
    const res = await this.db.finance_ar_customers.findUnique({
      where: { id }
    });
    if (!res) return null;
    return this.mapToDomain(res);
  }

  async findByEmail(tenant_id: string, company_id: string, email: string): Promise<IArCustomer | null> {
    const res = await this.db.finance_ar_customers.findFirst({
      where: { tenant_id: tenant_id, email }
    });
    if (!res) return null;
    return this.mapToDomain(res);
  }

  async findAll(tenant_id: string, company_id: string): Promise<IArCustomer[]> {
    const list = await this.db.finance_ar_customers.findMany({
      where: { tenant_id: tenant_id }
    });
    return list.map((item: any) => this.mapToDomain(item));
  }

  async create(tenant_id: string, company_id: string, data: any): Promise<IArCustomer> {
    const created = await this.db.finance_ar_customers.create({
      data: {
        id: data.id || randomUUID(),
        tenant_id: tenant_id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        credit_limit: new Prisma.Decimal(data.creditLimit || 0),
        status: data.status || 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date(),
      }
    });
    return this.mapToDomain(created);
  }

  async update(tenant_id: string, company_id: string, id: string, data: any): Promise<IArCustomer> {
    const updated = await this.db.finance_ar_customers.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        status: data.status,
        credit_limit: data.creditLimit ? new Prisma.Decimal(data.creditLimit) : undefined,
        updated_at: new Date(),
      }
    });
    return this.mapToDomain(updated);
  }

  private mapToDomain(item: any): IArCustomer {
    return {
      id: item.id,
      tenant_id: item.tenant_id,
      company_id: item.tenant_id,
      name: item.name,
      email: item.email,
      phone: item.phone,
      creditLimit: item.credit_limit,
      currentBalance: new Prisma.Decimal(0), // Placeholder
      status: item.status,
      created_at: item.created_at,
      updated_at: item.updated_at,
    } as unknown as IArCustomer;
  }
}
