import { apiRequest } from "@/core/api/apiClient";
import type { SessionContext } from "@/core/security/session";
import type { Employee } from "@/core/types/hr/employee";

export const hrService = {
  /**
   * Get HR workspace overview, enriched with retail module contributions
   */
  async getHrOverview(tenantId: string, session: SessionContext): Promise<any> {
    return apiRequest<any>(`/hr/overview`, "GET", session);
  },

  /**
   * List all employees for the tenant
   */
  async listEmployees(
    tenantId: string,
    session: SessionContext,
    locationId?: string,
  ): Promise<Employee[]> {
    const query = locationId ? `?locationId=${locationId}` : "";
    return apiRequest<Employee[]>(`/hr/employees${query}`, "GET", session);
  },

  /**
   * Get a specific employee by ID
   */
  async getEmployee(
    tenantId: string,
    session: SessionContext,
    employeeId: string,
  ): Promise<Employee | null> {
    return apiRequest<Employee | null>(
      `/hr/employees/${employeeId}`,
      "GET",
      session,
    );
  },

  /**
   * Delete (deactivate) an employee
   */
  async deleteEmployee(
    tenantId: string,
    session: SessionContext,
    employeeId: string,
  ): Promise<{ success: boolean }> {
    await apiRequest(`/hr/employees/${employeeId}`, "DELETE", session);
    return { success: true };
  },

  /**
   * Create a new employee
   */
  async createEmployee(
    tenantId: string,
    session: SessionContext,
    employee: Partial<Employee>,
  ): Promise<Employee> {
    return apiRequest<Employee>("/v1/hr/employees", "POST", session, employee);
  },

  /**
   * Update an existing employee
   */
  async updateEmployee(
    tenantId: string,
    session: SessionContext,
    employeeId: string,
    updates: Partial<Employee>,
  ): Promise<Employee> {
    return apiRequest<Employee>(
      `/hr/employees/${employeeId}`,
      "PUT",
      session,
      updates,
    );
  },

  /**
   * List all locations for the tenant
   */
  async listLocations(
    tenantId: string,
    session: SessionContext,
  ): Promise<
    Array<{ id: string; name: string; code: string; address: string; type: string }>
  > {
    return apiRequest<
      Array<{ id: string; name: string; code: string; address: string; type: string }>
    >(`/hr/locations`, "GET", session);
  },

  /**
   * Promote an employee
   */
  async promoteEmployee(
    tenantId: string,
    session: SessionContext,
    employeeId: string,
    data: { newRoleTitle: string; newBaseSalary?: number; notes?: string },
  ): Promise<Employee> {
    return apiRequest<Employee>(
      `/hr/employees/${employeeId}/promote`,
      "PATCH",
      session,
      data,
    );
  },

  /**
   * Transfer an employee
   */
  async transferEmployee(
    tenantId: string,
    session: SessionContext,
    employeeId: string,
    data: { newLocationId?: string; newDepartmentId?: string; notes?: string },
  ): Promise<Employee> {
    return apiRequest<Employee>(
      `/hr/employees/${employeeId}/transfer`,
      "PATCH",
      session,
      data,
    );
  },

  /**
   * Suspend an employee
   */
  async suspendEmployee(
    tenantId: string,
    session: SessionContext,
    employeeId: string,
    reason: string,
  ): Promise<Employee> {
    return apiRequest<Employee>(
      `/hr/employees/${employeeId}/suspend`,
      "PATCH",
      session,
      { reason },
    );
  },

  /**
   * Hire a candidate
   */
  async hireCandidate(
    tenantId: string,
    session: SessionContext,
    candidateId: string,
  ): Promise<Employee> {
    return apiRequest<Employee>(
      `/hr/candidates/${candidateId}/hire`,
      "POST",
      session,
    );
  },
};

