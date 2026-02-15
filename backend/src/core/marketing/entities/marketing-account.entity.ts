export class MarketingConnectedAccount {
  id: string;
  tenantId: string;
  provider: 'meta' | 'google';
  accountName: string;
  status: 'connected' | 'expired' | 'disconnected';
  tokenExpiresAt: Date;
  scopes: string[];
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

