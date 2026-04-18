import {
  RetailStore,
  RetailProduct,
  RetailOrder,
  RetailShift,
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
  UpdateProductDto,
  CheckoutDto,
} from "../dto/retail.dto";

export abstract class IRetailRepository {
  // ============================================================
  // BRANCHES (Physical Stores)
  // ============================================================
  abstract listStores(
    tenant_id: string,
    location_id?: string,
  ): Promise<RetailStore[]>;
  abstract listCategories(tenant_id: string): Promise<any[]>;
  abstract getStore(
    tenant_id: string,
    store_id: string,
  ): Promise<RetailStore | null>;
  abstract createStore(
    tenant_id: string,
    data: CreateStoreDto,
  ): Promise<RetailStore>;
  abstract updateStore(
    tenant_id: string,
    store_id: string,
    data: UpdateStoreDto,
  ): Promise<RetailStore>;
  abstract deleteStore(tenant_id: string, store_id: string): Promise<void>;

  // ============================================================
  // INVENTORY POOLS
  // ============================================================
  abstract listInventoryPools(tenant_id: string): Promise<any[]>;
  abstract createInventoryPool(
    tenant_id: string,
    data: CreateInventoryPoolDto,
  ): Promise<any>;
  abstract getInventoryPool(
    tenant_id: string,
    poolId: string,
  ): Promise<any | null>;
  abstract deleteInventoryPool(tenant_id: string, poolId: string): Promise<void>;

  // ============================================================
  // E-COMMERCE STORES
  // ============================================================
  abstract listEcommerceStores(
    tenant_id: string,
    store_id?: string,
  ): Promise<any[]>;
  abstract getEcommerceStore(
    tenant_id: string,
    store_id: string,
  ): Promise<any | null>;
  abstract createEcommerceStore(
    tenant_id: string,
    data: CreateEcommerceStoreDto,
  ): Promise<any>;
  abstract updateEcommerceStore(
    tenant_id: string,
    store_id: string,
    data: UpdateEcommerceStoreDto,
  ): Promise<any>;
  abstract deleteEcommerceStore(
    tenant_id: string,
    store_id: string,
  ): Promise<void>;
  abstract linkEcommerceToBranch(
    tenant_id: string,
    ecommerceId: string,
    branch_id: string,
  ): Promise<void>;
  abstract unlinkEcommerceFromBranch(
    tenant_id: string,
    ecommerceId: string,
    branch_id: string,
  ): Promise<void>;

  // ============================================================
  // PRODUCTS
  // ============================================================
  abstract listProducts(
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
    },
  ): Promise<{
    items: RetailProduct[];
    total: number;
    page: number;
    pageSize: number;
  }>;
  abstract getProduct(
    tenant_id: string,
    product_id: string,
  ): Promise<RetailProduct | null>;
  abstract updateProduct(
    tenant_id: string,
    product_id: string,
    data: UpdateProductDto,
    location_id?: string,
  ): Promise<RetailProduct>;
  abstract generateNextSku(
    tenant_id: string,
    category_id: string,
  ): Promise<{ sku: string; barcode: string }>;

  // ============================================================
  // ORDERS
  // ============================================================
  abstract listOrders(
    tenant_id: string,
    store_id?: string,
  ): Promise<RetailOrder[]>;
  abstract getOrder(
    tenant_id: string,
    order_id: string,
  ): Promise<RetailOrder | null>;
  abstract createOrder(
    tenant_id: string,
    location_id: string,
    data: CreateOrderDto,
    user_id: string,
  ): Promise<RetailOrder>;
  abstract updateOrderStatus(
    tenant_id: string,
    order_id: string,
    status: string,
    metadata?: any,
  ): Promise<RetailOrder>;

  // ============================================================
  // INVENTORY / STOCK
  // ============================================================
  abstract reserveStock(
    tenant_id: string,
    location_id: string,
    product_id: string,
    quantity: number,
  ): Promise<{ success: boolean; reservationId?: string }>;
  abstract releaseStock(
    tenant_id: string,
    product_id: string,
    quantity: number,
  ): Promise<void>;
  abstract checkStock(
    tenant_id: string,
    product_id: string,
  ): Promise<{ available: number; status: string }>;

  abstract getInventoryStats(
    tenant_id: string,
    options?: { category_id?: string; q?: string },
  ): Promise<{
    total: number;
    critical: number;
    lowStock: number;
    overstock: number;
    outOfStock: number;
    totalSOH: number;
    totalATS: number;
    // User requested fields:
    totalItems: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalValue: number;
  }>;

  // ============================================================
  // SHIFTS
  // ============================================================
  abstract getActiveShift(
    tenant_id: string,
    store_id: string,
    employee_id: string,
  ): Promise<RetailShift | null>;
  abstract openShift(
    tenant_id: string,
    location_id: string,
    employee_id: string,
    data: OpenShiftDto,
  ): Promise<RetailShift>;
  abstract closeShift(
    tenant_id: string,
    shift_id: string,
    data: CloseShiftDto,
  ): Promise<RetailShift>;
  abstract listShifts(
    tenant_id: string,
    filters?: {
      store_id?: string;
      employee_id?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<RetailShift[]>;

  // ============================================================
  // PROMOTIONS
  // ============================================================
  abstract listPromotions(tenant_id: string): Promise<any[]>;
  abstract updatePromotion(
    tenant_id: string,
    promotionId: string,
    data: any,
  ): Promise<any>;

  // ============================================================
  // CHANNELS (Legacy - Ecommerce Hub integration)
  // ============================================================
  abstract listChannels(tenant_id: string): Promise<any[]>;
  abstract createChannel(tenant_id: string, data: any): Promise<any>;
  abstract updateChannel(
    tenant_id: string,
    channelId: string,
    data: any,
  ): Promise<any>;
  abstract deleteChannel(
    tenant_id: string,
    channelId: string,
  ): Promise<{ success: boolean }>;
  abstract syncChannel(
    tenant_id: string,
    channelId: string,
  ): Promise<{ success: boolean }>;
  abstract getChannelById(
    tenant_id: string,
    channelId: string,
  ): Promise<any | null>;
  abstract updateChannelCredentials(
    tenant_id: string,
    channelId: string,
    credentials: any,
  ): Promise<any>;
  abstract findChannelByClientId(
    tenant_id: string,
    clientId: string,
  ): Promise<any | null>;

  // ============================================================
  // DEVICES
  // ============================================================
  abstract listDevices(tenant_id: string, store_id?: string): Promise<any[]>;
  abstract registerDevice(
    tenant_id: string,
    location_id: string,
    data: any,
  ): Promise<any>;
  abstract listCCTVs(tenant_id: string, store_id?: string): Promise<any[]>;
  abstract registerCCTV(
    tenant_id: string,
    location_id: string,
    data: any,
  ): Promise<any>;
  abstract validateCCTVConnection(
    tenant_id: string,
    location_id: string,
    data: any,
  ): Promise<{ success: boolean; message?: string }>;
  abstract listSensors(tenant_id: string, store_id?: string): Promise<any[]>;
  abstract registerSensor(
    tenant_id: string,
    location_id: string,
    data: any,
  ): Promise<any>;
  abstract pingDevice(
    tenant_id: string,
    device_id: string,
  ): Promise<{ success: boolean }>;

  abstract scanDevices(tenant_id: string, location_id: string): Promise<any[]>;
  abstract commitScannedDevice(
    tenant_id: string,
    location_id: string,
    discoveryId: string,
  ): Promise<any>;

  // ============================================================
  // PAYMENTS & RETURNS
  // ============================================================
  abstract processPayment(
    tenant_id: string,
    order_id: string,
    data: { amount: number; method: string; shift_id?: string },
  ): Promise<any>;
  abstract processReturn(
    tenant_id: string,
    order_id: string,
    data: { itemIds: string[]; shift_id?: string },
  ): Promise<{ success: boolean }>;

  abstract atomicCheckout(
    tenant_id: string,
    data: CheckoutDto,
    user_id: string,
    idempotencyKey?: string,
  ): Promise<RetailOrder>;

  // ============================================================
  // INVENTORY OPERATIONS
  // ============================================================
  abstract submitOpname(
    tenant_id: string,
    data: { store_id: string; adjustments: any[]; shift_id?: string },
  ): Promise<{ success: boolean }>;
  abstract receiveGoods(
    tenant_id: string,
    data: {
      store_id: string;
      shipment_id: string;
      items: any[];
      shift_id?: string;
    },
  ): Promise<{ success: boolean }>;

  // ============================================================
  // PUBLIC GATEWAY (Customer, Cart, Wishlist)
  // ============================================================

  // Customers
  abstract findCustomerByEmail(
    tenant_id: string,
    email: string,
  ): Promise<any | null>;
  abstract findCustomerById(
    tenant_id: string,
    customer_id: string,
  ): Promise<any | null>;
  abstract createCustomer(tenant_id: string, data: any): Promise<any>;
  abstract updateCustomer(
    tenant_id: string,
    customer_id: string,
    data: any,
  ): Promise<any>;

  // Auth & Sessions
  abstract createCustomerSession(tenant_id: string, data: any): Promise<any>;
  abstract findCustomerSession(
    tenant_id: string,
    tokenHash: string,
  ): Promise<any | null>;
  abstract revokeCustomerSession(
    tenant_id: string,
    tokenHash: string,
  ): Promise<void>;

  // Cart
  abstract getCart(tenant_id: string, customer_id: string): Promise<any | null>;
  abstract createCart(tenant_id: string, customer_id: string): Promise<any>;
  abstract updateCartItem(
    tenant_id: string,
    cartId: string,
    product_id: string,
    data: { quantity: number; unit_price: number },
  ): Promise<any>;
  abstract removeCartItem(
    tenant_id: string,
    cartId: string,
    item_id: string,
  ): Promise<void>;
  abstract clearCart(tenant_id: string, cartId: string): Promise<void>;

  // Wishlist
  abstract getWishlist(
    tenant_id: string,
    customer_id: string,
  ): Promise<any | null>;
  abstract upsertWishlist(tenant_id: string, customer_id: string): Promise<any>;
  abstract addWishlistItem(
    tenant_id: string,
    wishlistId: string,
    product_id: string,
  ): Promise<any>;
  abstract removeWishlistItem(
    tenant_id: string,
    wishlistId: string,
    item_id: string,
  ): Promise<void>;

  // Events
  abstract logEvent(tenant_id: string, data: any): Promise<any>;
}
