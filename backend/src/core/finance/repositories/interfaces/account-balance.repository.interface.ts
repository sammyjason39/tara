import { AccountBalance, AccountBalanceSnapshot } from '../../domain/finance.interfaces';
import { Prisma } from '@prisma/client';

export interface IAccountBalanceRepository {
  findBalance(params: {
    tenant_id: string;
    company_id: string;
    fiscalPeriodId: string;
    accountId: string;
    currency: string; // Multi-Currency Scoping
    branch_id: string;
    location_id: string;
    departmentId?: string;
    costCenterId?: string;
    projectId?: string;
  }): Promise<AccountBalance | null>;

  updateBalance(tenant_id: string, company_id: string, data: Partial<AccountBalance>): Promise<void>;
  
  /**
   * Atomically increment/decrement account balances to prevent race conditions (HOT-001).
   */
  incrementBalance(tenant_id: string, company_id: string, params: {
    fiscalPeriodId: string;
    accountId: string;
    currency: string; // Multi-Currency Scoping
    branch_id: string;
    location_id: string;
    departmentId?: string;
    costCenterId?: string;
    projectId?: string;
  }, delta: { debit?: Prisma.Decimal; credit?: Prisma.Decimal; net?: Prisma.Decimal }): Promise<void>;

  createSnapshot(tenant_id: string, company_id: string, data: Partial<AccountBalanceSnapshot>): Promise<AccountBalanceSnapshot>;
  
  reset(tenant_id: string, company_id: string): Promise<void>;
}
