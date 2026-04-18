import { AccountBalanceSnapshot, SnapshotApplicationLog, JournalEntry } from '../../domain/finance.interfaces';

export interface IAccountBalanceSnapshotRepository {
  findByAccount(tenant_id: string, company_id: string, accountId: string, currency: string, periodId: string): Promise<AccountBalanceSnapshot | null>;
  upsert(tenant_id: string, company_id: string, snapshot: AccountBalanceSnapshot): Promise<void>;
  findPeriodsAfter(tenant_id: string, company_id: string, periodNumber: number, fiscalYearId: string): Promise<string[]>; // Returns period IDs in order
  deleteForPeriod(tenant_id: string, company_id: string, periodId: string): Promise<void>;
  findAllInPeriod(tenant_id: string, company_id: string, periodId: string): Promise<AccountBalanceSnapshot[]>;

  // Consistency & Concurrency
  isLogged(ledgerEntryId: string, accountId: string, periodId: string): Promise<boolean>;
  addLog(log: SnapshotApplicationLog): Promise<void>;
  acquireRowLock(tenant_id: string, company_id: string, accountId: string, currency: string, periodId: string): Promise<void>;

  // Sequence Buffer (Resilience)
  saveToBuffer(tenant_id: string, company_id: string, entry: JournalEntry): Promise<void>;
  getFromBuffer(tenant_id: string, company_id: string, periodId: string, sequence: number): Promise<JournalEntry | null>;
  clearFromBuffer(tenant_id: string, company_id: string, entryId: string): Promise<void>;

  // Sequence Tracking
  getLastAppliedSequence(tenant_id: string, company_id: string, periodId: string): Promise<number>;
  updateLastAppliedSequence(tenant_id: string, company_id: string, periodId: string, sequence: number): Promise<void>;

  // Closing Alignment
  getClosingSnapshotSequence(tenant_id: string, company_id: string, periodId: string): Promise<number | null>;
}
