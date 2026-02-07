import create from "zustand";
import type { Payable } from "@/types/payablesTypes";
import { payablesService } from "@/services/payablesService";
import type { SessionContext } from "@/core/security/session";

type PayablesState = {
  payables: Payable[];
  loading: boolean;
  error: string | null;
  fetchPayables: (
    tenantId: string,
    session: SessionContext,
    status?: string,
  ) => Promise<void>;
  createPayable: (
    payable: Payable,
    tenantId: string,
    session: SessionContext,
  ) => Promise<void>;
  approvePayable: (
    payableId: string,
    tenantId: string,
    session: SessionContext,
  ) => Promise<void>;
};

export const usePayablesStore = create<PayablesState>((set, get) => ({
  payables: [],
  loading: false,
  error: null,

  fetchPayables: async (tenantId, session, status) => {
    set({ loading: true, error: null });
    try {
      const data = await payablesService.getPayables(tenantId, status);
      set({ payables: data });
    } catch (err: any) {
      set({ error: err.message || "Failed to fetch payables" });
    } finally {
      set({ loading: false });
    }
  },

  createPayable: async (payable, tenantId, session) => {
    set({ loading: true });
    try {
      const newPayable = await payablesService.createPayable(payable);
      set({ payables: [...get().payables, newPayable] });
    } catch (err: any) {
      set({ error: err.message || "Failed to create payable" });
    } finally {
      set({ loading: false });
    }
  },

  approvePayable: async (payableId, tenantId, session) => {
    set({ loading: true });
    try {
      const approved = await payablesService.approvePayable({ payableId });
      set({
        payables: get().payables.map((p) =>
          p.id === payableId ? approved : p,
        ),
      });
    } catch (err: any) {
      set({ error: err.message || "Failed to approve payable" });
    } finally {
      set({ loading: false });
    }
  },
}));
