import { useState, useEffect } from "react";
import { paymentsService } from "@/core/services/finance/paymentsService";
import type { PaymentRequest } from "@/core/types/finance/payments";
import type { SessionContext } from "@/core/security/session";

export function usePayments(tenantId: string, session: SessionContext) {
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = async (status?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await paymentsService.getPayments(tenantId, status);
      setPayments(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch payments");
    } finally {
      setLoading(false);
    }
  };

  const executePayment = async (payment: any) => {
    setLoading(true);
    try {
      const executed = await paymentsService.executePayment(payment);
      if (executed) setPayments((prev) => [...prev, executed]);
    } catch (err: any) {
      setError(err.message || "Failed to execute payment");
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentHistory = async (filters?: any) => {
    setLoading(true);
    try {
      const data = await paymentsService.getPaymentHistory(tenantId, filters);
      setPayments(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch payment history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [tenantId]);

  return { payments, loading, error, fetchPayments, executePayment, fetchPaymentHistory };
}
