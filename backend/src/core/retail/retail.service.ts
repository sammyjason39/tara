import { Injectable, NotFoundException } from "@nestjs/common";
import { IRetailRepository } from "./repositories/retail.repository.interface";
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
} from "./dto/retail.dto";
import { randomBytes, createHash } from "crypto";
import { AuditService } from "../../shared/audit/audit.service";

@Injectable()
export class RetailService {
  constructor(
    private readonly retailRepository: IRetailRepository,
    private readonly auditService: AuditService,
  ) {}

  // Stores (Physical Branches)
  async listStores(
    tenantId: string,
    locationId?: string,
  ): Promise<RetailStore[]> {
    return this.retailRepository.listStores(tenantId, locationId);
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
  ): Promise<any> {
    return this.retailRepository.createInventoryPool(tenantId, data);
  }

  async getInventoryPool(tenantId: string, poolId: string): Promise<any> {
    const pool = await this.retailRepository.getInventoryPool(tenantId, poolId);
    if (!pool)
      throw new NotFoundException(`Inventory pool ${poolId} not found`);
    return pool;
  }

  async deleteInventoryPool(tenantId: string, poolId: string): Promise<void> {
    return this.retailRepository.deleteInventoryPool(tenantId, poolId);
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
  ): Promise<any> {
    return this.retailRepository.createEcommerceStore(tenantId, data);
  }

  async updateEcommerceStore(
    tenantId: string,
    storeId: string,
    data: UpdateEcommerceStoreDto,
  ): Promise<any> {
    return this.retailRepository.updateEcommerceStore(tenantId, storeId, data);
  }

  async deleteEcommerceStore(tenantId: string, storeId: string): Promise<void> {
    return this.retailRepository.deleteEcommerceStore(tenantId, storeId);
  }

  async linkEcommerceToBranch(
    tenantId: string,
    ecommerceId: string,
    branchId: string,
  ): Promise<void> {
    return this.retailRepository.linkEcommerceToBranch(
      tenantId,
      ecommerceId,
      branchId,
    );
  }

  async unlinkEcommerceFromBranch(
    tenantId: string,
    ecommerceId: string,
    branchId: string,
  ): Promise<void> {
    return this.retailRepository.unlinkEcommerceFromBranch(
      tenantId,
      ecommerceId,
      branchId,
    );
  }

  // Products
  async listProducts(tenantId: string): Promise<RetailProduct[]> {
    return this.retailRepository.listProducts(tenantId);
  }

  // Orders
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
    );

    // Audit initial creation
    await this.auditService.log({
      tenantId,
      userId,
      module: "retail",
      action: "CREATE",
      entityType: "ORDER",
      entityId: order.id,
      metadata: { total: order.grand_total, itemCount: order.items.length },
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
        item.product_id,
        item.quantity,
      );
      if (!res.success) {
        throw new Error(`Insufficient stock for product ${item.product_id}`);
      }
    }
  }

  async calculateTax(tenantId: string, orderId: string): Promise<number> {
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
    return taxTotal;
  }

  async updateOrderStatus(
    tenantId: string,
    orderId: string,
    status: string,
    metadata?: any,
  ): Promise<RetailOrder> {
    return this.retailRepository.updateOrderStatus(
      tenantId,
      orderId,
      status,
      metadata,
    );
  }

  async getStockStatus(tenantId: string, productId: string) {
    return this.retailRepository.checkStock(tenantId, productId);
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
    return this.retailRepository.openShift(
      tenantId,
      locationId,
      employeeId,
      data,
    );
  }

  async closeShift(
    tenantId: string,
    shiftId: string,
    data: CloseShiftDto,
  ): Promise<RetailShift> {
    return this.retailRepository.closeShift(tenantId, shiftId, data);
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
  ): Promise<any> {
    return this.retailRepository.updatePromotion(tenantId, promotionId, data);
  }

  // Channels
  async listChannels(tenantId: string): Promise<any[]> {
    return this.retailRepository.listChannels(tenantId);
  }

  async createChannel(tenantId: string, data: any): Promise<any> {
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
  ): Promise<any> {
    return this.retailRepository.updateChannel(tenantId, channelId, data);
  }

  async deleteChannel(
    tenantId: string,
    channelId: string,
  ): Promise<{ success: boolean }> {
    return this.retailRepository.deleteChannel(tenantId, channelId);
  }

  async syncChannel(
    tenantId: string,
    channelId: string,
  ): Promise<{ success: boolean }> {
    return this.retailRepository.syncChannel(tenantId, channelId);
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

    return { clientId, clientSecret };
  }

  async revokeChannelCredentials(
    tenantId: string,
    channelId: string,
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

  async pingDevice(
    tenantId: string,
    deviceId: string,
  ): Promise<{ success: boolean }> {
    return this.retailRepository.pingDevice(tenantId, deviceId);
  }

  // Payments & Returns
  async processPayment(
    tenantId: string,
    orderId: string,
    data: { amount: number; method: string; shiftId?: string },
  ): Promise<any> {
    return this.retailRepository.processPayment(tenantId, orderId, data);
  }

  async processReturn(
    tenantId: string,
    orderId: string,
    data: { itemIds: string[]; shiftId?: string },
  ): Promise<{ success: boolean }> {
    return this.retailRepository.processReturn(tenantId, orderId, data);
  }

  // Inventory Operations
  async submitOpname(
    tenantId: string,
    data: { storeId: string; adjustments: any[]; shiftId?: string },
  ): Promise<{ success: boolean }> {
    return this.retailRepository.submitOpname(tenantId, data);
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
    return this.retailRepository.receiveGoods(tenantId, data);
  }

  // --- Public Gateway (Customer, Cart, Wishlist) ---

  async findCustomerByEmail(tenantId: string, email: string) {
    return this.retailRepository.findCustomerByEmail(tenantId, email);
  }

  async findCustomerById(tenantId: string, customerId: string) {
    return this.retailRepository.findCustomerById(tenantId, customerId);
  }

  async createCustomer(tenantId: string, data: any) {
    return this.retailRepository.createCustomer(tenantId, data);
  }

  async updateCustomer(tenantId: string, customerId: string, data: any) {
    return this.retailRepository.updateCustomer(tenantId, customerId, data);
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
