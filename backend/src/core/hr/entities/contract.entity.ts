export class Contract {
  id: string;
  tenant_id: string;
  employee_id?: string;
  title: string;
  type: string;
  status: "active" | "draft" | "expired" | "terminated";
  start_date: Date;
  end_date?: Date;
  url?: string;
  created_at: Date;
  updated_at: Date;
}
