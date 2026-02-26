import { apiRequest } from "@/core/api/apiClient";
import type { SessionContext } from "@/core/security/session";
import type { RetailChannel, ChannelType, ChannelStatus } from "@/core/types/retail/retail";

export interface EcommerceConnectorRecord {
  id: string;
  tenantId: string;
  tenantId?: string; // Alias
  branchIds: string[];
  name: string;
  platform: string;
  domain: string;
  inventoryPoolId?: string;
  managerId?: string;
  status: 'active' | 'revoked' | 'suspended';
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
  // RetailChannel already has most fields. 
  // We just ensure tenantId/tenantId compatibility.
  tenantId?: string;
  credentials?: Record<string, unknown> | null;
  integrationCategory: 'HEADLESS' | 'PREMADE' | 'PRESET';
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
  integrationCategory?: 'HEADLESS' | 'PREMADE' | 'PRESET';
  settings?: Record<string, unknown>;
}

export interface TestResult {
  reachable: boolean;
  latencyMs: number;
  error?: string;
}

export const ecommerceHubService = {
  // Connectors
  async listConnectors(session: SessionContext) {
    return apiRequest<EcommerceConnectorRecord[]>("/retail/ecommerce-hub/connectors", "GET", session);
  },

  async createConnector(session: SessionContext, payload: CreateConnectorPayload) {
    return apiRequest<ConnectorCreateResult>("/retail/ecommerce-hub/connectors", "POST", session, payload);
  },

  async updateConnector(session: SessionContext, id: string, payload: Partial<CreateConnectorPayload> & { status?: string }) {
    return apiRequest<EcommerceConnectorRecord>(`/retail/ecommerce-hub/connectors/${id}`, "PUT", session, payload);
  },

  async deleteConnector(session: SessionContext, id: string) {
    return apiRequest<{ success: boolean }>(`/retail/ecommerce-hub/connectors/${id}`, "DELETE", session);
  },

  async rotateConnectorKey(session: SessionContext, id: string) {
    return apiRequest<{ plainApiKey: string; warning: string }>(`/retail/ecommerce-hub/connectors/${id}/rotate-key`, "POST", session);
  },

  async testConnector(session: SessionContext, id: string) {
    return apiRequest<TestResult>(`/retail/ecommerce-hub/connectors/${id}/test`, "POST", session);
  },

  // Channels
  async listChannels(session: SessionContext) {
    return apiRequest<ChannelRecord[]>("/retail/ecommerce-hub/channels", "GET", session);
  },

  async createChannel(session: SessionContext, payload: CreateChannelPayload) {
    return apiRequest<ChannelCreateResult>("/retail/ecommerce-hub/channels", "POST", session, payload);
  },

  async updateChannel(session: SessionContext, id: string, payload: Partial<CreateChannelPayload> & { status?: string }) {
    return apiRequest<ChannelRecord>(`/retail/ecommerce-hub/channels/${id}`, "PUT", session, payload);
  },

  async deleteChannel(session: SessionContext, id: string) {
    return apiRequest<{ success: boolean }>(`/retail/ecommerce-hub/channels/${id}`, "DELETE", session);
  },

  async rotateChannelCredentials(session: SessionContext, id: string) {
    return apiRequest<{ plainClientId: string; plainClientSecret: string; warning: string }>(`/retail/ecommerce-hub/channels/${id}/rotate-credentials`, "POST", session);
  },

  async revokeChannelCredentials(session: SessionContext, id: string) {
    return apiRequest<{ success: boolean }>(`/retail/ecommerce-hub/channels/${id}/revoke-credentials`, "POST", session);
  }
};
