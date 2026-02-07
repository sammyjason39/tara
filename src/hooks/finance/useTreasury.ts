import { useState, useEffect } from "react";
import { treasuryService } from "@/core/services/finance/treasuryService"; // our updated treasuryService
import type { TreasuryTransfer } from "@/core/types/finance/treasury";
import type { SessionContext } from "@/core/security/session";
import { MoneySource } from "@/core/types/finance/accounts";

export function useTreasury(tenantId: string, session: SessionContext) {
  const [sources, setSources] = useState<MoneySource[]>([]);
  const [transfers, setTransfers] = useState<TreasuryTransfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSources = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await treasuryService.listSources(tenantId, session);
      setSources(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch treasury sources");
    } finally {
      setLoading(false);
    }
  };

  const fetchTransfers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await treasuryService.listTransfers(tenantId, session);
      setTransfers(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch treasury transfers");
    } finally {
      setLoading(false);
    }
  };

  const createTransfer = async (payload: {
    fromSourceId: string;
    toSourceId: string;
    amount: number;
  }) => {
    setLoading(true);
    try {
      const transfer = await treasuryService.createTransfer(
        tenantId,
        session,
        payload,
      );
      setTransfers((prev) => [...prev, transfer]);
    } catch (err: any) {
      setError(err.message || "Failed to create transfer");
    } finally {
      setLoading(false);
    }
  };

  const reconcileSettlement = async (sourceId: string, amount: number) => {
    setLoading(true);
    try {
      await treasuryService.reconcileSettlement(
        tenantId,
        session,
        sourceId,
        amount,
      );
      // Refresh sources after reconciliation
      await fetchSources();
    } catch (err: any) {
      setError(err.message || "Failed to reconcile settlement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
    fetchTransfers();
  }, [tenantId]);

  return {
    sources,
    transfers,
    loading,
    error,
    fetchSources,
    fetchTransfers,
    createTransfer,
    reconcileSettlement,
  };
}
