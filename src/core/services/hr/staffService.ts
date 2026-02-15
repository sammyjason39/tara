import type { Employee } from "@/core/types/hr/employee";
import { employeeRepo } from "@/core/repositories/hr/employeeRepo";
import { departmentRepo } from "@/core/repositories/hr/departmentRepo";
import { trainingRepo } from "@/core/repositories/hr/trainingRepo";
import { Roles } from "@/core/security/roles";
import type { SessionContext } from "@/core/security/session";
import { audit } from "@/core/logging/audit";
import { createWorkflowRequest } from "@/core/tools/workflows/workflowEngine";

export type StaffFilters = {
  search?: string;
  departmentId?: string;
  status?: Employee["status"] | "all";
  roleTitle?: string;
};

export type StaffListResult = {
  items: Employee[];
  total: number;
  page: number;
  pageSize: number;
};

const ensureTenantAccess = (tenantId: string, actor: SessionContext) => {
  if (actor.role === Roles.SUPERADMIN) return;
  if (actor.tenantId !== tenantId) {
    throw new Error("Tenant access denied");
  }
};

const applyScopeFilter = (employees: Employee[], actor: SessionContext) => {
  if (actor.role === Roles.SUPERADMIN) return employees;
  if (([Roles.OWNER, Roles.COMPANY_ADMIN, Roles.HR_ADMIN, Roles.FINANCE_ADMIN] as readonly string[]).includes(actor.role)) {
    return employees;
  }
  if (actor.role === Roles.DEPT_HEAD) {
    return employees.filter((employee) => employee.departmentId === actor.departmentId);
  }
  return employees.filter((employee) => employee.userId === actor.userId);
};

const canManageStaff = (actor: SessionContext, employee?: Employee) => {
  if (actor.role === Roles.SUPERADMIN) return true;
  if (([Roles.OWNER, Roles.COMPANY_ADMIN, Roles.HR_ADMIN] as readonly string[]).includes(actor.role)) return true;
  if (actor.role === Roles.DEPT_HEAD && employee) {
    return employee.departmentId === actor.departmentId;
  }
  return false;
};

export const staffService = {
  getStatusOptions() {
    return ["active", "on_leave", "inactive", "terminated"] as const;
  },
  listRoleTitles(tenantId: string, actor: SessionContext) {
    ensureTenantAccess(tenantId, actor);
    const employees = applyScopeFilter(employeeRepo.list(tenantId), actor);
    const roles = new Set(employees.map((emp) => emp.roleTitle));
    return Array.from(roles);
  },
  listStaff(
    tenantId: string,
    actor: SessionContext,
    filters: StaffFilters = {},
    pagination: { page?: number; pageSize?: number } = {},
  ): StaffListResult {
    ensureTenantAccess(tenantId, actor);
    const page = pagination.page ?? 1;
    const pageSize = pagination.pageSize ?? 10;
    let employees = applyScopeFilter(employeeRepo.list(tenantId), actor);

    if (filters.search) {
      const query = filters.search.toLowerCase();
      employees = employees.filter(
        (emp) =>
          emp.fullName.toLowerCase().includes(query) ||
          emp.roleTitle.toLowerCase().includes(query) ||
          emp.email.toLowerCase().includes(query),
      );
    }

    if (filters.departmentId && filters.departmentId !== "all") {
      employees = employees.filter((emp) => emp.departmentId === filters.departmentId);
    }

    if (filters.status && filters.status !== "all") {
      employees = employees.filter((emp) => emp.status === filters.status);
    }

    if (filters.roleTitle && filters.roleTitle !== "all") {
      employees = employees.filter((emp) => emp.roleTitle === filters.roleTitle);
    }

    const total = employees.length;
    const start = (page - 1) * pageSize;
    const items = employees.slice(start, start + pageSize);
    return { items, total, page, pageSize };
  },

  listDepartments(tenantId: string, actor: SessionContext) {
    ensureTenantAccess(tenantId, actor);
    return departmentRepo.list(tenantId);
  },

  createEmployee(
    tenantId: string,
    actor: SessionContext,
    payload: Omit<Employee, "id" | "tenantId" | "createdAt" | "updatedAt">,
  ) {
    ensureTenantAccess(tenantId, actor);
    if (!canManageStaff(actor)) {
      throw new Error("Not authorized to create staff");
    }
    const record = employeeRepo.create(tenantId, payload);
    audit.log({
      tenantId,
      actorId: actor.userId,
      action: "staff.create",
      entityType: "employee",
      entityId: record.id,
    });
    return record;
  },

  updateEmployee(
    tenantId: string,
    actor: SessionContext,
    employeeId: string,
    patch: Partial<Employee>,
  ) {
    ensureTenantAccess(tenantId, actor);
    const employee = employeeRepo.getById(tenantId, employeeId);
    if (!employee) {
      throw new Error("Employee not found");
    }
    if (!canManageStaff(actor, employee)) {
      throw new Error("Not authorized to update staff");
    }
    const record = employeeRepo.update(tenantId, employeeId, patch);
    if (record) {
      audit.log({
        tenantId,
        actorId: actor.userId,
        action: "staff.update",
        entityType: "employee",
        entityId: record.id,
      });
    }
    return record;
  },

  requestTermination(
    tenantId: string,
    actor: SessionContext,
    employeeId: string,
    reason?: string,
  ) {
    ensureTenantAccess(tenantId, actor);
    const employee = employeeRepo.getById(tenantId, employeeId);
    if (!employee) {
      throw new Error("Employee not found");
    }
    if (!canManageStaff(actor, employee)) {
      throw new Error("Not authorized to terminate staff");
    }
    const request = createWorkflowRequest({
      tenantId,
      entityType: "CONTRACT",
      entityId: employeeId,
      makerDept: actor.departmentId,
      destinationDept: "HR",
      requestedBy: actor.userId,
      metadata: { employeeId, reason: reason ?? "Termination request" },
    });
    audit.log({
      tenantId,
      actorId: actor.userId,
      action: "staff.terminate.request",
      entityType: "workflow",
      entityId: request.id,
      after: { employeeId },
    });
    return request;
  },
  requestTransfer(
    tenantId: string,
    actor: SessionContext,
    employeeId: string,
    targetDept: string,
    reason?: string,
  ) {
    ensureTenantAccess(tenantId, actor);
    const employee = employeeRepo.getById(tenantId, employeeId);
    if (!employee) {
      throw new Error("Employee not found");
    }
    if (!canManageStaff(actor, employee)) {
      throw new Error("Not authorized to transfer staff");
    }
    const request = createWorkflowRequest({
      tenantId,
      entityType: "CONTRACT",
      entityId: employeeId,
      makerDept: actor.departmentId,
      destinationDept: "HR",
      requestedBy: actor.userId,
      metadata: { employeeId, targetDept, reason: reason ?? "Department transfer request" },
    });
    audit.log({
      tenantId,
      actorId: actor.userId,
      action: "staff.transfer.request",
      entityType: "workflow",
      entityId: request.id,
      after: { employeeId, targetDept },
    });
    return request;
  },

  importStaff(tenantId: string, actor: SessionContext, source: string) {
    ensureTenantAccess(tenantId, actor);
    if (!canManageStaff(actor)) {
      throw new Error("Not authorized to import staff");
    }
    audit.log({
      tenantId,
      actorId: actor.userId,
      action: "staff.import",
      entityType: "employee",
      entityId: source,
    });
  },

  exportStaff(tenantId: string, actor: SessionContext) {
    ensureTenantAccess(tenantId, actor);
    if (!canManageStaff(actor)) {
      throw new Error("Not authorized to export staff");
    }
    const employees = applyScopeFilter(employeeRepo.list(tenantId), actor);
    audit.log({
      tenantId,
      actorId: actor.userId,
      action: "staff.export",
      entityType: "employee",
      entityId: "export",
      after: { count: employees.length },
    });
    return employees;
  },

  assignTraining(
    tenantId: string,
    actor: SessionContext,
    payload: { employeeId: string; programId: string },
  ) {
    ensureTenantAccess(tenantId, actor);
    const assignedAt = new Date().toISOString().slice(0, 10);
    trainingRepo.assignTraining(tenantId, {
      employeeId: payload.employeeId,
      programId: payload.programId,
      status: "planned",
      assignedAt,
    });
    audit.log({
      tenantId,
      actorId: actor.userId,
      action: "training.assign",
      entityType: "training_assignment",
      entityId: payload.employeeId,
      after: { programId: payload.programId, assignedAt },
    });
  },

  requestPerformanceReview(
    tenantId: string,
    actor: SessionContext,
    employeeId: string,
  ) {
    ensureTenantAccess(tenantId, actor);
    const request = createWorkflowRequest({
      tenantId,
      entityType: "PERFORMANCE",
      entityId: employeeId,
      makerDept: actor.departmentId,
      destinationDept: "HR",
      requestedBy: actor.userId,
      metadata: { employeeId },
    });
    audit.log({
      tenantId,
      actorId: actor.userId,
      action: "performance.request",
      entityType: "workflow",
      entityId: request.id,
      after: { employeeId },
    });
    return request;
  },

  openPayrollCase(tenantId: string, actor: SessionContext, employeeId: string) {
    ensureTenantAccess(tenantId, actor);
    const request = createWorkflowRequest({
      tenantId,
      entityType: "PAYROLL",
      entityId: employeeId,
      makerDept: actor.departmentId,
      destinationDept: "FINANCE",
      requestedBy: actor.userId,
      metadata: { employeeId },
    });
    audit.log({
      tenantId,
      actorId: actor.userId,
      action: "payroll.case.open",
      entityType: "workflow",
      entityId: request.id,
      after: { employeeId },
    });
    return request;
  },
};
