export class PayrollRun {
  id: string;
  tenant_id: string;
  period_start: Date;
  period_end: Date;
  status: string;
  totalGrossPay: number;
  totalNetPay: number;
  baseCurrency: string;
  created_at: Date;
  updated_at: Date;
}
