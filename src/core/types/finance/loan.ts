import type { HRAuditFields } from "../hr/base";

export type LoanStatus = "pending" | "approved" | "rejected" | "disbursed" | "completed";

export interface LoanRequest extends HRAuditFields {
  id: string;
  tenantId: string;
  employeeId: string;
  amount: number;
  installments: number;
  interestRate: number;
  monthlyInstallment: number;
  reason: string;
  status: LoanStatus;
  currentApprovalTier: "HOD" | "FINANCE" | "HR" | "COMPLETED";
  approvals: {
    hod?: boolean;
    finance?: boolean;
    hr?: boolean;
    owner?: boolean;
  };
}

export interface InstallmentRecord {
  id: string;
  loanId: string;
  dueDate: string;
  amount: number;
  status: "pending" | "paid" | "skipped";
}
