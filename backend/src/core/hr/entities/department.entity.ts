export class Department {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  headId?: string;
  description?: string;
  status: "active" | "inactive";
  created_at: Date;
  updated_at: Date;
}
