import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { TenantContext } from "../../../gateway/tenant-context.interface";
import { v4 as uuidv4 } from "uuid";
import { IRetailRepository } from "./retail.repository.interface";
import {
  RetailStore,
  RetailProduct,
  RetailOrder,
  RetailShift,
  ProductProjection,
  LabelConfig,
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

@Injectable()
export class RetailMockRepository implements IRetailRepository {
  private stores: RetailStore[] = [];
  private products: RetailProduct[] = [];
  private orders: RetailOrder[] = [];
  private shifts: RetailShift[] = [];
  private projections: ProductProjection[] = [];
  private labelConfigs: LabelConfig[] = [];
  private devices: any[] = [];
  private cameras: any[] = [];
  private sensors: any[] = [];
  private discoveredDevices: any[] = [];
  private channelProductConfigs: Map<string, Map<string, { visible: boolean; stock_limit: number }>> = new Map();
  private channelCategoryConfigs: Map<string, string[]> = new Map();

  constructor() {
    // Hansel Demo Tenant Data
    const hanselTenant = "hansel-demo-tenant";
    const hanselLoc1 = "hansel-loc-1";
    const hanselLoc2 = "hansel-loc-2";

    this.stores = [
      {
        id: "hansel-store-1",
        tenant_id: hanselTenant,
        location_id: hanselLoc1,
        name: "Flagship Gadget Hub",
        code: "STR-GDB-01",
        type: "flagship",
        status: "active",
        address: "Sudirman Central Jakarta",
        phone: "+62 812-3456-7890",
        timezone: "Asia/Jakarta",
        currency: "IDR",
        created_at: new Date(),
        updated_at: new Date(),
      } as any,
      {
        id: "hansel-store-2",
        tenant_id: hanselTenant,
        location_id: hanselLoc2,
        name: "Urban Electronics Lite",
        code: "STR-URB-02",
        type: "satellite",
        status: "active",
        address: "Kuningan Mall, Jakarta",
        phone: "+62 811-1111-2222",
        timezone: "Asia/Jakarta",
        currency: "IDR",
        created_at: new Date(),
        updated_at: new Date(),
      } as any,
    ];

    this.products = [
      {
        id: "hansel-prod-1",
        tenant_id: hanselTenant,
        sku: "ELEC-MBP-M3",
        barcode: "888123456789",
        name: "MacBook Pro 14 M3",
        description: "14-inch Space Gray, 16GB RAM, 512GB SSD",
        category_id: "cat-1",
        categoryName: "Electronics",
        base_price: new Prisma.Decimal(32999000),
        currency: "IDR",
        unit: "PCS",
        type: "ITEM",
        status: "active",
        stock: 12,
        created_at: new Date(),
        updated_at: new Date(),
      } as any,
    ];
  }

  async listStores(ctx: TenantContext, location_id?: string): Promise<RetailStore[]> {
    return this.stores.filter(s => s.tenant_id === ctx.tenant_id);
  }

  async listCategories(ctx: TenantContext): Promise<any[]> {
    return [
      { id: "cat-1", name: "Electronics" },
      { id: "cat-2", name: "Fashion" },
      { id: "cat-3", name: "Furniture" },
    ];
  }

  async getStore(ctx: TenantContext, store_id: string): Promise<RetailStore | null> {
    return this.stores.find(s => s.id === store_id && s.tenant_id === ctx.tenant_id) || null;
  }

  async createStore(ctx: TenantContext, data: CreateStoreDto): Promise<RetailStore> {
    const store = { id: uuidv4(), tenant_id: ctx.tenant_id, ...data, created_at: new Date(), updated_at: new Date() } as any;
    this.stores.push(store);
    return store;
  }

  async updateStore(ctx: TenantContext, store_id: string, data: UpdateStoreDto): Promise<RetailStore> {
    const index = this.stores.findIndex(s => s.id === store_id && s.tenant_id === ctx.tenant_id);
    if (index === -1) throw new Error("Store not found");
    this.stores[index] = { ...this.stores[index], ...data, updated_at: new Date() } as any;
    return this.stores[index];
  }

  async deleteStore(ctx: TenantContext, store_id: string): Promise<void> {
    this.stores = this.stores.filter(s => !(s.id === store_id && s.tenant_id === ctx.tenant_id));
  }

  async listInventoryPools(ctx: TenantContext): Promise<any[]> { return []; }
  async listCustomers(ctx: TenantContext, options?: { ecommerce_id?: string; q?: string }): Promise<any[]> { return []; }
  async createInventoryPool(ctx: TenantContext, data: CreateInventoryPoolDto): Promise<any> { return {}; }
  async getInventoryPool(ctx: TenantContext, poolId: string): Promise<any | null> { return null; }
  async deleteInventoryPool(ctx: TenantContext, poolId: string): Promise<void> {}

  async listEcommerceStores(ctx: TenantContext, store_id?: string): Promise<any[]> { return []; }
  async getEcommerceStore(ctx: TenantContext, store_id: string): Promise<any | null> { return null; }
  async createEcommerceStore(ctx: TenantContext, data: CreateEcommerceStoreDto): Promise<any> { return {}; }
  async updateEcommerceStore(ctx: TenantContext, store_id: string, data: UpdateEcommerceStoreDto): Promise<any> { return {}; }
  async deleteEcommerceStore(ctx: TenantContext, store_id: string): Promise<void> {}
  async linkEcommerceToBranch(ctx: TenantContext, ecommerceId: string, branch_id: string): Promise<void> {}
  async unlinkEcommerceFromBranch(ctx: TenantContext, ecommerceId: string, branch_id: string): Promise<void> {}

  async listProducts(ctx: TenantContext, options?: any): Promise<{ items: RetailProduct[]; total: number; page: number; pageSize: number }> {
    const filtered = this.products.filter(p => p.tenant_id === ctx.tenant_id);
    return { items: filtered, total: filtered.length, page: 1, pageSize: 50 };
  }

  async getProduct(ctx: TenantContext, product_id: string): Promise<RetailProduct | null> {
    return this.products.find(p => p.id === product_id && p.tenant_id === ctx.tenant_id) || null;
  }

  async updateProduct(ctx: TenantContext, product_id: string, data: UpdateProductDto): Promise<RetailProduct> {
    const index = this.products.findIndex(p => p.id === product_id && p.tenant_id === ctx.tenant_id);
    if (index === -1) throw new Error("Product not found");
    this.products[index] = { ...this.products[index], ...data, updated_at: new Date() } as any;
    return this.products[index];
  }

  async generateNextSku(ctx: TenantContext, category_id: string): Promise<{ sku: string; barcode: string }> {
    return { sku: "SKU-" + uuidv4().slice(0, 8), barcode: "BC-" + uuidv4().slice(0, 8) };
  }

  async listOrders(ctx: TenantContext, options?: { store_id?: string; customer_id?: string; status?: string }): Promise<RetailOrder[]> {
    return this.orders.filter(o => o.tenant_id === ctx.tenant_id);
  }

  async getOrder(ctx: TenantContext, order_id: string): Promise<RetailOrder | null> {
    return this.orders.find(o => o.id === order_id && o.tenant_id === ctx.tenant_id) || null;
  }

  async createOrder(ctx: TenantContext, location_id: string, data: CreateOrderDto, user_id: string): Promise<RetailOrder> {
    const order = { id: uuidv4(), tenant_id: ctx.tenant_id, ...data, cashier_id: user_id, created_at: new Date(), updated_at: new Date() } as any;
    this.orders.push(order);
    return order;
  }

  async atomicCheckout(ctx: TenantContext, data: CheckoutDto, user_id: string): Promise<RetailOrder> {
    return this.createOrder(ctx, "mock-loc", { ...data, terminal_id: data.terminal_id || "pos" } as any, user_id);
  }

  async updateOrderStatus(ctx: TenantContext, order_id: string, status: string): Promise<RetailOrder> {
    const index = this.orders.findIndex(o => o.id === order_id && o.tenant_id === ctx.tenant_id);
    if (index === -1) throw new Error("Order not found");
    this.orders[index].status = status as any;
    return this.orders[index];
  }

  async reserveStock(ctx: TenantContext, location_id: string, product_id: string, quantity: Prisma.Decimal): Promise<{ success: boolean }> {
    return { success: true };
  }

  async releaseStock(ctx: TenantContext, product_id: string, quantity: Prisma.Decimal): Promise<void> {}

  async checkStock(ctx: TenantContext, product_id: string): Promise<any> {
    return { available: new Prisma.Decimal(10), on_hand: new Prisma.Decimal(10), reserved: new Prisma.Decimal(0), status: "IN_STOCK" };
  }

  async getChannelStock(ctx: TenantContext, channel_id: string, product_id: string): Promise<any> {
    return this.checkStock(ctx, product_id);
  }

  async getInventoryStats(ctx: TenantContext): Promise<any> {
    return { total: 0, critical: 0, lowStock: 0, overstock: 0, outOfStock: 0, totalValue: new Prisma.Decimal(0) };
  }

  async getActiveShift(ctx: TenantContext, store_id: string, employee_id: string): Promise<RetailShift | null> {
    return this.shifts.find(s => s.store_id === store_id && s.tenant_id === ctx.tenant_id && s.status === "open") || null;
  }

  async openShift(ctx: TenantContext, location_id: string, employee_id: string, data: OpenShiftDto): Promise<RetailShift> {
    const shift = { id: uuidv4(), tenant_id: ctx.tenant_id, employee_id, status: "open", ...data, start_time: new Date() } as any;
    this.shifts.push(shift);
    return shift;
  }

  async closeShift(ctx: TenantContext, shift_id: string, data: CloseShiftDto): Promise<RetailShift> {
    const index = this.shifts.findIndex(s => s.id === shift_id && s.tenant_id === ctx.tenant_id);
    if (index === -1) throw new Error("Shift not found");
    this.shifts[index] = { ...this.shifts[index], ...data, status: "closed", end_time: new Date() } as any;
    return this.shifts[index];
  }

  async reconcileShift(ctx: TenantContext, shift_id: string, data: any): Promise<RetailShift> {
    const index = this.shifts.findIndex(s => s.id === shift_id && s.tenant_id === ctx.tenant_id);
    if (index === -1) throw new Error("Shift not found");
    this.shifts[index].status = "reconciled" as any;
    return this.shifts[index];
  }

  async listShifts(ctx: TenantContext, store_id?: string): Promise<RetailShift[]> {
    return this.shifts.filter(s => s.tenant_id === ctx.tenant_id);
  }

  async getShift(ctx: TenantContext, shift_id: string): Promise<RetailShift | null> {
    return this.shifts.find(s => s.id === shift_id && s.tenant_id === ctx.tenant_id) || null;
  }

  async updateShiftStatus(ctx: TenantContext, shift_id: string, status: string): Promise<RetailShift> {
    const index = this.shifts.findIndex(s => s.id === shift_id && s.tenant_id === ctx.tenant_id);
    if (index === -1) throw new Error("Shift not found");
    this.shifts[index].status = status as any;
    return this.shifts[index];
  }

  async createCashMovement(ctx: TenantContext, data: any): Promise<any> {
    return { id: uuidv4(), ...data, created_at: new Date() };
  }

  async listPromotions(ctx: TenantContext): Promise<any[]> { return []; }
  async updatePromotion(ctx: TenantContext, promotionId: string, data: any): Promise<any> { return {}; }
  async listChannels(ctx: TenantContext): Promise<any[]> { return []; }
  async createChannel(ctx: TenantContext, data: any): Promise<any> { return {}; }
  async updateChannel(ctx: TenantContext, channelId: string, data: any): Promise<any> { return {}; }
  async deleteChannel(ctx: TenantContext, channelId: string): Promise<{ success: boolean }> { return { success: true }; }
  async syncChannel(ctx: TenantContext, channelId: string): Promise<{ success: boolean }> { return { success: true }; }
  async getChannelById(ctx: TenantContext, channelId: string): Promise<any | null> { return null; }

  async listChannelProducts(ctx: TenantContext, channel_id: string, options?: any): Promise<any[]> { return []; }
  async updateChannelProducts(ctx: TenantContext, channel_id: string, updates: any[]): Promise<void> {}
  async updateChannelCategories(ctx: TenantContext, channel_id: string, categories: string[]): Promise<void> {}
  async getChannelCategories(ctx: TenantContext, channel_id: string): Promise<string[]> { return []; }
  async updateChannelCredentials(ctx: TenantContext, channelId: string, credentials: any): Promise<any> { return {}; }
  async findChannelByClientId(ctx: TenantContext, clientId: string): Promise<any | null> { return null; }

  async listDevices(ctx: TenantContext, store_id?: string): Promise<any[]> { return []; }
  async registerDevice(ctx: TenantContext, location_id: string, data: any): Promise<any> { return {}; }
  async listCCTVs(ctx: TenantContext, store_id?: string): Promise<any[]> { return []; }
  async validateCCTVConnection(ctx: TenantContext, location_id: string, data: any): Promise<any> { return { success: true }; }
  async registerCCTV(ctx: TenantContext, location_id: string, data: any): Promise<any> { return {}; }
  async listSensors(ctx: TenantContext, store_id?: string): Promise<any[]> { return []; }
  async registerSensor(ctx: TenantContext, location_id: string, data: any): Promise<any> { return {}; }
  async scanDevices(ctx: TenantContext, location_id: string): Promise<any[]> { return []; }
  async commitScannedDevice(ctx: TenantContext, location_id: string, discoveryId: string): Promise<any> { return {}; }
  async pingDevice(ctx: TenantContext, device_id: string): Promise<any> { return { success: true }; }

  async processPayment(ctx: TenantContext, order_id: string, data: any): Promise<any> { return {}; }
  async processReturn(ctx: TenantContext, order_id: string, data: any): Promise<any> { return { success: true }; }
  async voidOrder(ctx: TenantContext, order_id: string, user_id: string): Promise<RetailOrder> { return {} as any; }
  async cancelOrder(ctx: TenantContext, order_id: string, user_id: string): Promise<RetailOrder> { return {} as any; }
  async submitOpname(ctx: TenantContext, data: any): Promise<any> { return { success: true }; }
  async receiveGoods(ctx: TenantContext, data: any): Promise<any> { return { success: true }; }

  async findCustomerByEmail(ctx: TenantContext, email: string): Promise<any | null> { return null; }
  async getCustomerById(ctx: TenantContext, customer_id: string): Promise<any | null> { return null; }
  async getCustomerByPhone(ctx: TenantContext, phone: string): Promise<any | null> { return null; }
  async createCustomer(ctx: TenantContext, data: any): Promise<any> { return {}; }
  async updateCustomer(ctx: TenantContext, customer_id: string, data: any): Promise<any> { return {}; }
  async createCustomerSession(ctx: TenantContext, data: any): Promise<any> { return {}; }
  async findCustomerSession(ctx: TenantContext, tokenHash: string): Promise<any | null> { return null; }
  async revokeCustomerSession(ctx: TenantContext, tokenHash: string): Promise<void> {}

  async getCart(ctx: TenantContext, customer_id: string): Promise<any | null> { return null; }
  async createCart(ctx: TenantContext, customer_id: string): Promise<any> { return {}; }
  async updateCartItem(ctx: TenantContext, cartId: string, product_id: string, data: any): Promise<any> { return {}; }
  async removeCartItem(ctx: TenantContext, cartId: string, item_id: string): Promise<void> {}
  async clearCart(ctx: TenantContext, cartId: string): Promise<void> {}
  async getWishlist(ctx: TenantContext, customer_id: string): Promise<any | null> { return null; }
  async upsertWishlist(ctx: TenantContext, customer_id: string): Promise<any> { return {}; }
  async addWishlistItem(ctx: TenantContext, wishlistId: string, product_id: string): Promise<any> { return {}; }
  async removeWishlistItem(ctx: TenantContext, wishlistId: string, item_id: string): Promise<void> {}
  async logEvent(ctx: TenantContext, data: any): Promise<any> { return {}; }
}
