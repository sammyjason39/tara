import { apiRequest } from "@/core/api/apiClient";
import type { SessionContext } from "@/core/security/session";

export const hrService = {
  /**
   * List all employees for the current tenant
   */
  async getEmployees(session: SessionContext) {
    return apiRequest<any[]>("/v1/hr/employees", "GET", session);
  },

  /**
   * Update an employee's status (Active, Suspended, etc.)
   */
  async updateEmployeeStatus(session: SessionContext, employeeId: string, status: string) {
    return apiRequest<any>(`/v1/hr/employees/${employeeId}/status`, "PUT", session, { status });
  },

  /**
   * Get headcount and organizational metrics
   */
  async getHrMetrics(session: SessionContext) {
    return apiRequest<any>("/v1/hr/dashboard/metrics", "GET", session);
  }
};
