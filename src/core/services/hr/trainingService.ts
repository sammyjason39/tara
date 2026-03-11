import type { TrainingAssignment, TrainingProgram } from "@/core/types/hr/training";
import type { SessionContext } from "@/core/security/session";
import { Roles } from "@/core/security/roles";
import { apiRequest } from "@/core/api/apiClient";

const ensureTenantAccess = (tenantId: string, actor: SessionContext) => {
  if (actor.role === Roles.SUPERADMIN) return;
  if (actor.tenantId !== tenantId) throw new Error("Tenant access denied");
};

export const trainingService = {
  async listPrograms(tenantId: string, actor: SessionContext): Promise<TrainingProgram[]> {
    ensureTenantAccess(tenantId, actor);
    return apiRequest<TrainingProgram[]>("/hr/training/programs", "GET", actor);
  },

  async listAssignments(tenantId: string, actor: SessionContext): Promise<TrainingAssignment[]> {
    ensureTenantAccess(tenantId, actor);
    return apiRequest<TrainingAssignment[]>("/hr/training/assignments", "GET", actor);
  },

  async getComplianceStatus(tenantId: string, actor: SessionContext) {
    ensureTenantAccess(tenantId, actor);
    // Stub for now or fetch and calculate
    const assignments = await this.listAssignments(tenantId, actor);
    return {
      assigned: assignments.length,
      completed: assignments.filter(a => a.status === 'completed').length,
      overdue: 0,
      completionRate: assignments.length ? (assignments.filter(a => a.status === 'completed').length / assignments.length) * 100 : 0,
    };
  },

  async assignTraining(
    tenantId: string,
    actor: SessionContext,
    payload: { employeeId: string; programId: string; status?: TrainingAssignment["status"] },
  ) {
    ensureTenantAccess(tenantId, actor);
    return apiRequest<TrainingAssignment>("/hr/training/assignments", "POST", actor, payload);
  },

  async createProgram(
    tenantId: string,
    actor: SessionContext,
    payload: Omit<TrainingProgram, "id" | "tenantId" | "createdAt" | "updatedAt">,
  ) {
    ensureTenantAccess(tenantId, actor);
    return apiRequest<TrainingProgram>("/hr/training/programs", "POST", actor, payload);
  },

  async bulkAssign(
    tenantId: string,
    actor: SessionContext,
    payload: { employeeIds: string[]; programId: string },
  ) {
    ensureTenantAccess(tenantId, actor);
    const promises = payload.employeeIds.map(empId =>
      this.assignTraining(tenantId, actor, { employeeId: empId, programId: payload.programId })
    );
    return Promise.all(promises);
  },

  async exportCompliance(tenantId: string, actor: SessionContext) {
    ensureTenantAccess(tenantId, actor);
    console.log("Export compliance requested, stubbed for now");
    return [];
  },

  async requestComplianceReview(tenantId: string, actor: SessionContext, employeeId: string) {
    ensureTenantAccess(tenantId, actor);
    return apiRequest(`/hr/cases`, "POST", actor, {
      title: "Compliance Review",
      type: "COMPLIANCE",
      priority: "HIGH",
      employeeId,
      description: "Triggered from Training Grid",
    });
  },

  async completeTraining(tenantId: string, actor: SessionContext, assignmentId: string) {
    ensureTenantAccess(tenantId, actor);
    return apiRequest<TrainingAssignment>(`/hr/training/assignments/${assignmentId}`, "PATCH", actor, { status: "completed" });
  },
};
