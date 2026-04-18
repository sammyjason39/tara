import { Injectable, NotFoundException } from "@nestjs/common";
import { IRetailRepository } from "./repositories/retail.repository.interface";
import { SkuGeneratorService } from "../../core/inventory/sku-generator.service";
import { TransactionType } from "../../core/finance/dto/create-transaction.dto";
import {
  RetailStore,
  RetailProduct,
  RetailOrder,
  RetailShift,
} from "./entities/retail.entity";
import {
  CreateStoreDto,
  UpdateStoreDto,
  CreateOrderDto,
  OpenShiftDto,
  CloseShiftDto,
  CreateEcommerceStoreDto,
  UpdateEcommerceStoreDto,
  CreateInventoryPoolDto,
  UpdateProductDto,
  RegisterBranchDeviceDto,
  RegisterCCTVCameraDto,
  RegisterBranchSensorDto,
} from "./dto/retail.dto";
import { randomBytes, createHash } from "crypto";
import { AuditService } from "../../shared/audit/audit.service";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../persistence/prisma.service";
import { EventBusService } from "../../shared/events/event-bus.service";

@Injectable()
export class RetailService {
  constructor(
    private readonly retailRepository: IRetailRepository,
    private readonly auditService: AuditService,
    private readonly skuGenerator: SkuGeneratorService,
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  // Stores (Physical Branches)
  async listStores(
    tenant_id: string,
    location_id?: string,
  ): Promise<RetailStore[]> {
    return this.retailRepository.listStores(tenant_id, location_id);
  }

  async listCategories(tenant_id: string): Promise<any[]> {
    return this.retailRepository.listCategories(tenant_id);
  }

  async createStore(
    tenant_id: string,
    data: CreateStoreDto,
    user_id: string,
  ): Promise<RetailStore> {
    const store = await this.retailRepository.createStore(tenant_id, data);
    await this.auditService.log({
      tenant_id,
      user_id,
      module: "retail",
      action: "CREATE",
      entity_type: "STORE",
      entity_id: store.id,
      metadata: { name: store.name, code: store.code },
    });
    return store;
  }

  async updateStore(
    tenant_id: string,
    store_id: string,
    data: UpdateStoreDto,
    user_id: string,
  ): Promise<RetailStore> {
    const store = await this.retailRepository.updateStore(
      tenant_id,
      store_id,
      data,
    );
    await this.auditService.log({
      tenant_id,
      user_id,
      module: "retail",
      action: "UPDATE",
      entity_type: "STORE",
      entity_id: store_id,
      metadata: { changes: data },
    });
    return store;
  }

  async deleteStore(
    tenant_id: string,
    store_id: string,
    user_id: string,
  ): Promise<void> {
    await this.prisma.retail_cart_items.deleteMany({ where: { cart_id: store_id } });
    await this.auditService.log({
      tenant_id,
      user_id,
      module: "retail",
      action: "DELETE",
      entity_type: "STORE",
      entity_id: store_id,
    });
  }

  // Inventory Pools
  async listInventoryPools(tenant_id: string): Promise<any[]> {
    return this.retailRepository.listInventoryPools(tenant_id);
  }

  async createInventoryPool(
    tenant_id: string,
    data: CreateInventoryPoolDto,
    user_id: string,
  ): Promise<any> {
    const pool = await this.retailRepository.createInventoryPool(
      tenant_id,
      data,
    );
    await this.auditService.log({
      tenant_id,
      user_id,
      module: "retail",
      action: "CREATE",
      entity_type: "INVENTORY_POOL",
      entity_id: pool.id,
      metadata: { name: pool.name },
    });
    return pool;
  }

  async getInventoryPool(tenant_id: string, poolId: string): Promise<any> {
    const pool = await this.retailRepository.getInventoryPool(tenant_id, poolId);
    if (!pool)
      throw new NotFoundException(`Inventory pool ${poolId} not found`);
    return pool;
  }

  async deleteInventoryPool(
    tenant_id: string,
    poolId: string,
    user_id: string,
  ): Promise<void> {
    await this.retailRepository.deleteInventoryPool(tenant_id, poolId);
    await this.auditService.log({
      tenant_id,
      user_id,
      module: "retail",
      action: "DELETE",
      entity_type: "INVENTORY_POOL",
      entity_id: poolId,
    });
  }

  // E-Commerce Stores
  async listEcommerceStores(
    tenant_id: string,
    store_id?: string,
  ): Promise<any[]> {
    return this.retailRepository.listEcommerceStores(tenant_id, store_id);
  }

  async getEcommerceStore(tenant_id: string, store_id: string): Promise<any> {
    const store = await this.retailRepository.getEcommerceStore(
      tenant_id,
      store_id,
    );
    if (!store)
      throw new NotFoundException(`E-commerce store ${store_id} not found`);
    return store;
  }

  async createEcommerceStore(
    tenant_id: string,
    data: CreateEcommerceStoreDto,
    user_id: string,
  ): Promise<any> {
    const store = await this.retailRepository.createEcommerceStore(
      tenant_id,
      data,
    );
    await this.auditService.log({
      tenant_id,
      user_id,
      module: "retail",
      action: "CREATE",
      entity_type: "ECOMMERCE_STORE",
      entity_id: store.id,
      metadata: { name: store.name },
    });
    return store;
  }

  async updateEcommerceStore(
    tenant_id: string,
    store_id: string,
    data: UpdateEcommerceStoreDto,
    user_id: string,
  ): Promise<any> {
    const store = await this.retailRepository.updateEcommerceStore(
      tenant_id,
      store_id,
      data,
    );
    await this.auditService.log({
      tenant_id,
      user_id,
      module: "retail",
      action: "UPDATE",
      entity_type: "ECOMMERCE_STORE",
      entity_id: store_id,
      metadata: { changes: data },
    });
    return store;
  }

  async deleteEcommerceStore(
    tenant_id: string,
    store_id: string,
    user_id: string,
  ): Promise<void> {
    await this.retailRepository.deleteEcommerceStore(tenant_id, store_id);
    await this.auditService.log({
      tenant_id,
      user_id,
      module: "retail",
      action: "DELETE",
      entity_type: "ECOMMERCE_STORE",
      entity_id: store_id,
    });
  }

  async linkEcommerceToBranch(
    tenant_id: string,
    ecommerceId: string,
    branch_id: string,
    user_id: string,
  ): Promise<void> {
    await this.retailRepository.linkEcommerceToBranch(
      tenant_id,
      ecommerceId,
      branch_id,
    );
    await this.auditService.log({
      tenant_id,
      user_id,
      module: "retail",
      action: "LINK",
      entity_type: "ECOMMERCE_BRANCH",
      entity_id: ecommerceId,
      metadata: { branch_id },
    });
  }

  async unlinkEcommerceFromBranch(
    tenant_id: string,
    ecommerceId: string,
    branch_id: string,
    user_id: string,
  ): Promise<void> {
    await this.retailRepository.unlinkEcommerceFromBranch(
      tenant_id,
      ecommerceId,
      branch_id,
    );
    await this.auditService.log({
      tenant_id,
      user_id,
      module: "retail",
      action: "UNLINK",
      entity_type: "ECOMMERCE_BRANCH",
      entity_id: ecommerceId,
      metadata: { branch_id },
    });
  }

  // Products
  async listProducts(
    tenant_id: string,
    options?: {
      page?: number;
      pageSize?: number;
      category_id?: string;
      type?: string;
      minPrice?: number;
      maxPrice?: number;
      q?: string;
      sortBy?: "name" | "price" | "created_at";
      sortDir?: "asc" | "desc";
      location_id?: string;
    },
  ) {
    return this.retailRepository.listProducts(tenant_id, options);
  }

  async getProduct(tenant_id: string, product_id: string) {
    return this.retailRepository.getProduct(tenant_id, product_id);
  }

  async updateProduct(
    tenant_id: string,
    product_id: string,
    data: UpdateProductDto,
    user_id: string,
    location_id?: string,
  ) {
    const updated = await this.retailRepository.updateProduct(
      tenant_id,
      product_id,
      data,
      location_id,
    );
    await this.auditService.log({
      tenant_id,
      user_id,
      module: "retail",
      action: "UPDATE",
      entity_type: "PRODUCT",
      entity_id: product_id,
      metadata: { changes: data, location_id },
    });
    return updated;
  }

  async findProductBySku(tenant_id: string, sku: string): Promise<any> {
    return this.prisma.item_masters.findFirst({
      where: {
        tenant_id: tenant_id,
        sku,
        status: "active",
      },
    });
  }

  async generateNextSku(
    tenant_id: string,
    category_id: string,
  ): Promise<{ sku: string; barcode: string }> {
    const sku = await this.skuGenerator.generateSku(tenant_id, category_id);
    const barcode = this.skuGenerator.generateBarcode(tenant_id, sku);
    return { sku, barcode };
  }

  async listOrders(tenant_id: string, store_id?: string): Promise<RetailOrder[]> {
    return this.retailRepository.listOrders(tenant_id, store_id);
  }

  async createOrder(
    tenant_id: string,
    location_id: string,
    data: CreateOrderDto,
    user_id: string,
  ): Promise<RetailOrder> {
    // 1. Initial creation (PENDING)
    const order = await this.retailRepository.createOrder(
      tenant_id,
      location_id,
      data,
      user_id,
    );

    // Audit initial creation
    await this.auditService.log({
      tenant_id,
      user_id,
      module: "retail",
      action: "CREATE",
      entity_type: "ORDER",
      entity_id: order.id,
      metadata: { total: order.grand_total, itemCount: order.items.length },
    });

    // 2. Transition to RESERVED if items can be locked
    try {
      await this.reserveOrderStock(tenant_id, order);
      return this.updateOrderStatus(tenant_id, order.id, "reserved", {
        reservation_expires_at: new Date(
          Date.now() + 15 * 60 * 1000,
        ).toISOString(), // 15 min lock
      });
    } catch (e) {
      // If reservation fails, we might mark as cancelled or keep as pending
      return order;
    }
  }

  async reserveOrderStock(tenant_id: string, order: RetailOrder) {
    for (const item of order.items) {
      const res = await this.retailRepository.reserveStock(
        tenant_id,
        order.location_id || "default",
        item.product_id,
        item.quantity,
      );
      if (!res.success) {
        throw new Error(`Insufficient stock for product ${item.product_id}`);
      }
    }
  }

  async calculateTax(
    tenant_id: string,
    order_id: string,
    user_id?: string,
  ): Promise<number> {
    const order = await this.retailRepository.getOrder(tenant_id, order_id);
    if (!order) throw new NotFoundException("Order not found");

    // DECIMAL-SAFE: Precise tax calculation using Prisma.Decimal
    const subtotal = new Prisma.Decimal(String(order.subtotal));
    const taxRate = new Prisma.Decimal("0.1"); // Simple 10% rate
    const tax_total = subtotal.mul(taxRate);

    await this.retailRepository.updateOrderStatus(
      tenant_id,
      order_id,
      order.status,
      { tax_total: tax_total },
    );

    if (user_id) {
      await this.auditService.log({
        tenant_id,
        user_id,
        module: "retail",
        action: "CALCULATE_TAX",
        entity_type: "ORDER",
        entity_id: order_id,
        metadata: { tax_total: tax_total.toNumber() },
      });
    }

    return tax_total.toNumber();

  }

  async updateOrderStatus(
    tenant_id: string,
    order_id: string,
    status: string,
    metadata?: any,
    user_id?: string,
  ): Promise<RetailOrder> {
    const order = await this.retailRepository.updateOrderStatus(
      tenant_id,
      order_id,
      status,
      metadata,
    );
    if (user_id) {
      await this.auditService.log({
        tenant_id,
        user_id,
        module: "retail",
        action: "UPDATE_STATUS",
        entity_type: "ORDER",
        entity_id: order_id,
        metadata: { status, ...metadata },
      });
    }
    return order;
  }

  async getStockStatus(tenant_id: string, product_id: string) {
    return this.retailRepository.checkStock(tenant_id, product_id);
  }

  async getInventoryStats(
    tenant_id: string,
    options?: { category_id?: string; q?: string },
  ) {
    return this.retailRepository.getInventoryStats(tenant_id, options);
  }

  // Shifts
  async getActiveShift(
    tenant_id: string,
    store_id: string,
    employee_id: string,
  ): Promise<RetailShift | null> {
    return this.retailRepository.getActiveShift(tenant_id, store_id, employee_id);
  }

  async openShift(
    tenant_id: string,
    location_id: string,
    employee_id: string,
    data: OpenShiftDto,
    user_id?: string,
  ): Promise<RetailShift> {
    // Check if already has an active shift
    const active = await this.retailRepository.getActiveShift(
      tenant_id,
      data.store_id,
      employee_id,
    );
    if (active) {
      throw new Error("Shift already active for this employee and store.");
    }
    const shift = await this.retailRepository.openShift(
      tenant_id,
      location_id,
      employee_id,
      data,
    );

    if (user_id) {
      await this.auditService.log({
        tenant_id,
        user_id,
        module: "retail",
        action: "OPEN_SHIFT",
        entity_type: "SHIFT",
        entity_id: shift.id,
        metadata: { opening_cash: data.opening_cash, store_id: data.store_id },
      });
    }

    return shift;
  }

  async closeShift(
    tenant_id: string,
    shift_id: string,
    data: CloseShiftDto,
    user_id: string,
  ): Promise<RetailShift> {
    const shift = await this.retailRepository.closeShift(
      tenant_id,
      shift_id,
      data,
    );
    await this.auditService.log({
      tenant_id,
      user_id,
      module: "retail",
      action: "CLOSE_SHIFT",
      entity_type: "SHIFT",
      entity_id: shift_id,
      metadata: { closing_cash: data.closing_cash },
    });
    return shift;
  }

  async listShifts(tenant_id: string, store_id?: string): Promise<RetailShift[]> {
    return this.retailRepository.listShifts(tenant_id, store_id);
  }

  // Promotions
  async listPromotions(tenant_id: string): Promise<any[]> {
    return this.retailRepository.listPromotions(tenant_id);
  }

  async updatePromotion(
    tenant_id: string,
    promotionId: string,
    data: any,
    user_id: string,
  ): Promise<any> {
    const promo = await this.retailRepository.updatePromotion(
      tenant_id,
      promotionId,
      data,
    );
    await this.auditService.log({
      tenant_id,
      user_id,
      module: "retail",
      action: "UPDATE",
      entity_type: "PROMOTION",
      entity_id: promotionId,
      metadata: { changes: data },
    });
    return promo;
  }

  // Channels
  async listChannels(tenant_id: string): Promise<any[]> {
    return this.retailRepository.listChannels(tenant_id);
  }

  async createChannel(
    tenant_id: string,
    data: any,
    user_id: string,
  ): Promise<any> {
    const shouldProvision =
      typeof data?.provisionCredentials === "boolean"
        ? data.provisionCredentials
        : data?.type === "OWNED";

    let clientId: string | undefined = data?.credentials?.clientId;
    let clientSecret: string | undefined = data?.credentials?.clientSecret;

    if (shouldProvision && (!clientId || !clientSecret)) {
      clientId = this.generateClientId();
      clientSecret = this.generateClientSecret();
    }

    const payload = {
      ...data,
      credentials:
        clientId && clientSecret
          ? { clientId, clientSecret }
          : data?.credentials,
    };

    const channel = await this.retailRepository.createChannel(
      tenant_id,
      payload,
    );

    await this.auditService.log({
      tenant_id,
      user_id,
      module: "retail",
      action: "CREATE",
      entity_type: "CHANNEL",
      entity_id: channel.id,
      metadata: { name: channel.name, type: channel.type },
    });

    return {
      ...channel,
      ...(clientId ? { clientId } : {}),
      ...(clientSecret ? { clientSecret } : {}),
    };
  }

  async updateChannel(
    tenant_id: string,
    channelId: string,
    data: any,
    user_id: string,
  ): Promise<any> {
    const channel = await this.retailRepository.updateChannel(
      tenant_id,
      channelId,
      data,
    );
    await this.auditService.log({
      tenant_id,
      user_id,
      module: "retail",
      action: "UPDATE",
      entity_type: "CHANNEL",
      entity_id: channelId,
      metadata: { changes: data },
    });
    return channel;
  }

  async deleteChannel(
    tenant_id: string,
    channelId: string,
    user_id: string,
  ): Promise<{ success: boolean }> {
    const result = await this.retailRepository.deleteChannel(
      tenant_id,
      channelId,
    );
    await this.auditService.log({
      tenant_id,
      user_id,
      module: "retail",
      action: "DELETE",
      entity_type: "CHANNEL",
      entity_id: channelId,
    });
    return result;
  }

  async syncChannel(
    tenant_id: string,
    channelId: string,
    user_id: string,
  ): Promise<{ success: boolean }> {
    const result = await this.retailRepository.syncChannel(tenant_id, channelId);
    await this.auditService.log({
      tenant_id,
      user_id,
      module: "retail",
      action: "SYNC",
      entity_type: "CHANNEL",
      entity_id: channelId,
    });
    return result;
  }

  async getChannelById(
    tenant_id: string,
    channelId: string,
  ): Promise<any | null> {
    return this.retailRepository.getChannelById(tenant_id, channelId);
  }

  async rotateChannelCredentials(
    tenant_id: string,
    channelId: string,
    user_id: string,
  ): Promise<{ clientId: string; clientSecret: string }> {
    const channel = await this.retailRepository.getChannelById(
      tenant_id,
      channelId,
    );
    if (!channel) {
      throw new NotFoundException("Channel not found");
    }

    const existingCredentials = channel.credentials as {
      clientId?: string;
      branch_id?: string;
      gatewayUrl?: string;
      connector?: string;
    } | null;
    const clientId = existingCredentials?.clientId ?? this.generateClientId();
    const clientSecret = this.generateClientSecret();
    const credentialsPayload = {
      clientId,
      clientSecret,
      clientSecretHash: this.hashSecret(clientSecret),
      branch_id: existingCredentials?.branch_id,
      gatewayUrl: existingCredentials?.gatewayUrl,
      connector: existingCredentials?.connector,
      lastRotated: new Date().toISOString(),
      revoked: false,
    };

    await this.retailRepository.updateChannelCredentials(
      tenant_id,
      channelId,
      credentialsPayload,
    );

    await this.auditService.log({
      tenant_id,
      user_id,
      module: "retail",
      action: "ROTATE_CREDENTIALS",
      entity_type: "CHANNEL",
      entity_id: channelId,
    });

    return { clientId, clientSecret };
  }

  async revokeChannelCredentials(
    tenant_id: string,
    channelId: string,
    user_id: string,
  ): Promise<{ clientId: string }> {
    const channel = await this.retailRepository.getChannelById(
      tenant_id,
      channelId,
    );
    if (!channel) {
      throw new NotFoundException("Channel not found");
    }

    const existingCredentials = channel.credentials as {
      clientId?: string;
      clientSecret?: string;
      clientSecretHash?: string;
      branch_id?: string;
      gatewayUrl?: string;
      connector?: string;
    } | null;
    if (!existingCredentials?.clientId) {
      throw new NotFoundException("Channel credentials are missing");
    }

    const credentialsPayload = {
      clientId: existingCredentials.clientId,
      clientSecret: existingCredentials.clientSecret,
      clientSecretHash: existingCredentials.clientSecretHash ?? "",
      branch_id: existingCredentials.branch_id,
      gatewayUrl: existingCredentials.gatewayUrl,
      connector: existingCredentials.connector,
      revoked: true,
      revoked_at: new Date().toISOString(),
    };

    await this.retailRepository.updateChannelCredentials(
      tenant_id,
      channelId,
      credentialsPayload,
    );

    await this.auditService.log({
      tenant_id,
      user_id,
      module: "retail",
      action: "REVOKE_CREDENTIALS",
      entity_type: "CHANNEL",
      entity_id: channelId,
    });

    return { clientId: existingCredentials.clientId };
  }

  private generateClientId() {
    return `znx_${randomBytes(4).toString("hex")}`;
  }

  private generateClientSecret() {
    return `sk_test_${randomBytes(8).toString("hex")}`;
  }

  private hashSecret(secret: string) {
    return createHash("sha256").update(secret).digest("hex");
  }

  async findChannelByClientId(
    tenant_id: string,
    clientId: string,
  ): Promise<any | null> {
    return this.retailRepository.findChannelByClientId(tenant_id, clientId);
  }

  // Devices
  async listDevices(tenant_id: string, store_id?: string): Promise<any[]> {
    return this.retailRepository.listDevices(tenant_id, store_id);
  }

  async registerDevice(
    tenant_id: string,
    location_id: string,
    data: RegisterBranchDeviceDto,
    user_id: string,
  ): Promise<any> {
    const device = await this.retailRepository.registerDevice(
      tenant_id,
      location_id,
      data,
    );
    await this.auditService.log({
      tenant_id,
      user_id,
      module: "it",
      action: "REGISTER",
      entity_type: "DEVICE",
      entity_id: device.id,
      metadata: { name: device.name, type: device.type },
    });
    return device;
  }

  async listCCTVs(tenant_id: string, store_id?: string): Promise<any[]> {
    return this.retailRepository.listCCTVs(tenant_id, store_id);
  }

  async validateCCTVConnection(
    tenant_id: string,
    location_id: string,
    data: Partial<RegisterCCTVCameraDto>,
  ): Promise<{ success: boolean; message?: string }> {
    return this.retailRepository.validateCCTVConnection(
      tenant_id,
      location_id,
      data,
    );
  }

  async registerCCTV(
    tenant_id: string,
    location_id: string,
    data: RegisterCCTVCameraDto,
    user_id: string,
  ): Promise<any> {
    const camera = await this.retailRepository.registerCCTV(
      tenant_id,
      location_id,
      data,
    );
    await this.auditService.log({
      tenant_id,
      user_id,
      module: "it",
      action: "REGISTER",
      entity_type: "CCTV",
      entity_id: camera.id,
      metadata: { name: camera.name, provider: camera.provider },
    });
    return camera;
  }

  async listSensors(tenant_id: string, store_id?: string): Promise<any[]> {
    return this.retailRepository.listSensors(tenant_id, store_id);
  }

  async registerSensor(
    tenant_id: string,
    location_id: string,
    data: RegisterBranchSensorDto,
    user_id: string,
  ): Promise<any> {
    const sensor = await this.retailRepository.registerSensor(
      tenant_id,
      location_id,
      data,
    );
    await this.auditService.log({
      tenant_id,
      user_id,
      module: "it",
      action: "REGISTER",
      entity_type: "SENSOR",
      entity_id: sensor.id,
      metadata: { name: sensor.name, type: sensor.type },
    });
    return sensor;
  }

  async pingDevice(
    tenant_id: string,
    device_id: string,
  ): Promise<{ success: boolean }> {
    return this.retailRepository.pingDevice(tenant_id, device_id);
  }

  async scanDevices(tenant_id: string, location_id: string): Promise<any[]> {
    return this.retailRepository.scanDevices(tenant_id, location_id);
  }

  async commitScannedDevice(
    tenant_id: string,
    location_id: string,
    discoveryId: string,
    user_id: string,
  ): Promise<any> {
    const device = await this.retailRepository.commitScannedDevice(
      tenant_id,
      location_id,
      discoveryId,
    );
    if (device) {
      await this.auditService.log({
        tenant_id,
        user_id,
        module: "it",
        action: "REGISTER",
        entity_type: "DEVICE",
        entity_id: device.id,
        metadata: {
          name: device.name,
          type: device.type,
          method: "discovery_commit",
        },
      });
    }
    return device;
  }

  // Payments & Returns
  async processPayment(
    tenant_id: string,
    order_id: string,
    data: { amount: Prisma.Decimal; method: string; shift_id?: string },
    user_id: string,
  ): Promise<any> {
    // 1. Process payment via Repository (Atomically handles DB, Stock, and Finance ledgers)
    const result = await this.retailRepository.processPayment(
      tenant_id,
      order_id,
      data,
    );

    // 2. Publish Sales Event
    if (result.success && result.movements) {
      await this.eventBus.publish({
        event_type: "RETAIL_SALE_COMPLETED",
        tenant_id: tenant_id,
        entity_id: order_id,
        entity_type: "ORDER",
        source_module: "retail",
        payload: {
          order_id,
          location_id: result.movements[0]?.from_location_id || "default",
          movements: result.movements,
          amount: data.amount,
          method: data.method,
        },
        user_id,
      });
    }

    // 3. Audit Logging
    const order = await this.retailRepository.getOrder(tenant_id, order_id);
    if (order) {
      await this.auditService.log({
        tenant_id,
        user_id,
        module: "retail",
        action: "PAYMENT_COMPLETE",
        entity_type: "ORDER",
        entity_id: order_id,
        metadata: {
          total: order.grand_total,
          payment_method: data.method,
        },
      });
    }

    return result;
  }

  async processReturn(
    tenant_id: string,
    order_id: string,
    data: { itemIds: string[]; shift_id?: string },
    user_id: string,
  ): Promise<{ success: boolean }> {
    // 1. Get Order Details
    const order = await this.retailRepository.getOrder(tenant_id, order_id);
    if (!order) throw new NotFoundException("Order not found");

    // 2. Emit Return Completed Event instead of calling Inventory and Finance
    await this.eventBus.publish({
      event_type: "RETAIL_RETURN_COMPLETED",
      tenant_id: tenant_id,
      entity_id: order_id,
      entity_type: "ORDER",
      source_module: "retail",
      payload: {
        order_id,
        store_id: order.store_id || "default",
        grand_total: order.grand_total,
        returnedItems: data.itemIds.map((item_id) => {
          const orderItem = order.items.find((i) => i.product_id === item_id);
          return {
            product_id: item_id,
            quantity: orderItem?.quantity || 1,
            unit_price: Number(orderItem?.unit_price || 0),
          };
        }),
      },
      user_id,
    });

    // 4. Call Repository
    const result = await this.retailRepository.processReturn(
      tenant_id,
      order_id,
      data,
    );

    // 5. Audit Log
    await this.auditService.log({
      tenant_id,
      user_id,
      module: "retail",
      action: "RETURN_PROCESS",
      entity_type: "ORDER",
      entity_id: order_id,
      metadata: { refundedItems: data.itemIds.length },
    });

    return result;
  }

  // Inventory Operations
  async submitOpname(
    tenant_id: string,
    data: { store_id: string; adjustments: any[]; shift_id?: string },
    user_id: string,
  ): Promise<{ success: boolean }> {
    // 1. Emit Opname Event (adjustments handled by listener)
    await this.eventBus.publish({
      event_type: "RETAIL_OPNAME_SUBMITTED",
      tenant_id: tenant_id,
      entity_id: data.store_id,
      entity_type: "STORE",
      source_module: "retail",
      payload: {
        store_id: data.store_id,
        adjustments: data.adjustments.filter((adj) => adj.variance !== 0),
        sessionId: data.shift_id || "SESSION",
      },
      user_id,
    });

    // 2. Call Repository
    const result = await this.retailRepository.submitOpname(tenant_id, data);

    // 3. Audit Log
    await this.auditService.log({
      tenant_id,
      user_id,
      module: "retail",
      action: "STOCK_OPNAME",
      entity_type: "STORE",
      entity_id: data.store_id,
      metadata: { adjustmentCount: data.adjustments.length },
    });

    return result;
  }

  async receiveGoods(
    tenant_id: string,
    data: {
      store_id: string;
      shipment_id: string;
      items: any[];
      shift_id?: string;
    },
    user_id: string,
  ): Promise<{ success: boolean }> {
    // 1. Emit Goods Receipt Event to trigger Inventory Intake
    await this.eventBus.publish({
      event_type: "RETAIL_GOODS_RECEIVED",
      tenant_id: tenant_id,
      entity_id: data.shipment_id,
      entity_type: "SHIPMENT",
      source_module: "retail",
      payload: {
        store_id: data.store_id,
        shipment_id: data.shipment_id,
        items: data.items,
      },
      user_id,
    });

    // 2. Call Repository
    const result = await this.retailRepository.receiveGoods(tenant_id, data);

    // 3. Audit Log
    await this.auditService.log({
      tenant_id,
      user_id,
      module: "retail",
      action: "STOCK_INTAKE",
      entity_type: "SHIPMENT",
      entity_id: data.shipment_id,
      metadata: { itemCount: data.items.length },
    });

    return result;
  }

  // --- Public Gateway (Customer, Cart, Wishlist) ---

  async findCustomerByEmail(tenant_id: string, email: string) {
    return this.retailRepository.findCustomerByEmail(tenant_id, email);
  }

  async findCustomerById(tenant_id: string, customer_id: string) {
    return this.retailRepository.findCustomerById(tenant_id, customer_id);
  }

  async createCustomer(tenant_id: string, data: any, user_id?: string) {
    const customer = await this.retailRepository.createCustomer(tenant_id, data);
    if (user_id) {
      await this.auditService.log({
        tenant_id,
        user_id,
        module: "retail",
        action: "CREATE",
        entity_type: "CUSTOMER",
        entity_id: customer.id,
        metadata: { name: customer.name, email: customer.email },
      });
    }
    return customer;
  }

  async updateCustomer(
    tenant_id: string,
    customer_id: string,
    data: any,
    user_id?: string,
  ) {
    const customer = await this.retailRepository.updateCustomer(
      tenant_id,
      customer_id,
      data,
    );
    if (user_id) {
      await this.auditService.log({
        tenant_id,
        user_id,
        module: "retail",
        action: "UPDATE",
        entity_type: "CUSTOMER",
        entity_id: customer_id,
        metadata: { changes: data },
      });
    }
    return customer;
  }

  async createCustomerSession(tenant_id: string, data: any) {
    return this.retailRepository.createCustomerSession(tenant_id, data);
  }

  async findCustomerSession(tenant_id: string, tokenHash: string) {
    return this.retailRepository.findCustomerSession(tenant_id, tokenHash);
  }

  async revokeCustomerSession(tenant_id: string, tokenHash: string) {
    return this.retailRepository.revokeCustomerSession(tenant_id, tokenHash);
  }

  async getCart(tenant_id: string, customer_id: string) {
    return this.retailRepository.getCart(tenant_id, customer_id);
  }

  async createCart(tenant_id: string, customer_id: string) {
    return this.retailRepository.createCart(tenant_id, customer_id);
  }

  async updateCartItem(
    tenant_id: string,
    cartId: string,
    product_id: string,
    data: { quantity: Prisma.Decimal; unit_price: Prisma.Decimal },
  ) {
    return this.retailRepository.updateCartItem(
      tenant_id,
      cartId,
      product_id,
      data,
    );
  }

  async removeCartItem(tenant_id: string, cartId: string, item_id: string) {
    return this.retailRepository.removeCartItem(tenant_id, cartId, item_id);
  }

  async clearCart(tenant_id: string, cartId: string) {
    return this.retailRepository.clearCart(tenant_id, cartId);
  }

  async getWishlist(tenant_id: string, customer_id: string) {
    return this.retailRepository.getWishlist(tenant_id, customer_id);
  }

  async upsertWishlist(tenant_id: string, customer_id: string) {
    return this.retailRepository.upsertWishlist(tenant_id, customer_id);
  }

  async addWishlistItem(
    tenant_id: string,
    wishlistId: string,
    product_id: string,
  ) {
    return this.retailRepository.addWishlistItem(
      tenant_id,
      wishlistId,
      product_id,
    );
  }

  async removeWishlistItem(
    tenant_id: string,
    wishlistId: string,
    item_id: string,
  ) {
    return this.retailRepository.removeWishlistItem(
      tenant_id,
      wishlistId,
      item_id,
    );
  }

  async logEvent(tenant_id: string, data: any) {
    return this.retailRepository.logEvent(tenant_id, data);
  }
}
