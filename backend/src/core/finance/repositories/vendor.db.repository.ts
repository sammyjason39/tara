import { Injectable, Inject } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../persistence/prisma.service';
import { IVendorRepository, IVendor } from './interfaces/vendor.repository.interface';

@Injectable()
export class VendorDbRepository implements IVendorRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService | Prisma.TransactionClient
  ) {}

  private get db(): Prisma.TransactionClient {
    if (this.prisma instanceof PrismaService) {
      return (this.prisma as any);
    }
    return this.prisma as Prisma.TransactionClient;
  }

  async findById(tenant_id: string, id: string): Promise<IVendor | null> {
    const res = await this.db.supplier_masters.findFirst({
      where: { id, tenant_id: tenant_id }
    });
    if (!res) return null;
    return this.mapToDomain(res);
  }

  async findByEmail(tenant_id: string, email: string): Promise<IVendor | null> {
    const res = await this.db.supplier_masters.findFirst({
      // Schema uses contact_email
      where: { tenant_id: tenant_id, contact_email: email }
    });
    if (!res) return null;
    return this.mapToDomain(res);
  }

  async findAll(tenant_id: string): Promise<IVendor[]> {
    const list = await this.db.supplier_masters.findMany({
      where: { tenant_id: tenant_id }
    });
    return list.map((item: any) => this.mapToDomain(item));
  }

  async create(tenant_id: string, data: any): Promise<IVendor> {
    const created = await this.db.supplier_masters.create({
      data: {
        tenant_id: tenant_id,
        name: data.name,
        contact_email: data.email,
        contact_phone: data.phone,
        compliance_status: 'PENDING',
        global_rating: 0,
        risk_tier: 'LOW',
      }
    });
    return this.mapToDomain(created);
  }

  async update(tenant_id: string, id: string, data: any): Promise<IVendor> {
    const updated = await this.db.supplier_masters.update({
      where: { id, tenant_id: tenant_id },
      data: {
        name: data.name,
        contact_email: data.email,
        contact_phone: data.phone,
        compliance_status: data.status,
      }
    });
    return this.mapToDomain(updated);
  }

  private mapToDomain(item: any): IVendor {
    return {
      id: item.id,
      tenant_id: item.tenant_id,
      company_id: item.tenant_id,
      name: item.name,
      email: item.contact_email || '',
      phone: item.contact_phone || undefined,
      credit_limit: new Prisma.Decimal(0),
      creditLimit: new Prisma.Decimal(0),
      currentBalance: new Prisma.Decimal(0),
      status: item.compliance_status,
      created_at: item.created_at,
      updated_at: item.updated_at,
    } as unknown as IVendor;
  }
}
