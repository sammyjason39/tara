import create from "zustand";
import type { LedgerEntry, LedgerBalance } from "@/types/ledgerTypes";
import { ledgerService } from "@/services/ledgerService";
import type { SessionContext } from "@/core/security/session";

type LedgerState = {
  entries: LedgerEntry[];
  balances: LedgerBalance[];
  loading: boolean;
  error: string | null;
  fetchEntries: (tenantId: string, session: SessionContext) => Promise<void>;
  createEntry: (
    entry: LedgerEntry,
    tenantId: string,
    session: SessionContext,
  ) => Promise<void>;
  updateEntry: (
    entryId: string,
    updates: Partial<LedgerEntry>,
    tenantId: string,
    session: SessionContext,
  ) => Promise<void>;
  deleteEntry: (
    entryId: string,
    tenantId: string,
    session: SessionContext,
  ) => Promise<void>;
};

export const useLedgerStore = create<LedgerState>((set, get) => ({
  entries: [],
  balances: [],
  loading: false,
  error: null,

  fetchEntries: async (tenantId, session) => {
    set({ loading: true, error: null });
    try {
      const entries = await ledgerService.getEntries(tenantId);
      const balances = await ledgerService.getBalances(tenantId);
      set({ entries, balances });
    } catch (err: any) {
      set({ error: err.message || "Failed to fetch ledger" });
    } finally {
      set({ loading: false });
    }
  },

  createEntry: async (entry, tenantId, session) => {
    set({ loading: true });
    try {
      const newEntry = await ledgerService.createEntry(entry);
      set({ entries: [...get().entries, newEntry] });
    } catch (err: any) {
      set({ error: err.message || "Failed to create ledger entry" });
    } finally {
      set({ loading: false });
    }
  },

  updateEntry: async (entryId, updates, tenantId, session) => {
    set({ loading: true });
    try {
      const updated = await ledgerService.updateEntry(entryId, updates);
      set({
        entries: get().entries.map((e) => (e.id === entryId ? updated : e)),
      });
    } catch (err: any) {
      set({ error: err.message || "Failed to update ledger entry" });
    } finally {
      set({ loading: false });
    }
  },

  deleteEntry: async (entryId, tenantId, session) => {
    set({ loading: true });
    try {
      await ledgerService.deleteEntry(entryId);
      set({ entries: get().entries.filter((e) => e.id !== entryId) });
    } catch (err: any) {
      set({ error: err.message || "Failed to delete ledger entry" });
    } finally {
      set({ loading: false });
    }
  },
}));
