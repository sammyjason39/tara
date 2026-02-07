import create from "zustand";
import type {
  MoneySource,
  TreasuryTransfer,
} from "@/core/types/finance/treasury";
import { treasuryService } from "@/core/services/finance/treasuryService";
import type { SessionContext } from "@/core/security/session";

type TreasuryState = {
  sources: MoneySource[];
  transfers: TreasuryTransfer[];
  loading: boolean;
  error: string | null;
  fetchSources: (tenantId: string, session: SessionContext) => Promise<void>;
  fetchTransfers: (tenantId: string, session: SessionContext) => Promise<void>;
  createTransfer: (
    payload: { fromSourceId: string; toSourceId: string; amount: number },
    tenantId: string,
    session: SessionContext,
  ) => Promise<void>;
  reconcileSettlement: (
    sourceId: string,
    amount: number,
    tenantId: string,
    session: SessionContext,
  ) => Promise<void>;
};

export const useTreasuryStore = create<TreasuryState>((set, get) => ({
  sources: [],
  transfers: [],
  loading: false,
  error: null,

  fetchSources: async (tenantId, session) => {
    set({ loading: true, error: null });
    try {
      const data = await treasuryService.listSources(tenantId, session);
      set({ sources: data });
    } catch (err: any) {
      set({ error: err.message || "Failed to fetch treasury sources" });
    } finally {
      set({ loading: false });
    }
  },

  fetchTransfers: async (tenantId, session) => {
    set({ loading: true, error: null });
    try {
      const data = await treasuryService.listTransfers(tenantId, session);
      set({ transfers: data });
    } catch (err: any) {
      set({ error: err.message || "Failed to fetch treasury transfers" });
    } finally {
      set({ loading: false });
    }
  },

  createTransfer: async (payload, tenantId, session) => {
    set({ loading: true });
    try {
      const transfer = await treasuryService.createTransfer(
        tenantId,
        session,
        payload,
      );
      set({ transfers: [...get().transfers, transfer] });
    } catch (err: any) {
      set({ error: err.message || "Failed to create transfer" });
    } finally {
      set({ loading: false });
    }
  },

  reconcileSettlement: async (sourceId, amount, tenantId, session) => {
    set({ loading: true });
    try {
      await treasuryService.reconcileSettlement(
        tenantId,
        session,
        sourceId,
        amount,
      );
      await get().fetchSources(tenantId, session); // refresh sources after reconciliation
    } catch (err: any) {
      set({ error: err.message || "Failed to reconcile settlement" });
    } finally {
      set({ loading: false });
    }
  },
}));
