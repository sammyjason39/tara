export class PaymentProvider {
  id: string;
  tenant_id: string;
  name: string;
  channels: string[];
  status: "healthy" | "degraded" | "down";
  max_amount_per_txn: number;
  settlement_sla_hours: number;
  priority: number;
  lastHeartbeatAt: Date;
}
