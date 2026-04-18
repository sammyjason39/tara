import { FinancialReportSnapshot } from '../../domain/finance.interfaces';

export interface IFinancialReportSnapshotRepository {
  create(data: Partial<FinancialReportSnapshot>): Promise<FinancialReportSnapshot>;
  findLatest(tenant_id: string, company_id: string, reportType: string, fiscalPeriodId: string, parametersHash: string): Promise<FinancialReportSnapshot | null>;
  deleteOldSnapshots(tenant_id: string, company_id: string, olderThan: Date): Promise<void>;
}
