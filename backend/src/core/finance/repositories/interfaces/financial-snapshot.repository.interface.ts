import { FinancialSnapshot } from '../../domain/finance.interfaces';

export interface IFinancialSnapshotRepository {
  create(tenant_id: string, company_id: string, data: Partial<FinancialSnapshot>): Promise<FinancialSnapshot>;
  findLatest(tenant_id: string, company_id: string): Promise<FinancialSnapshot | null>;
}
