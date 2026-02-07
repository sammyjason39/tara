export type PayrollStatus = "draft" | "pending" | "approved" | "rejected" | "exported";

export type PayrollRun = {
  id: string;
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  status: PayrollStatus;
  workflowId?: string;
  createdAt: string;
  updatedAt: string;
};

export type PayrollLine = {
  employeeId: string;
  baseSalary: number;
  overtimeHours: number;
  allowances: number;
  deductions: number;
  taxPlaceholder: number;
  bpjsPlaceholder: number;
  netPay: number;
};
