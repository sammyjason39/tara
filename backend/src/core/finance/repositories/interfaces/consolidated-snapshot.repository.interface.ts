import { ConsolidatedFinancialSnapshot } from '../../domain/finance.interfaces';

export interface IConsolidatedSnapshotRepository {
  getLatest(tenant_id: string, groupId: string, fiscalPeriodId: string): Promise<ConsolidatedFinancialSnapshot | null>;
  create(tenant_id: string, data: Partial<ConsolidatedFinancialSnapshot>): Promise<ConsolidatedFinancialSnapshot>;
  deleteByPeriod(tenant_id: string, groupId: string, fiscalPeriodId: string): Promise<void>;
}
