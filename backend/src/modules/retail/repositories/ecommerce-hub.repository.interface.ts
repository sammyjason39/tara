import {
  EcommerceConnector,
  ConnectorWithPlainKey,
  EcommerceChannel,
  ChannelWithPlainCredentials,
} from "../entities/ecommerce-hub.entity";
import {
  CreateEcommerceConnectorDto,
  UpdateEcommerceConnectorDto,
} from "../dto/ecommerce-hub.dto";
import {
  CreateRetailChannelDto,
  UpdateRetailChannelDto,
} from "../dto/ecommerce-hub.dto";

export abstract class IEcommerceHubRepository {
  // ── EcommerceConnector (API-key auth) ───────────────────────
  abstract listConnectors(tenant_id: string): Promise<EcommerceConnector[]>;
  abstract getConnector(
    tenant_id: string,
    id: string,
  ): Promise<EcommerceConnector | null>;
  abstract createConnector(
    tenant_id: string,
    data: CreateEcommerceConnectorDto,
  ): Promise<ConnectorWithPlainKey>;
  abstract updateConnector(
    tenant_id: string,
    id: string,
    data: UpdateEcommerceConnectorDto,
  ): Promise<EcommerceConnector>;
  abstract rotateConnectorApiKey(
    tenant_id: string,
    id: string,
  ): Promise<{ plainApiKey: string }>;
  abstract deleteConnector(tenant_id: string, id: string): Promise<void>;

  // ── RetailChannel (clientId/secret auth) ────────────────────
  abstract listChannels(tenant_id: string): Promise<EcommerceChannel[]>;
  abstract getChannel(
    tenant_id: string,
    id: string,
  ): Promise<EcommerceChannel | null>;
  abstract createChannel(
    tenant_id: string,
    data: CreateRetailChannelDto,
  ): Promise<ChannelWithPlainCredentials>;
  abstract updateChannel(
    tenant_id: string,
    id: string,
    data: UpdateRetailChannelDto,
  ): Promise<EcommerceChannel>;
  abstract rotateChannelCredentials(
    tenant_id: string,
    id: string,
  ): Promise<{ plainClientId: string; plainClientSecret: string }>;
  abstract revokeChannelCredentials(
    tenant_id: string,
    id: string,
  ): Promise<void>;
  abstract deleteChannel(tenant_id: string, id: string): Promise<void>;
}
