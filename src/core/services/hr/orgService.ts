import type { SessionContext } from "@/core/security/session";
import { apiRequest } from "@/core/api/apiClient";
import { workflowService } from "./workflowService";
import { recruitmentService } from "./recruitmentService";

export interface Department {
  id: string;
  name: string;
  code: string;
  status: "active" | "inactive";
  headId?: string;
  headcount?: number;
  openRequisitions?: number;
  attendanceRisk?: number;
}

export const orgService = {
  async getOrgMap(tenantId: string, actor: SessionContext): Promise<Department[]> {
    const departments = await apiRequest<Department[]>("/v1/hr/departments", "GET", actor);
    
    // Enriching with some UI-specific metrics if not provided by backend
    return (Array.isArray(departments) ? departments : []).map(d => ({
        ...d,
        headcount: d.headcount ?? 0,
        openRequisitions: d.openRequisitions ?? 0,
        attendanceRisk: d.attendanceRisk ?? 0
    }));
  },

  async createDepartment(
    tenantId: string,
    actor: SessionContext,
    payload: { id?: string; name: string; code: string; status: "active" | "inactive"; headId?: string },
  ): Promise<Department> {
    return apiRequest<Department>("/v1/hr/departments", "POST", actor, payload);
  },

  async escalateStaffingRisk(tenantId: string, actor: SessionContext, departmentId: string, reason?: string) {
    return workflowService.createRequest(tenantId, actor, {
      entityType: "PERFORMANCE",
      entityId: departmentId,
      makerDept: actor.department_id,
      destinationDept: "HR",
      metadata: { departmentId, reason: reason ?? "Staffing risk escalation" },
    });
  },

  async openRequisition(
    tenantId: string,
    actor: SessionContext,
    payload: { title: string; departmentId: string; openings: number },
  ) {
    return recruitmentService.createRequisition(tenantId, actor, {
      title: payload.title,
      departmentId: payload.departmentId,
      status: "open",
      openings: payload.openings,
    });
  },

  async routeDepartment(
    tenantId: string,
    actor: SessionContext,
    departmentId: string,
    notes?: string,
  ) {
    return workflowService.createRequest(tenantId, actor, {
      entityType: "RECRUITMENT",
      entityId: departmentId,
      makerDept: actor.department_id,
      destinationDept: "HR",
      metadata: { departmentId, notes: notes ?? "Department routing" },
    });
  },
};

