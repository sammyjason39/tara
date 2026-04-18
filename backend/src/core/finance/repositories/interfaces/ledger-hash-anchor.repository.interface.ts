import { LedgerHashAnchor } from '../../domain/finance.interfaces';

export interface ILedgerHashAnchorRepository {
  create(tenant_id: string, data: { anchorDate: Date, finalJournalHash: string }): Promise<LedgerHashAnchor>;
  findLatest(tenant_id: string): Promise<LedgerHashAnchor | null>;
  findByDate(tenant_id: string, date: Date): Promise<LedgerHashAnchor | null>;
}
