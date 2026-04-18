import { Prisma } from '@prisma/client';

export interface IVendor {
  id: string;
  tenant_id: string;
  company_id: string;
  name: string;
  email: string;
  phone?: string;
  creditLimit: Prisma.Decimal;
  currentBalance: Prisma.Decimal;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface IVendorRepository {
  findById(tenant_id: string, id: string): Promise<IVendor | null>;
  findByEmail(tenant_id: string, email: string): Promise<IVendor | null>;
  findAll(tenant_id: string): Promise<IVendor[]>;
  create(tenant_id: string, data: any): Promise<IVendor>;
  update(tenant_id: string, id: string, data: any): Promise<IVendor>;
}
