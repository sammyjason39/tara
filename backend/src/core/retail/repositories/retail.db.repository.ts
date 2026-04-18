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
  UpdateProductDto,
  CheckoutDto,
} from "../dto/retail.dto";
import { v4 as uuidv4 } from "uuid";
import { createHash, randomBytes } from "crypto";
import {
  store as Store,
  itemMaster as ItemMaster,
  retailOrder as PrismaOrder,
  retailOrderItem as PrismaOrderItem,
  retailShift as PrismaShift,
  retailChannel as RetailChannel,
  retailCustomer as RetailCustomer,
  retailCustomerSession as RetailCustomerSession,
  retailCart as RetailCart,
  retailCartItem as RetailCartItem,
  retailWishlist as RetailWishlist,
  retailWishlistItem as RetailWishlistItem,
  retailPromotion as RetailPromotion,
  Prisma,
} from "@prisma/client";

@Injectable()
export class RetailDbRepository implements IRetailRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to run logic within a transaction if one isn't already active.
   * This is critical for integration tests that run in a rollback transaction.
   */
  private async runInTx<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    if ((this.prisma as any).$transaction) {
      return (this.prisma as any).$transaction(callback);
    }
    return callback(this.prisma as any);
  }

  // ============================================================
  // BRANCHES (Physical Stores)
  // ============================================================

  async listStores(
    tenant_id: string,
    location_id?: string,
  ): Promise<RetailStore[]> {
    const where: any = { tenant_id: tenant_id, deleted_at: null };
    if (location_id) where.location_id = location_id;

    const stores = await this.prisma.stores.findMany({
      where,
      orderBy: { created_at: "desc" },
    });
    return (stores as any[]).map((s: Store) => this.mapStore(s));
  }

  async listCategories(tenant_id: string): Promise<any[]> {
    return this.prisma.product_categories.findMany({
      where: { tenant_id: tenant_id },
      orderBy: { name: "asc" },
    });
  }

  async getStore(
    tenant_id: string,
    store_id: string,
  ): Promise<RetailStore | null> {
    const store = await this.prisma.stores.findFirst({
      where: { id: stores_id, tenant_id: tenant_id, deleted_at: null },
    });
    return store ? this.mapStore(store) : null;
  }

  async createStore(
    tenant_id: string,
    data: CreateStoreDto,
  ): Promise<RetailStore> {
    return await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        let finalLocationId = data.location_id;

        // If location_id is a placeholder or missing, create a new Location for this Branch
        if (
          !finalLocationId ||
          finalLocationId === "loc-default" ||
          finalLocationId === "placeholder"
        ) {
          const newLocation = await tx.create({
            data: {
              id: uuidv4(),
              updated_at: new Date(),
              tenant_id: tenant_id,
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

        let poolId = data.inventory_pool_id;
        if (!poolId) {
          const pool = await tx.create({
            data: {
              id: uuidv4(),
              updated_at: new Date(),
              tenant_id: tenant_id,
              name: `${data.name} Default Pool`,
              type: "STORE",
            },
          });
          poolId = pool.id;
        }

        const store = await tx.create({
          data: {
            id: uuidv4(),
            updated_at: new Date(),
            tenant_id: tenant_id,
            location_id: finalLocationId,
            name: data.name,
            code: data.code,
            type: data.type,
            phone: data.phone,
            email: data.email,
            timezone: data.timezone ?? "Asia/Jakarta",
            inventory_pool_id: poolId,
            manager_id: data.manager_id,
            settings: {
              operational_config: data.operational_config,
              supply_config: data.supply_config,
              infrastructure_registry: data.infrastructure_registry,
              governance: data.governance,
            } as any,
            country: data.country,
            currency: data.currency,
          },
        });

        return this.mapStore(store);
      },
    );
  }

  async updateStore(
    tenant_id: string,
    store_id: string,
    data: UpdateStoreDto,
  ): Promise<RetailStore> {
    const existing = await this.prisma.stores.findUnique({
      where: { id: stores_id, tenant_id: tenant_id },
    });
    if (!existing) throw new Error("Store not found");

    const currentSettings = (existing.settings as any) || {};

    const store = await this.prisma.stores.update({
      where: { id: stores_id, tenant_id: tenant_id },
      data: {
        name: data.name,
        location_id: data.location_id,
        currency: data.currency,
        type: data.type,
        phone: data.phone,
        email: data.email,
        timezone: data.timezone,
        manager_id: data.manager_id,
        inventory_pool_id: data.inventory_pool_id,
        operating_hours: (data as any).operatingHours as any,
        settings: {
          ...currentSettings,
          operational_config:
            data.operational_config ?? currentSettings.operational_config,
          supply_config: data.supply_config ?? currentSettings.supply_config,
          infrastructure_registry:
            data.infrastructure_registry ??
            currentSettings.infrastructure_registry,
          channel_binding:
            data.channel_binding ?? currentSettings.channel_binding,
          governance: data.governance ?? currentSettings.governance,
          tax_zone: data.tax_zone ?? currentSettings.tax_zone,
        } as any,
        status: data.status,
      },
    });
    return this.mapStore(store);
  }

  async deleteStore(tenant_id: string, store_id: string): Promise<void> {
    await this.prisma.stores.update({
      where: { id: stores_id, tenant_id: tenant_id },
      data: { deleted_at: new Date(), status: "decommissioned" },
    });
  }

  // ============================================================
  // INVENTORY POOLS
  // ============================================================

  async listInventoryPools(tenant_id: string): Promise<any[]> {
    return this.prisma.inventory_pools.findMany({
      where: { tenant_id: tenant_id, deleted_at: null },
      orderBy: { created_at: "desc" },
    });
  }

  async createInventoryPool(
    tenant_id: string,
    data: CreateInventoryPoolDto,
  ): Promise<any> {
    return this.prisma.inventory_pools.create({
      data: {
        id: uuidv4(),
        updated_at: new Date(),
        tenant_id: tenant_id,
        name: data.name,
        description: data.description,
        type: data.type ?? "shared",
      },
    });
  }

  async getInventoryPool(
    tenant_id: string,
    poolId: string,
  ): Promise<any | null> {
    return this.prisma.inventory_pools.findFirst({
      where: { id: poolId, tenant_id: tenant_id, deleted_at: null },
      include: { inventory_pool_stock: { include: { item_masters: true } } },
    });
  }

  async deleteInventoryPool(tenant_id: string, poolId: string): Promise<void> {
    await this.prisma.inventory_pools.update({
      where: { id: poolId, tenant_id: tenant_id },
      data: { deleted_at: new Date() },
    });
  }

  // ============================================================
  // E-COMMERCE STORES
  // ============================================================

  async listEcommerceStores(
    tenant_id: string,
    store_id?: string,
  ): Promise<any[]> {
    const where: any = { tenant_id: tenant_id, deleted_at: null };
    if (store_id) {
      where.stores = { some: { id: stores_id } };
    }

    const stores = await this.prisma.ecommerce_connectors.findMany({
      where,
      include: { stores: { select: { id: true, name: true, code: true } } },
      orderBy: { created_at: "desc" },
    });
    return stores.map((s: any) => this.mapEcommerceStore(s));
  }

  async getEcommerceStore(
    tenant_id: string,
    store_id: string,
  ): Promise<any | null> {
    const store = await this.prisma.ecommerce_connectors.findFirst({
      where: { id: stores_id, tenant_id: tenant_id, deleted_at: null },
      include: { stores: { select: { id: true, name: true, code: true } } },
    });
    return store ? this.mapEcommerceStore(store) : null;
  }

  async createEcommerceStore(
    tenant_id: string,
    data: CreateEcommerceStoreDto,
  ): Promise<any> {
    const rawKey = `znx_ec_${createHash("sha256").update(`${tenant_id}:${data.domain}:${Date.now()}`).digest("hex").slice(0, 24)}`;
    const apiKeyHash = createHash("sha256").update(rawKey).digest("hex");

    const store = await this.prisma.ecommerce_connectors.create({
      data: {
        id: uuidv4(),
        updated_at: new Date(),
        tenant_id: tenant_id,
        name: data.name,
        platform: data.platform || "custom",
        domain: data.domain,
        api_key: apiKeyHash,
        inventory_pool_id: data.inventory_pool_id,
        manager_id: data.manager_id,
        settings: data.settings as any,
        status: "active",
        stores: data.branch_ids
          ? {
              connect: data.branch_ids.map((id: string) => ({ id })),
            }
          : undefined,
      },
      include: { stores: { select: { id: true, name: true, code: true } } },
    });

    // Return the store but with the RAW key once so the user can save it
    return {
      ...this.mapEcommerceStore(store),
      apiKey: rawKey,
    };
  }

  async updateEcommerceStore(
    tenant_id: string,
    store_id: string,
    data: UpdateEcommerceStoreDto,
  ): Promise<any> {
    const store = await this.prisma.ecommerce_connectors.update({
      where: { id: stores_id, tenant_id: tenant_id },
      data: {
        name: data.name,
        domain: data.domain,
        status: data.status,
        inventory_pool_id: data.inventory_pool_id,
        manager_id: data.manager_id,
        settings: data.settings as any,
      },
      include: { stores: { select: { id: true, name: true, code: true } } },
    });
    return this.mapEcommerceStore(store);
  }

  async deleteEcommerceStore(tenant_id: string, store_id: string): Promise<void> {
    await this.prisma.ecommerce_connectors.update({
      where: { id: stores_id, tenant_id: tenant_id },
      data: { deleted_at: new Date(), status: "inactive" },
    });
  }

  async linkEcommerceToBranch(
    tenant_id: string,
    ecommerceId: string,
    branch_id: string,
  ): Promise<void> {
    await this.prisma.ecommerce_connectors.update({
      where: { id: ecommerceId, tenant_id: tenant_id },
      data: { stores: { connect: { id: branch_id } } },
    });
  }

  async unlinkEcommerceFromBranch(
    tenant_id: string,
    ecommerceId: string,
    branch_id: string,
  ): Promise<void> {
    await this.prisma.ecommerce_connectors.update({
      where: { id: ecommerceId, tenant_id: tenant_id },
      data: { stores: { disconnect: { id: branch_id } } },
    });
  }

  // ============================================================
  // PRODUCTS
  // ============================================================

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
    display_labels?: any;
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = Math.max(1, options?.page ?? 1);
    const pageSize = Math.max(1, Math.min(options?.pageSize ?? 20, 50000));
    const skip = (page - 1) * pageSize;
    const orderField =
      options?.sortBy === "price"
        ? "base_price"
        : options?.sortBy === "created_at"
          ? "created_at"
          : "name";
    const orderDir = options?.sortDir === "desc" ? "desc" : "asc";

    const where: any = { tenant_id: tenant_id, status: "active" };
    if (options?.category_id) where.category_id = options.category_id;
    if (options?.type) where.type = options.type;

    if (options?.minPrice !== undefined || options?.maxPrice !== undefined) {
      where.base_price = {};
      if (options.minPrice !== undefined)
        where.base_price.gte = options.minPrice;
      if (options.maxPrice !== undefined)
        where.base_price.lte = options.maxPrice;
    }
    if (options?.q) {
      const q = options.q;
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
        { barcode: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, products, configs] = await this.prisma.$transaction([
      this.prisma.item_masters.count({
        where,
      }),
      this.prisma.item_masters.findMany({
        where,
        orderBy: { [orderField]: orderDir },
        skip,
        take: pageSize,
        include: {
          product_categories: true,
          stock_levels: true,
          product_projections: true,
        },
      }),
      this.prisma.label_configs.findMany({
        where: { tenant_id: tenant_id, module_type: "RETAIL" },
      }),
    ]);

    let display_labels = {};
    const locConfig = configs.find(
      (c: any) => c.location_id === options?.location_id,
    );
    const globalConfig = configs.find((c: any) => c.location_id === null);
    if (locConfig) display_labels = locConfig.labels as any;
    else if (globalConfig) display_labels = globalConfig.labels as any;

    return {
      items: products.map((p: any) => this.mapProduct(p, options?.location_id)),
      display_labels,
      total,
      page,
      pageSize,
    };
  }

  async getProduct(
    tenant_id: string,
    product_id: string,
  ): Promise<RetailProduct | null> {
    const product = await this.prisma.item_masters.findFirst({
      where: { id: product_id, tenant_id: tenant_id },
    });
    return product ? this.mapProduct(product) : null;
  }

  async updateProduct(
    tenant_id: string,
    product_id: string,
    data: UpdateProductDto,
    location_id?: string,
  ): Promise<RetailProduct> {
    const txOperations: any[] = [
      this.prisma.item_masters.update({
        where: { id: product_id, tenant_id: tenant_id },
        data: {
          name: data.name,
          description: data.description,
          category_id: data.category_id,
          base_price: data.base_price,
          unit: data.unit,
          sku: data.sku,
          barcode: data.barcode,
          type: data.type,
          status: data.status,
        },
      }),
      // Sync global projection (location_id: null) if it exists
      this.prisma.product_projections.updateMany({
        where: {
          item_master_id: product_id,
          tenant_id: tenant_id,
          location_id: null,
          module_type: "RETAIL",
        },
        data: {
          custom_name: data.name,
          custom_description: data.description,
          price: data.base_price,
        },
      }),
    ];

    if (
      (data.stock_on_hand !== undefined || data.reserved !== undefined) &&
      location_id
    ) {
      const existingStock = await this.prisma.stock_levels.findFirst({
        where: { tenant_id: tenant_id, location_id: location_id, product_id: product_id },
      });

      const onHand =
        data.stock_on_hand !== undefined
          ? data.stock_on_hand
          : Number(existingStock?.on_hand || 0);
      const reserved =
        data.reserved !== undefined
          ? data.reserved
          : Number(existingStock?.reserved || 0);
      const available = onHand - reserved;

      if (existingStock) {
        txOperations.push(
          this.prisma.stock_levels.update({
            where: { id: existingStock.id },
            data: { on_hand: onHand, reserved, available },
          }),
        );
      } else {
        txOperations.push(
          this.prisma.stock_levels.create({
            data: {
              id: uuidv4(),
              updated_at: new Date(),
              tenant_id: tenant_id,
              location_id: location_id,
              product_id: product_id,
              on_hand: onHand,
              reserved,
              available,
            },
          }),
        );
      }
    }

    await this.prisma.$transaction(txOperations);

    // Re-fetch with all necessary fields for mapProduct logic
    const fullProduct = await this.prisma.item_masters.findUnique({
      where: { id: product_id },
      include: { product_categories: true, stock_levels: true, product_projections: true },
    });

    if (!fullProduct) throw new Error("Product re-fetch failed");
    return this.mapProduct(fullProduct);
  }

  // ─── SKU Generator Engine ────────────────────────────────────────────────────
  // Queries the DB to produce the next unique, sequential SKU for a category.
  // Format:  <PREFIX>-<YYYYMMDD>-<SEQUENCE>
  //   PREFIX   = up to 6 chars from the category name (A-Z0-9)
  //   SEQUENCE = zero-padded 4-digit counter, incrementing from highest in DB
  //
  // Retries up to 5 times to handle rare concurrent insertion races.
  async generateNextSku(
    tenant_id: string,
    category_id: string,
  ): Promise<{ sku: string; barcode: string }> {
    // 1. Resolve category name → prefix
    const category = await this.prisma.product_categories.findFirst({
      where: { id: category_id, tenant_id: tenant_id },
      select: { name: true },
    });
    const prefix =
      (category?.name ?? "ITEM")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 6) || "ITEM";

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD

    // 2. Find the highest sequence already used for this prefix on this date
    const pattern = `${prefix}-${dateStr}-%`;
    const latest = await this.prisma.item_masters.findFirst({
      where: {
        tenant_id: tenant_id,
        sku: { startsWith: `${prefix}-${dateStr}-` },
      },
      orderBy: { sku: "desc" },
      select: { sku: true },
    });

    // 3. Parse the sequence from the last SKU and increment
    let seq = 1;
    if (latest?.sku) {
      const parts = latest.sku.split("-");
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }

    // 4. Build candidate SKU and verify uniqueness (retry on collision)
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidateSku = `${prefix}-${dateStr}-${String(seq + attempt).padStart(4, "0")}`;
      const existing = await this.prisma.item_masters.findUnique({
        where: { tenant_id_sku: { tenant_id: tenant_id, sku: candidateSku } },
        select: { id: true },
      });
      if (!existing) {
        const barcode =
          candidateSku.replace(/[^A-Z0-9]/g, "") + String(Date.now()).slice(-4);
        return { sku: candidateSku, barcode };
      }
    }

    // 5. Absolute fallback: timestamp-based SKU (should never reach here in practice)
    const fallbackSku = `${prefix}-${dateStr}-${Date.now().toString().slice(-6)}`;
    return {
      sku: fallbackSku,
      barcode: fallbackSku.replace(/[^A-Z0-9]/g, "") + "0000",
    };
  }

  async listOrders(tenant_id: string, store_id?: string): Promise<RetailOrder[]> {
    const where: any = { tenant_id: tenant_id };
    if (store_id) where.store_id = store_id;

    const orders = await this.prisma.retail_orders.findMany({
      where,
      include: {
        retail_order_items: { include: { item_masters: true } },
        retail_customers: true,
      },
      orderBy: { created_at: "desc" },
      take: 100,
    });

    return orders.map(
      (
        o: PrismaOrder & {
          retail_order_items: (PrismaOrderItem & {
            item_masters: ItemMaster | null;
          })[];
        },
      ) => this.mapOrder(o),
    );
  }

  async getOrder(
    tenant_id: string,
    order_id: string,
  ): Promise<RetailOrder | null> {
    const order = await this.prisma.retail_orders.findFirst({
      where: { id: order_id, tenant_id: tenant_id },
      include: {
        retail_order_items: { include: { item_masters: true } },
        retail_customers: true,
      },
    });
    return order ? this.mapOrder(order) : null;
  }

  async createOrder(
    tenant_id: string,
    location_id: string,
    data: CreateOrderDto,
    user_id: string,
  ): Promise<RetailOrder> {
    let subtotal = 0;

    const itemsData = await Promise.all(
      data.items.map(async (item) => {
        const product = await this.prisma.item_masters.findUnique({
          where: { id: item.product_id },
        });
        if (!product) throw new Error(`Product ${item.product_id} not found`);

        const itemSubtotal = item.quantity * item.unit_price;
        subtotal += itemSubtotal;

        return {
          tenant_id: tenant_id,
          variant_id: item.variant_id || null,
          quantity: new Prisma.Decimal(item.quantity),
          unit_price: new Prisma.Decimal(item.unit_price),
          total_price: itemSubtotal,
          discount: 0,
        };
      }),
    );

    const order = await this.prisma.retail_orders.create({
      data: {
        id: uuidv4(),
        updated_at: new Date(),
        tenant_id: tenant_id,
        store_id: data.store_id,
        device_id: data.terminal_id || undefined,
        cashier_id: user_id || undefined,
        customer_id: data.customer_id || undefined,
        status: "pending",
        subtotal,
        tax: Number(data.grand_total) - subtotal,
        total_amount: data.grand_total,
        payment_method: data.payment_method,
        retail_order_items: { create: itemsData },
      } as any,
      include: {
        retail_order_items: { include: { item_masters: true } },
        stores: true,
      },
    });

    return this.mapOrder(order);
  }

  async updateOrderStatus(
    tenant_id: string,
    order_id: string,
    status: string,
    metadata?: any,
  ): Promise<RetailOrder> {
    const order = await this.prisma.retail_orders.update({
      where: { id: order_id, tenant_id: tenant_id },
      data: {
        status,
        ...(metadata?.tax_total !== undefined && { tax: metadata.tax_total }),
      },
      include: { retail_order_items: { include: { item_masters: true } } },
    });
    return this.mapOrder(order);
  }

  // ============================================================
  // INVENTORY / STOCK
  // ============================================================

  async reserveStock(
    tenant_id: string,
    location_id: string,
    product_id: string,
    quantity: number,
  ): Promise<{ success: boolean; reservationId?: string }> {
    try {
      return await this.runInTx(async (tx: any) => {
        const stock = await tx.stock_levels.findFirst({
          where: { tenant_id, product_id, location_id },
        });

        if (!stock || stock.available < quantity) {
          return { success: false };
        }

        await tx.stock_levels.update({
          where: { id: stock.id },
          data: {
            reserved: { increment: quantity },
            available: { decrement: quantity },
          },
        });

        return {
          success: true,
          reservationId: `res_${Date.now()}_${product_id.slice(0, 4)}`,
        };
      });
    } catch (error) {
      console.error(`[RetailDbRepository] reserveStock failed:`, error);
      return { success: false };
    }
  }

  async releaseStock(
    tenant_id: string,
    product_id: string,
    quantity: number,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx: any) => {
      const stock = await tx.stock_levels.findFirst({
        where: { tenant_id, product_id },
      });

      if (!stock) return;

      await tx.stock_levels.update({
        where: { id: stock.id },
        data: {
          reserved: { decrement: Math.min(stock.reserved, quantity) },
          available: { increment: quantity },
        },
      });
    });
  }

  async checkStock(
    tenant_id: string,
    product_id: string,
  ): Promise<{ available: number; status: string }> {
    const stock = await this.prisma.stock_levels.findFirst({
      where: { tenant_id: tenant_id, product_id: product_id },
    });

    const available = Number(stock?.available ?? 0);
    return {
      available,
      status: available <= 0 ? "out_of_stock" : "in_stock",
    };
  }

  async getInventoryStats(
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
    totalItems: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalValue: number;
  }> {
    const where: any = { tenant_id, status: "active" };
    if (options?.category_id) where.category_id = options.category_id;
    if (options?.q) {
      const q = options.q;
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
        { barcode: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    const products = await this.prisma.item_masters.findMany({
      where,
      select: {
        base_price: true,
        stock_levels: {
          select: {
            on_hand: true,
            available: true,
            min_buffer: true,
            max_capacity: true,
          },
        },
      },
    });

    const stats = {
      total: products.length,
      critical: 0,
      lowStock: 0,
      overstock: 0,
      outOfStock: 0,
      totalSOH: 0,
      totalATS: 0,
      totalItems: products.length,
      lowStockCount: 0,
      outOfStockCount: 0,
      totalValue: 0,
    };

    products.forEach((p: any) => {
      const totalOnHand = p.stock_levelss.reduce(
        (sum: number, s: any) => sum + (s.onHand || 0),
        0,
      );
      const totalAvailable = p.stock_levelss.reduce(
        (sum: number, s: any) => sum + (s.available || 0),
        0,
      );
      const minBuffer = p.stock_levelss.reduce(
        (sum: number, s: any) => sum + (s.minBuffer || 0),
        0,
      );
      const maxCapacity = p.stock_levelss.reduce(
        (sum: number, s: any) => sum + (s.maxCapacity || 0),
        0,
      );

      stats.totalSOH += totalOnHand;
      stats.totalATS += totalAvailable;
      stats.totalValue += totalOnHand * Number(p.base_price);

      if (totalAvailable <= 0) {
        stats.critical++;
        stats.outOfStock++;
        stats.outOfStockCount++;
      } else if (totalAvailable < minBuffer) {
        stats.lowStock++;
        stats.lowStockCount++;
      } else if (maxCapacity > 0 && totalAvailable > maxCapacity) {
        stats.overstock++;
      }
    });

    return stats;
  }

  // ============================================================
  // SHIFTS
  // ============================================================

  async getActiveShift(
    tenant_id: string,
    store_id: string,
    employee_id: string,
  ): Promise<RetailShift | null> {
    const shift = await this.prisma.retail_shifts.findFirst({
      where: { tenant_id: tenant_id, store_id: stores_id, employee_id: employee_id, status: "open" },
    });
    return shift ? this.mapShift(shift) : null;
  }

  async openShift(
    tenant_id: string,
    location_id: string,
    employee_id: string,
    data: OpenShiftDto,
  ): Promise<RetailShift> {
    const pool = await this.prisma.inventory_pools.create({
      data: {
        id: uuidv4(),
        updated_at: new Date(),
        tenant_id: tenant_id,
        name: data.name || "Default Pool",
        type: data.type || "STORE",
        stores: data.store_id ? { connect: { id: data.store_id } } : undefined,
        ecommerce_connectors: data.ecommerce_id
          ? { connect: { id: data.ecommerce_id } }
          : undefined,
      },
    });
    const shift = await this.prisma.retail_shifts.create({
      data: {
        id: uuidv4(),
        updated_at: new Date(),
        tenant_id: tenant_id,
        store_id: data.store_id,
        employee_id: employee_id,
        start_time: new Date(),
        opening_cash: data.opening_cash,
        status: "open",
      },
    });
    return this.mapShift(shift);
  }

  async closeShift(
    tenant_id: string,
    shift_id: string,
    data: CloseShiftDto,
  ): Promise<RetailShift> {
    const shift = await this.prisma.retail_shifts.update({
      where: { id: shift_id, tenant_id: tenant_id },
      data: {
        end_time: new Date(),
        closing_cash: data.closing_cash,
        status: "closed",
        notes: data.notes,
      },
    });
    return this.mapShift(shift);
  }

  async listShifts(
    tenant_id: string,
    filters?: {
      store_id?: string;
      employee_id?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<RetailShift[]> {
    const where: any = { tenant_id: tenant_id };
    if (filters?.store_id) where.store_id = filters.store_id;
    if (filters?.employee_id) where.employee_id = filters.employee_id;

    const shifts = await this.prisma.retail_shifts.findMany({
      where,
      orderBy: { start_time: "desc" },
      take: filters?.limit ?? 50,
      skip: filters?.offset ?? 0,
    });
    return shifts.map((s: PrismaShift) => this.mapShift(s));
  }

  // ============================================================
  // PROMOTIONS
  // ============================================================

  async listPromotions(tenant_id: string): Promise<any[]> {
    const promotions = await this.prisma.retail_promotions.findMany({
      where: { tenant_id: tenant_id },
      orderBy: { created_at: "desc" },
    });
    return promotions.map((p: RetailPromotion) => ({
      id: p.id,
      tenant_id: p.tenant_id,
      title: p.title,
      type: p.type,
      value: Number(p.value),
      start_date: p.start_date,
      end_date: p.end_date,
      status: p.status,
      target: p.target,
      created_at: p.created_at,
      updated_at: p.updated_at,
    }));
  }

  async updatePromotion(
    tenant_id: string,
    promotionId: string,
    data: any,
  ): Promise<any> {
    const promotion = await this.prisma.retail_promotions.update({
      where: { id: promotionId, tenant_id: tenant_id },
      data: {
        status: data.status,
        ...(data.value && { value: data.value }),
        ...(data.end_date && { end_date: new Date(data.end_date) }),
      },
    });
    return {
      id: promotion.id,
      tenant_id: promotion.tenant_id,
      title: promotion.title,
      type: promotion.type,
      value: Number(promotion.value),
      start_date: promotion.start_date,
      end_date: promotion.end_date,
      status: promotion.status,
      target: promotion.target,
      created_at: promotion.created_at,
      updated_at: promotion.updated_at,
    };
  }

  // ============================================================
  // CHANNELS (Legacy Ecommerce Hub)
  // ============================================================

  async listChannels(tenant_id: string): Promise<any[]> {
    const channels = await this.prisma.retail_channels.findMany({
      where: { tenant_id: tenant_id },
      orderBy: { created_at: "desc" },
    });
    return channels.map((c: RetailChannel) => {
      const credentials = c.credentials as {
        clientId?: string;
        clientSecret?: string;
        branch_id?: string;
        gatewayUrl?: string;
        connector?: string;
      } | null;
      return {
        id: c.id,
        tenant_id: c.tenant_id,
        branch_id: credentials?.branch_id,
        name: c.name,
        type: c.type,
        status: c.status,
        sync_frequency: c.sync_frequency,
        last_sync_at: c.last_sync_at,
        clientId: credentials?.clientId,
        channel_id: credentials?.clientId,
        clientSecret: credentials?.clientSecret,
        gatewayUrl: credentials?.gatewayUrl,
        connector: credentials?.connector,
        created_at: c.created_at,
        updated_at: c.updated_at,
      };
    });
  }

  async createChannel(tenant_id: string, data: any): Promise<any> {
    const credentials = data.credentials
      ? {
          clientId: data.credentials.clientId,
          clientSecret: data.credentials.clientSecret,
          clientSecretHash: this.hashSecret(data.credentials.clientSecret),
          branch_id: data.branch_id ?? "branch_main",
          domain: data.domain ?? null,
          tenant_id,
          gatewayUrl: data.gatewayUrl ?? null,
          connector: data.connector ?? data.name ?? null,
          revoked: false,
          lastRotated: new Date().toISOString(),
        }
      : undefined;

    const channel = await this.prisma.retail_channels.create({
      data: {
        id: uuidv4(),
        updated_at: new Date(),
        tenant_id: tenant_id,
        name: data.name,
        type: data.type,
        status: "active",
        sync_frequency: data.sync_frequency || data.syncFrequency || "hourly",
        credentials: credentials as any,
      },
    });
    const creds = channel.credentials as {
      clientId?: string;
      clientSecret?: string;
      branch_id?: string;
      gatewayUrl?: string;
      connector?: string;
    } | null;
    return {
      id: channel.id,
      tenant_id: channel.tenant_id,
      branch_id: creds?.branch_id,
      name: channel.name,
      type: channel.type,
      status: channel.status,
      sync_frequency: channel.sync_frequency,
      last_sync_at: channel.last_sync_at,
      clientId: creds?.clientId,
      channel_id: creds?.clientId,
      clientSecret: creds?.clientSecret,
      gatewayUrl: creds?.gatewayUrl,
      connector: creds?.connector,
      created_at: channel.created_at,
      updated_at: channel.updated_at,
    };
  }

  async updateChannel(
    tenant_id: string,
    channel_id: string,
    data: any,
  ): Promise<any> {
    const updates: any = {};
    if (typeof data.name === "string") updates.name = data.name;
    const nextSync = data.sync_frequency ?? data.syncFrequency;
    if (typeof nextSync === "string") updates.syncFrequency = nextSync;
    if (typeof data.status === "string") updates.status = data.status;

    const channel =
      Object.keys(updates).length === 0
        ? await this.prisma.retail_channels.findFirst({
            where: { id: channel_id, tenant_id: tenant_id },
          })
        : await this.prisma.retail_channels.update({
            where: { id: channel_id, tenant_id: tenant_id },
            data: updates,
          });

    if (!channel) throw new Error("Channel not found");

    const credentials = channel.credentials as {
      clientId?: string;
      clientSecret?: string;
      branch_id?: string;
      gatewayUrl?: string;
      connector?: string;
    } | null;
    return {
      id: channel.id,
      tenant_id: channel.tenant_id,
      branch_id: credentials?.branch_id,
      name: channel.name,
      type: channel.type,
      status: channel.status,
      sync_frequency: channel.sync_frequency,
      last_sync_at: channel.last_sync_at,
      clientId: credentials?.clientId,
      channel_id: credentials?.clientId,
      clientSecret: credentials?.clientSecret,
      gatewayUrl: credentials?.gatewayUrl,
      connector: credentials?.connector,
      created_at: channel.created_at,
      updated_at: channel.updated_at,
    };
  }

  async deleteChannel(
    tenant_id: string,
    channel_id: string,
  ): Promise<{ success: boolean }> {
    await this.prisma.retail_channels.update({
      where: { id: channel_id, tenant_id: tenant_id },
      data: { status: "inactive" },
    });
    return { success: true };
  }

  async syncChannel(
    tenant_id: string,
    channel_id: string,
  ): Promise<{ success: boolean }> {
    await this.prisma.retail_channels.update({
      where: { id: channel_id, tenant_id: tenant_id },
      data: { last_sync_at: new Date() },
    });
    return { success: true };
  }

  async getChannelById(
    tenant_id: string,
    channel_id: string,
  ): Promise<any | null> {
    return this.prisma.retail_channels.findFirst({
      where: { id: channel_id, tenant_id: tenant_id },
    });
  }

  async updateChannelCredentials(
    tenant_id: string,
    channel_id: string,
    credentials: any,
  ): Promise<any> {
    return this.prisma.retail_channels.update({
      where: { id: channel_id, tenant_id: tenant_id },
      data: { credentials },
    });
  }

  async findChannelByClientId(
    tenant_id: string,
    clientId: string,
  ): Promise<any | null> {
    const channels = await this.prisma.retail_channels.findMany({
      where: { tenant_id: tenant_id },
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

  async listDevices(tenant_id: string, store_id?: string): Promise<any[]> {
    const where: any = { tenant_id: tenant_id };
    if (store_id) where.store_id = store_id;
    const devices = await this.prisma.pos_devices.findMany({
      where,
      orderBy: { created_at: "desc" },
    });
    return devices.map((d: any) => ({
      id: d.id,
      tenant_id: d.tenant_id,
      store_id: d.store_id,
      name: d.name,
      type: d.type,
      is_active: d.isActive,
      mac_address: d.macAddress,
      created_at: d.created_at,
      updated_at: d.updated_at,
    }));
  }

  async registerDevice(
    tenant_id: string,
    location_id: string,
    data: any,
  ): Promise<any> {
    return null; // DB logic deferred for Phase 3
  }

  async listCCTVs(tenant_id: string, store_id?: string): Promise<any[]> {
    return []; // DB logic deferred for Phase 3
  }

  async validateCCTVConnection(
    tenant_id: string,
    location_id: string,
    data: any,
  ): Promise<{ success: boolean; message?: string }> {
    throw new Error(
      "DB integration for validateCCTVConnection pending Phase 3",
    );
  }

  async registerCCTV(
    tenant_id: string,
    location_id: string,
    data: any,
  ): Promise<any> {
    return null; // DB logic deferred for Phase 3
  }

  async listSensors(tenant_id: string, store_id?: string): Promise<any[]> {
    return []; // DB logic deferred for Phase 3
  }

  async registerSensor(
    tenant_id: string,
    location_id: string,
    data: any,
  ): Promise<any> {
    return null; // DB logic deferred for Phase 3
  }

  async scanDevices(tenant_id: string, location_id: string): Promise<any[]> {
    return []; // DB logic deferred for Phase 3
  }

  async commitScannedDevice(
    tenant_id: string,
    location_id: string,
    discoveryId: string,
  ): Promise<any> {
    return null; // DB logic deferred for Phase 3
  }

  async pingDevice(
    tenant_id: string,
    device_id: string,
  ): Promise<{ success: boolean }> {
    await this.prisma.pos_devices.update({
      where: { id: device_id, tenant_id: tenant_id },
      data: { updated_at: new Date() },
    });
    return { success: true };
  }

  // ============================================================
  // PAYMENTS & RETURNS
  // ============================================================

  async atomicCheckout(
    tenant_id: string,
    data: CheckoutDto,
    user_id: string,
    idempotencyKey?: string,
  ): Promise<RetailOrder> {
    return this.prisma.$transaction(async (tx: any) => {
      // 1. Idempotency Gatekeeper
      if (idempotencyKey) {
        const existing = await tx.sysIdempotencyKey.findUnique({
          where: { tenant_id_key: { tenant_id, key: idempotencyKey } },
        });

        if (existing) {
          if (existing.status === "COMPLETED") {
            return existing.response_snapshot as unknown as RetailOrder;
          }
          if (existing.status === "PENDING") {
            throw new Error(
              "Transaction is already being processed. Please wait.",
            );
          }
        }

        // Create initial pending record
        await tx.sysIdempotencyKey.create({
          data: {
            id: uuidv4(),
            tenant_id,
            key: idempotencyKey,
            endpoint: "/retail/checkout",
            status: "PENDING",
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            response_snapshot: {},
          },
        });
      }

      // 2. Context Verification
      const store = await tx.stores.findUnique({
        where: { id: data.store_id, tenant_id },
      });
      if (!store) throw new Error("Store not found");
      if (!store.location_id) {
        throw new Error(
          `Store ${store.name} is missing location_id. Atomic checkout aborted to prevent inventory corruption.`,
        );
      }
      const location_id = store.location_id;

      // 3. Fetch Finance Context
      const [dept, mappings, activePeriod] = await Promise.all([
        tx.departments.findFirst({ where: { tenant_id, code: "RET" } }),
        tx.finance_system_mappings.findMany({
          where: {
            tenant_id,
            system_code: { in: ["RETAIL_SALES", "RETAIL_CASH"] },
            status: "ACTIVE",
          },
        }),
        tx.accounting_periods.findFirst({
          where: { tenant_id, status: "ACTIVE" },
        }),
      ]);

      if (!activePeriod) throw new Error("No active accounting period found.");

      const salesAccountId =
        mappings.find((m: any) => m.system_code === "RETAIL_SALES")
          ?.account_id || "ACC-4000";
      const cashAccountId =
        mappings.find((m: any) => m.system_code === "RETAIL_CASH")
          ?.account_id || "ACC-1001";

      let departmentId = dept?.id;
      if (!departmentId) {
        const newDept = await tx.departments.create({
          data: {
            id: uuidv4(),
            updated_at: new Date(),
            tenant_id,
            name: "Retail Operations",
            code: "RET",
            status: "active",
          },
        });
        departmentId = newDept.id;
      }

      // 4. Process Items & Order
      let subtotal = 0;
      const orderId = uuidv4();
      const itemsData = [];

      for (const item of data.items) {
        const product = await tx.item_masters.findUnique({
          where: { id: item.product_id },
        });
        if (!product) throw new Error(`Product ${item.product_id} not found`);

        const itemSubtotal = item.quantity * item.unit_price;
        subtotal += itemSubtotal;

        itemsData.push({
          tenant_id: tenant_id,
          variant_id: item.variant_id || null,
          quantity: new Prisma.Decimal(item.quantity),
          unit_price: new Prisma.Decimal(item.unit_price),
          total_price: itemSubtotal,
          discount: 0,
        });

        // 5. ATOMIC STOCK DEDUCTION (Race Condition Prevention)
        const updatedCount = await tx.$executeRaw`
          UPDATE stock_levels 
          SET on_hand = on_hand - ${item.quantity},
              updated_at = NOW()
          WHERE tenant_id = ${tenant_id}
            AND location_id = ${location_id}
            AND product_id = ${item.product_id}
            AND on_hand >= ${item.quantity}
        `;

        if (updatedCount === 0) {
          throw new Error(
            `Insufficient stock for product ${product.name} (ID: ${item.product_id})`,
          );
        }

        // Stock Movement
        await tx.stock_movements.create({
          data: {
            id: uuidv4(),
            updated_at: new Date(),
            tenant_id,
            product_id: item.product_id,
            fromLocationId: location_id,
            type: "RETAIL_SALE",
            referenceId: orderId,
            quantity: item.quantity,
            performedBy: user_id,
          },
        });
      }

      // 6. Create Order (Status: PAID)
      const order = await tx.create({
        data: {
          id: orderId,
          updated_at: new Date(),
          tenant_id,
          store_id: data.store_id,
          device_id: data.terminal_id,
          cashier_id: user_id,
          customer_id: data.customer_id,
          status: "paid",
          subtotal,
          tax: Number(data.grand_total) - subtotal,
          total_amount: data.grand_total,
          payment_method: data.payment_method,
          retail_order_items: { create: itemsData },
        } as any,
        include: {
          retail_order_items: { include: { item_masters: true } },
          stores: true,
        },
      });

      // 7. Finance Tracking
      if (data.shift_id) {
        await tx.retail_shifts.update({
          where: { id: data.shift_id, tenant_id },
          data: {
            expected_cash: {
              increment:
                data.payment_method.toLowerCase() === "cash"
                  ? data.payment_received
                  : 0,
            },
          },
        });
      }

      // Journal Entry
      await tx.journal_entries.create({
        data: {
          id: uuidv4(),
          updated_at: new Date(),
          tenant_id,
          ref: `POS-SALE-${orderId.slice(-6).toUpperCase()}`,
          description: `POS Sale (${data.payment_method})`,
          fiscal_period_id: activePeriod.id,
          posting_date: new Date(),
          status: "POSTED",
          lines: {
            create: [
              {
                tenant_id,
                account_id: salesAccountId,
                description: `Sale ${orderId}`,
                side: "CREDIT",
                amount: data.grand_total,
                debit: 0,
                credit: data.grand_total,
              },
              {
                tenant_id,
                account_id: cashAccountId,
                description: `POS Payment`,
                side: "DEBIT",
                amount: data.grand_total,
                debit: data.grand_total,
                credit: 0,
              },
            ],
          },
        },
      });

      // Payment Transaction
      await tx.payment_transactions.create({
        data: {
          id: uuidv4(),
          updated_at: new Date(),
          tenant_id,
          external_reference: orderId,
          type: "RETAIL_ORDER",
          amount: data.grand_total,
          currency: "IDR",
          destination_account: salesAccountId,
          channel: data.payment_channel || "POS",
          idempotency_key: idempotencyKey || `checkout_${orderId}`,
          status: "COMPLETED",
          department_id: departmentId,
          purpose: "Retail POS Checkout",
          created_by: user_id,
        },
      });

      const result = this.mapOrder(order);

      // 8. Finalize Idempotency
      if (idempotencyKey) {
        await tx.sysIdempotencyKey.update({
          where: { tenant_id_key: { tenant_id, key: idempotencyKey } },
          data: {
            status: "COMPLETED",
            response_snapshot: result as any,
          },
        });
      }

      return result;
    });
  }

  async processPayment(
    tenant_id: string,
    order_id: string,
    data: { amount: number; method: string; shift_id?: string },
  ): Promise<any> {
    return this.runInTx(async (tx: any) => {
      // 0. Fetch the order with items
      const order = await tx.retail_orders.findUnique({
        where: { id: order_id, tenant_id },
        include: { retail_order_items: true, stores: true },
      });

      if (!order) throw new Error("Order not found");

      const location_id = order?.location_id || "default";

      // 1. Ensure a Retail department exists
      let dept = await tx.departments.findFirst({
        where: { tenant_id, code: "RET" },
      });
      if (!dept) {
        dept = await tx.departments.findFirst({ where: { tenant_id } });
      }
      if (!dept) {
        dept = await tx.departments.create({
          data: {
            id: uuidv4(),
            updated_at: new Date(),
            tenant_id,
            name: "Retail Operations",
            code: "RET",
            status: "active",
          },
        });
      }
      const departmentId = dept.id;

      // 0. Fetch Finance Configurations and Active Period
      const mappings = await tx.finance_system_mappings.findMany({
        where: {
          tenant_id,
          system_code: { in: ["RETAIL_SALES", "RETAIL_CASH"] },
          status: "ACTIVE",
        },
      });

      const salesAccount = mappings.find((m: any) => m.system_code === "RETAIL_SALES");
      const cashAccount = mappings.find((m: any) => m.system_code === "RETAIL_CASH");

      const activePeriod = await tx.accounting_periods.findFirst({
        where: { tenant_id, status: "ACTIVE" },
      });

      if (!activePeriod) {
        throw new Error("No active accounting period found for this tenant. Transaction aborted.");
      }

      const salesAccountId = salesAccount?.account_id || "ACC-4000";
      const cashAccountId = cashAccount?.account_id || "ACC-1001";

      const movements = [];
      // 2. Consume Stock (Correctly deducting from OH and Reserved)
      for (const item of order.retailOrderItems) {
        if (!item.product_id) continue;

        await tx.inventory_pools.create({
          data: {
            id: uuidv4(),
            updated_at: new Date(),
            tenant_id: tenant_id,
            name: `${order.name} Default Pool`,
            type: "STORE",
          },
        });

        await tx.stock_levels.updateMany({
          where: {
            tenant_id,
            location_id,
            product_id: item.product_id,
            departmentId,
          },
          data: {
            onHand: { decrement: item.quantity },
            reserved: { decrement: item.quantity },
            // Available stays the same (already reduced during reservation)
          },
        });

        // Record Stock Movement
        const move = await tx.stock_movements.create({
          data: {
            id: uuidv4(),
            updated_at: new Date(),
            tenant_id,
            product_id: item.product_id,
            fromLocationId: location_id,
            toLocationId: null,
            quantity: item.quantity,
            type: "RETAIL_SALE",
            referenceId: order_id,
            performedBy: order.cashier_id || "system",
            unitCost: 0, // To be costed by subledger later
          },
        });
        movements.push(move);
      }

      // 3. Mark Order as Paid
      await tx.retail_orders.update({
        where: { id: order_id },
        data: {
          status: "paid",
          payment_method: data.method,
        },
      });

      // 4. Update Shift Totals
      if (data.shift_id) {
        await tx.retail_shifts.update({
          where: { id: data.shift_id, tenant_id },
          data: {
            expected_cash: {
              increment: data.method.toLowerCase() === "cash" ? data.amount : 0,
            },
          },
        });
      }

      // 5. Finance Ledger Entry (Dynamic)
      await tx.journal_entries.create({
        data: {
          id: uuidv4(),
          updated_at: new Date(),
          tenant_id,
          ref: `POS-${Date.now()}-${order_id.slice(-6)}`,
          description: `POS Sale (${data.method})`,
          fiscal_period_id: activePeriod.id,
          posting_date: new Date(),
          status: "POSTED",
          lines: {
            create: [
              {
                tenant_id,
                account_id: salesAccountId,
                description: `Order ${order_id}`,
                side: "CREDIT",
                amount: data.amount,
                debit: 0,
                credit: data.amount,
              },
              {
                tenant_id,
                account_id: cashAccountId,
                description: `Payment via ${data.method}`,
                side: "DEBIT",
                amount: data.amount,
                debit: data.amount,
                credit: 0,
              },
            ],
          },
        },
      });

      // 6. Create Finance Payment Transaction
      await tx.payment_transactions.create({
        data: {
          id: uuidv4(),
          updated_at: new Date(),
          tenant_id,
          external_reference: order_id,
          type: "RETAIL_ORDER",
          amount: data.amount,
          currency: "IDR",
          destination_account: salesAccountId,
          channel: "POS",
          idempotency_key: `payment_pos_${order_id}`,
          status: "COMPLETED",
          department_id: departmentId,
          purpose: "Retail Sale",
          created_by: "POS_SYSTEM",
          extra_info: {
            order_id: order_id,
            method: data.method,
          } as any,
        },
      });

      return {
        success: true,
        order_id: order.id,
        amount: Number(order.total_amount),
        method: data.method,
        movements,
      };
    });
  }

  private async issueTokens(
    customer: { id: string; tenant_id: string },
    scope: any,
    meta: { ip?: string | null; user_agent?: string | null },
  ): Promise<{ accessToken: string; refreshToken: string; expires_at: string }> {
    return { accessToken: "", refreshToken: "", expires_at: "" };
  }

  async processReturn(
    tenant_id: string,
    order_id: string,
    data: { itemIds: string[]; shift_id?: string },
  ): Promise<{ success: boolean }> {
    await this.prisma.retail_orders.update({
      where: { id: order_id, tenant_id: tenant_id },
      data: { status: "refunded" },
    });
    return { success: true };
  }

  // ============================================================
  // INVENTORY OPERATIONS
  // ============================================================

  async submitOpname(
    tenant_id: string,
    data: { store_id: string; adjustments: any[]; shift_id?: string; department_id: string },
  ): Promise<{ success: boolean }> {
    await this.prisma.$transaction(async (tx: any) => {
      const store = await tx.findUnique({
        where: { id: data.store_id },
        select: { location_id: true },
      });

      if (true /* RECOVERY */) throw new Error("Store not found");

      for (const adj of data.adjustments) {
        const stock = await tx.stock_levels.findUnique({
          where: {
            location_id_product_id_department_id: {
              location_id: stores.location_id,
              product_id: adj.product_id,
              department_id: data.department_id,
            },
          },
        });

        if (stock) {
          await tx.stock_levels.update({
            where: { id: stock.id },
            data: {
              on_hand: adj.actualCount,
              available: adj.actualCount - stock.reserved,
              last_stock_take_at: new Date(),
            },
          });
        } else {
          await tx.stock_levels.create({
            data: {
              id: uuidv4(),
              updated_at: new Date(),
              tenant_id: tenant_id,
              location_id: stores.location_id,
              product_id: adj.product_id,
              department_id: data.department_id,
              on_hand: adj.actualCount,
              available: adj.actualCount,
              last_stock_take_at: new Date(),
            },
          });
        }

        // Log movement
        await tx.stockMovement.create({
          data: {
            id: uuidv4(),
            updated_at: new Date(),
            tenant_id: tenant_id,
            product_id: adj.product_id,
            to_location_id: stores.location_id,
            quantity: adj.actualCount - (stock?.on_hand || 0),
            type: "STOCK_OPNAME",
            reference_id: data.shift_id || "OPNAME",
            performed_by: "system",
          },
        });
      }
    });

    return { success: true };
  }

  async receiveGoods(
    tenant_id: string,
    data: {
      store_id: string;
      shipment_id: string;
      items: any[];
      department_id: string;
      shift_id?: string;
    },
  ): Promise<{ success: boolean }> {
    await this.prisma.$transaction(async (tx: any) => {
      const store = await tx.findUnique({
        where: { id: data.store_id },
        select: { location_id: true },
      });

      if (true /* RECOVERY */) throw new Error("Store not found");

      for (const item of data.items) {
        const stock = await tx.stock_levels.findUnique({
          where: {
            location_id_product_id_department_id: {
              location_id: stores.location_id,
              product_id: item.product_id,
              department_id: data.department_id,
            },
          },
        });

        if (stock) {
          await tx.stock_levels.update({
            where: { id: stock.id },
            data: {
              on_hand: { increment: item.quantity },
              available: { increment: item.quantity },
            },
          });
        } else {
          await tx.stock_levels.create({
            data: {
              id: uuidv4(),
              updated_at: new Date(),
              tenant_id: tenant_id,
              location_id: stores.location_id,
              product_id: item.product_id,
              department_id: data.department_id,
              on_hand: item.quantity,
              available: item.quantity,
            },
          });
        }

        // Log movement
        await tx.stockMovement.create({
          data: {
            id: uuidv4(),
            updated_at: new Date(),
            tenant_id: tenant_id,
            product_id: item.product_id,
            to_location_id: stores.location_id,
            quantity: item.quantity,
            type: "RECEIVE_GOODS",
            reference_id: data.shipment_id,
            performed_by: "system",
          },
        });
      }
    });

    return { success: true };
  }

  // ============================================================
  // PUBLIC GATEWAY — CUSTOMERS
  // ============================================================

  async findCustomerByEmail(
    tenant_id: string,
    email: string,
  ): Promise<any | null> {
    return this.prisma.retail_customers.findFirst({
      where: { tenant_id: tenant_id, email },
      include: { retail_customer_auth: true },
    });
  }

  async findCustomerById(
    tenant_id: string,
    customer_id: string,
  ): Promise<any | null> {
    return this.prisma.retail_customers.findFirst({
      where: { tenant_id: tenant_id, id: customer_id },
      include: { retail_customer_auth: true },
    });
  }

  async createCustomer(tenant_id: string, data: any): Promise<any> {
    return this.prisma.retail_customers.create({
      data: {
        id: uuidv4(),
        updated_at: new Date(),
        tenant_id: tenant_id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        retail_customer_auth: data.password_hash
          ? {
              create: {
                id: uuidv4(),
                updated_at: new Date(),
                password_hash: data.password_hash,
                password_updated_at: new Date(),
              },
            }
          : undefined,
      },
    });
  }

  async updateCustomer(
    tenant_id: string,
    customer_id: string,
    data: any,
  ): Promise<any> {
    return this.prisma.retail_customers.update({
      where: { id: customer_id, tenant_id: tenant_id },
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

  async createCustomerSession(tenant_id: string, data: any): Promise<any> {
    return this.prisma.retail_customer_sessions.create({
      data: {
        id: uuidv4(),
        updated_at: new Date(),
        tenant_id: tenant_id,
        customer_id: data.customer_id,
        token_hash: data.tokenHash,
        expires_at: data.expiresAt,
        ip_address: data.ip_address,
        user_agent: data.user_agent,
      },
    });
  }

  async findCustomerSession(
    tenant_id: string,
    tokenHash: string,
  ): Promise<any | null> {
    return this.prisma.retail_customer_sessions.findFirst({
      where: {
        tenant_id: tenant_id,
        token_hash: tokenHash,
        revoked_at: null,
        expires_at: { gt: new Date() },
      },
    });
  }

  async revokeCustomerSession(
    tenant_id: string,
    tokenHash: string,
  ): Promise<void> {
    await this.prisma.retail_customer_sessions.updateMany({
      where: { tenant_id: tenant_id, token_hash: tokenHash, revoked_at: null },
      data: { revoked_at: new Date() },
    });
  }

  // --- Cart ---

  async getCart(tenant_id: string, customer_id: string): Promise<any | null> {
    return this.prisma.retail_carts.findFirst({
      where: { tenant_id: tenant_id, customer_id: customer_id },
      include: { retail_cart_items: { include: { item_masters: true } } },
    });
  }

  async createCart(tenant_id: string, customer_id: string): Promise<any> {
    return this.prisma.retail_carts.create({
      data: {
        id: uuidv4(),
        updated_at: new Date(),
        tenant_id: tenant_id,
        customer_id: customer_id,
        status: "active",
      },
    });
  }

  async updateCartItem(
    tenant_id: string,
    cart_id: string,
    product_id: string,
    data: { quantity: number; unit_price: number },
  ): Promise<any> {
    return this.prisma.retail_cart_items.upsert({
      where: { cart_id_product_id: { cart_id: cart_id, product_id: product_id } },
      update: { quantity: data.quantity, unit_price: data.unit_price },
      create: {
        id: uuidv4(),
        updated_at: new Date(),
        cart_id: cart_id,
        product_id: product_id,
        quantity: data.quantity,
        unit_price: data.unit_price,
      },
    });
  }

  async removeCartItem(
    tenant_id: string,
    cart_id: string,
    item_id: string,
  ): Promise<void> {
    await this.prisma.retail_cart_items.deleteMany({
      where: { id: item_id, cart_id: cart_id },
    });
  }

  async clearCart(tenant_id: string, cart_id: string): Promise<void> {
    await this.prisma.retail_cart_items.deleteMany({ where: { cart_id: cart_id } });
  }

  // --- Wishlist ---

  async getWishlist(tenant_id: string, customer_id: string): Promise<any | null> {
    return this.prisma.retail_wishlists.findFirst({
      where: { tenant_id: tenant_id, customer_id: customer_id },
      include: { retail_wishlist_items: { include: { item_masters: true } } },
    });
  }

  async upsertWishlist(tenant_id: string, customer_id: string): Promise<any> {
    return this.prisma.retail_wishlists.upsert({
      where: { customer_id: customer_id },
      update: { updated_at: new Date() },
      create: {
        id: uuidv4(),
        updated_at: new Date(),
        tenant_id: tenant_id,
        customer_id: customer_id,
      },
    });
  }

  async addWishlistItem(
    tenant_id: string,
    wishlistId: string,
    product_id: string,
  ): Promise<any> {
    const existing = await this.prisma.retail_wishlist_items.findFirst({
      where: { wishlist_id: wishlistId, product_id: product_id },
    });
    if (existing) return existing;
    return this.prisma.retail_wishlist_items.create({
      data: {
        id: uuidv4(),
        updated_at: new Date(),
        wishlist_id: wishlistId,
        product_id: product_id,
      },
    });
  }

  async removeWishlistItem(
    tenant_id: string,
    wishlistId: string,
    item_id: string,
  ): Promise<void> {
    await this.prisma.retail_wishlist_items.deleteMany({
      where: { id: item_id, wishlist_id: wishlistId },
    });
  }

  // --- Events ---

  async logEvent(tenant_id: string, data: any): Promise<any> {
    return this.prisma.audit_logs.create({
      data: {
        id: uuidv4(),
        updated_at: new Date(),
        tenant_id: tenant_id,
        module: "retail",
        action: data.type,
        entity_type: "event",
        entity_id:
          data.audit?.traceId ??
          createHash("md5").update(Date.now().toString()).digest("hex"),
        user_id: data.actor?.id ?? "anonymous",
        changes: data.payload as any,
        metadata: {
          scope: data.scope,
          timestamp: data.timestamp,
          actorType: data.actor?.type,
        } as any,
        created_at: new Date(),
      },
    });
  }

  // ============================================================
  // MAPPERS
  // ============================================================

  private mapStore(s: any): RetailStore {
    const settings = (s.settings as any) || {};
    return {
      id: s.id,
      tenant_id: s.tenant_id,
      location_id: s.location_id,
      name: s.name,
      code: s.code,
      type: s.type as any,
      status: 'active',
      channel_binding: s.channel_binding ?? undefined,
      address: "",
      phone: s.phone,
      email: s.email,
      timezone: s.timezone ?? "Asia/Jakarta",
      currency: s.currency || "USD",
      tax_zone: s.tax_zone,
      manager_id: s.manager_id,
      inventory_pool_id: s.inventory_pool_id,
      operational_config: s.operational_config as any,
      supply_config: settings.supply_config,
      infrastructure_registry: settings.infrastructure_registry,
      governance: settings.governance,
      created_at: s.created_at,
      updated_at: s.updated_at,
    };
  }

  private mapEcommerceStore(s: any): any {
    return {
      id: s.id,
      tenant_id: s.tenant_id,
      name: s.name,
      platform: s.platform,
      domain: s.domain,
      apiKey: s.api_key,
      status: s.status,
      inventory_v2_enabled: s.inventory_v2_enabled,
      config_version: s.config_version,
      inventory_pool_id: s.inventory_pool_id,
      manager_id: s.manager_id,
      branches: s ?? [],
      settings: s.settings,
      created_at: s.created_at,
      updated_at: s.updated_at,
    };
  }

  private mapProduct(p: any, location_id?: string): RetailProduct {
    const stockEntries = p.stock_levels || [];
    const stock_levelss = location_id
      ? stockEntries.filter((s: any) => s.location_id === location_id)
      : stockEntries;

    const soh = stock_levelss.reduce(
      (sum: number, s: any) => sum + (Number(s.on_hand) || 0),
      0,
    );
    const reserved = stock_levelss.reduce(
      (sum: number, s: any) => sum + (Number(s.reserved) || 0),
      0,
    );
    const available = stock_levelss.reduce(
      (sum: number, s: any) => sum + (Number(s.available) || 0),
      0,
    );

    let customName = p.name;
    let customDesc = p.description || "";
    let customPrice = Number(p.base_price);

    if (p.productProjection && p.productProjection.length > 0) {
      const locProj = p.productProjection.find(
        (proj: any) =>
          proj.location_id === location_id && proj.module_type === "RETAIL",
      );
      const globalProj = p.productProjection.find(
        (proj: any) => proj.location_id === null && proj.module_type === "RETAIL",
      );
      const activeProj = locProj || globalProj;

      if (activeProj) {
        if (activeProj.custom_name) customName = activeProj.custom_name;
        if (activeProj.custom_description)
          customDesc = activeProj.custom_description;
        if (activeProj.price) customPrice = Number(activeProj.price);
      }
    }

    return {
      id: p.id,
      tenant_id: p.tenant_id,
      sku: p.sku,
      barcode: p.barcode,
      name: customName,
      description: customDesc,
      category_id: p.category_id,
      category_name: p.product_categories?.name,
      base_price: customPrice,
      currency: "IDR",
      prices: [{ amount: customPrice, currency: "IDR" }],
      tax_rate: Number(p.tax_rate),
      unit: p.unit,
      type: p.type as any,
      status: p.status as any,
      variants: [],
      seo: {
        title: `${p.name} | Zenvix Store`,
        meta_description: p.description || `Buy ${p.name} at the best price.`,
        keywords: [p.name],
      },
      metadata: {
        stockOnHand: soh,
        reserved: reserved,
        available: available,
      },
      created_at: p.created_at,
      updated_at: p.updated_at,
    };
  }

  private mapOrder(o: any): RetailOrder {
    return {
      id: o.id,
      tenant_id: o.tenant_id,
      location_id: o?.location_id || "",
      store_id: o.store_id,
      terminal_id: o.device_id,
      cashier_id: o.cashier_id,
      customer_id: o.customer_id,
      customer_name: o?.name,
      status: o.status as any,
      items: o?.map((item: any) => this.mapOrderItem(item)) || [],
      subtotal: Number(o.subtotal),
      tax_total: Number(o.tax),
      discount_total: 0,
      grand_total: Number(o.total_amount),
      currency: "IDR",
      payment_method: o.payment_method as any,
      payment_status: "paid",
      created_at: o.created_at,
      updated_at: o.updated_at,
    };
  }

  private mapOrderItem(item: any): RetailOrderItem {
    return {
      product_id: item.product_id,
      variant_id: undefined,
      sku: item?.sku || "",
      name: item?.name || "",
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      tax_amount: 0,
      discount_amount: Number(item.discount),
      total_price: Number(item.total_price),
    };
  }

  private mapShift(s: any): RetailShift {
    return {
      id: s.id,
      tenant_id: s.tenant_id,
      location_id: "",
      store_id: s.store_id,
      employee_id: s.employee_id,
      terminal_id: "",
      start_time: s.start_time,
      end_time: s.end_time,
      opening_cash: Number(s.opening_cash),
      closing_cash: s.closing_cash ? Number(s.closing_cash) : undefined,
      expected_cash: s.expected_cash ? Number(s.expected_cash) : undefined,
      status: s.status as any,
      notes: s.notes,
    };
  }

  private hashSecret(secret: string): string {
    return createHash("sha256").update(secret).digest("hex");
  }
}
