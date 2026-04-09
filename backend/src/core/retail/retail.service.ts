import { Injectable, NotFoundException } from "@nestjs/common";
import { IRetailRepository } from "./repositories/retail.repository.interface";
import { SkuGeneratorService } from "../inventory/sku-generator.service";
import { TransactionType } from "../finance/dto/create-transaction.dto";
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
    tenantId: string,
    locationId?: string,
  ): Promise<RetailStore[]> {
    return this.retailRepository.listStores(tenantId, locationId);
  }

  async listCategories(tenantId: string): Promise<any[]> {
    return this.retailRepository.listCategories(tenantId);
  }

  async createStore(
    tenantId: string,
    data: CreateStoreDto,
    userId: string,
  ): Promise<RetailStore> {
    const store = await this.retailRepository.createStore(tenantId, data);
    await this.auditService.log({
      tenantId,
      userId,
      module: "retail",
      action: "CREATE",
      entityType: "STORE",
      entityId: store.id,
      metadata: { name: store.name, code: store.code },
    });
    return store;
  }

  async updateStore(
    tenantId: string,
    storeId: string,
    data: UpdateStoreDto,
    userId: string,
  ): Promise<RetailStore> {
    const store = await this.retailRepository.updateStore(
      tenantId,
      storeId,
      data,
    );
    await this.auditService.log({
      tenantId,
      userId,
      module: "retail",
      action: "UPDATE",
      entityType: "STORE",
      entityId: storeId,
      metadata: { changes: data },
    });
    return store;
  }

  async deleteStore(
    tenantId: string,
    storeId: string,
    userId: string,
  ): Promise<void> {
    await this.retailRepository.deleteStore(tenantId, storeId);
    await this.auditService.log({
      tenantId,
      userId,
      module: "retail",
      action: "DELETE",
      entityType: "STORE",
      entityId: storeId,
    });
  }

  // Inventory Pools
  async listInventoryPools(tenantId: string): Promise<any[]> {
    return this.retailRepository.listInventoryPools(tenantId);
  }

  async createInventoryPool(
    tenantId: string,
    data: CreateInventoryPoolDto,
    userId: string,
  ): Promise<any> {
    const pool = await this.retailRepository.createInventoryPool(
      tenantId,
      data,
    );
    await this.auditService.log({
      tenantId,
      userId,
      module: "retail",
      action: "CREATE",
      entityType: "INVENTORY_POOL",
      entityId: pool.id,
      metadata: { name: pool.name },
    });
    return pool;
  }

  async getInventoryPool(tenantId: string, poolId: string): Promise<any> {
    const pool = await this.retailRepository.getInventoryPool(tenantId, poolId);
    if (!pool)
      throw new NotFoundException(`Inventory pool ${poolId} not found`);
    return pool;
  }

  async deleteInventoryPool(
    tenantId: string,
    poolId: string,
    userId: string,
  ): Promise<void> {
    await this.retailRepository.deleteInventoryPool(tenantId, poolId);
    await this.auditService.log({
      tenantId,
      userId,
      module: "retail",
      action: "DELETE",
      entityType: "INVENTORY_POOL",
      entityId: poolId,
    });
  }

  // E-Commerce Stores
  async listEcommerceStores(
    tenantId: string,
    storeId?: string,
  ): Promise<any[]> {
    return this.retailRepository.listEcommerceStores(tenantId, storeId);
  }

  async getEcommerceStore(tenantId: string, storeId: string): Promise<any> {
    const store = await this.retailRepository.getEcommerceStore(
      tenantId,
      storeId,
    );
    if (!store)
      throw new NotFoundException(`E-commerce store ${storeId} not found`);
    return store;
  }

  async createEcommerceStore(
    tenantId: string,
    data: CreateEcommerceStoreDto,
    userId: string,
  ): Promise<any> {
    const store = await this.retailRepository.createEcommerceStore(
      tenantId,
      data,
    );
    await this.auditService.log({
      tenantId,
      userId,
      module: "retail",
      action: "CREATE",
      entityType: "ECOMMERCE_STORE",
      entityId: store.id,
      metadata: { name: store.name },
    });
    return store;
  }

  async updateEcommerceStore(
    tenantId: string,
    storeId: string,
    data: UpdateEcommerceStoreDto,
    userId: string,
  ): Promise<any> {
    const store = await this.retailRepository.updateEcommerceStore(
      tenantId,
      storeId,
      data,
    );
    await this.auditService.log({
      tenantId,
      userId,
      module: "retail",
      action: "UPDATE",
      entityType: "ECOMMERCE_STORE",
      entityId: storeId,
      metadata: { changes: data },
    });
    return store;
  }

  async deleteEcommerceStore(
    tenantId: string,
    storeId: string,
    userId: string,
  ): Promise<void> {
    await this.retailRepository.deleteEcommerceStore(tenantId, storeId);
    await this.auditService.log({
      tenantId,
      userId,
      module: "retail",
      action: "DELETE",
      entityType: "ECOMMERCE_STORE",
      entityId: storeId,
    });
  }

  async linkEcommerceToBranch(
    tenantId: string,
    ecommerceId: string,
    branchId: string,
    userId: string,
  ): Promise<void> {
    await this.retailRepository.linkEcommerceToBranch(
      tenantId,
      ecommerceId,
      branchId,
    );
    await this.auditService.log({
      tenantId,
      userId,
      module: "retail",
      action: "LINK",
      entityType: "ECOMMERCE_BRANCH",
      entityId: ecommerceId,
      metadata: { branchId },
    });
  }

  async unlinkEcommerceFromBranch(
    tenantId: string,
    ecommerceId: string,
    branchId: string,
    userId: string,
  ): Promise<void> {
    await this.retailRepository.unlinkEcommerceFromBranch(
      tenantId,
      ecommerceId,
      branchId,
    );
    await this.auditService.log({
      tenantId,
      userId,
      module: "retail",
      action: "UNLINK",
      entityType: "ECOMMERCE_BRANCH",
      entityId: ecommerceId,
      metadata: { branchId },
    });
  }

  // Products
  async listProducts(
    tenantId: string,
    options?: {
      page?: number;
      pageSize?: number;
      categoryId?: string;
      type?: string;
      minPrice?: number;
      maxPrice?: number;
      q?: string;
      sortBy?: "name" | "price" | "createdAt";
      sortDir?: "asc" | "desc";
      locationId?: string;
    },
  ) {
    return this.retailRepository.listProducts(tenantId, options);
  }

  async getProduct(tenantId: string, productId: string) {
    return this.retailRepository.getProduct(tenantId, productId);
  }

  async updateProduct(
    tenantId: string,
    productId: string,
    data: UpdateProductDto,
    userId: string,
    locationId?: string,
  ) {
    const updated = await this.retailRepository.updateProduct(
      tenantId,
      productId,
      data,
      locationId,
    );
    await this.auditService.log({
      tenantId,
      userId,
      module: "retail",
      action: "UPDATE",
      entityType: "PRODUCT",
      entityId: productId,
      metadata: { changes: data, locationId },
    });
    return updated;
  }

  async findProductBySku(tenantId: string, sku: string): Promise<any> {
    return this.prisma.itemMaster.findFirst({
      where: {
        tenantId,
        sku,
        status: "active",
      },
    });
  }

  async generateNextSku(
    tenantId: string,
    categoryId: string,
  ): Promise<{ sku: string; barcode: string }> {
    const sku = await this.skuGenerator.generateSku(tenantId, categoryId);
    const barcode = this.skuGenerator.generateBarcode(tenantId, sku);
    return { sku, barcode };
  }

  async listOrders(tenantId: string, storeId?: string): Promise<RetailOrder[]> {
    return this.retailRepository.listOrders(tenantId, storeId);
  }

  async createOrder(
    tenantId: string,
    locationId: string,
    data: CreateOrderDto,
    userId: string,
  ): Promise<RetailOrder> {
    // 1. Initial creation (PENDING)
    const order = await this.retailRepository.createOrder(
      tenantId,
      locationId,
      data,
      userId,
    );

    // Audit initial creation
    await this.auditService.log({
      tenantId,
      userId,
      module: "retail",
      action: "CREATE",
      entityType: "ORDER",
      entityId: order.id,
      metadata: { total: order.grandTotal, itemCount: order.items.length },
    });

    // 2. Transition to RESERVED if items can be locked
    try {
      await this.reserveOrderStock(tenantId, order);
      return this.updateOrderStatus(tenantId, order.id, "reserved", {
        reservation_expires_at: new Date(
          Date.now() + 15 * 60 * 1000,
        ).toISOString(), // 15 min lock
      });
    } catch (e) {
      // If reservation fails, we might mark as cancelled or keep as pending
      return order;
    }
  }

  async reserveOrderStock(tenantId: string, order: RetailOrder) {
    for (const item of order.items) {
      const res = await this.retailRepository.reserveStock(
        tenantId,
        order.locationId || "default",
        item.productId,
        item.quantity,
      );
      if (!res.success) {
        throw new Error(`Insufficient stock for product ${item.productId}`);
      }
    }
  }

  async calculateTax(
    tenantId: string,
    orderId: string,
    userId?: string,
  ): Promise<number> {
    const order = await this.retailRepository.getOrder(tenantId, orderId);
    if (!order) throw new NotFoundException("Order not found");

    // Placeholder for real tax logic (e.g., Avalara/TaxJar)
    // Simple 10% tax for mock mode
    const taxTotal = Number(order.subtotal) * 0.1;
    await this.retailRepository.updateOrderStatus(
      tenantId,
      orderId,
      order.status,
      { tax_total: taxTotal },
    );

    if (userId) {
      await this.auditService.log({
        tenantId,
        userId,
        module: "retail",
        action: "CALCULATE_TAX",
        entityType: "ORDER",
        entityId: orderId,
        metadata: { taxTotal },
      });
    }

    return taxTotal;
  }

  async updateOrderStatus(
    tenantId: string,
    orderId: string,
    status: string,
    metadata?: any,
    userId?: string,
  ): Promise<RetailOrder> {
    const order = await this.retailRepository.updateOrderStatus(
      tenantId,
      orderId,
      status,
      metadata,
    );
    if (userId) {
      await this.auditService.log({
        tenantId,
        userId,
        module: "retail",
        action: "UPDATE_STATUS",
        entityType: "ORDER",
        entityId: orderId,
        metadata: { status, ...metadata },
      });
    }
    return order;
  }

  async getStockStatus(tenantId: string, productId: string) {
    return this.retailRepository.checkStock(tenantId, productId);
  }

  async getInventoryStats(
    tenantId: string,
    options?: { categoryId?: string; q?: string },
  ) {
    return this.retailRepository.getInventoryStats(tenantId, options);
  }

  // Shifts
  async getActiveShift(
    tenantId: string,
    storeId: string,
    employeeId: string,
  ): Promise<RetailShift | null> {
    return this.retailRepository.getActiveShift(tenantId, storeId, employeeId);
  }

  async openShift(
    tenantId: string,
    locationId: string,
    employeeId: string,
    data: OpenShiftDto,
    userId?: string,
  ): Promise<RetailShift> {
    // Check if already has an active shift
    const active = await this.retailRepository.getActiveShift(
      tenantId,
      data.storeId,
      employeeId,
    );
    if (active) {
      throw new Error("Shift already active for this employee and store.");
    }
    const shift = await this.retailRepository.openShift(
      tenantId,
      locationId,
      employeeId,
      data,
    );

    if (userId) {
      await this.auditService.log({
        tenantId,
        userId,
        module: "retail",
        action: "OPEN_SHIFT",
        entityType: "SHIFT",
        entityId: shift.id,
        metadata: { openingCash: data.openingCash, storeId: data.storeId },
      });
    }

    return shift;
  }

  async closeShift(
    tenantId: string,
    shiftId: string,
    data: CloseShiftDto,
    userId: string,
  ): Promise<RetailShift> {
    const shift = await this.retailRepository.closeShift(
      tenantId,
      shiftId,
      data,
    );
    await this.auditService.log({
      tenantId,
      userId,
      module: "retail",
      action: "CLOSE_SHIFT",
      entityType: "SHIFT",
      entityId: shiftId,
      metadata: { closingCash: data.closingCash },
    });
    return shift;
  }

  async listShifts(tenantId: string, storeId?: string): Promise<RetailShift[]> {
    return this.retailRepository.listShifts(tenantId, storeId);
  }

  // Promotions
  async listPromotions(tenantId: string): Promise<any[]> {
    return this.retailRepository.listPromotions(tenantId);
  }

  async updatePromotion(
    tenantId: string,
    promotionId: string,
    data: any,
    userId: string,
  ): Promise<any> {
    const promo = await this.retailRepository.updatePromotion(
      tenantId,
      promotionId,
      data,
    );
    await this.auditService.log({
      tenantId,
      userId,
      module: "retail",
      action: "UPDATE",
      entityType: "PROMOTION",
      entityId: promotionId,
      metadata: { changes: data },
    });
    return promo;
  }

  // Channels
  async listChannels(tenantId: string): Promise<any[]> {
    return this.retailRepository.listChannels(tenantId);
  }

  async createChannel(
    tenantId: string,
    data: any,
    userId: string,
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
      tenantId,
      payload,
    );

    await this.auditService.log({
      tenantId,
      userId,
      module: "retail",
      action: "CREATE",
      entityType: "CHANNEL",
      entityId: channel.id,
      metadata: { name: channel.name, type: channel.type },
    });

    return {
      ...channel,
      ...(clientId ? { clientId } : {}),
      ...(clientSecret ? { clientSecret } : {}),
    };
  }

  async updateChannel(
    tenantId: string,
    channelId: string,
    data: any,
    userId: string,
  ): Promise<any> {
    const channel = await this.retailRepository.updateChannel(
      tenantId,
      channelId,
      data,
    );
    await this.auditService.log({
      tenantId,
      userId,
      module: "retail",
      action: "UPDATE",
      entityType: "CHANNEL",
      entityId: channelId,
      metadata: { changes: data },
    });
    return channel;
  }

  async deleteChannel(
    tenantId: string,
    channelId: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    const result = await this.retailRepository.deleteChannel(
      tenantId,
      channelId,
    );
    await this.auditService.log({
      tenantId,
      userId,
      module: "retail",
      action: "DELETE",
      entityType: "CHANNEL",
      entityId: channelId,
    });
    return result;
  }

  async syncChannel(
    tenantId: string,
    channelId: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    const result = await this.retailRepository.syncChannel(tenantId, channelId);
    await this.auditService.log({
      tenantId,
      userId,
      module: "retail",
      action: "SYNC",
      entityType: "CHANNEL",
      entityId: channelId,
    });
    return result;
  }

  async getChannelById(
    tenantId: string,
    channelId: string,
  ): Promise<any | null> {
    return this.retailRepository.getChannelById(tenantId, channelId);
  }

  async rotateChannelCredentials(
    tenantId: string,
    channelId: string,
    userId: string,
  ): Promise<{ clientId: string; clientSecret: string }> {
    const channel = await this.retailRepository.getChannelById(
      tenantId,
      channelId,
    );
    if (!channel) {
      throw new NotFoundException("Channel not found");
    }

    const existingCredentials = channel.credentials as {
      clientId?: string;
      branchId?: string;
      gatewayUrl?: string;
      connector?: string;
    } | null;
    const clientId = existingCredentials?.clientId ?? this.generateClientId();
    const clientSecret = this.generateClientSecret();
    const credentialsPayload = {
      clientId,
      clientSecret,
      clientSecretHash: this.hashSecret(clientSecret),
      branchId: existingCredentials?.branchId,
      gatewayUrl: existingCredentials?.gatewayUrl,
      connector: existingCredentials?.connector,
      lastRotated: new Date().toISOString(),
      revoked: false,
    };

    await this.retailRepository.updateChannelCredentials(
      tenantId,
      channelId,
      credentialsPayload,
    );

    await this.auditService.log({
      tenantId,
      userId,
      module: "retail",
      action: "ROTATE_CREDENTIALS",
      entityType: "CHANNEL",
      entityId: channelId,
    });

    return { clientId, clientSecret };
  }

  async revokeChannelCredentials(
    tenantId: string,
    channelId: string,
    userId: string,
  ): Promise<{ clientId: string }> {
    const channel = await this.retailRepository.getChannelById(
      tenantId,
      channelId,
    );
    if (!channel) {
      throw new NotFoundException("Channel not found");
    }

    const existingCredentials = channel.credentials as {
      clientId?: string;
      clientSecret?: string;
      clientSecretHash?: string;
      branchId?: string;
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
      branchId: existingCredentials.branchId,
      gatewayUrl: existingCredentials.gatewayUrl,
      connector: existingCredentials.connector,
      revoked: true,
      revokedAt: new Date().toISOString(),
    };

    await this.retailRepository.updateChannelCredentials(
      tenantId,
      channelId,
      credentialsPayload,
    );

    await this.auditService.log({
      tenantId,
      userId,
      module: "retail",
      action: "REVOKE_CREDENTIALS",
      entityType: "CHANNEL",
      entityId: channelId,
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
    tenantId: string,
    clientId: string,
  ): Promise<any | null> {
    return this.retailRepository.findChannelByClientId(tenantId, clientId);
  }

  // Devices
  async listDevices(tenantId: string, storeId?: string): Promise<any[]> {
    return this.retailRepository.listDevices(tenantId, storeId);
  }

  async registerDevice(
    tenantId: string,
    locationId: string,
    data: RegisterBranchDeviceDto,
    userId: string,
  ): Promise<any> {
    const device = await this.retailRepository.registerDevice(
      tenantId,
      locationId,
      data,
    );
    await this.auditService.log({
      tenantId,
      userId,
      module: "it",
      action: "REGISTER",
      entityType: "DEVICE",
      entityId: device.id,
      metadata: { name: device.name, type: device.type },
    });
    return device;
  }

  async listCCTVs(tenantId: string, storeId?: string): Promise<any[]> {
    return this.retailRepository.listCCTVs(tenantId, storeId);
  }

  async validateCCTVConnection(
    tenantId: string,
    locationId: string,
    data: Partial<RegisterCCTVCameraDto>,
  ): Promise<{ success: boolean; message?: string }> {
    return this.retailRepository.validateCCTVConnection(
      tenantId,
      locationId,
      data,
    );
  }

  async registerCCTV(
    tenantId: string,
    locationId: string,
    data: RegisterCCTVCameraDto,
    userId: string,
  ): Promise<any> {
    const camera = await this.retailRepository.registerCCTV(
      tenantId,
      locationId,
      data,
    );
    await this.auditService.log({
      tenantId,
      userId,
      module: "it",
      action: "REGISTER",
      entityType: "CCTV",
      entityId: camera.id,
      metadata: { name: camera.name, provider: camera.provider },
    });
    return camera;
  }

  async listSensors(tenantId: string, storeId?: string): Promise<any[]> {
    return this.retailRepository.listSensors(tenantId, storeId);
  }

  async registerSensor(
    tenantId: string,
    locationId: string,
    data: RegisterBranchSensorDto,
    userId: string,
  ): Promise<any> {
    const sensor = await this.retailRepository.registerSensor(
      tenantId,
      locationId,
      data,
    );
    await this.auditService.log({
      tenantId,
      userId,
      module: "it",
      action: "REGISTER",
      entityType: "SENSOR",
      entityId: sensor.id,
      metadata: { name: sensor.name, type: sensor.type },
    });
    return sensor;
  }

  async pingDevice(
    tenantId: string,
    deviceId: string,
  ): Promise<{ success: boolean }> {
    return this.retailRepository.pingDevice(tenantId, deviceId);
  }

  async scanDevices(tenantId: string, locationId: string): Promise<any[]> {
    return this.retailRepository.scanDevices(tenantId, locationId);
  }

  async commitScannedDevice(
    tenantId: string,
    locationId: string,
    discoveryId: string,
    userId: string,
  ): Promise<any> {
    const device = await this.retailRepository.commitScannedDevice(
      tenantId,
      locationId,
      discoveryId,
    );
    if (device) {
      await this.auditService.log({
        tenantId,
        userId,
        module: "it",
        action: "REGISTER",
        entityType: "DEVICE",
        entityId: device.id,
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
    tenantId: string,
    orderId: string,
    data: { amount: number; method: string; shiftId?: string },
    userId: string,
  ): Promise<any> {
    // 1. Process payment via Repository (Atomically handles DB, Stock, and Finance ledgers)
    const result = await this.retailRepository.processPayment(
      tenantId,
      orderId,
      data,
    );

    // 2. Publish Sales Event
    if (result.success && result.movements) {
      await this.eventBus.publish({
        eventType: "RETAIL_SALE_COMPLETED",
        tenantId: tenantId,
        entityId: orderId,
        entityType: "ORDER",
        sourceModule: "retail",
        payload: {
          orderId,
          locationId: result.movements[0]?.fromLocationId || "default",
          movements: result.movements,
          amount: data.amount,
          method: data.method,
        },
        userId,
      });
    }

    // 3. Audit Logging
    const order = await this.retailRepository.getOrder(tenantId, orderId);
    if (order) {
      await this.auditService.log({
        tenantId,
        userId,
        module: "retail",
        action: "PAYMENT_COMPLETE",
        entityType: "ORDER",
        entityId: orderId,
        metadata: {
          total: order.grandTotal,
          paymentMethod: data.method,
        },
      });
    }

    return result;
  }

  async processReturn(
    tenantId: string,
    orderId: string,
    data: { itemIds: string[]; shiftId?: string },
    userId: string,
  ): Promise<{ success: boolean }> {
    // 1. Get Order Details
    const order = await this.retailRepository.getOrder(tenantId, orderId);
    if (!order) throw new NotFoundException("Order not found");

    // 2. Emit Return Completed Event instead of calling Inventory and Finance
    await this.eventBus.publish({
      eventType: "RETAIL_RETURN_COMPLETED",
      tenantId: tenantId,
      entityId: orderId,
      entityType: "ORDER",
      sourceModule: "retail",
      payload: {
        orderId,
        storeId: order.storeId || "default",
        grandTotal: order.grandTotal,
        returnedItems: data.itemIds.map((itemId) => {
          const orderItem = order.items.find((i) => i.productId === itemId);
          return {
            productId: itemId,
            quantity: orderItem?.quantity || 1,
            unitPrice: Number(orderItem?.unitPrice || 0),
          };
        }),
      },
      userId,
    });

    // 4. Call Repository
    const result = await this.retailRepository.processReturn(
      tenantId,
      orderId,
      data,
    );

    // 5. Audit Log
    await this.auditService.log({
      tenantId,
      userId,
      module: "retail",
      action: "RETURN_PROCESS",
      entityType: "ORDER",
      entityId: orderId,
      metadata: { refundedItems: data.itemIds.length },
    });

    return result;
  }

  // Inventory Operations
  async submitOpname(
    tenantId: string,
    data: { storeId: string; adjustments: any[]; shiftId?: string },
    userId: string,
  ): Promise<{ success: boolean }> {
    // 1. Emit Opname Event (adjustments handled by listener)
    await this.eventBus.publish({
      eventType: "RETAIL_OPNAME_SUBMITTED",
      tenantId: tenantId,
      entityId: data.storeId,
      entityType: "STORE",
      sourceModule: "retail",
      payload: {
        storeId: data.storeId,
        adjustments: data.adjustments.filter((adj) => adj.variance !== 0),
        sessionId: data.shiftId || "SESSION",
      },
      userId,
    });

    // 2. Call Repository
    const result = await this.retailRepository.submitOpname(tenantId, data);

    // 3. Audit Log
    await this.auditService.log({
      tenantId,
      userId,
      module: "retail",
      action: "STOCK_OPNAME",
      entityType: "STORE",
      entityId: data.storeId,
      metadata: { adjustmentCount: data.adjustments.length },
    });

    return result;
  }

  async receiveGoods(
    tenantId: string,
    data: {
      storeId: string;
      shipmentId: string;
      items: any[];
      shiftId?: string;
    },
    userId: string,
  ): Promise<{ success: boolean }> {
    // 1. Emit Goods Receipt Event to trigger Inventory Intake
    await this.eventBus.publish({
      eventType: "RETAIL_GOODS_RECEIVED",
      tenantId: tenantId,
      entityId: data.shipmentId,
      entityType: "SHIPMENT",
      sourceModule: "retail",
      payload: {
        storeId: data.storeId,
        shipmentId: data.shipmentId,
        items: data.items,
      },
      userId,
    });

    // 2. Call Repository
    const result = await this.retailRepository.receiveGoods(tenantId, data);

    // 3. Audit Log
    await this.auditService.log({
      tenantId,
      userId,
      module: "retail",
      action: "STOCK_INTAKE",
      entityType: "SHIPMENT",
      entityId: data.shipmentId,
      metadata: { itemCount: data.items.length },
    });

    return result;
  }

  // --- Public Gateway (Customer, Cart, Wishlist) ---

  async findCustomerByEmail(tenantId: string, email: string) {
    return this.retailRepository.findCustomerByEmail(tenantId, email);
  }

  async findCustomerById(tenantId: string, customerId: string) {
    return this.retailRepository.findCustomerById(tenantId, customerId);
  }

  async createCustomer(tenantId: string, data: any, userId?: string) {
    const customer = await this.retailRepository.createCustomer(tenantId, data);
    if (userId) {
      await this.auditService.log({
        tenantId,
        userId,
        module: "retail",
        action: "CREATE",
        entityType: "CUSTOMER",
        entityId: customer.id,
        metadata: { name: customer.name, email: customer.email },
      });
    }
    return customer;
  }

  async updateCustomer(
    tenantId: string,
    customerId: string,
    data: any,
    userId?: string,
  ) {
    const customer = await this.retailRepository.updateCustomer(
      tenantId,
      customerId,
      data,
    );
    if (userId) {
      await this.auditService.log({
        tenantId,
        userId,
        module: "retail",
        action: "UPDATE",
        entityType: "CUSTOMER",
        entityId: customerId,
        metadata: { changes: data },
      });
    }
    return customer;
  }

  async createCustomerSession(tenantId: string, data: any) {
    return this.retailRepository.createCustomerSession(tenantId, data);
  }

  async findCustomerSession(tenantId: string, tokenHash: string) {
    return this.retailRepository.findCustomerSession(tenantId, tokenHash);
  }

  async revokeCustomerSession(tenantId: string, tokenHash: string) {
    return this.retailRepository.revokeCustomerSession(tenantId, tokenHash);
  }

  async getCart(tenantId: string, customerId: string) {
    return this.retailRepository.getCart(tenantId, customerId);
  }

  async createCart(tenantId: string, customerId: string) {
    return this.retailRepository.createCart(tenantId, customerId);
  }

  async updateCartItem(
    tenantId: string,
    cartId: string,
    productId: string,
    data: { quantity: number; unitPrice: number },
  ) {
    return this.retailRepository.updateCartItem(
      tenantId,
      cartId,
      productId,
      data,
    );
  }

  async removeCartItem(tenantId: string, cartId: string, itemId: string) {
    return this.retailRepository.removeCartItem(tenantId, cartId, itemId);
  }

  async clearCart(tenantId: string, cartId: string) {
    return this.retailRepository.clearCart(tenantId, cartId);
  }

  async getWishlist(tenantId: string, customerId: string) {
    return this.retailRepository.getWishlist(tenantId, customerId);
  }

  async upsertWishlist(tenantId: string, customerId: string) {
    return this.retailRepository.upsertWishlist(tenantId, customerId);
  }

  async addWishlistItem(
    tenantId: string,
    wishlistId: string,
    productId: string,
  ) {
    return this.retailRepository.addWishlistItem(
      tenantId,
      wishlistId,
      productId,
    );
  }

  async removeWishlistItem(
    tenantId: string,
    wishlistId: string,
    itemId: string,
  ) {
    return this.retailRepository.removeWishlistItem(
      tenantId,
      wishlistId,
      itemId,
    );
  }

  async logEvent(tenantId: string, data: any) {
    return this.retailRepository.logEvent(tenantId, data);
  }
}
