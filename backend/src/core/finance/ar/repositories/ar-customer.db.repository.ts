import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../persistence/prisma.service';
import { IArCustomerRepository } from './interfaces/ar-customer.repository.interface';
import { IArCustomer } from '../domain/ar.interfaces';

@Injectable()
export class ArCustomerDbRepository implements IArCustomerRepository {
  constructor(private readonly prisma: PrismaService | Prisma.TransactionClient) {}

  private get db(): Prisma.TransactionClient {
    return this.prisma as Prisma.TransactionClient;
  }

  async findById(tenantId: string, companyId: string, id: string): Promise<IArCustomer | null> {
    const res = await this.db.arCustomer.findUnique({
      where: { id }
    });
    if (!res) return null;
    return this.mapToDomain(res);
  }

  async findByEmail(tenantId: string, companyId: string, email: string): Promise<IArCustomer | null> {
    const res = await this.db.arCustomer.findFirst({
      where: { tenantId, email }
    });
    if (!res) return null;
    return this.mapToDomain(res);
  }

  async findAll(tenantId: string, companyId: string): Promise<IArCustomer[]> {
    const list = await this.db.arCustomer.findMany({
      where: { tenantId }
    });
    return list.map(this.mapToDomain);
  }

  async create(tenantId: string, companyId: string, data: any): Promise<IArCustomer> {
    const created = await this.db.arCustomer.create({
      data: {
        id: 'ny0yovwn',
        updatedAt: new Date(),
        tenantId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        creditLimit: new Prisma.Decimal(data.creditLimit || 0),
        status: data.status || 'ACTIVE',
      }
    });
    return this.mapToDomain(created);
  }

  async update(tenantId: string, companyId: string, id: string, data: any): Promise<IArCustomer> {
    const updated = await this.db.arCustomer.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        status: data.status,
        creditLimit: data.creditLimit ? new Prisma.Decimal(data.creditLimit) : undefined,
      }
    });
    return this.mapToDomain(updated);
  }

  private mapToDomain(item: any): IArCustomer {
    return {
      id: item.id,
      tenantId: item.tenantId,
      companyId: item.tenantId,
      name: item.name,
      email: item.email,
      phone: item.phone,
      creditLimit: item.creditLimit,
      currentBalance: new Prisma.Decimal(0), // Placeholder
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    } as unknown as IArCustomer;
  }
}
