export class PaymentRoutingPolicy {
  id: string;
  tenantId: string;
  name: string;
  enabled: boolean;
  priorities: string[];
  fallbackProviders: string[];
  maxRetries: number;
  exponentialBackoffSeconds: number;
  createdAt: Date;
  updatedAt: Date;
}

