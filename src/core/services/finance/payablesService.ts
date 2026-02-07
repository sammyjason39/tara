import { Payable, PayableApproval } from "../types/payablesTypes";
import { apiClient } from "../utils/apiClient";

export const payablesService = {
  async getPayables(tenantId: string, status?: string): Promise<Payable[]> {
    try {
      const response = await apiClient.get("/payables", {
        params: { tenantId, status },
      });
      return response.data;
    } catch (err) {
      console.error("Error fetching payables:", err);
      throw err;
    }
  },

  async createPayable(payable: Payable): Promise<Payable> {
    try {
      const response = await apiClient.post("/payables", payable);
      return response.data;
    } catch (err) {
      console.error("Error creating payable:", err);
      throw err;
    }
  },

  async updatePayable(
    payableId: string,
    updates: Partial<Payable>,
  ): Promise<Payable> {
    try {
      const response = await apiClient.put(`/payables/${payableId}`, updates);
      return response.data;
    } catch (err) {
      console.error("Error updating payable:", err);
      throw err;
    }
  },

  async approvePayable(approval: PayableApproval): Promise<Payable> {
    try {
      const response = await apiClient.post(
        `/payables/${approval.payableId}/approve`,
        approval,
      );
      return response.data;
    } catch (err) {
      console.error("Error approving payable:", err);
      throw err;
    }
  },
};
