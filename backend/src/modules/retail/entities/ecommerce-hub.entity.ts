// ============================================================
// EcommerceHub Entity Definitions
// These mirror the Prisma models but are framework-agnostic.
// ============================================================

/** Connector authenticated via API Key (x-api-key or x-ecommerce-key header). */
export class EcommerceConnector {
  id: string;
  tenant_id: string;
  branchIds: string[];
  name: string;
  platform: string;
  domain: string;
  inventoryPoolId?: string | null;
  managerId?: string | null;
  apiKeyHash?: string;
  status: "active" | "revoked" | "suspended";
  settings?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
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
  tenant_id: string;
  name: string;
  type: string;
  adapterType: string;
  status: string;
  syncFrequency: string;
  integrationCategory: "HEADLESS" | "PREMADE" | "PRESET";
  lastSyncAt?: Date | null;
  webhookUrl?: string | null;
  branchIds?: string[];
  /** clientId, clientSecretHash, branch_id, domain, settings — stored as JSON. */
  credentials?: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

/** One-time result when creating or rotating channel credentials. */
export class ChannelWithPlainCredentials {
  channel: EcommerceChannel;
  /** Shown ONCE — store securely. */
  plainClientId: string;
  plainClientSecret: string;
}
