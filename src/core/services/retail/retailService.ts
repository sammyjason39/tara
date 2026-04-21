import { apiRequest } from "@/core/api/apiClient";
import type { SessionContext } from "@/core/security/session";
import type {
  RetailOrder,
  RetailStore,
  RetailPromotion,
  RetailChannel,
  RetailShift,
  POSDevice,
  BranchDevice,
  CCTVCamera,
  BranchSensor,
  RetailOrderItem,
  RetailProduct,
} from "@/core/types/retail/retail";

export const retailService = {
  // --- 1. Access Control & Scope (Now handled by backend or thin wrapper) ---
  async validateAccess(
    tenantId: string,
    employeeId: string,
    storeId: string,
    session: SessionContext,
  ) {
    return apiRequest<{ valid: boolean }>(
      "/retail/validate-access",
      "POST",
      session,
      { storeId },
    );
  },

  async enforceScope(
    tenantId: string,
    session: SessionContext,
    storeId: string,
    shiftId?: string,
  ) {
    // This is essentially a client-side guard that might call a validation endpoint
    // or simply rely on the fact that subsequent API calls will fail if scope is invalid.
    return apiRequest<{ valid: boolean }>(
      "/retail/enforce-scope",
      "POST",
      session,
      { storeId, shiftId },
    );
  },

  async listStores(tenantId: string, session: SessionContext) {
    return apiRequest<RetailStore[]>("/v1/retail/stores", "GET", session);
  },

  async listCategories(tenantId: string, session: SessionContext) {
    return apiRequest<{ id: string; name: string }[]>(
      "/v1/retail/categories",
      "GET",
      session,
    );
  },

  async getStore(tenantId: string, storeId: string, session: SessionContext) {
    return apiRequest<RetailStore>(`/v1/retail/stores/${storeId}`, "GET", session);
  },


  async createStore(
    tenantId: string,
    session: SessionContext,
    store: Partial<RetailStore>,
  ) {
    return apiRequest<RetailStore>("/v1/retail/stores", "POST", session, store);
  },

  async updateStore(
    tenantId: string,
    session: SessionContext,
    store: RetailStore,
  ) {
    const pickAndClean = (obj: unknown, keys: string[]) => {
      if (!obj || typeof obj !== "object") return undefined;
      const res = {} as Record<string, unknown>;
      keys.forEach((k) => {
        const val = (obj as Record<string, unknown>)[k];
        if (val !== undefined && val !== null) {
          res[k] = val;
        }
      });
      return Object.keys(res).length > 0 ? res : undefined;
    };

    const payload = pickAndClean(
      {
        name: store.name,
        locationId: store.locationId,
        type: store.type,
        status: store.status,
        phone: store.phone,
        email: store.email,
        timezone: store.timezone,
        managerId: store.managerId,
        inventoryPoolId: store.inventoryPoolId,
        currency: store.currency,
        tax_zone: store.taxZone,

        operational_config: pickAndClean(store.operationalConfig, [
          "business_hours_template",
          "default_shift_model",
          "enabled_modules",
          "pos_device_limit",
          "self_checkout_enabled",
          "payment_methods_allowed",
          "refund_policy_mode",
          "auto_close_shift_setting",
        ]),

        supply_config: pickAndClean(store.supplyConfig, [
          "default_inbound_warehouse_id",
          "transfer_priority_policy",
          "replenishment_rule_set",
          "safety_stock_policy",
          "auto_reorder_threshold_template",
          "fulfillment_fallback_routing",
        ]),

        infrastructure_registry: pickAndClean(store.infrastructureRegistry, [
          "registered_device_ids",
          "pos_clusters",
          "scanner_pools",
          "local_server_binding",
          "sync_interval",
          "offline_tolerance_threshold",
        ]),

        channel_binding: pickAndClean(store.channelBinding, [
          "linked_ecommerce_store_id",
          "marketplace_integrations",
          "channel_priority",
          "order_routing_logic",
          "online_to_offline_sync_policy",
        ]),

        governance: pickAndClean(store.governance, [
          "license_status",
          "activation_date",
          "activation_source",
          "compliance_level",
          "audit_frequency_tier",
          "data_retention_policy",
          "decommission_trigger",
        ]),
      },
      [
        "name",
        "locationId",
        "type",
        "status",
        "phone",
        "email",
        "timezone",
        "managerId",
        "inventoryPoolId",
        "currency",
        "tax_zone",
        "operational_config",
        "supply_config",
        "infrastructure_registry",
        "channel_binding",
        "governance",
      ],
    );

    console.log("[retailService] updateStore payload:", payload);

    return apiRequest<RetailStore>(
      `/retail/stores/${store.id}`,
      "PUT",
      session,
      payload,
    );
  },

  async deleteStore(
    tenantId: string,
    session: SessionContext,
    storeId: string,
  ) {
    return apiRequest<{ success: boolean }>(
      `/retail/stores/${storeId}`,
      "DELETE",
      session,
    );
  },

  async listOrders(
    tenantId: string,
    session: SessionContext,
    storeId?: string,
  ) {
    const path = storeId
      ? `/v1/retail/orders?store_id=${storeId}`
      : "/v1/retail/orders";
    return apiRequest<RetailOrder[]>(path, "GET", session);
  },

  async updateOrderStatus(
    tenantId: string,
    session: SessionContext,
    orderId: string,
    status: RetailOrder["status"],
  ) {
    return apiRequest<RetailOrder>(
      `/v1/retail/orders/${orderId}/status`,
      "PATCH",
      session,
      { status },
    );
  },

  async voidOrder(
    tenantId: string,
    session: SessionContext,
    orderId: string,
  ) {
    return apiRequest<RetailOrder>(
      `/v1/retail/orders/${orderId}/void`,
      "POST",
      session
    );
  },

  async cancelOrder(
    tenantId: string,
    session: SessionContext,
    orderId: string,
  ) {
    return apiRequest<RetailOrder>(
      `/v1/retail/orders/${orderId}/cancel`,
      "POST",
      session
    );
  },



  async listDevices(
    tenantId: string,
    session: SessionContext,
    storeId?: string,
  ) {
    const path = storeId
      ? `/retail/devices?store_id=${storeId}`
      : "/retail/devices";
    return apiRequest<BranchDevice[]>(path, "GET", session);
  },

  async registerDevice(
    tenantId: string,
    session: SessionContext,
    device: Partial<BranchDevice>,
  ) {
    return apiRequest<BranchDevice>("/v1/retail/devices", "POST", session, device);
  },

  async listCCTVs(tenantId: string, session: SessionContext, storeId?: string) {
    const path = storeId
      ? `/retail/cctvs?store_id=${storeId}`
      : "/retail/cctvs";
    return apiRequest<CCTVCamera[]>(path, "GET", session);
  },

  async validateCCTVConnection(
    tenantId: string,
    session: SessionContext,
    camera: Partial<CCTVCamera>,
  ) {
    return apiRequest<{ success: boolean; message?: string }>(
      "/retail/cctvs/validate",
      "POST",
      session,
      camera,
    );
  },

  async registerCCTV(
    tenantId: string,
    session: SessionContext,
    camera: Partial<CCTVCamera>,
  ) {
    return apiRequest<CCTVCamera>("/v1/retail/cctvs", "POST", session, camera);
  },

  async listSensors(
    tenantId: string,
    session: SessionContext,
    storeId?: string,
  ) {
    const path = storeId
      ? `/retail/sensors?store_id=${storeId}`
      : "/retail/sensors";
    return apiRequest<BranchSensor[]>(path, "GET", session);
  },

  async registerSensor(
    tenantId: string,
    session: SessionContext,
    sensor: Partial<BranchSensor>,
  ) {
    return apiRequest<BranchSensor>("/v1/retail/sensors", "POST", session, sensor);
  },

  async listInventory(
    tenantId: string,
    session: SessionContext,
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
  ): Promise<
    RetailProduct[] & {
      meta: { total: number; page: number; pageSize: number };
    }
  > {
    type PaginatedArray<T> = T[] & {
      meta: { total: number; page: number; pageSize: number };
    };

    const qs = new URLSearchParams();
    if (options?.page) qs.set("page", String(options.page));
    if (options?.pageSize) qs.set("pageSize", String(options.pageSize));
    if (options?.categoryId) qs.set("categoryId", options.categoryId);
    if (options?.type) qs.set("type", options.type);
    if (options?.minPrice !== undefined)
      qs.set("minPrice", String(options.minPrice));
    if (options?.maxPrice !== undefined)
      qs.set("maxPrice", String(options.maxPrice));
    if (options?.q) qs.set("q", options.q);
    if (options?.sortBy) qs.set("sortBy", options.sortBy);
    if (options?.sortDir) qs.set("sortDir", options.sortDir);
    if (options?.locationId) qs.set("location_id", options.locationId);
    const path = qs.toString()
      ? `/retail/products?${qs.toString()}`
      : "/retail/products";

    const response = await apiRequest<{
      items: unknown[]; // replaced any with unknown
      total: number;
      page: number;
      pageSize: number;
    }>(path, "GET", session);

    // apiRequest already extracts result.data.
    // Backend respond(payload) wraps payload in { success, data }.
    // So response IS the payload { items, total, page, pageSize }
    // or sometimes an array in legacy endpoints.

    const payload = Array.isArray(response)
      ? {
          items: response,
          total: response.length,
          page: 1,
          pageSize: response.length || 1,
        }
      : response || { items: [], total: 0, page: 1, pageSize: 1 };

    const items = payload.items || [];
    const totalCount = payload.total ?? items.length;
    const pageNum = payload.page ?? 1;
    const pageSizeNum = payload.pageSize ?? (items.length || 1);

    const mapped = (items || []).map((p: Record<string, unknown>) => ({
      ...p,
      tenantId: (p.tenant_id || p.tenantId || tenantId) as string,
      categoryId: (p.category_id || p.categoryId) as string,
      categoryName: (p.category_name ||
        p.categoryName ||
        (p.category as { name?: string })?.name) as string,
      basePrice: (p.base_price ?? p.basePrice ?? 0) as number,
      taxRate: (p.tax_rate ?? p.taxRate ?? 0) as number,
      unit: p.unit as string,
      status: (p.status as RetailProduct["status"]) ?? "active",
      createdAt: (p.created_at ?? p.createdAt) as string,
      updatedAt: (p.updated_at ?? p.updatedAt) as string,
      price: (p.base_price ?? p.basePrice ?? 0) as number,
      stock:
        (p.metadata as { stock_on_hand?: number })?.stock_on_hand ??
        (p.stock as number) ??
        0,
    })) as RetailProduct[];

    const result = mapped as PaginatedArray<RetailProduct>;
    result.meta = { total: totalCount, page: pageNum, pageSize: pageSizeNum };
    return result;
  },

  // --- 2. Order Processing ---
  async createOrder(
    tenantId: string,
    session: SessionContext,
    storeId: string,
    deviceId: string,
    items: {
      productId: string;
      quantity: number;
      unitPrice: number;
      name?: string;
    }[],
    paymentMethod: "cash" | "card" | "qr" | "wallet",
    grandTotal: number,
    shiftId?: string,
  ) {
    return apiRequest<RetailOrder>("/v1/retail/orders", "POST", session, {
      storeId,
      terminalId: deviceId, // Using terminalId to match backend DTO
      items,
      paymentMethod,
      grandTotal,
      shiftId,
    });
  },

  async processPayment(
    tenantId: string,
    session: SessionContext,
    orderId: string,
    amount: number,
    method: "card" | "cash" | "qr",
    shiftId?: string,
  ) {
    return apiRequest<RetailOrder>(
      `/retail/orders/${orderId}/payment`,
      "POST",
      session,
      {
        amount,
        method,
        shiftId,
        department_id: session.departmentId,
      },
    );
  },

  async checkout(
    tenantId: string,
    session: any,
    checkoutData: any,
    idempotencyKey?: string,
  ) {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers["x-idempotency-key"] = idempotencyKey;
    }

    return apiClient.post(
      "/v1/retail/checkout",
      checkoutData,
      {
        headers: {
          ...this.getHeaders(tenantId, session),
          ...headers,
        },
      },
      true,
    );
  },

  // --- 3. Promotion & Campaign Management ---
  async listPromotions(
    tenantId: string,
    session: SessionContext,
  ): Promise<RetailPromotion[]> {
    return apiRequest<RetailPromotion[]>("/v1/retail/promotions", "GET", session);
  },

  async updatePromotion(
    tenantId: string,
    session: SessionContext,
    promotion: RetailPromotion,
  ) {
    return apiRequest<RetailPromotion>(
      `/retail/promotions/${promotion.id}`,
      "PUT",
      session,
      promotion,
    );
  },

  // --- 4. Channel & Logic Zenvix ---
  async listChannels(
    tenantId: string,
    session: SessionContext,
  ): Promise<RetailChannel[]> {
    return apiRequest<RetailChannel[]>("/v1/retail/channels", "GET", session);
  },

  async syncChannel(
    tenantId: string,
    session: SessionContext,
    channelId: string,
  ) {
    return apiRequest<{ success: boolean }>(
      `/retail/channels/${channelId}/sync`,
      "POST",
      session,
    );
  },

  async createChannel(
    tenantId: string,
    session: SessionContext,
    channel: {
      name: string;
      type: RetailChannel["type"];
      sync_frequency?: string;
      provisionCredentials?: boolean;
      branchId?: string;
      domain?: string;
      gatewayUrl?: string;
      connector?: string;
      credentials?: {
        clientId: string;
        clientSecret: string;
      };
    },
  ) {
    return apiRequest<RetailChannel>(
      "/retail/channels",
      "POST",
      session,
      channel,
    );
  },

  async deleteChannel(
    tenantId: string,
    session: SessionContext,
    channelId: string,
  ) {
    return apiRequest<{ success: boolean }>(
      `/retail/channels/${channelId}`,
      "DELETE",
      session,
    );
  },

  async updateChannel(
    tenantId: string,
    session: SessionContext,
    channelId: string,
    updates: {
      name?: string;
      sync_frequency?: string;
      syncFrequency?: string;
      status?: RetailChannel["status"];
    },
  ) {
    return apiRequest<RetailChannel>(
      `/retail/channels/${channelId}`,
      "PUT",
      session,
      updates,
    );
  },

  async rotateChannelCredentials(
    tenantId: string,
    session: SessionContext,
    channelId: string,
  ) {
    return apiRequest<{ clientId: string; clientSecret: string }>(
      `/retail/channels/${channelId}/rotate-credentials`,
      "POST",
      session,
    );
  },

  async revokeChannelCredentials(
    tenantId: string,
    session: SessionContext,
    channelId: string,
  ) {
    return apiRequest<{ clientId: string }>(
      `/retail/channels/${channelId}/revoke-credentials`,
      "POST",
      session,
    );
  },

  // --- 5. Device & IoT Fleet ---
  async pingDevice(
    tenantId: string,
    session: SessionContext,
    deviceId: string,
  ) {
    return apiRequest<{ success: boolean }>(
      `/retail/devices/${deviceId}/ping`,
      "POST",
      session,
    );
  },

  async verifyTicket(
    tenantId: string,
    session: SessionContext,
    ticketId: string,
  ) {
    return apiRequest<{
      status: "valid" | "invalid" | "expired";
      type: string;
      issuedAt: string;
      balance: string;
    }>(`/retail/verify/${ticketId}`, "GET", session);
  },


  async scanDevices(tenantId: string, session: SessionContext) {
    return apiRequest<unknown[]>("/v1/retail/devices/scan", "POST", session);
  },

  async commitScannedDevice(
    tenantId: string,
    session: SessionContext,
    discoveryId: string,
  ) {
    return apiRequest<BranchDevice>(
      `/retail/devices/commit-scan/${discoveryId}`,
      "POST",
      session,
    );
  },

  // --- 6. Shift & Fiscal Integrity ---
  async openShift(
    tenantId: string,
    session: SessionContext,
    storeId: string,
    openingCash: number,
  ) {
    return apiRequest<RetailShift>("/v1/retail/shifts/open", "POST", session, {
      storeId,
      openingCash,
    });
  },

  async closeShift(
    tenantId: string,
    session: SessionContext,
    shiftId: string,
    closingCash: number,
    notes?: string,
  ) {
    return apiRequest<RetailShift>(
      `/v1/retail/shifts/${shiftId}/close`,
      "PUT",
      session,
      {
        closingCash,
        notes,
      },
    );
  },

  async reconcileShift(
    tenantId: string,
    session: SessionContext,
    shiftId: string,
  ) {
    return apiRequest<RetailShift>(
      `/v1/retail/shifts/${shiftId}/reconcile`,
      "POST",
      session
    );
  },


  async listShifts(
    tenantId: string,
    session: SessionContext,
    params?: {
      store_id?: string;
      employee_id?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    let path = "/retail/shifts";
    if (params) {
      const query = new URLSearchParams();
      if (params.store_id) query.append("store_id", params.store_id);
      if (params.employee_id) query.append("employee_id", params.employee_id);
      if (params.limit) query.append("limit", params.limit.toString());
      if (params.offset) query.append("offset", params.offset.toString());
      path += `?${query.toString()}`;
    }
    return apiRequest<RetailShift[]>(path, "GET", session);
  },

  async processReturn(
    tenantId: string,
    session: SessionContext,
    orderId: string,
    itemIds: string[],
    shiftId?: string,
    conditions?: Array<{ productId: string; condition: 'good' | 'damaged_repairable' | 'damaged_unrepairable'; notes?: string }>,
  ) {
    return apiRequest<{ success: boolean }>(
      `/v1/retail/orders/${orderId}/return`,
      "POST",
      session,
      {
        itemIds,
        shiftId,
        conditions,
      },
    );
  },


  async submitOpname(
    tenantId: string,
    session: SessionContext,
    storeId: string,
    adjustments: { sku: string; actualCount: number }[],
    shiftId?: string,
  ) {
    return apiRequest<{ success: boolean }>(
      "/retail/inventory/opname",
      "POST",
      session,
      {
        storeId,
        adjustments,
        shiftId,
      },
    );
  },

  async receiveGoods(
    tenantId: string,
    session: SessionContext,
    storeId: string,
    shipmentId: string,
    items: { itemId: string; received: number }[],
    shiftId?: string,
  ) {
    return apiRequest<{ success: boolean }>(
      "/retail/inventory/receive",
      "POST",
      session,
      {
        storeId,
        shipmentId,
        items,
        shiftId,
      },
    );
  },

  async listInventoryPools(tenantId: string, session: SessionContext) {
    return apiRequest<Record<string, unknown>[]>(
      "/retail/inventory-pools",
      "GET",
      session,
    );
  },

  async getInventoryStats(
    tenantId: string,
    session: SessionContext,
    options?: {
      categoryId?: string;
      type?: string;
      minPrice?: number;
      maxPrice?: number;
      q?: string;
    },
  ) {
    const qs = new URLSearchParams();
    if (options?.categoryId) qs.set("categoryId", options.categoryId);
    if (options?.type) qs.set("type", options.type);
    if (options?.minPrice !== undefined)
      qs.set("minPrice", String(options.minPrice));
    if (options?.maxPrice !== undefined)
      qs.set("maxPrice", String(options.maxPrice));
    if (options?.q) qs.set("q", options.q);
    const path = qs.toString()
      ? `/retail/inventory/stats?${qs.toString()}`
      : "/retail/inventory/stats";

    const response = await apiRequest<{
      total: number;
      critical: number;
      lowStock: number;
      overstock: number;
      outOfStock: number;
      totalSOH: number;
      totalATS: number;
      // Added user requested fields
      totalItems: number;
      lowStockCount: number;
      outOfStockCount: number;
      totalValue: number;
    }>(path, "GET", session);
    return response;
  },

  async updateProduct(
    tenantId: string,
    session: SessionContext,
    productId: string,
    data: Partial<RetailProduct> & {
      category_id?: string;
      base_price?: number;
    },
  ) {
    return apiRequest<RetailProduct>(
      `/v1/retail/products/${productId}`,
      "PATCH",
      session,
      data,
    );
  },


  async listPendingItems(tenantId: string, session: SessionContext) {
    return apiRequest<RetailProduct[]>(
      "/inventory/items/pending",
      "GET",
      session,
    );
  },

  async approveItem(tenantId: string, session: SessionContext, itemId: string) {
    return apiRequest<RetailProduct>(
      `/inventory/items/${itemId}/approve`,
      "PUT",
      session,
    );
  },

  async rejectItem(tenantId: string, session: SessionContext, itemId: string) {
    return apiRequest<RetailProduct>(
      `/inventory/items/${itemId}/reject`,
      "PUT",
      session,
    );
  },

  // --- 7. SKU & Barcode Generation (Wired to Backend) ---
  async generateSku(
    tenantId: string,
    session: SessionContext,
    category: string,
  ) {
    return apiRequest<{ sku: string }>(
      `/inventory/generate-sku?category=${encodeURIComponent(category)}`,
      "GET",
      session,
    );
  },

  async generateBarcode(
    tenantId: string,
    session: SessionContext,
    sku: string,
  ) {
    return apiRequest<{ barcode: string }>(
      `/inventory/generate-barcode?sku=${encodeURIComponent(sku)}`,
      "GET",
      session,
    );
  },

  async batchCreateItemsJson(
    tenantId: string,
    session: SessionContext,
    items: unknown[],
  ) {
    return apiRequest<{ success: boolean; data: unknown[] }>(
      "/inventory/items/batch-json",
      "POST",
      session,
      { items },
    );
  },

  // --- 8. Governance & Auditing ---
  async logGovernanceAction(
    tenantId: string,
    session: SessionContext,
    entry: unknown,
  ) {
    return apiRequest<{ success: boolean }>(
      "/retail/governance/log",
      "POST",
      session,
      entry,
    );
  },
};

