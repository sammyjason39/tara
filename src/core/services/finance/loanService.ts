import { apiRequest } from "@/core/api/apiClient";
import { SessionContext } from "@/core/security/session";
import { LoanRequest, InstallmentRecord } from "@/core/types/finance/loan";
import { audit } from "@/core/logging/audit";

export const loanService = {
  async requestLoan(tenantId: string, actor: SessionContext, data: { amount: number; installments: number; reason: string }) {
    const monthlyInstallment = Math.round(data.amount / data.installments);
    const payload = {
      ...data,
      monthlyInstallment,
      status: "pending" as const,
      currentApprovalTier: "HOD" as const,
      approvals: {}
    };

    const record = await apiRequest<LoanRequest>(`/finance/loans`, "POST", actor, payload);
    
    audit.log({
      tenantId,
      actorId: actor.userId,
      action: "loan.request",
      entityType: "loan",
      entityId: record.id
    });

    return record;
  },

  async approveLoan(tenantId: string, actor: SessionContext, loanId: string) {
    const role = actor.role;
    let approvalPatch: any = {};

    // OWNER bypass logic
    if (role === "OWNER" || role === "SUPERADMIN") {
      approvalPatch = {
        status: "approved",
        currentApprovalTier: "COMPLETED",
        approvals: { owner: true, hod: true, finance: true, hr: true }
      };
    } else {
      // Tiered logic based on department HOD status (inferred from role or dept)
      const dept = actor.department_id;
      if (dept === "FINANCE") approvalPatch = { "approvals.finance": true };
      else if (dept === "HR") approvalPatch = { "approvals.hr": true };
      else approvalPatch = { "approvals.hod": true }; // Default to HOD for other depts
    }

    return apiRequest<LoanRequest>(`/finance/loans/${loanId}/approve`, "PATCH", actor, approvalPatch);
  },

  async getMyLoans(tenantId: string, actor: SessionContext) {
    return apiRequest<LoanRequest[]>(`/finance/loans/my`, "GET", actor);
  },

  async getLoanDetails(tenantId: string, actor: SessionContext, loanId: string) {
    return apiRequest<LoanRequest>(`/finance/loans/${loanId}`, "GET", actor);
  },

  async getInstallments(tenantId: string, actor: SessionContext, loanId: string) {
    return apiRequest<InstallmentRecord[]>(`/finance/loans/${loanId}/installments`, "GET", actor);
  }
};
