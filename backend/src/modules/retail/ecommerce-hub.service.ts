import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { IEcommerceHubRepository } from "./repositories/ecommerce-hub.repository.interface";
import {
  EcommerceConnector,
  ConnectorWithPlainKey,
  EcommerceChannel,
  ChannelWithPlainCredentials,
} from "./entities/ecommerce-hub.entity";
import {
  CreateEcommerceConnectorDto,
  UpdateEcommerceConnectorDto,
  CreateRetailChannelDto,
  UpdateRetailChannelDto,
} from "./dto/ecommerce-hub.dto";

import { AuditService } from "../../shared/audit/audit.service";

@Injectable()
export class EcommerceHubService {
  constructor(
    private readonly repo: IEcommerceHubRepository,
    private readonly audit: AuditService,
  ) {}

  // ── EcommerceConnectors ────────────────────────────────────

  async listConnectors(tenant_id: string): Promise<EcommerceConnector[]> {
    return this.repo.listConnectors(tenant_id);
  }

  async getConnector(
    tenant_id: string,
    id: string,
  ): Promise<EcommerceConnector> {
    const connector = await this.repo.getConnector(tenant_id, id);
    if (!connector) {
      throw new NotFoundException(`EcommerceConnector ${id} not found`);
    }
    return connector;
  }

  async createConnector(
    tenant_id: string,
    dto: CreateEcommerceConnectorDto,
    user_id: string = "system",
  ): Promise<ConnectorWithPlainKey> {
    if (!dto.name || !dto.platform || !dto.domain) {
      throw new BadRequestException("name, platform, and domain are required");
    }
    const result = await this.repo.createConnector(tenant_id, dto);

    await this.audit.log({
      tenant_id,
      user_id,
      module: "retail",
      action: "CREATE_CONNECTOR",
      entity_type: "EcommerceConnector",
      entity_id: result.connector.id,
      metadata: { platform: dto.platform, domain: dto.domain },
    });

    return result;
  }

  async updateConnector(
    tenant_id: string,
    id: string,
    dto: UpdateEcommerceConnectorDto,
    user_id: string = "system",
  ): Promise<EcommerceConnector> {
    await this.getConnector(tenant_id, id); // ensure exists
    const result = await this.repo.updateConnector(tenant_id, id, dto);

    await this.audit.log({
      tenant_id,
      user_id,
      module: "retail",
      action: "UPDATE_CONNECTOR",
      entity_type: "EcommerceConnector",
      entity_id: id,
      metadata: { updates: dto },
    });

    return result;
  }

  async rotateConnectorApiKey(
    tenant_id: string,
    id: string,
    user_id: string = "system",
  ): Promise<{ plainApiKey: string }> {
    await this.getConnector(tenant_id, id);
    const result = await this.repo.rotateConnectorApiKey(tenant_id, id);

    await this.audit.log({
      tenant_id,
      user_id,
      module: "retail",
      action: "ROTATE_CONNECTOR_KEY",
      entity_type: "EcommerceConnector",
      entity_id: id,
    });

    return result;
  }

  async deleteConnector(
    tenant_id: string,
    id: string,
    user_id: string = "system",
  ): Promise<{ deleted: boolean }> {
    await this.getConnector(tenant_id, id);
    await this.repo.deleteConnector(tenant_id, id);

    await this.audit.log({
      tenant_id,
      user_id,
      module: "retail",
      action: "DELETE_CONNECTOR",
      entity_type: "EcommerceConnector",
      entity_id: id,
    });

    return { deleted: true };
  }

  /** Lightweight domain-level ping to verify connectivity. Only for PRESET (Marketplace) channels. */
  async testConnector(
    tenant_id: string,
    id: string,
  ): Promise<{ reachable: boolean; latencyMs: number; error?: string }> {
    const channel = await this.repo.getChannel(tenant_id, id);
    if (!channel || channel.integrationCategory !== "PRESET") {
      return {
        reachable: false,
        latencyMs: 0,
        error: "Connectivity tests only supported for PRESET channels",
      };
    }

    const url = channel.webhookUrl ?? "";
    if (!url.startsWith("http"))
      return { reachable: false, latencyMs: 0, error: "Invalid webhook URL" };

    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      await fetch(url, { method: "HEAD", signal: controller.signal });
      clearTimeout(timeout);
      return { reachable: true, latencyMs: Date.now() - start };
    } catch (err: any) {
      return {
        reachable: false,
        latencyMs: Date.now() - start,
        error: err?.message ?? "unreachable",
      };
    }
  }

  // ── RetailChannels ─────────────────────────────────────────

  async listChannels(tenant_id: string): Promise<EcommerceChannel[]> {
    return this.repo.listChannels(tenant_id);
  }

  async getChannel(tenant_id: string, id: string): Promise<EcommerceChannel> {
    const channel = await this.repo.getChannel(tenant_id, id);
    if (!channel) {
      throw new NotFoundException(`RetailChannel ${id} not found`);
    }
    return channel;
  }

  async createChannel(
    tenant_id: string,
    dto: CreateRetailChannelDto,
    user_id: string = "system",
  ): Promise<ChannelWithPlainCredentials> {
    if (!dto.name || !dto.type) {
      throw new BadRequestException("name and type are required");
    }

    // Determine category if not explicitly provided
    if (!dto.integrationCategory) {
      dto.integrationCategory = this.determineCategory(
        dto.type,
        dto.adapterType,
      );
    }

    const result = await this.repo.createChannel(tenant_id, dto);

    await this.audit.log({
      tenant_id,
      user_id,
      module: "retail",
      action: "CREATE_CHANNEL",
      entity_type: "RetailChannel",
      entity_id: result.channel.id,
      metadata: { type: dto.type, category: dto.integrationCategory },
    });

    return result;
  }

  private determineCategory(
    type: string,
    adapterType?: string,
  ): "HEADLESS" | "PREMADE" | "PRESET" {
    const t = type.toLowerCase();
    const a = adapterType?.toUpperCase();

    if (t === "headless" || a === "CUSTOM") return "HEADLESS";
    if (
      t === "marketplace" ||
      a === "SHOPEE" ||
      a === "TOKOPEDIA" ||
      a === "LAZADA" ||
      a === "TIKTOK"
    ) {
      return "PRESET";
    }
    return "PREMADE"; // Default for standard e-commerce integrations like WooCommerce/Shopify
  }

  async updateChannel(
    tenant_id: string,
    id: string,
    dto: UpdateRetailChannelDto,
    user_id: string = "system",
  ): Promise<EcommerceChannel> {
    await this.getChannel(tenant_id, id);
    const result = await this.repo.updateChannel(tenant_id, id, dto);

    await this.audit.log({
      tenant_id,
      user_id,
      module: "retail",
      action: "UPDATE_CHANNEL",
      entity_type: "RetailChannel",
      entity_id: id,
      metadata: { updates: dto },
    });

    return result;
  }

  async rotateChannelCredentials(
    tenant_id: string,
    id: string,
    user_id: string = "system",
  ): Promise<{ plainClientId: string; plainClientSecret: string }> {
    const channel = await this.getChannel(tenant_id, id);
    const creds = channel.credentials as { revoked?: boolean } | null;
    if (creds?.revoked) {
      throw new ConflictException(
        "Channel credentials are revoked — re-create the channel instead",
      );
    }
    const result = await this.repo.rotateChannelCredentials(tenant_id, id);

    await this.audit.log({
      tenant_id,
      user_id,
      module: "retail",
      action: "ROTATE_CHANNEL_CREDENTIALS",
      entity_type: "RetailChannel",
      entity_id: id,
    });

    return result;
  }

  async revokeChannelCredentials(
    tenant_id: string,
    id: string,
    user_id: string = "system",
  ): Promise<{ revoked: boolean }> {
    await this.getChannel(tenant_id, id);
    await this.repo.revokeChannelCredentials(tenant_id, id);

    await this.audit.log({
      tenant_id,
      user_id,
      module: "retail",
      action: "REVOKE_CHANNEL_CREDENTIALS",
      entity_type: "RetailChannel",
      entity_id: id,
    });

    return { revoked: true };
  }

  async deleteChannel(
    tenant_id: string,
    id: string,
    user_id: string = "system",
  ): Promise<{ deleted: boolean }> {
    await this.getChannel(tenant_id, id);
    await this.repo.deleteChannel(tenant_id, id);

    await this.audit.log({
      tenant_id,
      user_id,
      module: "retail",
      action: "DELETE_CHANNEL",
      entity_type: "RetailChannel",
      entity_id: id,
    });

    return { deleted: true };
  }
}
