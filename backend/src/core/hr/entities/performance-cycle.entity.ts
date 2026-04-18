export class PerformanceCycle {
  id: string;
  tenant_id: string;
  name: string;
  status: "active" | "completed" | "draft";
  start_date: Date;
  end_date: Date;
  dueDate: Date;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}
