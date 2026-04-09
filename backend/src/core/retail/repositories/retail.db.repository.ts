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
} from "../dto/retail.dto";
import { createHash } from "crypto";
import {
  Store,
  ItemMaster,
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

  async listCategories(tenantId: string): Promise<any[]> {
    return this.prisma.productCategory.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });
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
              id: "q5ysumfj",
              updatedAt: new Date(),
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
            id: "ytqd1z2s",
            updatedAt: new Date(),
            tenantId: tenantId,
            locationId: finalLocationId,
            name: data.name,
            code: data.code,
            type: data.type,
            phone: data.phone,
            email: data.email,
            timezone: data.timezone ?? "Asia/Jakarta",
            operatingHours: (data as any).operatingHours as any,
            inventoryPoolId: data.inventoryPoolId,
            managerId: data.managerId,
            settings: {
              operational_config: data.operational_config,
              supply_config: data.supply_config,
              infrastructure_registry: data.infrastructure_registry,
              channel_binding: data.channel_binding,
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
    tenantId: string,
    storeId: string,
    data: UpdateStoreDto,
  ): Promise<RetailStore> {
    const existing = await this.prisma.store.findUnique({
      where: { id: storeId, tenantId: tenantId },
    });
    if (!existing) throw new Error("Store not found");

    const currentSettings = (existing.settings as any) || {};

    const store = await this.prisma.store.update({
      where: { id: storeId, tenantId: tenantId },
      data: {
        name: data.name,
        locationId: data.locationId,
        currency: data.currency,
        type: data.type,
        phone: data.phone,
        email: data.email,
        timezone: data.timezone,
        managerId: data.managerId,
        inventoryPoolId: data.inventoryPoolId,
        operatingHours: (data as any).operatingHours as any,
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
        id: "1syr0gfz",
        updatedAt: new Date(),
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
      include: { inventoryPoolStock: { include: { itemMaster: true } } },
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
      where.stores = { some: { id: storeId } };
    }

    const stores = await this.prisma.ecommerceConnector.findMany({
      where,
      include: { stores: { select: { id: true, name: true, code: true } } },
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
      include: { stores: { select: { id: true, name: true, code: true } } },
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
        id: "b4l93fc7",
        updatedAt: new Date(),
        tenantId: tenantId,
        name: data.name,
        platform: data.platform,
        domain: data.domain,
        apiKey: apiKeyHash,
        inventoryPoolId: data.inventoryPoolId,
        managerId: data.managerId,
        settings: data.settings as any,
        status: "active",
        stores: data.branchIds?.length
          ? { connect: data.branchIds.map((id) => ({ id })) }
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
      include: { stores: { select: { id: true, name: true, code: true } } },
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
      data: { stores: { connect: { id: branchId } } },
    });
  }

  async unlinkEcommerceFromBranch(
    tenantId: string,
    ecommerceId: string,
    branchId: string,
  ): Promise<void> {
    await this.prisma.ecommerceConnector.update({
      where: { id: ecommerceId, tenantId: tenantId },
      data: { stores: { disconnect: { id: branchId } } },
    });
  }

  // ============================================================
  // PRODUCTS
  // ============================================================

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
        ? "basePrice"
        : options?.sortBy === "createdAt"
          ? "createdAt"
          : "name";
    const orderDir = options?.sortDir === "desc" ? "desc" : "asc";

    const where: any = { tenantId: tenantId, status: "active" };
    if (options?.categoryId) where.categoryId = options.categoryId;
    if (options?.type) where.type = options.type;

    if (options?.minPrice !== undefined || options?.maxPrice !== undefined) {
      where.basePrice = {};
      if (options.minPrice !== undefined)
        where.basePrice.gte = options.minPrice;
      if (options.maxPrice !== undefined)
        where.basePrice.lte = options.maxPrice;
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
      this.prisma.itemMaster.count({
        where,
      }),
      this.prisma.itemMaster.findMany({
        where,
        orderBy: { [orderField]: orderDir },
        skip,
        take: pageSize,
        include: {
          productCategory: true,
          stockLevels: true,
          productProjections: true,
        },
      }),
      this.prisma.labelConfig.findMany({
        where: { tenantId, moduleType: "RETAIL" },
      }),
    ]);

    let display_labels = {};
    const locConfig = configs.find(
      (c: any) => c.locationId === options?.locationId,
    );
    const globalConfig = configs.find((c: any) => c.locationId === null);
    if (locConfig) display_labels = locConfig.labels as any;
    else if (globalConfig) display_labels = globalConfig.labels as any;

    return {
      items: products.map((p: any) => this.mapProduct(p, options?.locationId)),
      display_labels,
      total,
      page,
      pageSize,
    };
  }

  async getProduct(
    tenantId: string,
    productId: string,
  ): Promise<RetailProduct | null> {
    const product = await this.prisma.itemMaster.findFirst({
      where: { id: productId, tenantId: tenantId },
    });
    return product ? this.mapProduct(product) : null;
  }

  async updateProduct(
    tenantId: string,
    productId: string,
    data: UpdateProductDto,
    locationId?: string,
  ): Promise<RetailProduct> {
    const txOperations: any[] = [
      this.prisma.itemMaster.update({
        where: { id: productId, tenantId: tenantId },
        data: {
          name: data.name,
          description: data.description,
          categoryId: data.categoryId,
          basePrice: data.basePrice,
          unit: data.unit,
          sku: data.sku,
          barcode: data.barcode,
          type: data.type,
          status: data.status,
        },
      }),
      // Sync global projection (locationId: null) if it exists
      this.prisma.productProjection.updateMany({
        where: {
          itemMasterId: productId,
          tenantId: tenantId,
          locationId: null,
          moduleType: "RETAIL",
        },
        data: {
          customName: data.name,
          customDescription: data.description,
          price: data.basePrice,
        },
      }),
    ];

    if (
      (data.stockOnHand !== undefined || data.reserved !== undefined) &&
      locationId
    ) {
      const existingStock = await this.prisma.stockLevel.findFirst({
        where: { tenantId, locationId, productId },
      });

      const onHand =
        data.stockOnHand !== undefined
          ? data.stockOnHand
          : existingStock?.onHand || 0;
      const reserved =
        data.reserved !== undefined
          ? data.reserved
          : existingStock?.reserved || 0;
      const available = onHand - reserved;

      if (existingStock) {
        txOperations.push(
          this.prisma.stockLevel.update({
            where: { id: existingStock.id },
            data: { onHand, reserved, available },
          }),
        );
      } else {
        txOperations.push(
          this.prisma.stockLevel.create({
            data: {
              id: "up3v34kp",
              updatedAt: new Date(),
              tenantId,
              locationId,
              productId,
              onHand,
              reserved,
              available,
            },
          }),
        );
      }
    }

    await this.prisma.$transaction(txOperations);

    // Re-fetch with all necessary fields for mapProduct logic
    const fullProduct = await this.prisma.itemMaster.findUnique({
      where: { id: productId },
      include: { productCategory: true, stockLevels: true, productProjections: true },
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
    tenantId: string,
    categoryId: string,
  ): Promise<{ sku: string; barcode: string }> {
    // 1. Resolve category name → prefix
    const category = await this.prisma.productCategory.findFirst({
      where: { id: categoryId, tenantId },
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
    const latest = await this.prisma.itemMaster.findFirst({
      where: {
        tenantId,
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
      const existing = await this.prisma.itemMaster.findUnique({
        where: { tenantId_sku: { tenantId, sku: candidateSku } },
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

  async listOrders(tenantId: string, storeId?: string): Promise<RetailOrder[]> {
    const where: any = { tenantId: tenantId };
    if (storeId) where.storeId = storeId;

    const orders = await this.prisma.retailOrder.findMany({
      where,
      include: {
        retailOrderItems: { include: { itemMaster: true } },
        retailCustomer: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return orders.map(
      (
        o: PrismaOrder & {
          retailOrderItems: (PrismaOrderItem & {
            itemMaster: ItemMaster | null;
          })[];
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
      include: {
        retailOrderItems: { include: { itemMaster: true } },
        retailCustomer: true,
      },
    });
    return order ? this.mapOrder(order) : null;
  }

  async createOrder(
    tenantId: string,
    locationId: string,
    data: CreateOrderDto,
    userId: string,
  ): Promise<RetailOrder> {
    let subtotal = 0;

    const itemsData = await Promise.all(
      data.items.map(async (item) => {
        const product = await this.prisma.itemMaster.findUnique({
          where: { id: item.productId },
        });
        if (!product) throw new Error(`Product ${item.productId} not found`);

        const itemSubtotal = item.quantity * item.unitPrice;
        subtotal += itemSubtotal;

        return {
          tenantId: tenantId,
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
        id: "81dj4g20",
        updatedAt: new Date(),
        tenantId: tenantId,
        storeId: data.storeId,
        deviceId: data.terminalId || undefined,
        cashierId: userId || undefined,
        customerId: data.customerId || undefined,
        status: "pending",
        subtotal,
        tax: Number(data.grandTotal) - subtotal,
        totalAmount: data.grandTotal,
        paymentMethod: data.paymentMethod,
        retailOrderItems: { create: itemsData },
      } as any,
      include: {
        retailOrderItems: { include: { itemMaster: true } },
        store: true,
      },
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
      include: { retailOrderItems: { include: { itemMaster: true } } },
    });
    return this.mapOrder(order);
  }

  // ============================================================
  // INVENTORY / STOCK
  // ============================================================

  async reserveStock(
    tenantId: string,
    locationId: string,
    productId: string,
    quantity: number,
  ): Promise<{ success: boolean; reservationId?: string }> {
    try {
      return await this.runInTx(async (tx: any) => {
        const stock = await tx.stockLevel.findFirst({
          where: { tenantId, productId, locationId },
        });

        if (!stock || stock.available < quantity) {
          return { success: false };
        }

        await tx.stockLevel.update({
          where: { id: stock.id },
          data: {
            reserved: { increment: quantity },
            available: { decrement: quantity },
          },
        });

        return {
          success: true,
          reservationId: `res_${Date.now()}_${productId.slice(0, 4)}`,
        };
      });
    } catch (error) {
      console.error(`[RetailDbRepository] reserveStock failed:`, error);
      return { success: false };
    }
  }

  async releaseStock(
    tenantId: string,
    productId: string,
    quantity: number,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx: any) => {
      const stock = await tx.stockLevel.findFirst({
        where: { tenantId, productId },
      });

      if (!stock) return;

      await tx.stockLevel.update({
        where: { id: stock.id },
        data: {
          reserved: { decrement: Math.min(stock.reserved, quantity) },
          available: { increment: quantity },
        },
      });
    });
  }

  async checkStock(
    tenantId: string,
    productId: string,
  ): Promise<{ available: number; status: string }> {
    const stock = await this.prisma.stockLevel.findFirst({
      where: { tenantId, productId },
    });

    const available = stock?.available ?? 0;
    return {
      available,
      status: available <= 0 ? "out_of_stock" : "in_stock",
    };
  }

  async getInventoryStats(
    tenantId: string,
    options?: { categoryId?: string; q?: string },
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
    const where: any = { tenantId, status: "active" };
    if (options?.categoryId) where.categoryId = options.categoryId;
    if (options?.q) {
      const q = options.q;
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
        { barcode: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    const products = await this.prisma.itemMaster.findMany({
      where,
      select: {
        basePrice: true,
        stockLevels: {
          select: {
            onHand: true,
            available: true,
            minBuffer: true,
            maxCapacity: true,
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
      const totalOnHand = p.stockLevels.reduce(
        (sum: number, s: any) => sum + (s.onHand || 0),
        0,
      );
      const totalAvailable = p.stockLevels.reduce(
        (sum: number, s: any) => sum + (s.available || 0),
        0,
      );
      const minBuffer = p.stockLevels.reduce(
        (sum: number, s: any) => sum + (s.minBuffer || 0),
        0,
      );
      const maxCapacity = p.stockLevels.reduce(
        (sum: number, s: any) => sum + (s.maxCapacity || 0),
        0,
      );

      stats.totalSOH += totalOnHand;
      stats.totalATS += totalAvailable;
      stats.totalValue += totalOnHand * Number(p.basePrice);

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
        id: "s84p52tc",
        updatedAt: new Date(),
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
        id: "4m6cguof",
        updatedAt: new Date(),
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
    const devices = await this.prisma.posDevice.findMany({
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

  async registerDevice(
    tenantId: string,
    locationId: string,
    data: any,
  ): Promise<any> {
    return null; // DB logic deferred for Phase 3
  }

  async listCCTVs(tenantId: string, storeId?: string): Promise<any[]> {
    return []; // DB logic deferred for Phase 3
  }

  async validateCCTVConnection(
    tenantId: string,
    locationId: string,
    data: any,
  ): Promise<{ success: boolean; message?: string }> {
    throw new Error(
      "DB integration for validateCCTVConnection pending Phase 3",
    );
  }

  async registerCCTV(
    tenantId: string,
    locationId: string,
    data: any,
  ): Promise<any> {
    return null; // DB logic deferred for Phase 3
  }

  async listSensors(tenantId: string, storeId?: string): Promise<any[]> {
    return []; // DB logic deferred for Phase 3
  }

  async registerSensor(
    tenantId: string,
    locationId: string,
    data: any,
  ): Promise<any> {
    return null; // DB logic deferred for Phase 3
  }

  async scanDevices(tenantId: string, locationId: string): Promise<any[]> {
    return []; // DB logic deferred for Phase 3
  }

  async commitScannedDevice(
    tenantId: string,
    locationId: string,
    discoveryId: string,
  ): Promise<any> {
    return null; // DB logic deferred for Phase 3
  }

  async pingDevice(
    tenantId: string,
    deviceId: string,
  ): Promise<{ success: boolean }> {
    await this.prisma.posDevice.update({
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
    return this.runInTx(async (tx: any) => {
      // 0. Fetch the order with items
      const order = await tx.retailOrder.findUnique({
        where: { id: orderId, tenantId },
        include: { retailOrderItems: true, store: true },
      });

      if (!order) throw new Error("Order not found");

      const locationId = order.store?.locationId || "default";

      // 1. Ensure a Retail department exists
      let dept = await tx.departments.findFirst({
        where: { tenantId, code: "RET" },
      });
      if (!dept) {
        dept = await tx.departments.findFirst({ where: { tenantId } });
      }
      if (!dept) {
        dept = await tx.departments.create({
          data: {
            id: "xsplpxei",
            updated_at: new Date(),
            tenantId,
            name: "Retail Operations",
            code: "RET",
            status: "active",
          },
        });
      }
      const departmentId = dept.id;

      const movements = [];
      // 2. Consume Stock (Correctly deducting from OH and Reserved)
      for (const item of order.items) {
        if (!item.productId) continue;

        await tx.stockLevel.updateMany({
          where: {
            tenantId,
            locationId,
            productId: item.productId,
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
            id: "yahy4nhc",
            updated_at: new Date(),
            tenantId,
            productId: item.productId,
            fromLocationId: locationId,
            toLocationId: null,
            quantity: item.quantity,
            type: "RETAIL_SALE",
            referenceId: orderId,
            performedBy: order.cashierId || "system",
            unitCost: 0, // To be costed by subledger later
          },
        });
        movements.push(move);
      }

      // 3. Mark Order as Paid
      await tx.retail_orders.update({
        where: { id: orderId },
        data: {
          status: "paid",
          paymentMethod: data.method,
        },
      });

      // 4. Update Shift Totals
      if (data.shiftId) {
        await tx.retail_shifts.update({
          where: { id: data.shiftId, tenantId },
          data: {
            expectedCash: {
              increment: data.method.toLowerCase() === "cash" ? data.amount : 0,
            },
          },
        });
      }

      // 5. Finance Ledger Entry
      await tx.journalEntry.create({
        data: {
          id: "ed1z2mud",
          updated_at: new Date(),
          tenantId,
          ref: `POS-${Date.now()}-${order.id.slice(-6)}`,
          description: `POS Sales Transaction (${data.method})`,
          fiscalPeriodId: "FISCAL_AUTO",
          postingDate: new Date(),
          status: "POSTED",
          lines: {
            create: [
              {
                tenantId,
                accountId: "ACC-4000",
                accountCode: "4000", // Sales Revenue
                description: `Order ${order.id}`,
                side: "CREDIT",
                amount: data.amount,
                debit: 0,
                credit: data.amount,
              },
              {
                tenantId,
                accountId: "ACC-1001",
                accountCode: "1001", // Cash/Bank
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

      // 6. Create Finance Payment Transaction for Money Desk Visibility
      await (tx as any).paymentTransaction.create({
        data: {
          id: "turw2vtk",
          updated_at: new Date(),
          tenantId,
          externalReference: order.id,
          type: "RETAIL_ORDER",
          amount: data.amount,
          currency: (order as any).currency || "IDR",
          destination: "RETAIL_SALES_ACCOUNT",
          channel: "POS",
          idempotencyKey: `payment_pos_${order.id}`,
          status: "COMPLETED",
          departmentId,
          purpose: "Retail Sale",
          createdBy: "POS_SYSTEM",
          extraInfo: {
            orderId: order.id,
            method: data.method,
            storeId: order.storeId,
          } as any,
        },
      });

      return {
        success: true,
        order_id: order.id,
        amount: Number(order.totalAmount),
        method: data.method,
        movements,
      };
    });
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
    await this.prisma.$transaction(async (tx: any) => {
      const store = await tx.stores.findUnique({
        where: { id: data.storeId },
        select: { locationId: true },
      });

      if (!store) throw new Error("Store not found");

      for (const adj of data.adjustments) {
        const stock = await tx.stockLevel.findUnique({
          where: {
            locationId_productId_departmentId: {
              locationId: store.locationId,
              productId: adj.productId,
              departmentId: "DEFAULT", // Use a sentinel or ensure it matches schema expectation
            },
          },
        });

        if (stock) {
          await tx.stockLevel.update({
            where: { id: stock.id },
            data: {
              onHand: adj.actualCount,
              available: adj.actualCount - stock.reserved,
              lastStockTakeAt: new Date(),
            },
          });
        } else {
          await tx.stockLevel.create({
            data: {
              id: "8ylu9vbw",
              updated_at: new Date(),
              tenantId,
              locationId: store.locationId,
              productId: adj.productId,
              departmentId: "DEFAULT",
              onHand: adj.actualCount,
              available: adj.actualCount,
              lastStockTakeAt: new Date(),
            },
          });
        }

        // Log movement
        await tx.stock_movements.create({
          data: {
            id: "lqcmo8bd",
            updated_at: new Date(),
            tenantId,
            productId: adj.productId,
            toLocationId: store.locationId,
            quantity: adj.actualCount - (stock?.onHand || 0),
            type: "STOCK_OPNAME",
            referenceId: data.shiftId || "OPNAME",
            performedBy: "system", // Should ideally be actorId
          },
        });
      }
    });

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
    await this.prisma.$transaction(async (tx: any) => {
      const store = await tx.stores.findUnique({
        where: { id: data.storeId },
        select: { locationId: true },
      });

      if (!store) throw new Error("Store not found");

      for (const item of data.items) {
        const stock = await tx.stockLevel.findUnique({
          where: {
            locationId_productId_departmentId: {
              locationId: store.locationId,
              productId: item.productId,
              departmentId: "DEFAULT",
            },
          },
        });

        if (stock) {
          await tx.stockLevel.update({
            where: { id: stock.id },
            data: {
              onHand: { increment: item.quantity },
              available: { increment: item.quantity },
            },
          });
        } else {
          await tx.stockLevel.create({
            data: {
              id: "z545xer1",
              updated_at: new Date(),
              tenantId,
              locationId: store.locationId,
              productId: item.productId,
              departmentId: "DEFAULT",
              onHand: item.quantity,
              available: item.quantity,
            },
          });
        }

        // Log movement
        await tx.stock_movements.create({
          data: {
            id: "i57izojy",
            updated_at: new Date(),
            tenantId,
            productId: item.productId,
            toLocationId: store.locationId,
            quantity: item.quantity,
            type: "RECEIVE_GOODS",
            referenceId: data.shipmentId,
            performedBy: "system",
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
    tenantId: string,
    email: string,
  ): Promise<any | null> {
    return this.prisma.retailCustomer.findFirst({
      where: { tenantId: tenantId, email },
      include: { retailCustomerAuth: true },
    });
  }

  async findCustomerById(
    tenantId: string,
    customerId: string,
  ): Promise<any | null> {
    return this.prisma.retailCustomer.findFirst({
      where: { tenantId: tenantId, id: customerId },
      include: { retailCustomerAuth: true },
    });
  }

  async createCustomer(tenantId: string, data: any): Promise<any> {
    return this.prisma.retailCustomer.create({
      data: {
        id: "7shag4rn",
        updatedAt: new Date(),
        tenantId: tenantId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        retailCustomerAuth: data.passwordHash
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
        id: "cmcaplzt",
        updatedAt: new Date(),
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
      include: { retailCartItems: { include: { itemMaster: true } } },
    });
  }

  async createCart(tenantId: string, customerId: string): Promise<any> {
    return this.prisma.retailCart.create({
      data: {
        id: "pn8zwr3m",
        updatedAt: new Date(),
        tenantId: tenantId,
        customerId,
        status: "active",
      },
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
      include: { retailWishlistItems: { include: { itemMaster: true } } },
    });
  }
  // Duplicate getWishlist removed

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
      data: {
        id: "nzxaoeab",
        updatedAt: new Date(),
        wishlistId,
        productId,
      },
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
        id: "qw3sfnn1",
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
    const settings = (s.settings as any) || {};
    return {
      id: s.id,
      tenantId: s.tenantId,
      locationId: s.locationId,
      name: s.name,
      code: s.code,
      type: s.type as any,
      status: s.status as any,
      address: "",
      phone: s.phone,
      email: s.email,
      timezone: s.timezone ?? "Asia/Jakarta",
      currency: s.currency || "IDR",
      taxZone: settings.tax_zone,
      managerId: s.managerId,
      inventoryPoolId: s.inventoryPoolId,
      operationalConfig: settings.operational_config,
      supplyConfig: settings.supply_config,
      infrastructureRegistry: settings.infrastructure_registry,
      channelBinding: settings.channel_binding,
      governance: settings.governance,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
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
      branches: s.stores ?? [],
      settings: s.settings,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }

  private mapProduct(p: any, locationId?: string): RetailProduct {
    const stockLevels = locationId
      ? (p.stockLevels || []).filter((s: any) => s.locationId === locationId)
      : p.stockLevels || [];

    const soh = stockLevels.reduce(
      (sum: number, s: any) => sum + (s.onHand || 0),
      0,
    );
    const reserved = stockLevels.reduce(
      (sum: number, s: any) => sum + (s.reserved || 0),
      0,
    );
    const available = stockLevels.reduce(
      (sum: number, s: any) => sum + (s.available || 0),
      0,
    );

    let customName = p.name;
    let customDesc = p.description || "";
    let customPrice = Number(p.basePrice);

    if (p.productProjections && p.productProjections.length > 0) {
      const locProj = p.productProjections.find(
        (proj: any) =>
          proj.locationId === locationId && proj.moduleType === "RETAIL",
      );
      const globalProj = p.productProjections.find(
        (proj: any) => proj.locationId === null && proj.moduleType === "RETAIL",
      );
      const activeProj = locProj || globalProj;

      if (activeProj) {
        if (activeProj.customName) customName = activeProj.customName;
        if (activeProj.customDescription)
          customDesc = activeProj.customDescription;
        if (activeProj.price) customPrice = Number(activeProj.price);
      }
    }

    return {
      id: p.id,
      tenantId: p.tenantId,
      sku: p.sku,
      barcode: p.barcode,
      name: customName,
      description: customDesc,
      categoryId: p.categoryId,
      categoryName: p.productCategory?.name,
      basePrice: customPrice,
      currency: "IDR",
      prices: [{ amount: customPrice, currency: "IDR" }],
      taxRate: Number(p.taxRate),
      unit: p.unit,
      type: p.type as any,
      status: p.status as any,
      variants: [],
      seo: {
        title: `${p.name} | Zenvix Store`,
        metaDescription: p.description || `Buy ${p.name} at the best price.`,
        keywords: [p.name],
      },
      metadata: {
        stockOnHand: soh,
        reserved: reserved,
        available: available,
      },
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  private mapOrder(o: any): RetailOrder {
    return {
      id: o.id,
      tenantId: o.tenantId,
      locationId: o.store?.locationId || "",
      storeId: o.storeId,
      terminalId: o.deviceId,
      cashierId: o.cashierId,
      customerId: o.customerId,
      customerName: o.customer?.name,
      status: o.status as any,
      items: o.items?.map((item: any) => this.mapOrderItem(item)) || [],
      subtotal: Number(o.subtotal),
      taxTotal: Number(o.tax),
      discountTotal: 0,
      grandTotal: Number(o.totalAmount),
      currency: "IDR",
      paymentMethod: o.paymentMethod as any,
      paymentStatus: "paid",
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    };
  }

  private mapOrderItem(item: any): RetailOrderItem {
    return {
      productId: item.productId,
      variantId: undefined,
      sku: item.product?.sku || "",
      name: item.product?.name || "",
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      taxAmount: 0,
      discountAmount: Number(item.discount),
      totalPrice: Number(item.totalPrice),
    };
  }

  private mapShift(s: any): RetailShift {
    return {
      id: s.id,
      tenantId: s.tenantId,
      locationId: "",
      storeId: s.storeId,
      employeeId: s.employeeId,
      terminalId: "",
      startTime: s.startTime,
      endTime: s.endTime,
      openingCash: Number(s.openingCash),
      closingCash: s.closingCash ? Number(s.closingCash) : undefined,
      expectedCash: s.expectedCash ? Number(s.expectedCash) : undefined,
      status: s.status as any,
      notes: s.notes,
    };
  }

  private hashSecret(secret: string): string {
    return createHash("sha256").update(secret).digest("hex");
  }
}
