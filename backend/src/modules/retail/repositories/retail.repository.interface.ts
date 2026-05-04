import { TenantContext } from "../../../gateway/tenant-context.interface";
import { Prisma } from "@prisma/client";
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
  abstract listStores( ctx: TenantContext,
    location_id?: string,
  ): Promise<RetailStore[]>;
  abstract listCategories( ctx: TenantContext): Promise<any[]>;
  abstract getStore( ctx: TenantContext,
    store_id: string,
  ): Promise<RetailStore | null>;
  abstract createStore( ctx: TenantContext,
    data: CreateStoreDto,
  ): Promise<RetailStore>;
  abstract updateStore( ctx: TenantContext,
    store_id: string,
    data: UpdateStoreDto,
  ): Promise<RetailStore>;
  abstract deleteStore( ctx: TenantContext, store_id: string): Promise<void>;

  // ============================================================
  // INVENTORY POOLS
  // ============================================================
  abstract listInventoryPools( ctx: TenantContext): Promise<any[]>;
  abstract createInventoryPool( ctx: TenantContext,
    data: CreateInventoryPoolDto,
  ): Promise<any>;
  abstract getInventoryPool( ctx: TenantContext,
    poolId: string,
  ): Promise<any | null>;
  abstract deleteInventoryPool( ctx: TenantContext, poolId: string): Promise<void>;

  // ============================================================
  // E-COMMERCE STORES
  // ============================================================
  abstract listEcommerceStores( ctx: TenantContext,
    store_id?: string,
  ): Promise<any[]>;
  abstract getEcommerceStore( ctx: TenantContext,
    store_id: string,
  ): Promise<any | null>;
  abstract createEcommerceStore( ctx: TenantContext,
    data: CreateEcommerceStoreDto,
  ): Promise<any>;
  abstract updateEcommerceStore( ctx: TenantContext,
    store_id: string,
    data: UpdateEcommerceStoreDto,
  ): Promise<any>;
  abstract deleteEcommerceStore( ctx: TenantContext,
    store_id: string,
  ): Promise<void>;
  abstract linkEcommerceToBranch( ctx: TenantContext,
    ecommerceId: string,
    branch_id: string,
  ): Promise<void>;
  abstract unlinkEcommerceFromBranch( ctx: TenantContext,
    ecommerceId: string,
    branch_id: string,
  ): Promise<void>;

  // ============================================================
  // PRODUCTS
  // ============================================================
  abstract listProducts( ctx: TenantContext,
    options?: {
      page?: number;
      pageSize?: number;
      category_id?: string;
      type?: string;
      minPrice?: number | string;
      maxPrice?: number | string;
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
  abstract getProduct( ctx: TenantContext,
    product_id: string,
  ): Promise<RetailProduct | null>;
  abstract updateProduct( ctx: TenantContext,
    product_id: string,
    data: UpdateProductDto,
    location_id?: string,
  ): Promise<RetailProduct>;
  abstract generateNextSku( ctx: TenantContext,
    category_id: string,
  ): Promise<{ sku: string; barcode: string }>;

  // ============================================================
  // ORDERS
  // ============================================================
  abstract listOrders( ctx: TenantContext,
    options?: {
      store_id?: string;
      customer_id?: string;
      ecommerce_id?: string;
      status?: string;
    },
  ): Promise<RetailOrder[]>;

  abstract listCustomers( ctx: TenantContext,
    options?: {
      ecommerce_id?: string;
      q?: string;
    },
  ): Promise<any[]>;
  abstract getOrder( ctx: TenantContext,
    order_id: string,
  ): Promise<RetailOrder | null>;
  abstract createOrder( ctx: TenantContext,
    location_id: string,
    data: CreateOrderDto,
    user_id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<RetailOrder>;
  abstract updateOrderStatus( ctx: TenantContext,
    order_id: string,
    status: string,
    metadata?: any,
  ): Promise<RetailOrder>;

  abstract atomicCheckout( ctx: TenantContext,
    data: CheckoutDto,
    user_id: string,
    idempotency_key?: string,
  ): Promise<RetailOrder>;

  abstract voidOrder( ctx: TenantContext,
    order_id: string,
    user_id: string,
  ): Promise<RetailOrder>;

  abstract cancelOrder( ctx: TenantContext,
    order_id: string,
    user_id: string,
  ): Promise<RetailOrder>;


  // ============================================================
  // INVENTORY / STOCK
  // ============================================================
  abstract reserveStock( ctx: TenantContext,
    location_id: string,
    product_id: string,
    quantity: Prisma.Decimal,
  ): Promise<{ success: boolean; reservationId?: string }>;
  abstract releaseStock( ctx: TenantContext,
    product_id: string,
    quantity: Prisma.Decimal,
  ): Promise<void>;
  abstract checkStock( ctx: TenantContext,
    product_id: string,
  ): Promise<{ available: Prisma.Decimal; on_hand: Prisma.Decimal; reserved: Prisma.Decimal; status: string }>;

  abstract getChannelStock( ctx: TenantContext,
    channel_id: string,
    product_id: string,
  ): Promise<{ available: Prisma.Decimal; on_hand: Prisma.Decimal; reserved: Prisma.Decimal; status: string }>;

  abstract getInventoryStats( ctx: TenantContext,
    options?: { category_id?: string; q?: string },
  ): Promise<{
    total: number;
    critical: number;
    lowStock: number;
    overstock: number;
    outOfStock: number;
    totalSOH: Prisma.Decimal;
    totalATS: Prisma.Decimal;
    // User requested fields:
    totalItems: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalValue: Prisma.Decimal;
  }>;

  // ============================================================
  // SHIFTS
  // ============================================================
  abstract getActiveShift( ctx: TenantContext,
    store_id: string,
    employee_id: string,
  ): Promise<RetailShift | null>;
  abstract openShift( ctx: TenantContext,
    location_id: string,
    employee_id: string,
    data: OpenShiftDto,
  ): Promise<RetailShift>;
  abstract closeShift( ctx: TenantContext,
    shift_id: string,
    data: CloseShiftDto,
  ): Promise<RetailShift>;
  abstract listShifts( ctx: TenantContext,
    store_id?: string,
    employee_id?: string,
  ): Promise<RetailShift[]>;

  abstract getShift( ctx: TenantContext,
    shift_id: string,
  ): Promise<RetailShift | null>;

  abstract updateShiftStatus( ctx: TenantContext,
    shift_id: string,
    status: string,
  ): Promise<RetailShift>;

  abstract reconcileShift( ctx: TenantContext,
    shift_id: string,
    data: {
      actual_cash: Prisma.Decimal;
      variance: Prisma.Decimal;
      reason: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<RetailShift>;


  // ============================================================
  // PROMOTIONS
  // ============================================================
  abstract listPromotions( ctx: TenantContext): Promise<any[]>;
  abstract updatePromotion( ctx: TenantContext,
    promotionId: string,
    data: any,
  ): Promise<any>;

  // ============================================================
  // CHANNELS (Legacy - Ecommerce Hub integration)
  // ============================================================
  abstract listChannels( ctx: TenantContext): Promise<any[]>;
  abstract createChannel( ctx: TenantContext, data: any): Promise<any>;
  abstract updateChannel( ctx: TenantContext,
    channelId: string,
    data: any,
  ): Promise<any>;
  abstract deleteChannel( ctx: TenantContext,
    channelId: string,
  ): Promise<{ success: boolean }>;
  abstract syncChannel( ctx: TenantContext,
    channelId: string,
  ): Promise<{ success: boolean }>;
  abstract getChannelById( ctx: TenantContext,
    channelId: string,
  ): Promise<any | null>;
  abstract updateChannelCredentials( ctx: TenantContext,
    channelId: string,
    credentials: any,
  ): Promise<any>;
  abstract findChannelByClientId( ctx: TenantContext,
    clientId: string,
  ): Promise<any | null>;

  // ============================================================
  // CHANNEL PRODUCT MANAGEMENT (Ecommerce Hub)
  // ============================================================
  /** List products with their channel-specific visibility and stock limits. */
  abstract listChannelProducts( ctx: TenantContext,
    channel_id: string,
    options?: { category_id?: string; q?: string },
  ): Promise<any[]>;

  /** Bulk update visibility and stock limits for multiple products on a channel. */
  abstract updateChannelProducts( ctx: TenantContext,
    channel_id: string,
    updates: Array<{
      product_id: string;
      visible: boolean;
      stock_limit?: number;
    }>,
  ): Promise<void>;

  /** Update which categories are "enabled" for a specific channel. */
  abstract updateChannelCategories( ctx: TenantContext,
    channel_id: string,
    categories: string[],
  ): Promise<void>;

  /** Get enabled categories for a channel. */
  abstract getChannelCategories( ctx: TenantContext,
    channel_id: string,
  ): Promise<string[]>;

  // ============================================================
  // DEVICES
  // ============================================================
  abstract listDevices( ctx: TenantContext, store_id?: string): Promise<any[]>;
  abstract registerDevice( ctx: TenantContext,
    location_id: string,
    data: any,
  ): Promise<any>;
  abstract listCCTVs( ctx: TenantContext, store_id?: string): Promise<any[]>;
  abstract registerCCTV( ctx: TenantContext,
    location_id: string,
    data: any,
  ): Promise<any>;
  abstract validateCCTVConnection( ctx: TenantContext,
    location_id: string,
    data: any,
  ): Promise<{ success: boolean; message?: string }>;
  abstract listSensors( ctx: TenantContext, store_id?: string): Promise<any[]>;
  abstract registerSensor( ctx: TenantContext,
    location_id: string,
    data: any,
  ): Promise<any>;
  abstract pingDevice( ctx: TenantContext,
    device_id: string,
  ): Promise<{ success: boolean }>;

  abstract scanDevices( ctx: TenantContext, location_id: string): Promise<any[]>;
  abstract commitScannedDevice( ctx: TenantContext,
    location_id: string,
    discoveryId: string,
  ): Promise<any>;

  // ============================================================
  // PAYMENTS & RETURNS
  // ============================================================
  abstract processPayment( ctx: TenantContext,
    order_id: string,
    data: { amount: Prisma.Decimal; method: string; shift_id?: string },
  ): Promise<any>;
  abstract processReturn( ctx: TenantContext,
    order_id: string,
    data: {
      itemIds: string[];
      shift_id?: string;
      conditions?: Array<{
        productId: string;
        condition: "good" | "damaged_repairable" | "damaged_unrepairable";
        notes?: string;
      }>;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<{ success: boolean }>;



  // ============================================================
  // INVENTORY OPERATIONS
  // ============================================================
  abstract submitOpname( ctx: TenantContext,
    data: { store_id: string; adjustments: any[]; shift_id?: string },
  ): Promise<{ success: boolean }>;
  abstract receiveGoods( ctx: TenantContext,
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
  abstract findCustomerByEmail( ctx: TenantContext,
    email: string,
  ): Promise<any | null>;
  abstract getCustomerById( ctx: TenantContext,
    customer_id: string,
  ): Promise<any | null>;
  abstract getCustomerByPhone( ctx: TenantContext,
    phone: string,
  ): Promise<any | null>;
  abstract createCustomer( ctx: TenantContext, data: any): Promise<any>;
  abstract updateCustomer( ctx: TenantContext,
    customer_id: string,
    data: any,
  ): Promise<any>;

  // Auth & Sessions
  abstract createCustomerSession( ctx: TenantContext, data: any): Promise<any>;
  abstract findCustomerSession( ctx: TenantContext,
    tokenHash: string,
  ): Promise<any | null>;
  abstract revokeCustomerSession( ctx: TenantContext,
    tokenHash: string,
  ): Promise<void>;

  // Cart
  abstract getCart( ctx: TenantContext, customer_id: string): Promise<any | null>;
  abstract createCart( ctx: TenantContext, customer_id: string): Promise<any>;
  abstract updateCartItem( ctx: TenantContext,
    cartId: string,
    product_id: string,
    data: { quantity: Prisma.Decimal; unit_price: Prisma.Decimal },
  ): Promise<any>;
  abstract removeCartItem( ctx: TenantContext,
    cartId: string,
    item_id: string,
  ): Promise<void>;
  abstract clearCart( ctx: TenantContext, cartId: string): Promise<void>;

  // Wishlist
  abstract getWishlist( ctx: TenantContext,
    customer_id: string,
  ): Promise<any | null>;
  abstract upsertWishlist( ctx: TenantContext, customer_id: string): Promise<any>;
  abstract addWishlistItem( ctx: TenantContext,
    wishlistId: string,
    product_id: string,
  ): Promise<any>;
  abstract removeWishlistItem( ctx: TenantContext,
    wishlistId: string,
    item_id: string,
  ): Promise<void>;

  // Events
  abstract logEvent( ctx: TenantContext, data: any): Promise<any>;
}

