import { JournalReversal } from '../../domain/finance.interfaces';

export interface IJournalReversalRepository {
  createReversalRecord(tenant_id: string, company_id: string, data: Partial<JournalReversal>): Promise<JournalReversal>;
  findByOriginalJournalId(tenant_id: string, company_id: string, originalJournalId: string): Promise<JournalReversal | null>;
}
