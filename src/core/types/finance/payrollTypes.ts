export type PayrollEntry = {
  id: string;
  tenantId: string;
  employeeId: string;
  period: string; // e.g., "2026-02"
  baseSalary: number;
  bonuses?: number;
  deductions?: number;
  netSalary: number;
  status: "pending" | "approved" | "paid";
  createdAt: string;
  updatedAt: string;
};

export type PayrollEstimate = {
  department: string;
  employeeCount: number;
  totalGross: number;
  totalNet: number;
};
