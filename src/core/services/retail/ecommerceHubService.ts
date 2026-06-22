import { apiRequest } from "@/core/api/apiClient";
import type { SessionContext } from "@/core/security/session";
import type {
  RetailChannel,
  RetailStore,
  ChannelType,
  ChannelStatus,
} from "@/core/types/retail/retail";

export interface EcommerceConnectorRecord {
  id: string;
  tenantId: string;
  branchIds: string[];
  name: string;
  platform: string;
  domain: string;
  inventoryPoolId?: string;
  managerId?: string;
  status: "active" | "revoked" | "suspended";
  settings?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectorCreateResult {
  connector: EcommerceConnectorRecord;
  plainApiKey: string;
  warning: string;
}

export interface ChannelRecord extends RetailChannel {
  // tenantId is required — do NOT mark optional (RetailChannel enforces it)
  credentials?: Record<string, unknown> | null;
  adapterType?: string;
  integrationCategory: "HEADLESS" | "PREMADE" | "PRESET";
}

export interface ChannelCreateResult {
  channel: ChannelRecord;
  plainClientId: string;
  plainClientSecret: string;
  warning: string;
}

export interface CreateConnectorPayload {
  name: string;
  platform: string;
  domain: string;
  branchIds?: string[];
  inventoryPoolId?: string;
  settings?: Record<string, unknown>;
}

export interface CreateChannelPayload {
  name: string;
  type: string;
  adapterType?: string;
  syncFrequency?: string;
  webhookUrl?: string;
  integrationCategory?: "HEADLESS" | "PREMADE" | "PRESET";
  settings?: Record<string, unknown>;
  branchIds?: string[];
}

export interface TestResult {
  reachable: boolean;
  latencyMs: number;
  error?: string;
}

/**
 * Optional channel binding to attach to a newly registered e-commerce virtual branch.
 * When provided, the backend creates the channel and links it to the new branch so the
 * e-commerce presence participates in the branch hierarchy with its sales channel attached.
 */
export interface RegisterEcommerceBranchChannel {
  name: string;
  type?: ChannelType;
  syncFrequency?: string;
  integrationCategory?: "HEADLESS" | "PREMADE" | "PRESET";
}

/**
 * Payload for the unified e-commerce registration entry point. The result is a virtual
 * branch (`RetailStore` with `type: "ecommerce"`) that lives INSIDE the branch hierarchy
 * rather than a standalone entity that links TO branches via `branchIds[]`.
 */
export interface RegisterEcommerceBranchPayload {
  name: string;
  platform: string;
  domain: string;
  /** Physical/logical location the virtual branch is anchored to in the hierarchy. */
  locationId: string;
  /** Optional human/system code; the backend derives one when omitted. */
  code?: string;
  inventoryPoolId?: string;
  managerId?: string;
  /** Optional sales channel to bind to the new virtual branch. */
  channel?: RegisterEcommerceBranchChannel;
  settings?: Record<string, unknown>;
}

/**
 * Result of registering an e-commerce virtual branch: a {@link RetailStore} typed
 * `"ecommerce"`, optionally carrying the channel that was bound to it.
 */
export type RegisterEcommerceBranchResult = RetailStore & {
  boundChannel?: RetailChannel;
};

export const ecommerceHubService = {
  /**
   * Unified entry point for registering e-commerce presence. Creates an `"ecommerce"`
   * {@link RetailStore} (a virtual branch) that participates in the standard branch
   * hierarchy — NOT a standalone connector/channel that links TO branches via
   * `branchIds[]`. Optionally binds a sales channel to the new virtual branch.
   *
   * The returned object is RetailStore-shaped with `type: "ecommerce"`, an identity
   * (`id`/`locationId`), and no `branchIds[]` array.
   */
  async registerEcommerceBranch(
    session: SessionContext,
    payload: RegisterEcommerceBranchPayload,
  ): Promise<RegisterEcommerceBranchResult> {
    const body: Record<string, unknown> = {
      name: payload.name,
      // Virtual branch marker — places the new e-commerce presence INSIDE the hierarchy.
      type: "ecommerce",
      location_id: payload.locationId,
      platform: payload.platform,
      domain: payload.domain,
      status: "active",
    };
    if (payload.code) body.code = payload.code;
    if (payload.inventoryPoolId) body.inventory_pool_id = payload.inventoryPoolId;
    if (payload.managerId) body.manager_id = payload.managerId;
    if (payload.settings) body.settings = payload.settings;
    if (payload.channel) {
      body.channel = {
        name: payload.channel.name,
        type: payload.channel.type,
        sync_frequency: payload.channel.syncFrequency,
        integration_category: payload.channel.integrationCategory,
      };
    }

    return apiRequest<RegisterEcommerceBranchResult>(
      "/retail/ecommerce-hub/register-branch",
      "POST",
      session,
      body,
    );
  },

  // Connectors
  async listConnectors(session: SessionContext) {
    return apiRequest<EcommerceConnectorRecord[]>(
      "/retail/ecommerce-hub/connectors",
      "GET",
      session,
    );
  },

  async createConnector(
    session: SessionContext,
    payload: CreateConnectorPayload,
  ) {
    return apiRequest<ConnectorCreateResult>(
      "/retail/ecommerce-hub/connectors",
      "POST",
      session,
      payload,
    );
  },

  async updateConnector(
    session: SessionContext,
    id: string,
    payload: Partial<CreateConnectorPayload> & { status?: string },
  ) {
    return apiRequest<EcommerceConnectorRecord>(
      `/retail/ecommerce-hub/connectors/${id}`,
      "PUT",
      session,
      payload,
    );
  },

  async deleteConnector(session: SessionContext, id: string) {
    return apiRequest<{ success: boolean }>(
      `/retail/ecommerce-hub/connectors/${id}`,
      "DELETE",
      session,
    );
  },

  async rotateConnectorKey(session: SessionContext, id: string) {
    return apiRequest<{ plainApiKey: string; warning: string }>(
      `/retail/ecommerce-hub/connectors/${id}/rotate-key`,
      "POST",
      session,
    );
  },

  async testConnector(session: SessionContext, id: string) {
    return apiRequest<TestResult>(
      `/retail/ecommerce-hub/connectors/${id}/test`,
      "POST",
      session,
    );
  },

  // Channels
  async listChannels(session: SessionContext) {
    return apiRequest<ChannelRecord[]>(
      "/retail/ecommerce-hub/channels",
      "GET",
      session,
    );
  },

  async createChannel(session: SessionContext, payload: CreateChannelPayload) {
    return apiRequest<ChannelCreateResult>(
      "/retail/ecommerce-hub/channels",
      "POST",
      session,
      payload,
    );
  },

  async updateChannel(
    session: SessionContext,
    id: string,
    payload: Partial<CreateChannelPayload> & { status?: string },
  ) {
    return apiRequest<ChannelRecord>(
      `/retail/ecommerce-hub/channels/${id}`,
      "PUT",
      session,
      payload,
    );
  },

  async deleteChannel(session: SessionContext, id: string) {
    return apiRequest<{ success: boolean }>(
      `/retail/ecommerce-hub/channels/${id}`,
      "DELETE",
      session,
    );
  },

  async rotateChannelCredentials(session: SessionContext, id: string) {
    return apiRequest<{
      plainClientId: string;
      plainClientSecret: string;
      warning: string;
    }>(
      `/retail/ecommerce-hub/channels/${id}/rotate-credentials`,
      "POST",
      session,
    );
  },

  async revokeChannelCredentials(session: SessionContext, id: string) {
    return apiRequest<{ success: boolean }>(
      `/retail/ecommerce-hub/channels/${id}/revoke-credentials`,
      "POST",
      session,
    );
  },

  async testChannelConnection(
    session: SessionContext,
    id: string,
  ): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    return apiRequest<{ success: boolean; latencyMs: number; error?: string }>(
      `/retail/ecommerce-hub/channels/${id}/test-connection`,
      "POST",
      session,
    );
  },
  
  // Products & Categories
  async listChannelProducts(session: SessionContext, channelId: string) {
    return apiRequest<any[]>(
      `/retail/ecommerce-hub/channels/${channelId}/products`,
      "GET",
      session,
    );
  },

  async updateChannelProducts(
    session: SessionContext,
    channelId: string,
    updates: any[],
  ) {
    return apiRequest<{ success: boolean }>(
      `/retail/ecommerce-hub/channels/${channelId}/products`,
      "PUT",
      session,
      { updates },
    );
  },

  async getChannelCategories(session: SessionContext, channelId: string) {
    return apiRequest<string[]>(
      `/retail/ecommerce-hub/channels/${channelId}/categories`,
      "GET",
      session,
    );
  },

  async updateChannelCategories(
    session: SessionContext,
    channelId: string,
    categories: string[],
  ) {
    return apiRequest<{ success: boolean }>(
      `/retail/ecommerce-hub/channels/${channelId}/categories`,
      "PUT",
      session,
      { categories },
    );
  },

  async getChannelDeliveryLogs(
    session: SessionContext,
    channelId: string,
  ): Promise<Array<{
    id: string;
    timestamp: string;
    event: string;
    statusCode: number;
    latencyMs: number;
    success: boolean;
  }>> {
    return apiRequest(
      `/retail/ecommerce-hub/channels/${channelId}/delivery-logs`,
      "GET",
      session,
    );
  },
};
