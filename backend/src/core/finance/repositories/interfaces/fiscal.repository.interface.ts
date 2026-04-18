import { FinanceFiscalYear, FinanceFiscalPeriod, PeriodClosingRecord, ClosingExecutionLock } from '../../domain/finance.interfaces';
import { FiscalPeriodStatus } from '../../domain/finance.constants';

export interface IFiscalPeriodRepository {
  findYear(tenant_id: string, company_id: string, year: number): Promise<FinanceFiscalYear | null>;
  findPeriods(tenant_id: string, company_id: string, yearId: string): Promise<FinanceFiscalPeriod[]>;
  findById(tenant_id: string, company_id: string, id: string): Promise<FinanceFiscalPeriod | null>;
  updateStatus(tenant_id: string, company_id: string, periodId: string, status: FiscalPeriodStatus): Promise<FinanceFiscalPeriod>;
  createYear(tenant_id: string, company_id: string, data: Partial<FinanceFiscalYear>): Promise<FinanceFiscalYear>;
  createPeriod(tenant_id: string, company_id: string, data: Partial<FinanceFiscalPeriod>): Promise<FinanceFiscalPeriod>;
  
  // Period Closing
  saveClosingRecord(tenant_id: string, company_id: string, record: PeriodClosingRecord): Promise<PeriodClosingRecord>;
  getClosingRecord(tenant_id: string, company_id: string, periodId: string): Promise<PeriodClosingRecord | null>;

  // Concurrency & Idempotency
  acquireLock(tenant_id: string, company_id: string, periodId: string): Promise<void>;
  getExecutionLock(tenant_id: string, company_id: string, periodId: string): Promise<ClosingExecutionLock | null>;
  saveExecutionLock(tenant_id: string, company_id: string, lock: ClosingExecutionLock): Promise<void>;
  releaseExecutionLock(tenant_id: string, company_id: string, periodId: string): Promise<void>;
}
