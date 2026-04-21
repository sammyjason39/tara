import type { HRAuditFields } from "./base";

export type PayrollRunStatus = "draft" | "DRAFT" | "calculated" | "APPROVED" | "EXPORTED" | "DISBURSED";

export interface PayrollRun extends HRAuditFields {
  id: string;
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  status: PayrollRunStatus;
  totalEmployees: number;
  totalGrossPay: number;
  totalNetPay: number;
  approvalId?: string;
  approvedBy?: string;
  exportedAt?: string;
  disbursedAt?: string;
}

export interface PayrollLine extends HRAuditFields {
  id: string;
  tenantId: string;
  payrollRunId: string;
  employeeId: string;
  grossPay: number;
  netPay: number;
  adjustments?: number;
}
