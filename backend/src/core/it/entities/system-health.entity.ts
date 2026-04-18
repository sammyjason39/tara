export class SystemHealth {
  id: string;
  tenant_id: string;
  component:
    | "identity"
    | "database"
    | "gateway"
    | "integrations"
    | "device-bridge";
  status: "healthy" | "degraded" | "down";
  latencyMs: number;
  checkedAt: Date;
}
