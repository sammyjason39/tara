// ============================================================
// EcommerceHub Entity Definitions
// These mirror the Prisma models but are framework-agnostic.
// ============================================================

/** Connector authenticated via API Key (x-api-key or x-ecommerce-key header). */
export class EcommerceConnector {
  id: string;
  tenantId: string;
  branchIds: string[];
  name: string;
  platform: string; 
  domain: string;
  inventoryPoolId?: string | null;
  managerId?: string | null;
  apiKeyHash?: string;
  status: 'active' | 'revoked' | 'suspended';
  settings?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

/** One-time result when creating or rotating a connector API key. */
export class ConnectorWithPlainKey {
  connector: EcommerceConnector;
  /** Shown ONCE — store securely. */
  plainApiKey: string;
}

/** Channel authenticated via clientId + clientSecret headers. */
export class EcommerceChannel {
  id: string;
  tenantId: string;
  name: string;
  type: string;
  adapterType: string;
  status: string;
  syncFrequency: string;
  integrationCategory: 'HEADLESS' | 'PREMADE' | 'PRESET';
  lastSyncAt?: Date | null;
  webhookUrl?: string | null;
  /** clientId, clientSecretHash, branchId, domain, settings — stored as JSON. */
  credentials?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

/** One-time result when creating or rotating channel credentials. */
export class ChannelWithPlainCredentials {
  channel: EcommerceChannel;
  /** Shown ONCE — store securely. */
  plainClientId: string;
  plainClientSecret: string;
}
