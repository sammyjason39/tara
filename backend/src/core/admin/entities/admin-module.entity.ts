export class AdminModuleStatus {
  id: string;
  tenant_id: string;
  moduleKey:
    | "finance"
    | "hr"
    | "inventory"
    | "procurement"
    | "admin"
    | "it"
    | "retail"
    | "sales";
  enabled: boolean;
  updatedBy: string;
  updated_at: Date;
}
