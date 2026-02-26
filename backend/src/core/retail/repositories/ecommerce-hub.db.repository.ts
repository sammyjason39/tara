import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../../../persistence/prisma.service';
import { IEcommerceHubRepository } from './ecommerce-hub.repository.interface';
import {
  EcommerceConnector,
  ConnectorWithPlainKey,
  EcommerceChannel,
  ChannelWithPlainCredentials,
} from '../entities/ecommerce-hub.entity';
import {
  CreateEcommerceConnectorDto,
  UpdateEcommerceConnectorDto,
  CreateRetailChannelDto,
  UpdateRetailChannelDto,
} from '../dto/ecommerce-hub.dto';

// ── Helpers ───────────────────────────────────────────────────

function generateKey(prefix: string, bytes = 32): string {
  return `${prefix}_${randomBytes(bytes).toString('hex')}`;
}

function hashSecret(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function mapConnector(row: any): EcommerceConnector {
  return {
    id: row.id,
    tenantId: row.tenantId,
    branchIds: row.branches?.map((b: any) => b.id) ?? [],
    name: row.name ?? row.domain,
    platform: (row as any).platform ?? 'custom',
    domain: row.domain,
    inventoryPoolId: row.inventoryPoolId,
    managerId: row.managerId,
    status: row.status as EcommerceConnector['status'],
    settings: (row as any).settings ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt ?? null,
  };
}

function mapChannel(row: any): EcommerceChannel {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    type: row.type,
    adapterType: row.adapterType ?? 'CUSTOM',
    integrationCategory: row.integrationCategory ?? 'PRESET',
    status: row.status,
    syncFrequency: row.syncFrequency,
    lastSyncAt: row.lastSyncAt ?? null,
    webhookUrl: row.webhookUrl ?? null,
    credentials: row.credentials as Record<string, unknown> | null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ── Repository ────────────────────────────────────────────────

@Injectable()
export class EcommerceHubDbRepository implements IEcommerceHubRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── EcommerceConnector ─────────────────────────────────────

  async listConnectors(tenantId: string): Promise<EcommerceConnector[]> {
    const rows = await this.prisma.ecommerceConnector.findMany({
      where: { tenantId: tenantId, deletedAt: null },
      include: { branches: { select: { id: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(mapConnector);
  }

  async getConnector(tenantId: string, id: string): Promise<EcommerceConnector | null> {
    const row = await this.prisma.ecommerceConnector.findFirst({
      where: { id, tenantId: tenantId, deletedAt: null },
      include: { branches: { select: { id: true } } },
    });
    return row ? mapConnector(row) : null;
  }

  async createConnector(
    tenantId: string,
    data: CreateEcommerceConnectorDto,
  ): Promise<ConnectorWithPlainKey> {
    const plainApiKey = generateKey('znx_ec_gw'); 
    const apiKeyHash = hashSecret(plainApiKey);

    const row = await (this.prisma.ecommerceConnector as any).create({
      data: {
        tenantId: tenantId,
        name: data.name,
        platform: data.platform,
        domain: data.domain,
        apiKey: apiKeyHash,
        status: 'active',
        inventoryPoolId: data.inventoryPoolId,
        settings: (data.settings ?? {}) as any,
        branches: data.branchIds?.length
          ? { connect: data.branchIds.map((id) => ({ id })) }
          : undefined,
      },
      include: { branches: { select: { id: true } } },
    });
    return { connector: mapConnector(row), plainApiKey };
  }

  async updateConnector(
    tenantId: string,
    id: string,
    data: UpdateEcommerceConnectorDto,
  ): Promise<EcommerceConnector> {
    await this.requireConnector(tenantId, id);
    const row = await (this.prisma.ecommerceConnector as any).update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.platform !== undefined && { platform: data.platform }),
        ...(data.domain !== undefined && { domain: data.domain }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.settings !== undefined && { settings: data.settings }),
        ...(data.inventoryPoolId !== undefined && { inventoryPoolId: data.inventoryPoolId }),
        ...(data.branchIds !== undefined && {
          branches: {
            set: data.branchIds.map((id) => ({ id })),
          },
        }),
      },
      include: { branches: { select: { id: true } } },
    });
    return mapConnector(row);
  }

  async rotateConnectorApiKey(
    tenantId: string,
    id: string,
  ): Promise<{ plainApiKey: string }> {
    await this.requireConnector(tenantId, id);
    const plainApiKey = generateKey('zvx_ec');
    const apiKeyHash = hashSecret(plainApiKey);
    await (this.prisma.ecommerceConnector as any).update({
      where: { id },
      data: { apiKey: apiKeyHash },
    });
    return { plainApiKey };
  }

  async deleteConnector(tenantId: string, id: string): Promise<void> {
    await this.requireConnector(tenantId, id);
    await (this.prisma.ecommerceConnector as any).update({
      where: { id },
      data: { deletedAt: new Date(), status: 'revoked' },
    });
  }

  private async requireConnector(tenantId: string, id: string) {
    const row = await this.prisma.ecommerceConnector.findFirst({
      where: { id, tenantId: tenantId, deletedAt: null },
    });
    if (!row) throw new NotFoundException(`EcommerceConnector ${id} not found`);
    return row;
  }

  // ── RetailChannel ──────────────────────────────────────────

  async listChannels(tenantId: string): Promise<EcommerceChannel[]> {
    const rows = await this.prisma.retailChannel.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(mapChannel);
  }

  async getChannel(tenantId: string, id: string): Promise<EcommerceChannel | null> {
    const row = await this.prisma.retailChannel.findFirst({
      where: { id, tenantId: tenantId },
    });
    return row ? mapChannel(row) : null;
  }

  async createChannel(
    tenantId: string,
    data: CreateRetailChannelDto,
  ): Promise<ChannelWithPlainCredentials> {
    const plainClientId = generateKey('znx_chid', 16); // Channel ID
    const plainClientSecret = generateKey('znx_chcs', 32); // Channel Secret
    const clientSecretHash = hashSecret(plainClientSecret);

    const row = await this.prisma.retailChannel.create({
      data: {
        tenantId: tenantId,
        name: data.name,
        type: data.type,
        adapterType: data.adapterType ?? 'CUSTOM',
        integrationCategory: data.integrationCategory ?? 'PRESET',
        syncFrequency: data.syncFrequency ?? '15min',
        webhookUrl: data.webhookUrl ?? null,
        status: 'active',
        credentials: {
          clientId: plainClientId,
          clientSecretHash,
          branchId: 'branch_main',
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
    tenantId: string,
    id: string,
    data: UpdateRetailChannelDto,
  ): Promise<EcommerceChannel> {
    const existing = await this.requireChannel(tenantId, id);
    const currentCreds = (existing.credentials ?? {}) as Record<string, unknown>;

    const row = await this.prisma.retailChannel.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.adapterType !== undefined && { adapterType: data.adapterType }),
        ...(data.integrationCategory !== undefined && { integrationCategory: data.integrationCategory }),
        ...(data.syncFrequency !== undefined && { syncFrequency: data.syncFrequency }),
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
    tenantId: string,
    id: string,
  ): Promise<{ plainClientId: string; plainClientSecret: string }> {
    const existing = await this.requireChannel(tenantId, id);
    const currentCreds = (existing.credentials ?? {}) as Record<string, unknown>;

    const plainClientId = generateKey('znx_cid', 16);
    const plainClientSecret = generateKey('znx_cs', 32);
    const clientSecretHash = hashSecret(plainClientSecret);

    await this.prisma.retailChannel.update({
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

  async revokeChannelCredentials(tenantId: string, id: string): Promise<void> {
    const existing = await this.requireChannel(tenantId, id);
    const currentCreds = (existing.credentials ?? {}) as Record<string, unknown>;

    await this.prisma.retailChannel.update({
      where: { id },
      data: {
        credentials: { ...currentCreds, revoked: true } as any,
        status: 'suspended',
      },
    });
  }

  async deleteChannel(tenantId: string, id: string): Promise<void> {
    await this.requireChannel(tenantId, id);
    await this.prisma.retailChannel.delete({ where: { id } });
  }

  private async requireChannel(tenantId: string, id: string) {
    const row = await this.prisma.retailChannel.findFirst({
      where: { id, tenantId: tenantId },
    });
    if (!row) throw new NotFoundException(`RetailChannel ${id} not found`);
    return row;
  }
}
