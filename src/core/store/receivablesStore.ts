import create from "zustand";
import type { Receivable } from "@/types/receivablesTypes";
import { receivablesService } from "@/services/receivablesService";
import type { SessionContext } from "@/core/security/session";

type ReceivablesState = {
  receivables: Receivable[];
  loading: boolean;
  error: string | null;
  fetchReceivables: (
    tenantId: string,
    session: SessionContext,
    status?: string,
  ) => Promise<void>;
  createReceivable: (
    receivable: Receivable,
    tenantId: string,
    session: SessionContext,
  ) => Promise<void>;
  approveReceivable: (
    receivableId: string,
    tenantId: string,
    session: SessionContext,
  ) => Promise<void>;
};

export const useReceivablesStore = create<ReceivablesState>((set, get) => ({
  receivables: [],
  loading: false,
  error: null,

  fetchReceivables: async (tenantId, session, status) => {
    set({ loading: true, error: null });
    try {
      const data = await receivablesService.getReceivables(tenantId, status);
      set({ receivables: data });
    } catch (err: any) {
      set({ error: err.message || "Failed to fetch receivables" });
    } finally {
      set({ loading: false });
    }
  },

  createReceivable: async (receivable, tenantId, session) => {
    set({ loading: true });
    try {
      const newRec = await receivablesService.createReceivable(receivable);
      set({ receivables: [...get().receivables, newRec] });
    } catch (err: any) {
      set({ error: err.message || "Failed to create receivable" });
    } finally {
      set({ loading: false });
    }
  },

  approveReceivable: async (receivableId, tenantId, session) => {
    set({ loading: true });
    try {
      const updated = await receivablesService.approveReceivable({
        receivableId,
      });
      set({
        receivables: get().receivables.map((r) =>
          r.id === receivableId ? updated : r,
        ),
      });
    } catch (err: any) {
      set({ error: err.message || "Failed to approve receivable" });
    } finally {
      set({ loading: false });
    }
  },
}));
