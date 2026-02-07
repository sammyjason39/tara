export type PayrollComponent = {
  id: string;
  name: string;
  amount: number;
  type: "allowance" | "deduction" | "tax" | "overtime" | "base";
};

export type Payslip = {
  id: string;
  tenantId: string;
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  grossPay: number;
  netPay: number;
  components: PayrollComponent[];
  createdAt: string;
};

export type PayrollRun = {
  id: string;
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  status: "draft" | "pending" | "approved" | "executed";
  workflowId?: string;
  createdAt: string;
  updatedAt: string;
};
