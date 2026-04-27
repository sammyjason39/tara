export class MarketingConnectedAccount {
  id: string;
  tenant_id: string;
  provider: "meta" | "google";
  account_name: string;
  status: "connected" | "expired" | "disconnected";
  tokenExpiresAt: Date;
  scopes: string[];
  lastSyncAt?: Date;
  created_at: Date;
  updated_at: Date;
  branch_id?: string;
  ecommerce_id?: string;
}


