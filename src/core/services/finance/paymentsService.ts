import type { PaymentRequest } from "@/core/types/finance/payments";
import { mockFinanceRepo } from "@/core/repositories/finance/mockFinanceRepo";

const repo = mockFinanceRepo;

export const paymentsService = {
  async getPayments(tenantId: string, _status?: string): Promise<PaymentRequest[]> {
    return repo.listPaymentRequests(tenantId);
  },

  async executePayment(payment: any): Promise<PaymentRequest> {
    const now = new Date().toISOString();
    const request: PaymentRequest = {
      id: `pay-${Date.now()}`,
      tenantId: payment.tenantId,
      amount: payment.amount,
      currency: "IDR",
      method: payment.method ?? "BANK_TRANSFER",
      destination: payment.destination,
      purpose: payment.purpose,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };
    return repo.createPaymentRequest(request.tenantId, request);
  },

  async approvePayment(_approval: { paymentId: string }): Promise<PaymentRequest | null> {
    return null;
  },

  async getPaymentHistory(tenantId: string, _filters?: any): Promise<PaymentRequest[]> {
    return repo.listPaymentRequests(tenantId);
  },
};
