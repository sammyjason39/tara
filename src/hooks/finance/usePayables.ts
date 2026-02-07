import { useState, useEffect } from "react";
import { payablesService } from "@/core/services/finance/payablesService";
import type { PayableBill } from "@/core/types/finance/payables";
import type { SessionContext } from "@/core/security/session";

export function usePayables(tenantId: string, session: SessionContext) {
  const [payables, setPayables] = useState<PayableBill[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPayables = async (status?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await payablesService.getPayables(tenantId, status);
      setPayables(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch payables");
    } finally {
      setLoading(false);
    }
  };

  const createPayable = async (payable: PayableBill) => {
    setLoading(true);
    try {
      const newPayable = await payablesService.createPayable(payable);
      if (newPayable) setPayables((prev) => [...prev, newPayable]);
    } catch (err: any) {
      setError(err.message || "Failed to create payable");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayables();
  }, [tenantId]);

  return { payables, loading, error, fetchPayables, createPayable };
}
