export class EmployeeSkill {
  id: string;
  tenant_id: string;
  employee_id: string;
  skill_id: string;
  proficiency: number; // 1-5
  verification_status: string; // SELF_ASSESSED, VERIFIED, EXPIRED
  verified_by?: string;
  verified_at?: Date;
  created_at: Date;
  updated_at: Date;

  skill?: any; // To include skill name/category
}
