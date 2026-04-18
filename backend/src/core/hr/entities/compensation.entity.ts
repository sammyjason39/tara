/**
 * Compensation Entity
 * Represents multi-component salary structure
 */
export class Compensation {
  id: string;
  tenant_id: string;
  employee_id: string;
  base_salary: number;
  currency: string;
  payFrequency: "monthly" | "bi_weekly" | "weekly";
  allowances: { type: string; amount: number }[];
  bonuses: { type: string; amount: number }[];
  effectiveDate: Date;
  created_at: Date;
  updated_at: Date;
}
