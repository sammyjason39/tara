import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../persistence/prisma.service";
import { IRetailRepository } from "./retail.repository.interface";
import {
  RetailStore,
  RetailProduct,
  RetailOrder,
  RetailShift,
  RetailOrderItem,
} from "../entities/retail.entity";
import {
  CreateStoreDto,
  UpdateStoreDto,
  CreateOrderDto,
  OpenShiftDto,
  CloseShiftDto,
  CreateEcommerceStoreDto,
  UpdateEcommerceStoreDto,
  CreateInventoryPoolDto,
} from "../dto/retail.dto";
import { createHash } from "crypto";
import {
  Store,
  Product,
  RetailOrder as PrismaOrder,
  RetailOrderItem as PrismaOrderItem,
  RetailShift as PrismaShift,
  RetailChannel,
  RetailCustomer,
  RetailCustomerSession,
  RetailCart,
  RetailCartItem,
  RetailWishlist,
  RetailWishlistItem,
  RetailPromotion,
  Prisma,
} from "@prisma/client";

@Injectable()
export class RetailDbRepository implements IRetailRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // BRANCHES (Physical Stores)
  // ============================================================

  async listStores(
    tenantId: string,
    locationId?: string,
  ): Promise<RetailStore[]> {
    const where: any = { tenantId: tenantId, deletedAt: null };
    if (locationId) where.locationId = locationId;

    const stores = await this.prisma.store.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return stores.map((s: Store) => this.mapStore(s));
  }

  async getStore(
    tenantId: string,
    storeId: string,
  ): Promise<RetailStore | null> {
    const store = await this.prisma.store.findFirst({
      where: { id: storeId, tenantId: tenantId, deletedAt: null },
    });
    return store ? this.mapStore(store) : null;
  }

  async createStore(
    tenantId: string,
    data: CreateStoreDto,
  ): Promise<RetailStore> {
    return await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        let finalLocationId = data.locationId;

        // If locationId is a placeholder or missing, create a new Location for this Branch
        if (
          !finalLocationId ||
          finalLocationId === "loc-default" ||
          finalLocationId === "placeholder"
        ) {
          const newLocation = await tx.location.create({
            data: {
              tenantId: tenantId,
              name: data.name,
              code: data.code,
              address: data.address || "Main Street",
              type: "branch",
              country: data.country,
              currency: data.currency,
            },
          });
          finalLocationId = newLocation.id;
        }

        const store = await tx.store.create({
          data: {
            tenantId: tenantId,
            locationId: finalLocationId,
            name: data.name,
            code: data.code,
            type: data.type,
            phone: data.phone,
            email: data.email,
            timezone: data.timezone ?? "Asia/Jakarta",
            operatingHours: data.operatingHours as any,
            inventoryPoolId: data.inventoryPoolId,
            managerId: data.managerId,
            settings: data.settings as any,
            country: data.country,
            currency: data.currency,
          },
        });
        return this.mapStore(store);
      },
    );
  }

  async updateStore(
    tenantId: string,
    storeId: string,
    data: UpdateStoreDto,
  ): Promise<RetailStore> {
    const store = await this.prisma.store.update({
      where: { id: storeId, tenantId: tenantId },
      data: {
        name: data.name,
        type: data.type,
        phone: data.phone,
        email: data.email,
        timezone: data.timezone,
        managerId: data.managerId,
        inventoryPoolId: data.inventoryPoolId,
        operatingHours: data.operatingHours as any,
        settings: data.settings as any,
        status: data.status,
      },
    });
    return this.mapStore(store);
  }

  async deleteStore(tenantId: string, storeId: string): Promise<void> {
    await this.prisma.store.update({
      where: { id: storeId, tenantId: tenantId },
      data: { deletedAt: new Date(), status: "decommissioned" },
    });
  }

  // ============================================================
  // INVENTORY POOLS
  // ============================================================

  async listInventoryPools(tenantId: string): Promise<any[]> {
    return this.prisma.inventoryPool.findMany({
      where: { tenantId: tenantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
  }

  async createInventoryPool(
    tenantId: string,
    data: CreateInventoryPoolDto,
  ): Promise<any> {
    return this.prisma.inventoryPool.create({
      data: {
        tenantId: tenantId,
        name: data.name,
        description: data.description,
        type: data.type ?? "shared",
      },
    });
  }

  async getInventoryPool(
    tenantId: string,
    poolId: string,
  ): Promise<any | null> {
    return this.prisma.inventoryPool.findFirst({
      where: { id: poolId, tenantId: tenantId, deletedAt: null },
      include: { stock: { include: { product: true } } },
    });
  }

  async deleteInventoryPool(tenantId: string, poolId: string): Promise<void> {
    await this.prisma.inventoryPool.update({
      where: { id: poolId, tenantId: tenantId },
      data: { deletedAt: new Date() },
    });
  }

  // ============================================================
  // E-COMMERCE STORES
  // ============================================================

  async listEcommerceStores(
    tenantId: string,
    storeId?: string,
  ): Promise<any[]> {
    const where: any = { tenantId: tenantId, deletedAt: null };
    if (storeId) {
      where.branches = { some: { id: storeId } };
    }

    const stores = await this.prisma.ecommerceConnector.findMany({
      where,
      include: { branches: { select: { id: true, name: true, code: true } } },
      orderBy: { createdAt: "desc" },
    });
    return stores.map((s: any) => this.mapEcommerceStore(s));
  }

  async getEcommerceStore(
    tenantId: string,
    storeId: string,
  ): Promise<any | null> {
    const store = await this.prisma.ecommerceConnector.findFirst({
      where: { id: storeId, tenantId: tenantId, deletedAt: null },
      include: { branches: { select: { id: true, name: true, code: true } } },
    });
    return store ? this.mapEcommerceStore(store) : null;
  }

  async createEcommerceStore(
    tenantId: string,
    data: CreateEcommerceStoreDto,
  ): Promise<any> {
    const rawKey = `znx_ec_${createHash("sha256").update(`${tenantId}:${data.domain}:${Date.now()}`).digest("hex").slice(0, 24)}`;
    const apiKeyHash = createHash("sha256").update(rawKey).digest("hex");

    const store = await this.prisma.ecommerceConnector.create({
      data: {
        tenantId: tenantId,
        name: data.name,
        platform: data.platform,
        domain: data.domain,
        apiKey: apiKeyHash,
        inventoryPoolId: data.inventoryPoolId,
        managerId: data.managerId,
        settings: data.settings as any,
        status: "active",
        branches: data.branchIds?.length
          ? { connect: data.branchIds.map((id) => ({ id })) }
          : undefined,
      },
      include: { branches: { select: { id: true, name: true, code: true } } },
    });

    // Return the store but with the RAW key once so the user can save it
    return {
      ...this.mapEcommerceStore(store),
      apiKey: rawKey,
    };
  }

  async updateEcommerceStore(
    tenantId: string,
    storeId: string,
    data: UpdateEcommerceStoreDto,
  ): Promise<any> {
    const store = await this.prisma.ecommerceConnector.update({
      where: { id: storeId, tenantId: tenantId },
      data: {
        name: data.name,
        domain: data.domain,
        status: data.status,
        inventoryPoolId: data.inventoryPoolId,
        managerId: data.managerId,
        settings: data.settings as any,
      },
      include: { branches: { select: { id: true, name: true, code: true } } },
    });
    return this.mapEcommerceStore(store);
  }

  async deleteEcommerceStore(tenantId: string, storeId: string): Promise<void> {
    await this.prisma.ecommerceConnector.update({
      where: { id: storeId, tenantId: tenantId },
      data: { deletedAt: new Date(), status: "inactive" },
    });
  }

  async linkEcommerceToBranch(
    tenantId: string,
    ecommerceId: string,
    branchId: string,
  ): Promise<void> {
    await this.prisma.ecommerceConnector.update({
      where: { id: ecommerceId, tenantId: tenantId },
      data: { branches: { connect: { id: branchId } } },
    });
  }

  async unlinkEcommerceFromBranch(
    tenantId: string,
    ecommerceId: string,
    branchId: string,
  ): Promise<void> {
    await this.prisma.ecommerceConnector.update({
      where: { id: ecommerceId, tenantId: tenantId },
      data: { branches: { disconnect: { id: branchId } } },
    });
  }

  // ============================================================
  // PRODUCTS
  // ============================================================

  async listProducts(tenantId: string): Promise<RetailProduct[]> {
    const products = await this.prisma.product.findMany({
      where: { tenantId: tenantId, status: "active" },
      orderBy: { name: "asc" },
    });
    return products.map((p: Product) => this.mapProduct(p));
  }

  async getProduct(
    tenantId: string,
    productId: string,
  ): Promise<RetailProduct | null> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId: tenantId },
    });
    return product ? this.mapProduct(product) : null;
  }

  // ============================================================
  // ORDERS
  // ============================================================

  async listOrders(tenantId: string, storeId?: string): Promise<RetailOrder[]> {
    const where: any = { tenantId: tenantId };
    if (storeId) where.storeId = storeId;

    const orders = await this.prisma.retailOrder.findMany({
      where,
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return orders.map(
      (
        o: PrismaOrder & {
          items: (PrismaOrderItem & { product: Product | null })[];
        },
      ) => this.mapOrder(o),
    );
  }

  async getOrder(
    tenantId: string,
    orderId: string,
  ): Promise<RetailOrder | null> {
    const order = await this.prisma.retailOrder.findFirst({
      where: { id: orderId, tenantId: tenantId },
      include: { items: { include: { product: true } } },
    });
    return order ? this.mapOrder(order) : null;
  }

  async createOrder(
    tenantId: string,
    locationId: string,
    data: CreateOrderDto,
  ): Promise<RetailOrder> {
    let subtotal = 0;

    const itemsData = await Promise.all(
      data.items.map(async (item) => {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
        });
        if (!product) throw new Error(`Product ${item.productId} not found`);

        const itemSubtotal = item.quantity * item.unitPrice;
        subtotal += itemSubtotal;

        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: itemSubtotal,
          discount: 0,
        };
      }),
    );

    const order = await this.prisma.retailOrder.create({
      data: {
        tenantId: tenantId,
        storeId: data.storeId,
        deviceId: data.terminalId,
        cashierId: "emp-001",
        customerId: data.customerId,
        status: "pending",
        subtotal,
        tax: 0,
        totalAmount: subtotal,
        paymentMethod: data.paymentMethod,
        items: { create: itemsData },
      },
      include: { items: { include: { product: true } } },
    });

    return this.mapOrder(order);
  }

  async updateOrderStatus(
    tenantId: string,
    orderId: string,
    status: string,
    metadata?: any,
  ): Promise<RetailOrder> {
    const order = await this.prisma.retailOrder.update({
      where: { id: orderId, tenantId: tenantId },
      data: {
        status,
        ...(metadata?.tax_total !== undefined && { tax: metadata.tax_total }),
      },
      include: { items: { include: { product: true } } },
    });
    return this.mapOrder(order);
  }

  // ============================================================
  // INVENTORY / STOCK
  // ============================================================

  async reserveStock(
    tenantId: string,
    productId: string,
    quantity: number,
  ): Promise<{ success: boolean; reservationId?: string }> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId: tenantId },
    });
    if (!product) return { success: false };
    return { success: true, reservationId: `res_${Date.now()}` };
  }

  async releaseStock(
    tenantId: string,
    productId: string,
    quantity: number,
  ): Promise<void> {
    return;
  }

  async checkStock(
    tenantId: string,
    productId: string,
  ): Promise<{ available: number; status: string }> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId: tenantId },
    });
    if (!product) return { available: 0, status: "OUT_OF_STOCK" };
    const available = 100;
    return {
      available,
      status:
        available > 10
          ? "IN_STOCK"
          : available > 0
            ? "LOW_STOCK"
            : "OUT_OF_STOCK",
    };
  }

  // ============================================================
  // SHIFTS
  // ============================================================

  async getActiveShift(
    tenantId: string,
    storeId: string,
    employeeId: string,
  ): Promise<RetailShift | null> {
    const shift = await this.prisma.retailShift.findFirst({
      where: { tenantId: tenantId, storeId, employeeId, status: "open" },
    });
    return shift ? this.mapShift(shift) : null;
  }

  async openShift(
    tenantId: string,
    locationId: string,
    employeeId: string,
    data: OpenShiftDto,
  ): Promise<RetailShift> {
    const shift = await this.prisma.retailShift.create({
      data: {
        tenantId: tenantId,
        storeId: data.storeId,
        employeeId,
        startTime: new Date(),
        openingCash: data.openingCash,
        status: "open",
      },
    });
    return this.mapShift(shift);
  }

  async closeShift(
    tenantId: string,
    shiftId: string,
    data: CloseShiftDto,
  ): Promise<RetailShift> {
    const shift = await this.prisma.retailShift.update({
      where: { id: shiftId, tenantId: tenantId },
      data: {
        endTime: new Date(),
        closingCash: data.closingCash,
        status: "closed",
        notes: data.notes,
      },
    });
    return this.mapShift(shift);
  }

  async listShifts(tenantId: string, storeId?: string): Promise<RetailShift[]> {
    const where: any = { tenantId: tenantId };
    if (storeId) where.storeId = storeId;

    const shifts = await this.prisma.retailShift.findMany({
      where,
      orderBy: { startTime: "desc" },
      take: 50,
    });
    return shifts.map((s: PrismaShift) => this.mapShift(s));
  }

  // ============================================================
  // PROMOTIONS
  // ============================================================

  async listPromotions(tenantId: string): Promise<any[]> {
    const promotions = await this.prisma.retailPromotion.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: "desc" },
    });
    return promotions.map((p: RetailPromotion) => ({
      id: p.id,
      tenant_id: p.tenantId,
      title: p.title,
      type: p.type,
      value: Number(p.value),
      start_date: p.startDate,
      end_date: p.endDate,
      status: p.status,
      target: p.target,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
    }));
  }

  async updatePromotion(
    tenantId: string,
    promotionId: string,
    data: any,
  ): Promise<any> {
    const promotion = await this.prisma.retailPromotion.update({
      where: { id: promotionId, tenantId: tenantId },
      data: {
        status: data.status,
        ...(data.value && { value: data.value }),
        ...(data.endDate && { endDate: new Date(data.endDate) }),
      },
    });
    return {
      id: promotion.id,
      tenant_id: promotion.tenantId,
      title: promotion.title,
      type: promotion.type,
      value: Number(promotion.value),
      start_date: promotion.startDate,
      end_date: promotion.endDate,
      status: promotion.status,
      target: promotion.target,
      created_at: promotion.createdAt,
      updated_at: promotion.updatedAt,
    };
  }

  // ============================================================
  // CHANNELS (Legacy Ecommerce Hub)
  // ============================================================

  async listChannels(tenantId: string): Promise<any[]> {
    const channels = await this.prisma.retailChannel.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: "desc" },
    });
    return channels.map((c: RetailChannel) => {
      const credentials = c.credentials as {
        clientId?: string;
        clientSecret?: string;
        branchId?: string;
        gatewayUrl?: string;
        connector?: string;
      } | null;
      return {
        id: c.id,
        tenant_id: c.tenantId,
        branchId: credentials?.branchId,
        name: c.name,
        type: c.type,
        status: c.status,
        sync_frequency: c.syncFrequency,
        last_sync_at: c.lastSyncAt,
        clientId: credentials?.clientId,
        channelId: credentials?.clientId,
        clientSecret: credentials?.clientSecret,
        gatewayUrl: credentials?.gatewayUrl,
        connector: credentials?.connector,
        created_at: c.createdAt,
        updated_at: c.updatedAt,
      };
    });
  }

  async createChannel(tenantId: string, data: any): Promise<any> {
    const credentials = data.credentials
      ? {
          clientId: data.credentials.clientId,
          clientSecret: data.credentials.clientSecret,
          clientSecretHash: this.hashSecret(data.credentials.clientSecret),
          branchId: data.branchId ?? "branch_main",
          domain: data.domain ?? null,
          tenantId,
          gatewayUrl: data.gatewayUrl ?? null,
          connector: data.connector ?? data.name ?? null,
          revoked: false,
          lastRotated: new Date().toISOString(),
        }
      : undefined;

    const channel = await this.prisma.retailChannel.create({
      data: {
        tenantId: tenantId,
        name: data.name,
        type: data.type,
        status: "active",
        syncFrequency: data.sync_frequency || data.syncFrequency || "hourly",
        credentials: credentials as any,
      },
    });
    const creds = channel.credentials as {
      clientId?: string;
      clientSecret?: string;
      branchId?: string;
      gatewayUrl?: string;
      connector?: string;
    } | null;
    return {
      id: channel.id,
      tenant_id: channel.tenantId,
      branchId: creds?.branchId,
      name: channel.name,
      type: channel.type,
      status: channel.status,
      sync_frequency: channel.syncFrequency,
      last_sync_at: channel.lastSyncAt,
      clientId: creds?.clientId,
      channelId: creds?.clientId,
      clientSecret: creds?.clientSecret,
      gatewayUrl: creds?.gatewayUrl,
      connector: creds?.connector,
      created_at: channel.createdAt,
      updated_at: channel.updatedAt,
    };
  }

  async updateChannel(
    tenantId: string,
    channelId: string,
    data: any,
  ): Promise<any> {
    const updates: any = {};
    if (typeof data.name === "string") updates.name = data.name;
    const nextSync = data.sync_frequency ?? data.syncFrequency;
    if (typeof nextSync === "string") updates.syncFrequency = nextSync;
    if (typeof data.status === "string") updates.status = data.status;

    const channel =
      Object.keys(updates).length === 0
        ? await this.prisma.retailChannel.findFirst({
            where: { id: channelId, tenantId: tenantId },
          })
        : await this.prisma.retailChannel.update({
            where: { id: channelId, tenantId: tenantId },
            data: updates,
          });

    if (!channel) throw new Error("Channel not found");

    const credentials = channel.credentials as {
      clientId?: string;
      clientSecret?: string;
      branchId?: string;
      gatewayUrl?: string;
      connector?: string;
    } | null;
    return {
      id: channel.id,
      tenant_id: channel.tenantId,
      branchId: credentials?.branchId,
      name: channel.name,
      type: channel.type,
      status: channel.status,
      sync_frequency: channel.syncFrequency,
      last_sync_at: channel.lastSyncAt,
      clientId: credentials?.clientId,
      channelId: credentials?.clientId,
      clientSecret: credentials?.clientSecret,
      gatewayUrl: credentials?.gatewayUrl,
      connector: credentials?.connector,
      created_at: channel.createdAt,
      updated_at: channel.updatedAt,
    };
  }

  async deleteChannel(
    tenantId: string,
    channelId: string,
  ): Promise<{ success: boolean }> {
    await this.prisma.retailChannel.update({
      where: { id: channelId, tenantId: tenantId },
      data: { status: "inactive" },
    });
    return { success: true };
  }

  async syncChannel(
    tenantId: string,
    channelId: string,
  ): Promise<{ success: boolean }> {
    await this.prisma.retailChannel.update({
      where: { id: channelId, tenantId: tenantId },
      data: { lastSyncAt: new Date() },
    });
    return { success: true };
  }

  async getChannelById(
    tenantId: string,
    channelId: string,
  ): Promise<any | null> {
    return this.prisma.retailChannel.findFirst({
      where: { id: channelId, tenantId: tenantId },
    });
  }

  async updateChannelCredentials(
    tenantId: string,
    channelId: string,
    credentials: any,
  ): Promise<any> {
    return this.prisma.retailChannel.update({
      where: { id: channelId, tenantId: tenantId },
      data: { credentials },
    });
  }

  async findChannelByClientId(
    tenantId: string,
    clientId: string,
  ): Promise<any | null> {
    const channels = await this.prisma.retailChannel.findMany({
      where: { tenantId: tenantId },
    });
    return (
      channels.find((c: RetailChannel) => {
        const creds = c.credentials as { clientId?: string } | null;
        return creds?.clientId === clientId;
      }) || null
    );
  }

  // ============================================================
  // DEVICES
  // ============================================================

  async listDevices(tenantId: string, storeId?: string): Promise<any[]> {
    const where: any = { tenantId: tenantId };
    if (storeId) where.storeId = storeId;
    const devices = await this.prisma.pOSDevice.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return devices.map((d: any) => ({
      id: d.id,
      tenant_id: d.tenantId,
      store_id: d.storeId,
      name: d.name,
      type: d.type,
      is_active: d.isActive,
      mac_address: d.macAddress,
      created_at: d.createdAt,
      updated_at: d.updatedAt,
    }));
  }

  async pingDevice(
    tenantId: string,
    deviceId: string,
  ): Promise<{ success: boolean }> {
    await this.prisma.pOSDevice.update({
      where: { id: deviceId, tenantId: tenantId },
      data: { updatedAt: new Date() },
    });
    return { success: true };
  }

  // ============================================================
  // PAYMENTS & RETURNS
  // ============================================================

  async processPayment(
    tenantId: string,
    orderId: string,
    data: { amount: number; method: string; shiftId?: string },
  ): Promise<any> {
    const order = await this.prisma.retailOrder.update({
      where: { id: orderId, tenantId: tenantId },
      data: { paymentMethod: data.method, status: "paid" },
    });
    return {
      success: true,
      order_id: order.id,
      amount: Number(order.totalAmount),
      method: data.method,
    };
  }

  async processReturn(
    tenantId: string,
    orderId: string,
    data: { itemIds: string[]; shiftId?: string },
  ): Promise<{ success: boolean }> {
    await this.prisma.retailOrder.update({
      where: { id: orderId, tenantId: tenantId },
      data: { status: "refunded" },
    });
    return { success: true };
  }

  // ============================================================
  // INVENTORY OPERATIONS
  // ============================================================

  async submitOpname(
    tenantId: string,
    data: { storeId: string; adjustments: any[]; shiftId?: string },
  ): Promise<{ success: boolean }> {
    return { success: true };
  }

  async receiveGoods(
    tenantId: string,
    data: {
      storeId: string;
      shipmentId: string;
      items: any[];
      shiftId?: string;
    },
  ): Promise<{ success: boolean }> {
    return { success: true };
  }

  // ============================================================
  // PUBLIC GATEWAY — CUSTOMERS
  // ============================================================

  async findCustomerByEmail(
    tenantId: string,
    email: string,
  ): Promise<any | null> {
    return this.prisma.retailCustomer.findFirst({
      where: { tenantId: tenantId, email },
      include: { auth: true },
    });
  }

  async findCustomerById(
    tenantId: string,
    customerId: string,
  ): Promise<any | null> {
    return this.prisma.retailCustomer.findFirst({
      where: { tenantId: tenantId, id: customerId },
      include: { auth: true },
    });
  }

  async createCustomer(tenantId: string, data: any): Promise<any> {
    return this.prisma.retailCustomer.create({
      data: {
        tenantId: tenantId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        auth: data.passwordHash
          ? {
              create: {
                passwordHash: data.passwordHash,
                passwordUpdatedAt: new Date(),
              },
            }
          : undefined,
      },
    });
  }

  async updateCustomer(
    tenantId: string,
    customerId: string,
    data: any,
  ): Promise<any> {
    return this.prisma.retailCustomer.update({
      where: { id: customerId, tenantId: tenantId },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        points: data.points,
        tier: data.tier,
      },
    });
  }

  // --- Sessions ---

  async createCustomerSession(tenantId: string, data: any): Promise<any> {
    return this.prisma.retailCustomerSession.create({
      data: {
        tenantId: tenantId,
        customerId: data.customerId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }

  async findCustomerSession(
    tenantId: string,
    tokenHash: string,
  ): Promise<any | null> {
    return this.prisma.retailCustomerSession.findFirst({
      where: {
        tenantId: tenantId,
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async revokeCustomerSession(
    tenantId: string,
    tokenHash: string,
  ): Promise<void> {
    await this.prisma.retailCustomerSession.updateMany({
      where: { tenantId: tenantId, tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // --- Cart ---

  async getCart(tenantId: string, customerId: string): Promise<any | null> {
    return this.prisma.retailCart.findFirst({
      where: { tenantId: tenantId, customerId },
      include: { items: { include: { product: true } } },
    });
  }

  async createCart(tenantId: string, customerId: string): Promise<any> {
    return this.prisma.retailCart.create({
      data: { tenantId: tenantId, customerId, status: "active" },
    });
  }

  async updateCartItem(
    tenantId: string,
    cartId: string,
    productId: string,
    data: { quantity: number; unitPrice: number },
  ): Promise<any> {
    return this.prisma.retailCartItem.upsert({
      where: { cartId_productId: { cartId, productId } },
      update: { quantity: data.quantity, unitPrice: data.unitPrice },
      create: {
        cartId,
        productId,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
      },
    });
  }

  async removeCartItem(
    tenantId: string,
    cartId: string,
    itemId: string,
  ): Promise<void> {
    await this.prisma.retailCartItem.deleteMany({
      where: { id: itemId, cartId },
    });
  }

  async clearCart(tenantId: string, cartId: string): Promise<void> {
    await this.prisma.retailCartItem.deleteMany({ where: { cartId } });
  }

  // --- Wishlist ---

  async getWishlist(tenantId: string, customerId: string): Promise<any | null> {
    return this.prisma.retailWishlist.findFirst({
      where: { tenantId: tenantId, customerId },
      include: { items: { include: { product: true } } },
    });
  }

  async upsertWishlist(tenantId: string, customerId: string): Promise<any> {
    return this.prisma.retailWishlist.upsert({
      where: { customerId },
      update: {},
      create: { tenantId: tenantId, customerId },
    });
  }

  async addWishlistItem(
    tenantId: string,
    wishlistId: string,
    productId: string,
  ): Promise<any> {
    const existing = await this.prisma.retailWishlistItem.findFirst({
      where: { wishlistId, productId },
    });
    if (existing) return existing;
    return this.prisma.retailWishlistItem.create({
      data: { wishlistId, productId },
    });
  }

  async removeWishlistItem(
    tenantId: string,
    wishlistId: string,
    itemId: string,
  ): Promise<void> {
    await this.prisma.retailWishlistItem.deleteMany({
      where: { id: itemId, wishlistId },
    });
  }

  // --- Events ---

  async logEvent(tenantId: string, data: any): Promise<any> {
    return this.prisma.auditLog.create({
      data: {
        tenantId: tenantId,
        module: "retail",
        action: data.type,
        entityType: "event",
        entityId:
          data.audit?.traceId ??
          createHash("md5").update(Date.now().toString()).digest("hex"),
        userId: data.actor?.id ?? "anonymous",
        changes: data.payload as any,
        metadata: {
          scope: data.scope,
          timestamp: data.timestamp,
          actorType: data.actor?.type,
        } as any,
        createdAt: new Date(),
      },
    });
  }

  // ============================================================
  // MAPPERS
  // ============================================================

  private mapStore(s: any): RetailStore {
    return {
      id: s.id,
      tenant_id: s.tenantId,
      location_id: s.locationId,
      name: s.name,
      code: s.code,
      type: s.type as any,
      status: s.status as any,
      address: "",
      phone: s.phone,
      email: s.email,
      timezone: s.timezone ?? "Asia/Jakarta",
      currency: "IDR",
      manager_id: s.managerId,
      inventory_pool_id: s.inventoryPoolId,
      operating_hours: s.operatingHours,
      settings: s.settings,
      created_at: s.createdAt,
      updated_at: s.updatedAt,
    };
  }

  private mapEcommerceStore(s: any): any {
    return {
      id: s.id,
      tenantId: s.tenantId,
      name: s.name,
      platform: s.platform,
      domain: s.domain,
      apiKey: s.apiKey,
      status: s.status,
      inventoryPoolId: s.inventoryPoolId,
      managerId: s.managerId,
      branches: s.branches ?? [],
      settings: s.settings,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }

  private mapProduct(p: any): RetailProduct {
    return {
      id: p.id,
      tenant_id: p.tenantId,
      sku: p.sku,
      barcode: p.barcode,
      name: p.name,
      description: p.description || "",
      category_id: p.categoryId,
      base_price: Number(p.basePrice),
      currency: "IDR",
      prices: [{ amount: Number(p.basePrice), currency: "IDR" }],
      tax_rate: Number(p.taxRate),
      unit: p.unit,
      status: p.status as any,
      variants: [],
      seo: {
        title: `${p.name} | Zenvix Store`,
        metaDescription: p.description || `Buy ${p.name} at the best price.`,
        keywords: [p.name],
      },
      created_at: p.createdAt,
      updated_at: p.updatedAt,
    };
  }

  private mapOrder(o: any): RetailOrder {
    return {
      id: o.id,
      tenant_id: o.tenantId,
      location_id: "",
      store_id: o.storeId,
      terminal_id: o.deviceId,
      cashier_id: o.cashierId,
      customer_id: o.customerId,
      status: o.status as any,
      items: o.items?.map((item: any) => this.mapOrderItem(item)) || [],
      subtotal: Number(o.subtotal),
      tax_total: Number(o.tax),
      discount_total: 0,
      grand_total: Number(o.totalAmount),
      currency: "IDR",
      payment_method: o.paymentMethod as any,
      payment_status: "paid",
      created_at: o.createdAt,
      updated_at: o.updatedAt,
    };
  }

  private mapOrderItem(item: any): RetailOrderItem {
    return {
      product_id: item.productId,
      variant_id: undefined,
      sku: item.product?.sku || "",
      name: item.product?.name || "",
      quantity: item.quantity,
      unit_price: Number(item.unitPrice),
      tax_amount: 0,
      discount_amount: Number(item.discount),
      total_price: Number(item.totalPrice),
    };
  }

  private mapShift(s: any): RetailShift {
    return {
      id: s.id,
      tenant_id: s.tenantId,
      location_id: "",
      store_id: s.storeId,
      employee_id: s.employeeId,
      terminal_id: "",
      start_time: s.startTime,
      end_time: s.endTime,
      opening_cash: Number(s.openingCash),
      closing_cash: s.closingCash ? Number(s.closingCash) : undefined,
      expected_cash: s.expectedCash ? Number(s.expectedCash) : undefined,
      status: s.status as any,
      notes: s.notes,
    };
  }

  private hashSecret(secret: string): string {
    return createHash("sha256").update(secret).digest("hex");
  }
}
