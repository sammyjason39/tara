import { EmployeeBenefit } from "./employee-benefit.entity";

export class BenefitPlan {
  id: string;
  tenant_id: string;
  name: string;
  type: string; // HEALTH, RETIREMENT, PERK, INSURANCE
  description?: string;
  employerContribution: number;
  employeeContribution: number;
  frequency: string; // MONTHLY, ANNUALLY
  created_at: Date;
  updated_at: Date;

  enrollments?: EmployeeBenefit[];
}
