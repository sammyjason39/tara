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

  async findById(tenant_id: string, company_id: string, id: string): Promise<CoaAccount | null> {
    const res = await this.db.finance_chart_of_accounts.findUnique({
      where: { id }
    });
    if (!res) return null;
    return this.mapToDomain(res);
  }

  async findByCode(tenant_id: string, company_id: string, code: string): Promise<CoaAccount | null> {
    const res = await this.db.finance_chart_of_accounts.findUnique({
      where: { 
        tenant_id_code: { tenant_id: tenant_id, code }
      }
    });
    if (!res) return null;
    return this.mapToDomain(res);
  }

  async findAll(tenant_id: string, company_id: string): Promise<CoaAccount[]> {
    const list = await this.db.finance_chart_of_accounts.findMany({
      where: { tenant_id: tenant_id }
    });
    return list.map((item: any) => this.mapToDomain(item));
  }

  async create(tenant_id: string, company_id: string, data: Partial<CoaAccount>): Promise<CoaAccount> {
    const created = await this.db.finance_chart_of_accounts.create({
      data: {
        tenant_id,
        code: data.accountCode!,
        name: data.name!,
        type: data.accountType!,
        status: data.isActive === false ? 'INACTIVE' : 'ACTIVE',
      } as any
    });
    return this.mapToDomain(created);
  }

  async save(tenant_id: string, company_id: string, data: Partial<CoaAccount>): Promise<CoaAccount> {
    return this.create(tenant_id, company_id, data);
  }

  async update(tenant_id: string, company_id: string, id: string, data: Partial<CoaAccount>): Promise<CoaAccount> {
    const updated = await this.db.finance_chart_of_accounts.update({
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

  async checkInUse(tenant_id: string, company_id: string, id: string): Promise<boolean> {
    const journalLines = await this.db.finance_journal_lines.findFirst({
      where: { account_id: id }
    });
    return !!journalLines;
  }

  async delete(tenant_id: string, company_id: string, id: string): Promise<void> {
    await this.db.finance_chart_of_accounts.delete({
      where: { id }
    });
  }

  private mapToDomain(item: any): CoaAccount {
    return {
      id: item.id,
      tenant_id: item.tenant_id,
      accountCode: item.code,
      name: item.name,
      accountType: item.type,
      normalBalance: item.type === 'ASSET' || item.type === 'EXPENSE' ? 'DEBIT' : 'CREDIT',
      isActive: item.status === 'ACTIVE',
      accountLevel: 1,
      accountPath: item.code,
      created_at: item.created_at,
      updated_at: item.updated_at,
    } as unknown as CoaAccount;
  }
}
