import { ApprovalRequest } from "../types/workflowTypes";
import { apiClient } from "../utils/apiClient";

export const workflowService = {
  async getPendingApprovals(
    userId: string,
    tenantId: string,
  ): Promise<ApprovalRequest[]> {
    try {
      const response = await apiClient.get("/workflow/pending", {
        params: { userId, tenantId },
      });
      return response.data;
    } catch (err) {
      console.error("Error fetching pending approvals:", err);
      throw err;
    }
  },

  async approveRequest(
    requestId: string,
    userId: string,
  ): Promise<ApprovalRequest> {
    try {
      const response = await apiClient.post(`/workflow/${requestId}/approve`, {
        userId,
      });
      return response.data;
    } catch (err) {
      console.error("Error approving request:", err);
      throw err;
    }
  },

  async rejectRequest(
    requestId: string,
    userId: string,
    reason: string,
  ): Promise<ApprovalRequest> {
    try {
      const response = await apiClient.post(`/workflow/${requestId}/reject`, {
        userId,
        reason,
      });
      return response.data;
    } catch (err) {
      console.error("Error rejecting request:", err);
      throw err;
    }
  },

  async delegateRequest(
    requestId: string,
    fromUserId: string,
    toUserId: string,
  ): Promise<ApprovalRequest> {
    try {
      const response = await apiClient.post(`/workflow/${requestId}/delegate`, {
        fromUserId,
        toUserId,
      });
      return response.data;
    } catch (err) {
      console.error("Error delegating request:", err);
      throw err;
    }
  },
};
