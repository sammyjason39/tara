import { Receivable, ReceivableApproval } from "../types/receivablesTypes";
import { apiClient } from "../utils/apiClient";

export const receivablesService = {
  async getReceivables(
    tenantId: string,
    status?: string,
  ): Promise<Receivable[]> {
    try {
      const response = await apiClient.get("/receivables", {
        params: { tenantId, status },
      });
      return response.data;
    } catch (err) {
      console.error("Error fetching receivables:", err);
      throw err;
    }
  },

  async createReceivable(receivable: Receivable): Promise<Receivable> {
    try {
      const response = await apiClient.post("/receivables", receivable);
      return response.data;
    } catch (err) {
      console.error("Error creating receivable:", err);
      throw err;
    }
  },

  async updateReceivable(
    receivableId: string,
    updates: Partial<Receivable>,
  ): Promise<Receivable> {
    try {
      const response = await apiClient.put(
        `/receivables/${receivableId}`,
        updates,
      );
      return response.data;
    } catch (err) {
      console.error("Error updating receivable:", err);
      throw err;
    }
  },

  async approveReceivable(approval: ReceivableApproval): Promise<Receivable> {
    try {
      const response = await apiClient.post(
        `/receivables/${approval.receivableId}/approve`,
        approval,
      );
      return response.data;
    } catch (err) {
      console.error("Error approving receivable:", err);
      throw err;
    }
  },
};
