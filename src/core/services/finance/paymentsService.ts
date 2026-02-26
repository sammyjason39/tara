// src/core/services/finance/paymentsService.ts
import type {
  PaymentRequest,
  PaymentMethod,
} from "@/core/types/finance/payments";
import { apiRequest } from "@/core/api/apiClient";
import type { SessionContext } from "@/core/security/session";

export type PaymentExecutionPayload = {
  tenantId: string;
  amount: number;
  method?: PaymentMethod;
  destination: string;
  purpose: string;
};

export type PaymentHistoryFilters = {
  status?: string;
  startDate?: string;
  endDate?: string;
};

export const paymentsService = {
  async getPayments(
    tenantId: string,
    session?: SessionContext,
    status?: string,
  ): Promise<PaymentRequest[]> {
    const query = status ? `?status=${status}` : "";
    return apiRequest<PaymentRequest[]>(
      `/finance/payments${query}`,
      "GET",
      session,
      undefined,
      tenantId,
    );
  },

  async executePayment(
    payload: PaymentExecutionPayload,
    session?: SessionContext,
  ): Promise<PaymentRequest> {
    return apiRequest<PaymentRequest>(
      "/finance/payments",
      "POST",
      session,
      payload,
      payload.tenantId,
    );
  },

  async approvePayment(
    paymentId: string,
    tenantId: string,
    session?: SessionContext,
  ): Promise<PaymentRequest | null> {
    return apiRequest<PaymentRequest>(
      `/finance/payments/${paymentId}/approve`,
      "POST",
      session,
      undefined,
      tenantId,
    );
  },

  async getPaymentHistory(
    tenantId: string,
    session?: SessionContext,
    filters?: PaymentHistoryFilters,
  ): Promise<PaymentRequest[]> {
    let query = "";
    if (filters) {
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      query = `?${params.toString()}`;
    }
    return apiRequest<PaymentRequest[]>(
      `/finance/payments/history${query}`,
      "GET",
      session,
      undefined,
      tenantId,
    );
  },
};
