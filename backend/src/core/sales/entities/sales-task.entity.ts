export class SalesTask {
  id: string;
  tenant_id: string;
  opportunityId?: string;
  lead_id?: string;
  title: string;
  owner_id: string;
  owner_name: string;
  status: "pending" | "in_progress" | "done" | "overdue";
  priority: "low" | "medium" | "high" | "urgent";
  dueAt: Date;
  completedAt?: Date;
  created_at: Date;
  updated_at: Date;
}
