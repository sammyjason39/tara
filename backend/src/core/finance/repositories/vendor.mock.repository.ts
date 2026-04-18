import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IVendorRepository, IVendor } from './interfaces/vendor.repository.interface';
import { v4 as uuid } from 'uuid';

@Injectable()
export class VendorMockRepository implements IVendorRepository {
  private vendors: IVendor[] = [];

  async findById(tenant_id: string, id: string): Promise<IVendor | null> {
    return this.vendors.find(v => v.id === id && v.tenant_id === tenant_id) || null;
  }

  async findByEmail(tenant_id: string, email: string): Promise<IVendor | null> {
    return this.vendors.find(v => v.email === email && v.tenant_id === tenant_id) || null;
  }

  async findAll(tenant_id: string): Promise<IVendor[]> {
    return this.vendors.filter(v => v.tenant_id === tenant_id);
  }

  async create(tenant_id: string, data: any): Promise<IVendor> {
    const newVendor: IVendor = {
      id: uuid(),
      tenant_id,
      company_id: tenant_id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      creditLimit: new Prisma.Decimal(data.creditLimit || 0),
      currentBalance: new Prisma.Decimal(0),
      status: data.status || 'ACTIVE',
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.vendors.push(newVendor);
    return newVendor;
  }

  async update(tenant_id: string, id: string, data: any): Promise<IVendor> {
    const index = this.vendors.findIndex(v => v.id === id && v.tenant_id === tenant_id);
    if (index === -1) throw new Error('Vendor not found');
    
    this.vendors[index] = {
      ...this.vendors[index],
      ...data,
      updated_at: new Date(),
    };
    return this.vendors[index];
  }
}
