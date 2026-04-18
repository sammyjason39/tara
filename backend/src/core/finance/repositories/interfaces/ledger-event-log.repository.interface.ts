import { LedgerEventLog } from '../../domain/finance.interfaces';

export interface ILedgerEventLogRepository {
  create(tenant_id: string, company_id: string, data: any): Promise<LedgerEventLog>;
  findBySourceEventId(tenant_id: string, company_id: string, sourceEventId: string): Promise<LedgerEventLog | null>;
  updateStatus(tenant_id: string, company_id: string, id: string, status: 'PENDING' | 'POSTED' | 'FAILED'): Promise<void>;
  findUnprocessed(tenant_id: string, company_id: string, batchSize: number): Promise<LedgerEventLog[]>;
  markProcessed(tenant_id: string, company_id: string, id: string): Promise<void>;
  findProcessedBefore(tenant_id: string, company_id: string, date: Date): Promise<LedgerEventLog[]>;
  deleteMany(tenant_id: string, company_id: string, ids: string[]): Promise<void>;
}
