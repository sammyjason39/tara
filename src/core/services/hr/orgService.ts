import { departmentRepo } from "@/core/repositories/hr/departmentRepo";
import { employeeRepo } from "@/core/repositories/hr/employeeRepo";
import { attendanceRepo } from "@/core/repositories/hr/attendanceRepo";
import { recruitmentRepo } from "@/core/repositories/hr/recruitmentRepo";
import type { SessionContext } from "@/core/security/session";
import { Roles } from "@/core/security/roles";
import { audit } from "@/core/logging/audit";
import { workflowService } from "./workflowService";
import { recruitmentService } from "./recruitmentService";

const ensureTenantAccess = (tenantId: string, actor: SessionContext) => {
  if (actor.role === Roles.SUPERADMIN) return;
  if (actor.tenantId !== tenantId) {
    throw new Error("Tenant access denied");
  }
};

export const orgService = {
  getOrgMap(tenantId: string, actor: SessionContext) {
    ensureTenantAccess(tenantId, actor);
    const departments = departmentRepo.list(tenantId);
    const employees = employeeRepo.list(tenantId);
    const attendance = attendanceRepo.list(tenantId);
    const employeeDeptMap = new Map(
      employees.map((emp) => [emp.id, emp.departmentId]),
    );
    const requisitions = recruitmentRepo.list(tenantId);

    return departments.map((dept) => {
      const deptEmployees = employees.filter((emp) => emp.departmentId === dept.id);
      const deptAttendance = attendance.filter(
        (item) => employeeDeptMap.get(item.employeeId) === dept.id,
      );
      const lateOrAbsent = deptAttendance.filter((item) => item.status !== "on_time").length;
      const openReqs = requisitions.filter((req) => req.departmentId === dept.id && req.status !== "closed").length;
      const riskScore = deptEmployees.length
        ? Math.round((lateOrAbsent / deptEmployees.length) * 100)
        : 0;
      return {
        id: dept.id,
        name: dept.name,
        headcount: deptEmployees.length,
        openRequisitions: openReqs,
        attendanceRisk: riskScore,
      };
    });
  },

  createDepartment(
    tenantId: string,
    actor: SessionContext,
    payload: { id: string; name: string; code: string; status: "active" | "inactive"; headId?: string },
  ) {
    ensureTenantAccess(tenantId, actor);
    const record = departmentRepo.create(tenantId, payload);
    audit.log({
      tenantId,
      actorId: actor.userId,
      action: "department.create",
      entityType: "department",
      entityId: record.id,
    });
    return record;
  },

  escalateStaffingRisk(tenantId: string, actor: SessionContext, departmentId: string, reason?: string) {
    ensureTenantAccess(tenantId, actor);
    const request = workflowService.createRequest(tenantId, actor, {
      entityType: "PERFORMANCE",
      entityId: departmentId,
      makerDept: actor.departmentId,
      destinationDept: "HR",
      metadata: { departmentId, reason: reason ?? "Staffing risk escalation" },
    });
    audit.log({
      tenantId,
      actorId: actor.userId,
      action: "org.staffing.escalate",
      entityType: "workflow",
      entityId: request.id,
    });
    return request;
  },

  openRequisition(
    tenantId: string,
    actor: SessionContext,
    payload: { title: string; departmentId: string; openings: number },
  ) {
    ensureTenantAccess(tenantId, actor);
    return recruitmentService.createRequisition(tenantId, actor, {
      title: payload.title,
      departmentId: payload.departmentId,
      status: "open",
      openings: payload.openings,
    });
  },

  routeDepartment(
    tenantId: string,
    actor: SessionContext,
    departmentId: string,
    notes?: string,
  ) {
    ensureTenantAccess(tenantId, actor);
    const request = workflowService.createRequest(tenantId, actor, {
      entityType: "RECRUITMENT",
      entityId: departmentId,
      makerDept: actor.departmentId,
      destinationDept: "HR",
      metadata: { departmentId, notes: notes ?? "Department routing" },
    });
    audit.log({
      tenantId,
      actorId: actor.userId,
      action: "org.route.flowgate",
      entityType: "workflow",
      entityId: request.id,
    });
    return request;
  },
};
