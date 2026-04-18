export class AdminRequest {
  id: string;
  tenant_id: string;
  type: "access" | "module_toggle" | "compliance" | "other";
  title: string;
  detail: string;
  status: "open" | "in_progress" | "resolved";
  requested_by: string;
  resolvedBy?: string;
  created_at: Date;
  updated_at: Date;
}
