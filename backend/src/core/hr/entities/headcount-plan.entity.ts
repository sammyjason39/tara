export class HeadcountPlan {
  id: string;
  tenant_id: string;
  scenario_id: string;
  department_id: string;
  position_title: string;
  target_headcount: number;
  projected_salary: number;
  planned_hire_date: Date;
  created_at: Date;
  updated_at: Date;
}
