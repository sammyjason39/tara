import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ITrialBalanceProjectionRepository } from './interfaces/trial-balance-projection.repository.interface';
import { TrialBalanceProjection } from '../domain/finance.interfaces';
import { AccountType } from '../domain/finance.constants';

@Injectable()
export class TrialBalanceProjectionMockRepository implements ITrialBalanceProjectionRepository {
  private projections: Map<string, TrialBalanceProjection> = new Map();

  async update(
    tenant_id: string, 
    company_id: string,
    accountId: string, 
    fiscalPeriodId: string, 
    accountCategory: string,
    debit: Prisma.Decimal, 
    credit: Prisma.Decimal
  ): Promise<void> {
    const key = `${tenant_id}:${company_id}:${fiscalPeriodId}:${accountId}`;
    const existing = this.projections.get(key);

    if (existing) {
      existing.debitTotal = existing.debitTotal.plus(debit);
      existing.creditTotal = existing.creditTotal.plus(credit);
      existing.lastUpdatedAt = new Date();
    } else {
      this.projections.set(key, {
        id: Math.random().toString(36).substr(2, 9),
        tenant_id,
        company_id,
        fiscalPeriodId,
        accountId,
        account_name: 'MOCK',
        accountCategory,
        debitTotal: debit,
        creditTotal: credit,
        snapshotSequence: 0,
        lastUpdatedAt: new Date(),
      });
    }
  }

  async getBalance(tenant_id: string, company_id: string, accountId: string, fiscalPeriodId: string): Promise<TrialBalanceProjection | null> {
    const key = `${tenant_id}:${company_id}:${fiscalPeriodId}:${accountId}`;
    return this.projections.get(key) || null;
  }

  async findAll(tenant_id: string, company_id: string): Promise<TrialBalanceProjection[]> {
    return Array.from(this.projections.values()).filter(p => p.tenant_id === tenant_id && p.company_id === company_id);
  }

  async reset(tenant_id: string, company_id: string): Promise<void> {
    for (const [key, value] of this.projections.entries()) {
      if (value.tenant_id === tenant_id && value.company_id === company_id) {
        this.projections.delete(key);
      }
    }
  }
}
