export class PayrollLine {
  id: string;
  tenant_id: string;
  payrollRunId: string;
  employee_id: string;
  grossPay: number;
  netPay: number;
  adjustments: number;
  created_at: Date;
  updated_at: Date;
}
