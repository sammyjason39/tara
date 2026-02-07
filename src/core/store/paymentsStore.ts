import create from "zustand";
import type { Payment, PaymentApproval } from "@/types/paymentsTypes";
import { paymentsService } from "@/services/paymentsService";
import type { SessionContext } from "@/core/security/session";

type PaymentsState = {
  payments: Payment[];
  loading: boolean;
  error: string | null;
  fetchPayments: (
    tenantId: string,
    session: SessionContext,
    status?: string,
  ) => Promise<void>;
  executePayment: (
    payment: Payment,
    tenantId: string,
    session: SessionContext,
  ) => Promise<void>;
  approvePayment: (
    approval: PaymentApproval,
    tenantId: string,
    session: SessionContext,
  ) => Promise<void>;
  fetchPaymentHistory: (
    tenantId: string,
    session: SessionContext,
    filters?: any,
  ) => Promise<void>;
};

export const usePaymentsStore = create<PaymentsState>((set, get) => ({
  payments: [],
  loading: false,
  error: null,

  fetchPayments: async (tenantId, session, status) => {
    set({ loading: true, error: null });
    try {
      const data = await paymentsService.getPayments(tenantId, status);
      set({ payments: data });
    } catch (err: any) {
      set({ error: err.message || "Failed to fetch payments" });
    } finally {
      set({ loading: false });
    }
  },

  executePayment: async (payment, tenantId, session) => {
    set({ loading: true });
    try {
      const executed = await paymentsService.executePayment(payment);
      set({ payments: [...get().payments, executed] });
    } catch (err: any) {
      set({ error: err.message || "Failed to execute payment" });
    } finally {
      set({ loading: false });
    }
  },

  approvePayment: async (approval, tenantId, session) => {
    set({ loading: true });
    try {
      const approved = await paymentsService.approvePayment(approval);
      set({
        payments: get().payments.map((p) =>
          p.id === approval.paymentId ? approved : p,
        ),
      });
    } catch (err: any) {
      set({ error: err.message || "Failed to approve payment" });
    } finally {
      set({ loading: false });
    }
  },

  fetchPaymentHistory: async (tenantId, session, filters) => {
    set({ loading: true });
    try {
      const data = await paymentsService.getPaymentHistory(tenantId, filters);
      set({ payments: data });
    } catch (err: any) {
      set({ error: err.message || "Failed to fetch payment history" });
    } finally {
      set({ loading: false });
    }
  },
}));
