import type { PayrollRun } from "@/core/hr/payroll/types";
import { apiRequest } from "@/core/api/apiClient";
import type { SessionContext } from "@/core/security/session";

export const payrollService = {
  /**
   * Create (prepare) a payroll cycle/run
   */
  async prepareCycle(tenantId: string, actor: SessionContext, periodStart: string, periodEnd: string): Promise<PayrollRun> {
    return apiRequest<PayrollRun>("/hr/payroll-runs", "POST", actor, {
      periodStart,
      periodEnd,
    });
  },

  /**
   * Lock attendance for a period (triggers a variant record if needed)
   * Note: this is a safe no-op call — the backend will prep for payroll
   */
  async lockAttendance(tenantId: string, actor: SessionContext, periodStart: string, periodEnd: string) {
    return apiRequest<{ success: boolean }>("/hr/payroll-runs", "POST", actor, {
      periodStart,
      periodEnd,
    });
  },

  /**
   * Run variance check on a specific run
   */
  async runVarianceCheck(tenantId: string, actor: SessionContext, runId: string) {
    return apiRequest<{ runId: string; varianceScore: number }>(
      `/hr/payroll-runs/${runId}/variance-check`,
      "POST",
      actor,
    );
  },

  /**
   * List all payroll runs for current tenant
   */
  async listRuns(tenantId: string, actor: SessionContext): Promise<PayrollRun[]> {
    const response = await apiRequest<{ data?: PayrollRun[] } | PayrollRun[]>("/hr/payroll-runs", "GET", actor);
    // Handle nested `data` from backend response shape
    if (response && typeof response === "object" && !Array.isArray(response) && (response as any).data) {
      return (response as any).data as PayrollRun[];
    }
    return (response as PayrollRun[]) || [];
  },

  /**
   * Get payroll records for a specific employee
   */
  async getEmployeePayroll(tenantId: string, actor: SessionContext, employeeId: string) {
    return apiRequest<any[]>(`/hr/payroll/${employeeId}`, "GET", actor);
  },

  /**
   * Submit a payroll run for approval
   */
  async submitForApproval(tenantId: string, actor: SessionContext, runId: string) {
    return apiRequest<PayrollRun>(`/hr/payroll-runs/${runId}/submit`, "PATCH", actor);
  },

  /**
   * Approve a payroll run (Finance Admin/Owner/Superadmin only)
   */
  async approveRun(tenantId: string, actor: SessionContext, runId: string) {
    return apiRequest<PayrollRun>(`/hr/payroll-runs/${runId}/approve`, "PATCH", actor);
  },

  /**
   * Export journal entries for a payroll run (opens download)
   */
  async exportJournal(tenantId: string, actor: SessionContext, runId: string) {
    window.open(`/api/hr/payroll-runs/${runId}/export`, "_blank");
  },

  /**
   * Generate a payslip for an employee for a period
   */
  async generatePayslip(
    tenantId: string,
    actor: SessionContext,
    employeeId: string,
    periodStart: string,
    periodEnd: string,
    components: any[],
  ) {
    return apiRequest<any>(
      `/hr/payroll/${employeeId}/calculate`,
      "POST",
      actor,
      { period: periodStart },
    );
  },
};
