// src/core/services/finance/paymentsService.ts
import type {
  PaymentRequest,
  PaymentMethod,
} from "@/core/types/finance/payments";
import { mockFinanceRepo } from "@/core/repositories/finance/mockFinanceRepo";

const repo = mockFinanceRepo;

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
    status?: string,
  ): Promise<PaymentRequest[]> {
    const all = repo.listPaymentRequests(tenantId);
    if (!status) return all;
    return all.filter((p) => p.status === status);
  },

  async executePayment(
    payload: PaymentExecutionPayload,
  ): Promise<PaymentRequest> {
    const now = new Date().toISOString();
    const request: PaymentRequest = {
      id: `pay-${Date.now()}`,
      tenantId: payload.tenantId,
      amount: payload.amount,
      currency: "IDR",
      method: payload.method ?? "BANK_TRANSFER",
      destination: payload.destination,
      purpose: payload.purpose,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };

    return repo.createPaymentRequest(payload.tenantId, request);
  },

  async approvePayment(_approval: {
    paymentId: string;
  }): Promise<PaymentRequest | null> {
    // TODO: implement approval logic
    return null;
  },

  async getPaymentHistory(
    tenantId: string,
    filters?: PaymentHistoryFilters,
  ): Promise<PaymentRequest[]> {
    let all = repo.listPaymentRequests(tenantId);
    if (!filters) return all;

    if (filters.status) {
      all = all.filter((p) => p.status === filters.status);
    }
    if (filters.startDate) {
      all = all.filter(
        (p) => new Date(p.createdAt) >= new Date(filters.startDate!),
      );
    }
    if (filters.endDate) {
      all = all.filter(
        (p) => new Date(p.createdAt) <= new Date(filters.endDate!),
      );
    }
    return all;
  },
};
