import create from "zustand";
import type { PayrollEntry } from "@/types/payrollTypes";
import { payrollService } from "@/services/payrollService";
import type { SessionContext } from "@/core/security/session";

type PayrollState = {
  entries: PayrollEntry[];
  loading: boolean;
  error: string | null;
  fetchPayroll: (
    tenantId: string,
    session: SessionContext,
    period?: string,
  ) => Promise<void>;
  createPayrollEntry: (
    entry: PayrollEntry,
    tenantId: string,
    session: SessionContext,
  ) => Promise<void>;
  updatePayrollEntry: (
    entryId: string,
    updates: Partial<PayrollEntry>,
    tenantId: string,
    session: SessionContext,
  ) => Promise<void>;
  runPayroll: (
    tenantId: string,
    session: SessionContext,
    period: string,
  ) => Promise<void>;
};

export const usePayrollStore = create<PayrollState>((set, get) => ({
  entries: [],
  loading: false,
  error: null,

  fetchPayroll: async (tenantId, session, period) => {
    set({ loading: true, error: null });
    try {
      const data = await payrollService.getPayrollEntries(tenantId, period);
      set({ entries: data });
    } catch (err: any) {
      set({ error: err.message || "Failed to fetch payroll" });
    } finally {
      set({ loading: false });
    }
  },

  createPayrollEntry: async (entry, tenantId, session) => {
    set({ loading: true });
    try {
      const newEntry = await payrollService.createPayrollEntry(entry);
      set({ entries: [...get().entries, newEntry] });
    } catch (err: any) {
      set({ error: err.message || "Failed to create payroll entry" });
    } finally {
      set({ loading: false });
    }
  },

  updatePayrollEntry: async (entryId, updates, tenantId, session) => {
    set({ loading: true });
    try {
      const updated = await payrollService.updatePayrollEntry(entryId, updates);
      set({
        entries: get().entries.map((e) => (e.id === entryId ? updated : e)),
      });
    } catch (err: any) {
      set({ error: err.message || "Failed to update payroll entry" });
    } finally {
      set({ loading: false });
    }
  },

  runPayroll: async (tenantId, session, period) => {
    set({ loading: true });
    try {
      await payrollService.runPayroll(tenantId, period);
      await get().fetchPayroll(tenantId, session, period);
    } catch (err: any) {
      set({ error: err.message || "Failed to run payroll" });
    } finally {
      set({ loading: false });
    }
  },
}));
