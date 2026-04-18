import { LedgerProjectionCheckpoint } from '../../domain/finance.interfaces';

export interface ILedgerProjectionCheckpointRepository {
  upsert(tenant_id: string, company_id: string, projectionName: string, lastSequence: number): Promise<void>;
  getCheckpoint(tenant_id: string, company_id: string, projectionName: string): Promise<number>;
  reset(tenant_id: string, company_id: string): Promise<void>;
}
