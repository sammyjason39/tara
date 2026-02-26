import type {
  LedgerEntry,
  LedgerBalance,
  JournalEntry,
} from "@/core/types/finance/ledger";
import { apiRequest } from "@/core/api/apiClient";
import type { SessionContext } from "@/core/security/session";

export const ledgerService = {
  async getEntries(
    tenantId: string,
    session?: SessionContext,
  ): Promise<JournalEntry[]> {
    return apiRequest<JournalEntry[]>(
      "/finance/ledger/entries",
      "GET",
      session,
      undefined,
      tenantId,
    );
  },

  async createEntry(
    entry: JournalEntry,
    session?: SessionContext,
  ): Promise<JournalEntry> {
    return apiRequest<JournalEntry>(
      "/finance/ledger/entries",
      "POST",
      session,
      entry,
      entry.tenantId,
    );
  },

  async updateEntry(
    entryId: string,
    updates: Partial<JournalEntry>,
    session?: SessionContext,
  ): Promise<JournalEntry | null> {
    const tenantId = updates.tenantId || "";
    return apiRequest<JournalEntry>(
      `/finance/ledger/entries/${entryId}`,
      "PATCH",
      session,
      updates,
      tenantId,
    );
  },

  async deleteEntry(
    entryId: string,
    tenantId: string,
    session?: SessionContext,
  ): Promise<void> {
    return apiRequest<void>(
      `/finance/ledger/entries/${entryId}`,
      "DELETE",
      session,
      undefined,
      tenantId,
    );
  },

  async getBalances(
    tenantId: string,
    session?: SessionContext,
  ): Promise<LedgerBalance[]> {
    return apiRequest<LedgerBalance[]>(
      "/finance/ledger/balances",
      "GET",
      session,
      undefined,
      tenantId,
    );
  },
};
