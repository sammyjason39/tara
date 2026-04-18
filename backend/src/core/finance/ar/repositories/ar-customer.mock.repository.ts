import { Injectable } from '@nestjs/common';
import { IArCustomerRepository } from './interfaces/ar-customer.repository.interface';
import { IArCustomer } from '../domain/ar.interfaces';
import { ArCustomerStatus } from '../domain/ar.constants';
import { v4 as uuid } from 'uuid';
import { Prisma } from '@prisma/client';

@Injectable()
export class ArCustomerMockRepository implements IArCustomerRepository {
  private customers: IArCustomer[] = [];

  async findById(tenant_id: string, company_id: string, id: string): Promise<IArCustomer | null> {
    return this.customers.find((c: any) => c.tenant_id === tenant_id && c.company_id === company_id && c.id === id) || null;
  }

  async findAll(tenant_id: string, company_id: string): Promise<IArCustomer[]> {
    return this.customers.filter((c: any) => c.tenant_id === tenant_id && c.company_id === company_id);
  }

  async create(tenant_id: string, company_id: string, data: any): Promise<IArCustomer> {
    const customer: IArCustomer = {
      id: uuid(),
      tenant_id,
      company_id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      creditLimit: new Prisma.Decimal(data.creditLimit || 0),
      currentBalance: new Prisma.Decimal(0),
      status: 'ACTIVE',
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.customers.push(customer);
    return customer;
  }

  async update(tenant_id: string, company_id: string, id: string, data: any): Promise<IArCustomer> {
    const customer = await this.findById(tenant_id, company_id, id);
    if (!customer) throw new Error('Customer not found');
    
    Object.assign(customer, data);
    customer.updated_at = new Date();
    return customer;
  }
}
