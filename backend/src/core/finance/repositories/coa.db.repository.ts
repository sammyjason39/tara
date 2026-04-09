import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../persistence/prisma.service';
import { IChartOfAccountRepository } from './interfaces/coa.repository.interface';
import { CoaAccount } from '../domain/finance.interfaces';

@Injectable()
export class CoaDbRepository implements IChartOfAccountRepository {
  constructor(private readonly prisma: PrismaService | Prisma.TransactionClient) {}

  private get db(): Prisma.TransactionClient {
    return this.prisma as Prisma.TransactionClient;
  }

  async findById(tenantId: string, companyId: string, id: string): Promise<CoaAccount | null> {
    const res = await this.db.chartOfAccount.findUnique({
      where: { id }
    });
    if (!res) return null;
    return this.mapToDomain(res);
  }

  async findByCode(tenantId: string, companyId: string, code: string): Promise<CoaAccount | null> {
    const res = await this.db.chartOfAccount.findUnique({
      where: { 
        tenantId_code: { tenantId, code }
      }
    });
    if (!res) return null;
    return this.mapToDomain(res);
  }

  async findAll(tenantId: string, companyId: string): Promise<CoaAccount[]> {
    const list = await this.db.chartOfAccount.findMany({
      where: { tenantId }
    });
    return list.map(item => this.mapToDomain(item));
  }

  async create(tenantId: string, companyId: string, data: Partial<CoaAccount>): Promise<CoaAccount> {
    const created = await this.db.chartOfAccount.create({
      data: {
        tenantId,
        code: data.accountCode!,
        name: data.name!,
        type: data.accountType!,
        status: data.isActive === false ? 'INACTIVE' : 'ACTIVE',
      } as any
    });
    return this.mapToDomain(created);
  }

  async save(tenantId: string, companyId: string, data: Partial<CoaAccount>): Promise<CoaAccount> {
    return this.create(tenantId, companyId, data);
  }

  async update(tenantId: string, companyId: string, id: string, data: Partial<CoaAccount>): Promise<CoaAccount> {
    const updated = await this.db.chartOfAccount.update({
      where: { id },
      data: {
        name: data.name,
        code: data.accountCode,
        type: data.accountType,
        status: data.isActive === false ? 'INACTIVE' : (data.isActive === true ? 'ACTIVE' : undefined),
      }
    });
    return this.mapToDomain(updated);
  }

  async checkInUse(tenantId: string, companyId: string, id: string): Promise<boolean> {
    const journalLines = await this.db.journalLine.findFirst({
      where: { accountId: id }
    });
    return !!journalLines;
  }

  async delete(tenantId: string, companyId: string, id: string): Promise<void> {
    await this.db.chartOfAccount.delete({
      where: { id }
    });
  }

  private mapToDomain(item: any): CoaAccount {
    return {
      id: item.id,
      tenantId: item.tenantId,
      accountCode: item.code,
      name: item.name,
      accountType: item.type,
      normalBalance: item.type === 'ASSET' || item.type === 'EXPENSE' ? 'DEBIT' : 'CREDIT',
      isActive: item.status === 'ACTIVE',
      accountLevel: 1,
      accountPath: item.code,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    } as unknown as CoaAccount;
  }
}
