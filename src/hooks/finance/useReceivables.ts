import { useState, useEffect } from "react";
import { receivablesService } from "@/core/services/finance/receivablesService";
import type { ReceivableInvoice } from "@/core/types/finance/receivables";
import type { SessionContext } from "@/core/security/session";

export function useReceivables(tenantId: string, session: SessionContext) {
  const [receivables, setReceivables] = useState<ReceivableInvoice[]>([]);
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

  const createReceivable = async (receivable: ReceivableInvoice) => {
    setLoading(true);
    try {
      const newReceivable = await receivablesService.createReceivable(receivable);
      if (newReceivable) setReceivables((prev) => [...prev, newReceivable]);
    } catch (err: any) {
      setError(err.message || "Failed to create receivable");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceivables();
  }, [tenantId]);

  return { receivables, loading, error, fetchReceivables, createReceivable };
}
