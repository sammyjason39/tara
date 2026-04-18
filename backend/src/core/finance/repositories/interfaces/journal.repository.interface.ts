import { JournalEntry, JournalLine } from '../../domain/finance.interfaces';
import { JournalStatus } from '../../domain/finance.constants';
import { LedgerPostingContext } from '../../domain/ledger-posting-context';
import { Prisma } from '@prisma/client';

export interface IJournalRepository {
  /** Write a new journal entry. Requires a valid LedgerPostingContext token. */
  createEntry(ctx: LedgerPostingContext, data: Partial<JournalEntry>): Promise<JournalEntry>;
  /** Write journal lines for an entry. Requires a valid LedgerPostingContext token. */
  createLines(ctx: LedgerPostingContext, entryId: string, lines: Partial<JournalLine>[]): Promise<void>;
  /** Update journal status. Only allowed for internal state transitions (e.g., DRAFT → POSTED). */
  updateStatus(tenant_id: string, company_id: string, entryId: string, status: JournalStatus): Promise<JournalEntry>;
  findById(tenant_id: string, company_id: string, id: string): Promise<JournalEntry | null>;
  findLines(entryId: string): Promise<JournalLine[]>;
  getLastEntryHash(tenant_id: string, company_id: string): Promise<string | null>;
  findAllOrderedByDate(tenant_id: string, company_id: string): Promise<JournalEntry[]>;
  /** Fetch a journal by its deterministic ledgerSequence (used for O(1) hash link validation). */
  findBySequence(tenant_id: string, company_id: string, sequence: number): Promise<JournalEntry | null>;
  /** Fetch a range of journals by ledgerSequence for Merkle checkpoint building. */
  findBySequenceRange(tenant_id: string, company_id: string, fromSeq: number, toSeq: number): Promise<JournalEntry[]>;
  /** Aggregates raw balances (debit - credit) per account directly from GL lines. */
  getRawBalances(tenant_id: string, company_id: string, periodId: string, start_date: Date, end_date: Date): Promise<Record<string, Prisma.Decimal>>;
  /** Counts the number of DRAFT journals in a specific fiscal period. */
  countDraftsInPeriod(tenant_id: string, company_id: string, periodId: string): Promise<number>;
  /** Voids all DRAFT journals in a specific fiscal period. */
  voidDraftsInPeriod(tenant_id: string, company_id: string, periodId: string): Promise<void>;
}
