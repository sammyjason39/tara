import { useState, useEffect } from "react";
import { ledgerService } from "@/core/services/finance/ledgerService";
import type { JournalEntry } from "@/core/types/finance/ledger";
import type { LedgerBalance } from "@/core/types/finance/ledger";
import type { SessionContext } from "@/core/security/session";

export function useLedger(tenantId: string, session: SessionContext) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [balances, setBalances] = useState<LedgerBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ledgerService.getEntries(tenantId);
      setEntries(data);
      const bal = await ledgerService.getBalances(tenantId);
      setBalances(bal);
    } catch (err: any) {
      setError(err.message || "Failed to fetch ledger data");
    } finally {
      setLoading(false);
    }
  };

  const createEntry = async (entry: JournalEntry) => {
    setLoading(true);
    try {
      const newEntry = await ledgerService.createEntry(entry);
      if (newEntry) setEntries((prev) => [...prev, newEntry]);
    } catch (err: any) {
      setError(err.message || "Failed to create ledger entry");
    } finally {
      setLoading(false);
    }
  };

  const deleteEntry = async (entryId: string) => {
    setLoading(true);
    try {
      await ledgerService.deleteEntry(entryId);
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
    } catch (err: any) {
      setError(err.message || "Failed to delete ledger entry");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [tenantId]);

  return { entries, balances, loading, error, fetchEntries, createEntry, deleteEntry };
}
