import { BenefitPlan } from "./benefit-plan.entity";

export class EmployeeBenefit {
  id: string;
  tenant_id: string;
  employee_id: string;
  planId: string;
  enrollment_date: Date;
  status: string; // ACTIVE, PENDING, CANCELLED
  coverage_amount?: number;
  created_at: Date;
  updated_at: Date;

  plan?: BenefitPlan;
}
