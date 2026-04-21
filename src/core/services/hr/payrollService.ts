import type { PayrollRun } from "@/core/hr/payroll/types";
import { apiRequest } from "@/core/api/apiClient";
import type { SessionContext } from "@/core/security/session";

export const payrollService = {
  /**
   * Create (prepare) a payroll cycle/run
   */
  async prepareCycle(tenantId: string, actor: SessionContext, periodStart: string, periodEnd: string): Promise<PayrollRun> {
    return apiRequest<PayrollRun>("/v1/hr/payroll-runs", "POST", actor, {
      periodStart,
      periodEnd,
    });
  },

  /**
   * Lock attendance for a period (triggers a variant record if needed)
   * Note: this is a safe no-op call — the backend will prep for payroll
   */
  async lockAttendance(tenantId: string, actor: SessionContext, periodStart: string, periodEnd: string) {
    return apiRequest<{ success: boolean }>("/v1/hr/payroll-runs", "POST", actor, {
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
    const response = await apiRequest<{ data?: PayrollRun[] } | PayrollRun[]>("/v1/hr/payroll-runs", "GET", actor);
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
   * Approve a payroll run
   */
  async approvePayroll(actor: SessionContext, runId: string): Promise<PayrollRun> {
    return apiRequest<PayrollRun>(`/v1/hr/payroll/${runId}/approve`, "POST", actor);
  },

  /**
   * Generate and download bank file
   */
  async exportBankFile(actor: SessionContext, runId: string): Promise<string> {
    return apiRequest<string>(`/v1/hr/payroll/${runId}/export-bank`, "POST", actor);
  },

  /**
   * Confirm disbursement and post to ledger
   */
  async confirmDisbursement(actor: SessionContext, runId: string): Promise<any> {
    return apiRequest<any>(`/v1/hr/payroll/${runId}/confirm`, "POST", actor);
  },

  /**
   * Get employee payslip
   */
  async getPayslip(actor: SessionContext, runId: string, employeeId: string): Promise<any> {
    return apiRequest<any>(`/v1/hr/payroll/${runId}/payslip/${employeeId}`, "GET", actor);
  },
};

