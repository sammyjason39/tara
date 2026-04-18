import { FinanceChartOfAccount } from '../../domain/finance.interfaces';

export interface IChartOfAccountRepository {
  findAll(tenant_id: string, company_id: string): Promise<FinanceChartOfAccount[]>;
  findById(tenant_id: string, company_id: string, id: string): Promise<FinanceChartOfAccount | null>;
  findByCode(tenant_id: string, company_id: string, code: string): Promise<FinanceChartOfAccount | null>;
  create(tenant_id: string, company_id: string, data: Partial<FinanceChartOfAccount>): Promise<FinanceChartOfAccount>;
  update(tenant_id: string, company_id: string, id: string, data: Partial<FinanceChartOfAccount>): Promise<FinanceChartOfAccount>;
  checkInUse(tenant_id: string, company_id: string, id: string): Promise<boolean>;
  delete(tenant_id: string, company_id: string, id: string): Promise<void>;
}
