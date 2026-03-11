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
    return apiRequest<Employee>("/hr/employees", "POST", session, employee);
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
};
