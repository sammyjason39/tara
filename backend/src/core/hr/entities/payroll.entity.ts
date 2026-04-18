/**
 * Payroll Entity
 * Represents payroll calculation for an employee
 */
export class Payroll {
  id: string;
  tenant_id: string;
  employee_id: string;
  period: string; // YYYY-MM format
  base_salary: number;
  hours_worked?: number;
  hourly_rate?: number;
  overtimeHours?: number;
  overtimeRate?: number;
  bonuses?: number;
  deductions?: number;
  grossPay: number;
  netPay: number;
  status: "draft" | "approved" | "paid";
  paidAt?: Date;
  created_at: Date;
  updated_at: Date;
}
