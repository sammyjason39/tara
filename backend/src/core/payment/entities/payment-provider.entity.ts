export class PaymentProvider {
  id: string;
  tenantId: string;
  name: string;
  channels: string[];
  status: 'healthy' | 'degraded' | 'down';
  maxAmountPerTxn: number;
  settlementSlaHours: number;
  priority: number;
  lastHeartbeatAt: Date;
}

