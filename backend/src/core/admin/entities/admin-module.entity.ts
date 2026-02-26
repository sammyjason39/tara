export class AdminModuleStatus {
  id: string;
  tenantId: string;
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
  updatedAt: Date;
}
