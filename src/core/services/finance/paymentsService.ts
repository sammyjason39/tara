import { Payment, PaymentApproval } from "../types/paymentsTypes";
import { apiClient } from "../utils/apiClient";

export const paymentsService = {
  async getPayments(tenantId: string, status?: string): Promise<Payment[]> {
    try {
      const response = await apiClient.get("/payments", {
        params: { tenantId, status },
      });
      return response.data;
    } catch (err) {
      console.error("Error fetching payments:", err);
      throw err;
    }
  },

  async executePayment(payment: Payment): Promise<Payment> {
    try {
      const response = await apiClient.post("/payments/execute", payment);
      return response.data;
    } catch (err) {
      console.error("Error executing payment:", err);
      throw err;
    }
  },

  async approvePayment(approval: PaymentApproval): Promise<Payment> {
    try {
      const response = await apiClient.post(
        `/payments/${approval.paymentId}/approve`,
        approval,
      );
      return response.data;
    } catch (err) {
      console.error("Error approving payment:", err);
      throw err;
    }
  },

  async getPaymentHistory(tenantId: string, filters?: any): Promise<Payment[]> {
    try {
      const response = await apiClient.get("/payments/history", {
        params: { tenantId, ...filters },
      });
      return response.data;
    } catch (err) {
      console.error("Error fetching payment history:", err);
      throw err;
    }
  },
};
