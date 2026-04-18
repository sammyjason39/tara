import { Injectable } from '@nestjs/common';
import { FinanceChartOfAccount } from '../domain/finance.interfaces';
import { IChartOfAccountRepository } from './interfaces/coa.repository.interface';
import { AccountType, NormalBalance } from '../domain/finance.constants';

@Injectable()
export class CoaMockRepository implements IChartOfAccountRepository {
  /** Key: `${tenant_id}:${company_id}` */
  private coas: Map<string, FinanceChartOfAccount[]> = new Map();

  async findAll(tenant_id: string, company_id: string): Promise<FinanceChartOfAccount[]> {
    return this.coas.get(`${tenant_id}:${company_id}`) || [];
  }

  async findById(tenant_id: string, company_id: string, id: string): Promise<FinanceChartOfAccount | null> {
    const list = await this.findAll(tenant_id, company_id);
    return list.find((item: any) => item.id === id) || null;
  }

  async findByCode(tenant_id: string, company_id: string, code: string): Promise<FinanceChartOfAccount | null> {
    const list = await this.findAll(tenant_id, company_id);
    return list.find((item: any) => item.accountCode === code) || null;
  }

  async create(tenant_id: string, company_id: string, data: Partial<FinanceChartOfAccount>): Promise<FinanceChartOfAccount> {
    const scopeKey = `${tenant_id}:${company_id}`;
    const list = this.coas.get(scopeKey) || [];
    const newCoa: FinanceChartOfAccount = {
      id: data.id || Math.random().toString(36).substr(2, 9),
      tenant_id,
      company_id,
      accountCode: data.accountCode || '',
      name: data.name || '',
      accountType: data.accountType || AccountType.ASSET,
      normalBalance: data.normalBalance || NormalBalance.DEBIT,
      parentAccountId: data.parentAccountId,
      accountLevel: data.accountLevel || 0,
      accountPath: data.accountPath || '',
      isActive: true,
      metadata: data.metadata || {},
      created_at: new Date(),
      updated_at: new Date(),
    };
    list.push(newCoa);
    this.coas.set(scopeKey, list);
    return newCoa;
  }

  async update(tenant_id: string, company_id: string, id: string, data: Partial<FinanceChartOfAccount>): Promise<FinanceChartOfAccount> {
    const scopeKey = `${tenant_id}:${company_id}`;
    const list = this.coas.get(scopeKey) || [];
    const index = list.findIndex((item: any) => item.id === id);
    if (index === -1) throw new Error('COA not found');

    list[index] = { ...list[index], ...data, updated_at: new Date() };
    this.coas.set(scopeKey, list);
    return list[index];
  }

  async checkInUse(tenant_id: string, company_id: string, id: string): Promise<boolean> {
    return false;
  }

  async delete(tenant_id: string, company_id: string, id: string): Promise<void> {
    const scopeKey = `${tenant_id}:${company_id}`;
    const list = this.coas.get(scopeKey) || [];
    const newList = list.filter((item: any) => item.id !== id);
    this.coas.set(scopeKey, newList);
  }
}
