import { useState, useEffect } from "react";

import type { SessionContext } from "@/core/security/session";
import { PayrollEntry } from "@/core/types/finance/payrollTypes";
import { payrollService } from "@/core/services/finance/payrollService";

export function usePayroll(tenantId: string, session: SessionContext) {
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPayroll = async (period?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await payrollService.getPayrollEntries(tenantId, period);
      setEntries(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch payroll entries");
    } finally {
      setLoading(false);
    }
  };

  const createPayrollEntry = async (entry: PayrollEntry) => {
    setLoading(true);
    try {
      const newEntry = await payrollService.createPayrollEntry(entry);
      setEntries((prev) => [...prev, newEntry]);
    } catch (err: any) {
      setError(err.message || "Failed to create payroll entry");
    } finally {
      setLoading(false);
    }
  };

  const updatePayrollEntry = async (
    entryId: string,
    updates: Partial<PayrollEntry>,
  ) => {
    setLoading(true);
    try {
      const updated = await payrollService.updatePayrollEntry(entryId, updates);
      setEntries((prev) => prev.map((e) => (e.id === entryId ? updated : e)));
    } catch (err: any) {
      setError(err.message || "Failed to update payroll entry");
    } finally {
      setLoading(false);
    }
  };

  const runPayroll = async (period: string) => {
    setLoading(true);
    try {
      await payrollService.runPayroll(tenantId, period);
      await fetchPayroll(period);
    } catch (err: any) {
      setError(err.message || "Failed to run payroll");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, [tenantId]);

  return {
    entries,
    loading,
    error,
    fetchPayroll,
    createPayrollEntry,
    updatePayrollEntry,
    runPayroll,
  };
}
