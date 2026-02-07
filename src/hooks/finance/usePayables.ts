import { useState, useEffect } from "react";
import { payablesService } from "@/services/payablesService";
import type { Payable } from "@/types/payablesTypes";
import type { SessionContext } from "@/core/security/session";

export function usePayables(tenantId: string, session: SessionContext) {
  const [payables, setPayables] = useState<Payable[]>([]);
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

  const createPayable = async (payable: Payable) => {
    setLoading(true);
    try {
      const newPayable = await payablesService.createPayable(payable);
      setPayables((prev) => [...prev, newPayable]);
    } catch (err: any) {
      setError(err.message || "Failed to create payable");
    } finally {
      setLoading(false);
    }
  };

  const approvePayable = async (payableId: string) => {
    setLoading(true);
    try {
      const updated = await payablesService.approvePayable({ payableId });
      setPayables((prev) =>
        prev.map((p) => (p.id === payableId ? updated : p)),
      );
    } catch (err: any) {
      setError(err.message || "Failed to approve payable");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayables();
  }, [tenantId]);

  return {
    payables,
    loading,
    error,
    fetchPayables,
    createPayable,
    approvePayable,
  };
}
