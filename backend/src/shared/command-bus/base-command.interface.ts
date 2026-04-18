export interface BaseCommand {
  commandId: string;
  tenant_id: string;
  actor_id: string;
  timestamp: Date;
  payload: unknown;
}
