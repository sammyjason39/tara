import { useState, useEffect, useCallback } from "react";
import { financeApiClient } from "@/core/services/finance/financeApiClient";
import type { TreasuryTransfer } from "@/core/types/finance/treasury";
import type { SessionContext } from "@/core/security/session";
import { MoneySource } from "@/core/types/finance/accounts";

const toErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export function useTreasury(tenantId: string, session: SessionContext) {
  const [sources, setSources] = useState<MoneySource[]>([]);
  const [transfers, setTransfers] = useState<TreasuryTransfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSources = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await financeApiClient.listSources(tenantId, session);
      setSources(data);
    } catch (err: unknown) {
      setError(toErrorMessage(err, "Failed to fetch treasury sources"));
    } finally {
      setLoading(false);
    }
  }, [session, tenantId]);

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await financeApiClient.listTransfers(tenantId, session);
      setTransfers(data);
    } catch (err: unknown) {
      setError(toErrorMessage(err, "Failed to fetch treasury transfers"));
    } finally {
      setLoading(false);
    }
  }, [session, tenantId]);

  const createTransfer = useCallback(
    async (payload: {
      fromSourceId: string;
      toSourceId: string;
      amount: number;
      status?: string;
    }) => {
      setLoading(true);
      try {
        const transfer = await financeApiClient.createTransfer(
          tenantId,
          session,
          payload,
        );
        setTransfers((prev) => [...prev, transfer]);
      } catch (err: unknown) {
        setError(toErrorMessage(err, "Failed to create transfer"));
      } finally {
        setLoading(false);
      }
    },
    [session, tenantId],
  );

  const reconcileSettlement = useCallback(
    async (sourceId: string, amount: number) => {
      setLoading(true);
      try {
        await financeApiClient.reconcileSettlement(
          tenantId,
          session,
          sourceId,
          amount,
        );
        // Refresh sources after reconciliation
        await fetchSources();
      } catch (err: unknown) {
        setError(toErrorMessage(err, "Failed to reconcile settlement"));
      } finally {
        setLoading(false);
      }
    },
    [fetchSources, session, tenantId],
  );

  useEffect(() => {
    fetchSources();
    fetchTransfers();
  }, [fetchSources, fetchTransfers]);

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
