import { useState, useEffect } from "react";

import type { SessionContext } from "@/core/security/session";
import { Receivable } from "@/core/types/finance/receivables";
import { receivablesService } from "@/core/services/finance/receivablesService";

export function useReceivables(tenantId: string, session: SessionContext) {
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReceivables = async (status?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await receivablesService.getReceivables(tenantId, status);
      setReceivables(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch receivables");
    } finally {
      setLoading(false);
    }
  };

  const createReceivable = async (receivable: Receivable) => {
    setLoading(true);
    try {
      const newReceivable =
        await receivablesService.createReceivable(receivable);
      setReceivables((prev) => [...prev, newReceivable]);
    } catch (err: any) {
      setError(err.message || "Failed to create receivable");
    } finally {
      setLoading(false);
    }
  };

  const approveReceivable = async (receivableId: string) => {
    setLoading(true);
    try {
      const updated = await receivablesService.approveReceivable({
        receivableId,
      });
      setReceivables((prev) =>
        prev.map((r) => (r.id === receivableId ? updated : r)),
      );
    } catch (err: any) {
      setError(err.message || "Failed to approve receivable");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceivables();
  }, [tenantId]);

  return {
    receivables,
    loading,
    error,
    fetchReceivables,
    createReceivable,
    approveReceivable,
  };
}
