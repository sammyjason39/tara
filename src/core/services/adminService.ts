import { apiRequest } from "@/core/api/apiClient";
import type { SessionContext } from "@/core/security/session";

export const adminService = {
  async getDashboardMetrics(tenantId: string, session: SessionContext) {
    return apiRequest<any>("/admin/dashboard", "GET", session);
  },
  async getRequests(tenantId: string, session: SessionContext) {
    return apiRequest<any[]>("/admin/requests", "GET", session);
  },
  async createRequest(tenantId: string, session: SessionContext, data: any) {
    return apiRequest<any>("/admin/requests", "POST", session, data);
  },
};
