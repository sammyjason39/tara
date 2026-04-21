export class PayrollLine {
  id: string;
  tenant_id: string;
  payrollRunId: string;
  employee_id: string;
  base_salary: number;
  total_work_hours: number;
  overtime_pay: number;
  sales_bonus: number;
  manual_bonus: number;
  gross_income: number;
  grossPay: number; // For compatibility
  netPay: number;
  tax_amount: number;
  adjustments: number;
  deductions_total: number;
  breakdown_json?: any;
  checksum?: string;
  created_at: Date;
  updated_at: Date;
}
