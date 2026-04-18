import { Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes, createHash } from "crypto";
import { PrismaService } from "../../../persistence/prisma.service";
import { IEcommerceHubRepository } from "./ecommerce-hub.repository.interface";
import {
  EcommerceConnector,
  ConnectorWithPlainKey,
  EcommerceChannel,
  ChannelWithPlainCredentials,
} from "../entities/ecommerce-hub.entity";
import {
  CreateEcommerceConnectorDto,
  UpdateEcommerceConnectorDto,
  CreateRetailChannelDto,
  UpdateRetailChannelDto,
} from "../dto/ecommerce-hub.dto";

// ── Helpers ───────────────────────────────────────────────────

function generateKey(prefix: string, bytes = 32): string {
  return `${prefix}_${randomBytes(bytes).toString("hex")}`;
}

function hashSecret(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function mapConnector(row: any): EcommerceConnector {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    branchIds: row.stores?.map((b: any) => b.id) ?? [],
    name: row.name ?? row.domain,
    platform: (row as any).platform ?? "custom",
    domain: row.domain,
    inventoryPoolId: row.inventoryPoolId,
    managerId: row.managerId,
    status: row.status as EcommerceConnector["status"],
    settings: (row as any).settings ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at ?? null,
  };
}

function mapChannel(row: any): EcommerceChannel {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    name: row.name,
    type: row.type,
    adapterType: row.adapterType ?? "CUSTOM",
    integrationCategory: row.integrationCategory ?? "PRESET",
    status: row.status,
    syncFrequency: row.syncFrequency,
    lastSyncAt: row.lastSyncAt ?? null,
    webhookUrl: row.webhookUrl ?? null,
    credentials: row.credentials as Record<string, unknown> | null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ── Repository ────────────────────────────────────────────────

@Injectable()
export class EcommerceHubDbRepository implements IEcommerceHubRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── EcommerceConnector ─────────────────────────────────────

  async listConnectors(tenant_id: string): Promise<EcommerceConnector[]> {
    const rows = await this.prisma.ecommerce_connectors.findMany({
      where: { tenant_id: tenant_id, deleted_at: null },
      include: { stores: { select: { id: true } } },
      orderBy: { created_at: "desc" },
    });
    return rows.map(mapConnector);
  }

  async getConnector(
    tenant_id: string,
    id: string,
  ): Promise<EcommerceConnector | null> {
    const row = await this.prisma.ecommerce_connectors.findFirst({
      where: { id, tenant_id: tenant_id, deleted_at: null },
      include: { stores: { select: { id: true } } },
    });
    return row ? mapConnector(row) : null;
  }

  async createConnector(
    tenant_id: string,
    data: CreateEcommerceConnectorDto,
  ): Promise<ConnectorWithPlainKey> {
    const plainApiKey = generateKey("znx_ec_gw");
    const apiKeyHash = hashSecret(plainApiKey);

    const row = await (this.prisma.ecommerce_connectors as any).create({
      data: {
        id: '54vga3aq',
        updated_at: new Date(),
        tenant_id: tenant_id,
        name: data.name,
        platform: data.platform,
        domain: data.domain,
        apiKey: apiKeyHash,
        status: "active",
        inventoryPoolId: data.inventoryPoolId,
        settings: (data.settings ?? {}) as any,
        stores: data.branchIds?.length
          ? { connect: data.branchIds.map((id) => ({ id })) }
          : undefined,
      },
      include: { stores: { select: { id: true } } },
    });
    return { connector: mapConnector(row), plainApiKey };
  }

  async updateConnector(
    tenant_id: string,
    id: string,
    data: UpdateEcommerceConnectorDto,
  ): Promise<EcommerceConnector> {
    await this.requireConnector(tenant_id, id);
    const row = await (this.prisma.ecommerce_connectors as any).update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.platform !== undefined && { platform: data.platform }),
        ...(data.domain !== undefined && { domain: data.domain }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.settings !== undefined && { settings: data.settings }),
        ...(data.inventoryPoolId !== undefined && {
          inventoryPoolId: data.inventoryPoolId,
        }),
        ...(data.branchIds !== undefined && {
          stores: {
            set: data.branchIds.map((id) => ({ id })),
          },
        }),
      },
      include: { stores: { select: { id: true } } },
    });
    return mapConnector(row);
  }

  async rotateConnectorApiKey(
    tenant_id: string,
    id: string,
  ): Promise<{ plainApiKey: string }> {
    await this.requireConnector(tenant_id, id);
    const plainApiKey = generateKey("zvx_ec");
    const apiKeyHash = hashSecret(plainApiKey);
    await (this.prisma.ecommerce_connectors as any).update({
      where: { id },
      data: { apiKey: apiKeyHash },
    });
    return { plainApiKey };
  }

  async deleteConnector(tenant_id: string, id: string): Promise<void> {
    await this.requireConnector(tenant_id, id);
    await (this.prisma.ecommerce_connectors as any).update({
      where: { id },
      data: { deleted_at: new Date(), status: "revoked" },
    });
  }

  private async requireConnector(tenant_id: string, id: string) {
    const row = await this.prisma.ecommerce_connectors.findFirst({
      where: { id, tenant_id: tenant_id, deleted_at: null },
    });
    if (!row) throw new NotFoundException(`EcommerceConnector ${id} not found`);
    return row;
  }

  // ── RetailChannel ──────────────────────────────────────────

  async listChannels(tenant_id: string): Promise<EcommerceChannel[]> {
    const rows = await this.prisma.retail_channels.findMany({
      where: { tenant_id: tenant_id },
      orderBy: { created_at: "desc" },
    });
    return rows.map(mapChannel);
  }

  async getChannel(
    tenant_id: string,
    id: string,
  ): Promise<EcommerceChannel | null> {
    const row = await this.prisma.retail_channels.findFirst({
      where: { id, tenant_id: tenant_id },
    });
    return row ? mapChannel(row) : null;
  }

  async createChannel(
    tenant_id: string,
    data: CreateRetailChannelDto,
  ): Promise<ChannelWithPlainCredentials> {
    const plainClientId = generateKey("znx_chid", 16); // Channel ID
    const plainClientSecret = generateKey("znx_chcs", 32); // Channel Secret
    const clientSecretHash = hashSecret(plainClientSecret);

    const row = await this.prisma.retail_channels.create({
      data: {
        id: '10qxf1m4',
        updated_at: new Date(),
        tenant_id: tenant_id,
        name: data.name,
        type: data.type,
        adapter_type: data.adapterType ?? "CUSTOM",
        integration_category: data.integrationCategory ?? "PRESET",
        sync_frequency: data.syncFrequency ?? "15min",
        webhook_url: data.webhookUrl ?? null,
        status: "active",
        credentials: {
          clientId: plainClientId,
          clientSecretHash,
          branch_id: "branch_main",
          revoked: false,
          settings: (data.settings ?? {}) as any,
        } as any,
      },
    });
    return {
      channel: mapChannel(row),
      plainClientId,
      plainClientSecret,
    };
  }

  async updateChannel(
    tenant_id: string,
    id: string,
    data: UpdateRetailChannelDto,
  ): Promise<EcommerceChannel> {
    const existing = await this.requireChannel(tenant_id, id);
    const currentCreds = (existing.credentials ?? {}) as Record<
      string,
      unknown
    >;

    const row = await this.prisma.retail_channels.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.adapterType !== undefined && {
          adapterType: data.adapterType,
        }),
        ...(data.integrationCategory !== undefined && {
          integrationCategory: data.integrationCategory,
        }),
        ...(data.syncFrequency !== undefined && {
          syncFrequency: data.syncFrequency,
        }),
        ...(data.webhookUrl !== undefined && { webhookUrl: data.webhookUrl }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.settings !== undefined && {
          credentials: { ...currentCreds, settings: data.settings } as any,
        }),
      },
    });
    return mapChannel(row);
  }

  async rotateChannelCredentials(
    tenant_id: string,
    id: string,
  ): Promise<{ plainClientId: string; plainClientSecret: string }> {
    const existing = await this.requireChannel(tenant_id, id);
    const currentCreds = (existing.credentials ?? {}) as Record<
      string,
      unknown
    >;

    const plainClientId = generateKey("znx_cid", 16);
    const plainClientSecret = generateKey("znx_cs", 32);
    const clientSecretHash = hashSecret(plainClientSecret);

    await this.prisma.retail_channels.update({
      where: { id },
      data: {
        credentials: {
          ...currentCreds,
          clientId: plainClientId,
          clientSecretHash,
          revoked: false,
        } as any,
      },
    });

    return { plainClientId, plainClientSecret };
  }

  async revokeChannelCredentials(tenant_id: string, id: string): Promise<void> {
    const existing = await this.requireChannel(tenant_id, id);
    const currentCreds = (existing.credentials ?? {}) as Record<
      string,
      unknown
    >;

    await this.prisma.retail_channels.update({
      where: { id },
      data: {
        credentials: { ...currentCreds, revoked: true } as any,
        status: "suspended",
      },
    });
  }

  async deleteChannel(tenant_id: string, id: string): Promise<void> {
    await this.requireChannel(tenant_id, id);
    await this.prisma.retail_channels.delete({ where: { id } });
  }

  private async requireChannel(tenant_id: string, id: string) {
    const row = await this.prisma.retail_channels.findFirst({
      where: { id, tenant_id: tenant_id },
    });
    if (!row) throw new NotFoundException(`RetailChannel ${id} not found`);
    return row;
  }
}
