import type { Employee } from "@/core/types/hr/employee";
import { hrService } from "@/core/services/hr/hrService";
import { orgService } from "@/core/services/hr/orgService";
import { Roles } from "@/core/security/roles";
import type { SessionContext } from "@/core/security/session";
import { audit } from "@/core/logging/audit";
import { apiRequest } from "@/core/api/apiClient";

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

export const staffService = {
  getStatusOptions() {
    return ["candidate", "offer", "hired", "probation", "active", "transferred", "promoted", "on_leave", "suspended", "terminated"] as const;
  },

  async listRoleTitles(tenantId: string, actor: SessionContext) {
    const employees = await hrService.listEmployees(tenantId, actor);
    const roles = new Set(employees.map((emp) => emp.roleTitle));
    return Array.from(roles);
  },

  async listStaff(
    tenantId: string,
    actor: SessionContext,
    filters: StaffFilters = {},
    pagination: { page?: number; pageSize?: number } = {},
  ): Promise<StaffListResult> {
    ensureTenantAccess(tenantId, actor);
    const page = pagination.page ?? 1;
    const pageSize = pagination.pageSize ?? 10;
    
    // Fetch all employees from backend
    // In a real app, filtering and pagination should be done on backend
    let employees = await hrService.listEmployees(tenantId, actor);

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

  async listDepartments(tenantId: string, actor: SessionContext) {
    return orgService.getOrgMap(tenantId, actor);
  },

  async createEmployee(
    tenantId: string,
    actor: SessionContext,
    payload: Omit<Employee, "id" | "tenantId" | "createdAt" | "updatedAt">,
  ) {
    ensureTenantAccess(tenantId, actor);
    const record = await hrService.createEmployee(tenantId, actor, payload);
    audit.log({
      tenantId,
      actorId: actor.userId,
      action: "staff.create",
      entityType: "employee",
      entityId: record.id,
    });
    return record;
  },

  async updateEmployee(
    tenantId: string,
    actor: SessionContext,
    employeeId: string,
    patch: Partial<Employee>,
  ) {
    ensureTenantAccess(tenantId, actor);
    const record = await hrService.updateEmployee(tenantId, actor, employeeId, patch);
    return record;
  },

  // Replaced stubbed methods with actual API integrations
  async requestTermination(tenantId: string, actor: SessionContext, employeeId: string, reason?: string) {
    ensureTenantAccess(tenantId, actor);
    // Use the new HRService method for Termination
    return hrService.deleteEmployee(tenantId, actor, employeeId);
  },

  async requestTransfer(tenantId: string, actor: SessionContext, employeeId: string, targetDept: string, reason?: string) {
    ensureTenantAccess(tenantId, actor);
    return hrService.transferEmployee(tenantId, actor, employeeId, {
      newDepartmentId: targetDept,
      notes: reason,
    });
  },

  async promoteEmployee(tenantId: string, actor: SessionContext, employeeId: string, data: { newRoleTitle: string; newBaseSalary?: number; notes?: string }) {
    ensureTenantAccess(tenantId, actor);
    return hrService.promoteEmployee(tenantId, actor, employeeId, data);
  },

  async suspendEmployee(tenantId: string, actor: SessionContext, employeeId: string, reason: string) {
    ensureTenantAccess(tenantId, actor);
    return hrService.suspendEmployee(tenantId, actor, employeeId, reason);
  },

  async importStaff(tenantId: string, actor: SessionContext, source: string) {
    ensureTenantAccess(tenantId, actor);
    // Real implementation would send a FormData with file payload: apiRequest formData
    console.warn("importStaff expects a file upload. Sending text body as placeholder.");
    return;
  },

  async exportStaff(tenantId: string, actor: SessionContext) {
    ensureTenantAccess(tenantId, actor);
    // Export returns a buffer/file download, we trigger UI download via API
    window.open(`/api/v1/hr/employees/export`, '_blank');
  },

  async requestPerformanceReview(tenantId: string, actor: SessionContext, employeeId: string) {
    ensureTenantAccess(tenantId, actor);
    // Create an HR case for performance review
    return apiRequest(`/v1/hr/cases`, "POST", actor, {
      title: "Performance Review Request",
      type: "REVIEW",
      priority: "NORMAL",
      employeeId,
      description: "Triggered from Staff Grid",
    });
  },

  async openPayrollCase(tenantId: string, actor: SessionContext, employeeId: string) {
    ensureTenantAccess(tenantId, actor);
    return apiRequest(`/v1/hr/cases`, "POST", actor, {
      title: "Payroll Inquiry/Case",
      type: "PAYROLL",
      priority: "HIGH",
      employeeId,
      description: "Opened from Staff Grid",
    });
  },
};
