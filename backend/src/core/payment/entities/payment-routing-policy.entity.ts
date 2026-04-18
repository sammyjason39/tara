export class PaymentRoutingPolicy {
  id: string;
  tenant_id: string;
  name: string;
  enabled: boolean;
  priorities: string[];
  fallbackProviders: string[];
  maxRetries: number;
  exponentialBackoffSeconds: number;
  created_at: Date;
  updated_at: Date;
}
