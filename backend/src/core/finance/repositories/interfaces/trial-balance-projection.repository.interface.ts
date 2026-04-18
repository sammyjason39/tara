import { TrialBalanceProjection } from '../../domain/finance.interfaces';
import { Prisma } from '@prisma/client';

export interface ITrialBalanceProjectionRepository {
  update(
    tenant_id: string, 
    company_id: string,
    accountId: string, 
    fiscalPeriodId: string, 
    accountCategory: string,
    debit: Prisma.Decimal, 
    credit: Prisma.Decimal
  ): Promise<void>;
  reset(tenant_id: string, company_id: string): Promise<void>;
  getBalance(tenant_id: string, company_id: string, accountId: string, fiscalPeriodId: string): Promise<TrialBalanceProjection | null>;
  findAll(tenant_id: string, company_id: string, fiscalPeriodId?: string, options?: any): Promise<TrialBalanceProjection[]>;
}
