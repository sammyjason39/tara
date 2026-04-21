import { apiRequest } from "@/core/api/apiClient";
import type { SessionContext } from "@/core/security/session";

export const adminService = {
  async getDashboardMetrics(tenantId: string, session: SessionContext) {
    return apiRequest<any>("/v1/admin/dashboard", "GET", session);
  },
  async getRequests(tenantId: string, session: SessionContext) {
    return apiRequest<any[]>("/v1/admin/requests", "GET", session);
  },
  async createRequest(tenantId: string, session: SessionContext, data: any) {
    return apiRequest<any>("/v1/admin/requests", "POST", session, data);
  },
  async getStuckEvents(session: SessionContext) {
    return apiRequest<any>("/v1/admin/events/stuck", "GET", session);
  },
  async getSyncStatus(session: SessionContext) {
    return apiRequest<any>("/v1/admin/sync/status", "GET", session);
  },
  async getIotDevices(session: SessionContext) {
    return apiRequest<any>("/v1/admin/iot/devices", "GET", session);
  },
  async getAuditIntegrityStatus(session: SessionContext) {
    return apiRequest<any>("/v1/admin/audit/integrity-status", "GET", session);
  },
  async createInvitation(session: SessionContext, data: { email: string; role: string; justification?: string }) {
    return apiRequest<any>("/v1/admin/invitations", "POST", session, data);
  },
};

