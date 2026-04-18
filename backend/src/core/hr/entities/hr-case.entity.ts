export class HRCase {
  id: string;
  tenant_id: string;
  employee_id: string;
  department_id?: string;
  title: string;
  type: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "critical";
  owner_id?: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}
