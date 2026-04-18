import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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

  constructor() {
    // Initial mock data for testing projections
    this.products = [
      {
        id: "item-001",
        tenant_id: "04bbc0e0-213d-4af4-9ce8-0e4674a58a90",
        sku: "ELEC-MBP-001",
        name: "MacBook Pro 14 M3",
        description: "High performance laptop",
        base_price: 32999000,
        category_id: "cat-1",
        categoryName: "Electronics",
        barcode: "888123456789",
        type: "ITEM",
        status: "active",
        unit: "PCS",
        stock: 5,
        created_at: new Date(),
        updated_at: new Date(),
      } as any,
      {
        id: "item-002",
        tenant_id: "04bbc0e0-213d-4af4-9ce8-0e4674a58a90",
        sku: "ELEC-IPN-015",
        name: "iPhone 15 Pro",
        description: "Stronger than ever",
        base_price: 18999000,
        category_id: "cat-1",
        categoryName: "Electronics",
        barcode: "888987654321",
        type: "ITEM",
        status: "active",
        unit: "PCS",
        stock: 12,
        created_at: new Date(),
        updated_at: new Date(),
      } as any,
      {
        id: "item-003",
        tenant_id: "04bbc0e0-213d-4af4-9ce8-0e4674a58a90",
        sku: "CLOTH-TEE-BLK",
        name: "Minimalist Black Tee",
        description: "100% Cotton",
        base_price: 249000,
        category_id: "cat-2",
        categoryName: "Clothing",
        barcode: "111222333444",
        type: "ITEM",
        status: "active",
        unit: "PCS",
        stock: 50,
        created_at: new Date(),
        updated_at: new Date(),
      } as any,
      {
        id: "item-004",
        tenant_id: "04bbc0e0-213d-4af4-9ce8-0e4674a58a90",
        sku: "FURN-CHR-OAK",
        name: "Oak Dining Chair",
        description: "Solid oak wood",
        base_price: 1500000,
        category_id: "cat-3",
        categoryName: "Furniture",
        barcode: "555666777888",
        type: "ITEM",
        status: "active",
        unit: "PCS",
        stock: 8,
        created_at: new Date(),
        updated_at: new Date(),
      } as any,
    ];

    this.projections = [];
  }

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
  ): Promise<{
    items: RetailProduct[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    console.log(`[MockRepo] listProducts for tenant ${tenant_id}`, options);

    let filtered = this.products.filter((p) => p.tenant_id === tenant_id);

    // Apply filters
    if (options?.category_id && options.category_id !== "all") {
      filtered = filtered.filter((p) => p.category_id === options.category_id);
    }
    if (options?.type && options.type !== "all") {
      filtered = filtered.filter((p) => p.type === options.type);
    }
    if (options?.minPrice !== undefined) {
      filtered = filtered.filter((p) =>
        (p.base_price as unknown as Prisma.Decimal).greaterThanOrEqualTo(
          options.minPrice!,
        ),
      );
    }
    if (options?.maxPrice !== undefined) {
      filtered = filtered.filter((p) =>
        (p.base_price as unknown as Prisma.Decimal).lessThanOrEqualTo(
          options.maxPrice!,
        ),
      );
    }
    if (options?.q) {
      const q = options.q.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.barcode.toLowerCase().includes(q),
      );
    }

    const items = filtered.map((p) => {
      // Data Resolution Logic: Hierarchical Overrides
      let projection = undefined;

      if (options?.location_id) {
        projection = this.projections.find(
          (proj) =>
            proj.item_master_id === p.id &&
            proj.tenant_id === tenant_id &&
            proj.module_type === "RETAIL" &&
            proj.is_active &&
            proj.location_id === options.location_id,
        );
      }

      if (!projection) {
        projection = this.projections.find(
          (proj) =>
            proj.item_master_id === p.id &&
            proj.tenant_id === tenant_id &&
            proj.module_type === "RETAIL" &&
            proj.is_active &&
            !proj.location_id,
        );
      }

      return {
        ...p,
        name: projection?.custom_name || p.name,
        description: projection?.custom_description || p.description,
      } as any;
    });

    console.log(`[MockRepo] Returning ${items.length} items`);

    const page = options?.page || 1;
    const pageSize = options?.pageSize || 10;
    const start = (page - 1) * pageSize;

    return {
      items: items.slice(start, start + pageSize),
      total: items.length,
      page,
      pageSize,
    };
  }

  // --- Implement other REQUIRED methods with minimal mock logic ---
  async listStores(
    tenant_id: string,
    location_id?: string,
  ): Promise<RetailStore[]> {
    return this.stores.filter(
      (s) =>
        s.tenant_id === tenant_id && (!location_id || s.location_id === location_id),
    );
  }
  async listCategories(tenant_id: string): Promise<any[]> {
    return [
      { id: "cat-1", name: "Electronics", tenant_id },
      { id: "cat-2", name: "Clothing", tenant_id },
      { id: "cat-3", name: "Furniture", tenant_id },
    ];
  }
  async getStore(
    tenant_id: string,
    store_id: string,
  ): Promise<RetailStore | null> {
    return null;
  }
  async createStore(
    tenant_id: string,
    data: CreateStoreDto,
  ): Promise<RetailStore> {
    const store: RetailStore = {
      id: uuidv4(),
      tenant_id: tenant_id,
      location_id: data.location_id || "loc-default",
      name: data.name,
      code: data.code,
      type: data.type as any,
      status: "active",
      address: data.address || "",
      phone: data.phone,
      email: data.email,
      timezone: data.timezone || "UTC",
      currency: data.currency || "USD",
      tax_zone: data.tax_zone,
      manager_id: data.manager_id,
      inventory_pool_id: data.inventory_pool_id,
      operational_config: data.operational_config as any,
      supply_config: data.supply_config as any,
      infrastructure_registry: data.infrastructure_registry as any,
      channel_binding: data.channel_binding as any,
      governance: (data.governance || {
        license_status: "active",
        activation_source: "Cloud",
        compliance_level: 1,
        audit_frequency_tier: "standard",
      }) as any,
      config_version: {
        updated_by: "system_user",
        updated_at: new Date(),
        revision_number: 1,
      },
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.stores.push(store);
    return store;
  }
  async updateStore(
    tenant_id: string,
    store_id: string,
    data: UpdateStoreDto,
  ): Promise<RetailStore> {
    const index = this.stores.findIndex(
      (s) => s.id === store_id && s.tenant_id === tenant_id,
    );
    if (index === -1) throw new Error("Store not found");

    const current = this.stores[index];
    const updated: RetailStore = {
      ...current,
      name: data.name ?? current.name,
      location_id: data.location_id ?? current.location_id,
      currency: data.currency ?? current.currency,
      type: (data.type as any) ?? current.type,
      status: (data.status as any) ?? current.status,
      address: data.address ?? current.address,
      phone: data.phone ?? current.phone,
      email: data.email ?? current.email,
      timezone: data.timezone ?? current.timezone,
      tax_zone: data.tax_zone ?? current.tax_zone,
      manager_id: data.manager_id ?? current.manager_id,
      inventory_pool_id: data.inventory_pool_id ?? current.inventory_pool_id,
      operational_config: data.operational_config
        ? {
            ...(current.operational_config || {}),
            ...(data.operational_config as any),
          }
        : current.operational_config,
      supply_config: data.supply_config
        ? { ...(current.supply_config || {}), ...(data.supply_config as any) }
        : current.supply_config,
      infrastructure_registry: data.infrastructure_registry
        ? {
            ...(current.infrastructure_registry || {}),
            ...data.infrastructure_registry,
          }
        : current.infrastructure_registry,
      channel_binding: data.channel_binding
        ? { ...(current.channel_binding || {}), ...data.channel_binding }
        : current.channel_binding,
      governance: data.governance
        ? { ...(current.governance as any), ...data.governance }
        : current.governance,
      updated_at: new Date(),
    };

    // Update revision
    updated.config_version = {
      updated_by: "system_user", // Mock user
      updated_at: new Date(),
      revision_number: (current.config_version?.revision_number || 0) + 1,
    };

    this.stores[index] = updated;
    return updated;
  }
  async deleteStore(tenant_id: string, store_id: string): Promise<void> {}
  async listInventoryPools(tenant_id: string): Promise<any[]> {
    return [];
  }
  async createInventoryPool(
    tenant_id: string,
    data: CreateInventoryPoolDto,
  ): Promise<any> {
    return {};
  }
  async getInventoryPool(
    tenant_id: string,
    poolId: string,
  ): Promise<any | null> {
    return null;
  }
  async deleteInventoryPool(tenant_id: string, poolId: string): Promise<void> {}
  async listEcommerceStores(
    tenant_id: string,
    store_id?: string,
  ): Promise<any[]> {
    return [];
  }
  async getEcommerceStore(
    tenant_id: string,
    store_id: string,
  ): Promise<any | null> {
    return null;
  }
  async createEcommerceStore(
    tenant_id: string,
    data: CreateEcommerceStoreDto,
  ): Promise<any> {
    return {};
  }
  async updateEcommerceStore(
    tenant_id: string,
    store_id: string,
    data: UpdateEcommerceStoreDto,
  ): Promise<any> {
    return {};
  }
  async deleteEcommerceStore(
    tenant_id: string,
    store_id: string,
  ): Promise<void> {}
  async linkEcommerceToBranch(
    tenant_id: string,
    ecommerceId: string,
    branch_id: string,
  ): Promise<void> {}
  async unlinkEcommerceFromBranch(
    tenant_id: string,
    ecommerceId: string,
    branch_id: string,
  ): Promise<void> {}
  async getProduct(
    tenant_id: string,
    product_id: string,
  ): Promise<RetailProduct | null> {
    const product = this.products.find(
      (p) => p.id === product_id && p.tenant_id === tenant_id,
    );
    return product || null;
  }
  async updateProduct(
    tenant_id: string,
    product_id: string,
    data: UpdateProductDto,
    location_id?: string,
  ): Promise<RetailProduct> {
    console.log(
      `[MockRepo] updateProduct for tenant ${tenant_id}, product ${product_id}`,
      data,
    );
    const index = this.products.findIndex(
      (p) => p.id === product_id && p.tenant_id === tenant_id,
    );
    if (index === -1) {
      throw new Error("Product not found");
    }
    const updated = {
      ...this.products[index],
      name: data.name ?? this.products[index].name,
      description: data.description ?? this.products[index].description,
      category_id: data.category_id ?? this.products[index].category_id,
      base_price: data.base_price
        ? new Prisma.Decimal(String(data.base_price))
        : this.products[index].base_price,
      unit: data.unit ?? this.products[index].unit,
      sku: data.sku ?? this.products[index].sku,
      barcode: data.barcode ?? this.products[index].barcode,
      type: data.type ?? this.products[index].type,
    };

    // Mock logic: resolve category name if ID changed
    if (data.category_id) {
      const cats = await this.listCategories(tenant_id);
      const cat = cats.find((c) => c.id === data.category_id);
      if (cat) updated.categoryName = cat.name;
    }

    (this.products[index] as any) = updated;
    return updated as any;
  }

  async generateNextSku(
    tenant_id: string,
    category_id: string,
  ): Promise<{ sku: string; barcode: string }> {
    // Mock: derive prefix from known categories, generate a sequential-looking SKU
    const mockCats: Record<string, string> = {
      "cat-1": "ELEC",
      "cat-2": "CLOTH",
      "cat-3": "FURN",
    };
    const prefix = mockCats[category_id] ?? "ITEM";
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const seq = String(
      this.products.filter((p) => p.sku?.startsWith(prefix)).length + 1,
    ).padStart(4, "0");
    const sku = `${prefix}-${dateStr}-${seq}`;
    const barcode =
      sku.replace(/[^A-Z0-9]/g, "") + String(Date.now()).slice(-4);
    return { sku, barcode };
  }

  async listOrders(tenant_id: string, store_id?: string): Promise<RetailOrder[]> {
    return [];
  }
  async getOrder(
    tenant_id: string,
    order_id: string,
  ): Promise<RetailOrder | null> {
    return null;
  }
  async createOrder(
    tenant_id: string,
    location_id: string,
    data: CreateOrderDto,
    user_id: string,
  ): Promise<RetailOrder> {
    return {} as any;
  }
  async updateOrderStatus(
    tenant_id: string,
    order_id: string,
    status: string,
    metadata?: any,
  ): Promise<RetailOrder> {
    return {} as any;
  }

  async reserveStock(
    tenant_id: string,
    location_id: string,
    product_id: string,
    quantity: Prisma.Decimal,
  ): Promise<{ success: boolean; reservation_id?: string }> {
    return { success: true };
  }
  async releaseStock(
    tenant_id: string,
    product_id: string,
    quantity: Prisma.Decimal,
  ): Promise<void> {}
  async checkStock(
    tenant_id: string,
    product_id: string,
  ): Promise<{ available: Prisma.Decimal; status: string }> {
    return { available: new Prisma.Decimal(10), status: "IN_STOCK" };
  }
  async getInventoryStats(
    tenant_id: string,
    options?: any,
  ): Promise<{
    total: number;
    critical: number;
    lowStock: number;
    overstock: number;
    outOfStock: number;
    totalSOH: Prisma.Decimal;
    totalATS: Prisma.Decimal;
    totalItems: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalValue: Prisma.Decimal;
  }> {
    return {
      total: 0,
      totalItems: 0,
      critical: 0,
      lowStock: 0,
      overstock: 0,
      outOfStock: 0,
      totalSOH: new Prisma.Decimal(0),
      totalATS: new Prisma.Decimal(0),
      lowStockCount: 0,
      outOfStockCount: 0,
      totalValue: new Prisma.Decimal(0),
    };
  }
  async getActiveShift(
    tenant_id: string,
    store_id: string,
    employee_id: string,
  ): Promise<RetailShift | null> {
    return null;
  }
  async openShift(
    tenant_id: string,
    location_id: string,
    employee_id: string,
    data: OpenShiftDto,
  ): Promise<RetailShift> {
    return {} as any;
  }
  async closeShift(
    tenant_id: string,
    shift_id: string,
    data: CloseShiftDto,
  ): Promise<RetailShift> {
    return {} as any;
  }
  async listShifts(tenant_id: string, store_id?: string): Promise<RetailShift[]> {
    return [];
  }
  async listPromotions(tenant_id: string): Promise<any[]> {
    return [];
  }
  async updatePromotion(
    tenant_id: string,
    promotionId: string,
    data: any,
  ): Promise<any> {
    return {};
  }
  async listChannels(tenant_id: string): Promise<any[]> {
    return [];
  }
  async createChannel(tenant_id: string, data: any): Promise<any> {
    return {};
  }
  async updateChannel(
    tenant_id: string,
    channelId: string,
    data: any,
  ): Promise<any> {
    return {};
  }
  async deleteChannel(
    tenant_id: string,
    channelId: string,
  ): Promise<{ success: boolean }> {
    return { success: true };
  }
  async syncChannel(
    tenant_id: string,
    channelId: string,
  ): Promise<{ success: boolean }> {
    return { success: true };
  }
  async getChannelById(
    tenant_id: string,
    channelId: string,
  ): Promise<any | null> {
    return null;
  }
  async updateChannelCredentials(
    tenant_id: string,
    channelId: string,
    credentials: any,
  ): Promise<any> {
    return {};
  }
  async findChannelByClientId(
    tenant_id: string,
    clientId: string,
  ): Promise<any | null> {
    return null;
  }
  async listDevices(tenant_id: string, store_id?: string): Promise<any[]> {
    return this.devices.filter(
      (d) => d.tenant_id === tenant_id && (!store_id || d.store_id === store_id),
    );
  }

  async registerDevice(
    tenant_id: string,
    location_id: string,
    data: any,
  ): Promise<any> {
    const device = {
      id: `dev-${Math.random().toString(36).substr(2, 9)}`,
      tenant_id: tenant_id,
      store_id: location_id,
      ...data,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.devices.push(device);
    return device;
  }

  async listCCTVs(tenant_id: string, store_id?: string): Promise<any[]> {
    return this.cameras.filter(
      (c) => c.tenant_id === tenant_id && (!store_id || c.location_id === store_id),
    );
  }

  async validateCCTVConnection(
    tenant_id: string,
    location_id: string,
    data: any,
  ): Promise<{ success: boolean; message?: string }> {
    // Mock Validation Logic Simulation
    if (!data.provider) {
      return { success: false, message: "Provider is required." };
    }

    if (
      data.provider === "ezviz" &&
      (!data.verificationCode || !data.cloudAccountId)
    ) {
      return {
        success: false,
        message: "EZVIZ requires Verification Code and Cloud Account ID.",
      };
    }

    if (
      data.provider === "hikvision" &&
      (!data.ip_address || !data.username || !data.password)
    ) {
      return {
        success: false,
        message: "Hikvision requires IP, Username, and Password.",
      };
    }

    // Simulate network delay for validation check
    await new Promise((resolve) => setTimeout(resolve, 800));

    return { success: true, message: "Connection validated successfully." };
  }

  async registerCCTV(
    tenant_id: string,
    location_id: string,
    data: any,
  ): Promise<any> {
    const camera = {
      id: `cam-${Math.random().toString(36).substr(2, 9)}`,
      tenant_id,
      location_id,
      ...data,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.cameras.push(camera);
    return camera;
  }

  async listSensors(tenant_id: string, store_id?: string): Promise<any[]> {
    return this.sensors.filter(
      (s) => s.tenant_id === tenant_id && (!store_id || s.location_id === store_id),
    );
  }

  async registerSensor(
    tenant_id: string,
    location_id: string,
    data: any,
  ): Promise<any> {
    const sensor = {
      id: `sns-${Math.random().toString(36).substr(2, 9)}`,
      tenant_id,
      location_id,
      ...data,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.sensors.push(sensor);
    return sensor;
  }

  async scanDevices(tenant_id: string, location_id: string): Promise<any[]> {
    // Generate simulated discovery results
    this.discoveredDevices = [
      {
        discoveryId: "disc-101",
        name: "Discovered Printer",
        type: "thermal_printer",
        mac_address: "AA:BB:CC:DD:EE:01",
        ip_address: "192.168.1.55",
        model: "Postek C168 (Simulated)",
        status: "discovered",
      },
      {
        discoveryId: "disc-102",
        name: "Discovered PC",
        type: "pc",
        mac_address: "AA:BB:CC:DD:EE:02",
        ip_address: "192.168.1.102",
        model: "Dell OptiPlex (Simulated)",
        status: "discovered",
      },
    ];
    return this.discoveredDevices;
  }

  async commitScannedDevice(
    tenant_id: string,
    location_id: string,
    discoveryId: string,
  ): Promise<any> {
    const found = this.discoveredDevices.find(
      (d) => d.discoveryId === discoveryId,
    );
    if (!found) return null;

    const device = {
      id: `dev-${discoveryId}`,
      tenant_id,
      location_id,
      name: found.name,
      type: found.type,
      model: found.model,
      mac_address: found.mac_address,
      ip_address: found.ip_address,
      status: "online",
      is_active: true,
      lastSeen: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.devices.push(device);
    return device;
  }

  async pingDevice(
    tenant_id: string,
    device_id: string,
  ): Promise<{ success: boolean }> {
    return { success: true };
  }
  async processPayment(
    tenant_id: string,
    order_id: string,
    data: any,
  ): Promise<any> {
    return {};
  }
  async processReturn(
    tenant_id: string,
    order_id: string,
    data: any,
  ): Promise<{ success: boolean }> {
    return { success: true };
  }
  async submitOpname(
    tenant_id: string,
    data: any,
  ): Promise<{ success: boolean }> {
    return { success: true };
  }
  async receiveGoods(
    tenant_id: string,
    data: any,
  ): Promise<{ success: boolean }> {
    return { success: true };
  }
  async findCustomerByEmail(
    tenant_id: string,
    email: string,
  ): Promise<any | null> {
    return null;
  }
  async findCustomerById(
    tenant_id: string,
    customer_id: string,
  ): Promise<any | null> {
    return null;
  }
  async createCustomer(tenant_id: string, data: any): Promise<any> {
    return {};
  }
  async updateCustomer(
    tenant_id: string,
    customer_id: string,
    data: any,
  ): Promise<any> {
    return {};
  }
  async createCustomerSession(tenant_id: string, data: any): Promise<any> {
    return {};
  }
  async findCustomerSession(
    tenant_id: string,
    tokenHash: string,
  ): Promise<any | null> {
    return null;
  }
  async revokeCustomerSession(
    tenant_id: string,
    tokenHash: string,
  ): Promise<void> {}
  async getCart(tenant_id: string, customer_id: string): Promise<any | null> {
    return null;
  }
  async createCart(tenant_id: string, customer_id: string): Promise<any> {
    return {};
  }
  async updateCartItem(
    tenant_id: string,
    cartId: string,
    product_id: string,
    data: any,
  ): Promise<any> {
    return {};
  }
  async removeCartItem(
    tenant_id: string,
    cartId: string,
    item_id: string,
  ): Promise<void> {}
  async clearCart(tenant_id: string, cartId: string): Promise<void> {}
  async getWishlist(tenant_id: string, customer_id: string): Promise<any | null> {
    return null;
  }
  async upsertWishlist(tenant_id: string, customer_id: string): Promise<any> {
    return {};
  }
  async addWishlistItem(
    tenant_id: string,
    wishlistId: string,
    product_id: string,
  ): Promise<any> {
    return {};
  }
  async removeWishlistItem(
    tenant_id: string,
    wishlistId: string,
    item_id: string,
  ): Promise<void> {}
  async logEvent(tenant_id: string, data: any): Promise<any> {
    return {};
  }
}
