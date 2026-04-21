import { apiRequest } from "@/core/api/apiClient";
import type { SessionContext } from "@/core/security/session";

export interface ProvisioningRequest {
  id: string;
  tenantId: string;
  employeeId?: string;
  supplierId?: string;
  supplierBranchId?: string;
  scope: string;
  reason: string;
  status: string;
  requestedBy: string;
  provisionedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SystemHealth {
  id: string;
  tenantId: string;
  component: string;
  status: string;
  latencyMs: number;
  checkedAt: string;
}

export const itService = {
  async getProvisioningRequests(
    tenantId: string,
    session: SessionContext,
  ): Promise<ProvisioningRequest[]> {
    return apiRequest<ProvisioningRequest[]>(
      "/it/provisioning",
      "GET",
      session,
    );
  },

  async createProvisioningRequest(
    tenantId: string,
    session: SessionContext,
    data: any,
  ): Promise<ProvisioningRequest> {
    return apiRequest<ProvisioningRequest>(
      "/it/provisioning",
      "POST",
      session,
      data,
    );
  },

  async markAsProvisioned(
    tenantId: string,
    session: SessionContext,
    requestId: string,
    provisionedBy: string,
  ): Promise<ProvisioningRequest> {
    return apiRequest<ProvisioningRequest>(
      `/it/provisioning/${requestId}/provision`,
      "PUT",
      session,
      { provisionedBy },
    );
  },

  async updateProvisioningRequest(
    tenantId: string,
    session: SessionContext,
    requestId: string,
    data: any,
  ): Promise<ProvisioningRequest> {
    return apiRequest<ProvisioningRequest>(
      `/it/provisioning/${requestId}`,
      "PUT",
      session,
      data,
    );
  },

  async deleteProvisioningRequest(
    tenantId: string,
    session: SessionContext,
    requestId: string,
  ): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>(
      `/it/provisioning/${requestId}`,
      "DELETE",
      session,
    );
  },

  async getSystemHealth(
    tenantId: string,
    session: SessionContext,
  ): Promise<SystemHealth[]> {
    return apiRequest<SystemHealth[]>("/v1/it/system-health", "GET", session);
  },

  async getOverview(tenantId: string, session: SessionContext): Promise<any> {
    return apiRequest<any>("/v1/it/overview", "GET", session);
  },
};

