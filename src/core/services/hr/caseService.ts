import type { HRCase } from "@/core/types/hr/case";
import type { SessionContext } from "@/core/security/session";
import { apiRequest } from "@/core/api/apiClient";
import { workflowService } from "./workflowService";

export const caseService = {
  async listCases(tenantId: string, actor: SessionContext): Promise<HRCase[]> {
    return apiRequest<HRCase[]>("/v1/hr/cases", "GET", actor);
  },

  async getCase(tenantId: string, caseId: string, actor: SessionContext): Promise<HRCase | undefined> {
    return apiRequest<HRCase>(`/hr/cases/${caseId}`, "GET", actor);
  },

  async createCase(
    tenantId: string,
    actor: SessionContext,
    payload: Omit<HRCase, "id" | "tenantId" | "createdAt" | "updatedAt">,
  ): Promise<HRCase> {
    return apiRequest<HRCase>("/v1/hr/cases", "POST", actor, payload);
  },

  async updateStatus(tenantId: string, actor: SessionContext, caseId: string, status: HRCase["status"]) {
    return apiRequest<HRCase>(`/hr/cases/${caseId}`, "PATCH", actor, { status });
  },

  async assignOwner(tenantId: string, actor: SessionContext, caseId: string, ownerId: string) {
    return apiRequest<HRCase>(`/hr/cases/${caseId}`, "PATCH", actor, { ownerId });
  },

  async escalateCase(tenantId: string, actor: SessionContext, caseId: string, reason?: string) {
    return workflowService.createRequest(tenantId, actor, {
      entityType: "CASE",
      entityId: caseId,
      makerDept: actor.departmentId,
      destinationDept: "HR",
      metadata: { caseId, reason: reason ?? "Case escalation" },
    });
  },
};

