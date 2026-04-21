import type { SessionContext } from "@/core/security/session";
import { apiRequest } from "@/core/api/apiClient";

export type WorkflowStatus = "PENDING" | "APPROVED" | "REJECTED" | "RETURNED" | "MODIFIED";

export interface WorkflowRequest {
  id: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  makerDept: string;
  destinationDept: string;
  status: WorkflowStatus;
  requestedBy: string;
  requestedAt: string;
  notes?: string;
  metadata?: any;
}

export const workflowService = {
  async createRequest(
    tenantId: string,
    session: SessionContext,
    input: {
      entityType: string;
      entityId: string;
      makerDept: string;
      destinationDept: string;
      notes?: string;
      metadata?: any;
    },
  ): Promise<WorkflowRequest> {
    return apiRequest<WorkflowRequest>("/v1/workflow/request", "POST", session, input);
  },

  async listInbox(
    tenantId: string,
    session: SessionContext,
    deptCode: string,
  ): Promise<WorkflowRequest[]> {
    return apiRequest<WorkflowRequest[]>(`/workflow/inbox?dept=${deptCode}`, "GET", session);
  },

  async listRequests(
    tenantId: string,
    session: SessionContext,
  ): Promise<WorkflowRequest[]> {
    return apiRequest<WorkflowRequest[]>("/v1/workflow/list", "GET", session);
  },

  async approveRequest(
    tenantId: string,
    workflowId: string,
    session: SessionContext,
    notes?: string
  ): Promise<WorkflowRequest> {
    return apiRequest<WorkflowRequest>(`/workflow/${workflowId}/approve`, "POST", session, { notes });
  },

  async rejectRequest(
    tenantId: string,
    workflowId: string,
    session: SessionContext,
    notes?: string
  ): Promise<WorkflowRequest> {
    return apiRequest<WorkflowRequest>(`/workflow/${workflowId}/reject`, "POST", session, { notes });
  },
};

export type { WorkflowRequest };

