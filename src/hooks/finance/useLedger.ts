import { useState, useEffect } from "react";
import { ledgerService } from "@/services/ledgerService";
import type { LedgerEntry, LedgerBalance } from "@/types/ledgerTypes";
import type { SessionContext } from "@/core/security/session";

export function useLedger(tenantId: string, session: SessionContext) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
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

  const createEntry = async (entry: LedgerEntry) => {
    setLoading(true);
    try {
      const newEntry = await ledgerService.createEntry(entry);
      setEntries((prev) => [...prev, newEntry]);
    } catch (err: any) {
      setError(err.message || "Failed to create ledger entry");
    } finally {
      setLoading(false);
    }
  };

  const updateEntry = async (
    entryId: string,
    updates: Partial<LedgerEntry>,
  ) => {
    setLoading(true);
    try {
      const updated = await ledgerService.updateEntry(entryId, updates);
      setEntries((prev) => prev.map((e) => (e.id === entryId ? updated : e)));
    } catch (err: any) {
      setError(err.message || "Failed to update ledger entry");
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

  return {
    entries,
    balances,
    loading,
    error,
    fetchEntries,
    createEntry,
    updateEntry,
    deleteEntry,
  };
}
