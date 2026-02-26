import { apiRequest } from "@/core/api/apiClient";
import type { SessionContext } from "@/core/security/session";
import type {
  RetailOrder,
  RetailStore,
  RetailPromotion,
  RetailChannel,
  RetailShift,
  POSDevice,
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
    return apiRequest<RetailStore[]>("/retail/stores", "GET", session);
  },

  async getStore(tenantId: string, storeId: string, session: SessionContext) {
    return apiRequest<RetailStore>(`/retail/stores/${storeId}`, "GET", session);
  },

  async createStore(
    tenantId: string,
    session: SessionContext,
    store: Partial<RetailStore>,
  ) {
    return apiRequest<RetailStore>("/retail/stores", "POST", session, store);
  },

  async updateStore(
    tenantId: string,
    session: SessionContext,
    store: RetailStore,
  ) {
    return apiRequest<RetailStore>(
      `/retail/stores/${store.id}`,
      "PUT",
      session,
      store,
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
      ? `/retail/orders?store_id=${storeId}`
      : "/retail/orders";
    return apiRequest<RetailOrder[]>(path, "GET", session);
  },

  async listDevices(
    tenantId: string,
    session: SessionContext,
    storeId?: string,
  ) {
    const path = storeId
      ? `/retail/devices?store_id=${storeId}`
      : "/retail/devices";
    return apiRequest<POSDevice[]>(path, "GET", session);
  },

  async listInventory(
    tenantId: string,
    session: SessionContext,
  ): Promise<RetailProduct[]> {
    const products = await apiRequest<
      Array<{
        id: string;
        tenant_id: string;
        sku: string;
        barcode: string;
        name: string;
        description: string;
        category_id: string;
        base_price: number;
        currency: string;
        tax_rate: number;
        unit: string;
        status: string;
        created_at: string;
        updated_at: string;
        metadata?: Record<string, unknown>;
      }>
    >("/retail/products", "GET", session);
    return (products || []).map((p) => ({
      ...p,
      tenantId: p.tenant_id || tenantId,
      categoryId: p.category_id,
      basePrice: p.base_price,
      taxRate: p.tax_rate,
      unit: p.unit,
      status: p.status as RetailProduct["status"],
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      price: p.base_price || 0, // Convenience mapping
      stock: (p.metadata?.stock_on_hand as number) || 100, // Mock stock until pool integration
    }));
  },

  // --- 2. Order Processing ---
  async createOrder(
    tenantId: string,
    session: SessionContext,
    storeId: string,
    deviceId: string,
    items: {
      itemId: string;
      quantity: number;
      unitPrice: number;
      name: string;
    }[],
    shiftId?: string,
  ) {
    return apiRequest<RetailOrder>("/retail/orders", "POST", session, {
      storeId,
      deviceId,
      items,
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
      },
    );
  },

  // --- 3. Promotion & Campaign Management ---
  async listPromotions(
    tenantId: string,
    session: SessionContext,
  ): Promise<RetailPromotion[]> {
    return apiRequest<RetailPromotion[]>("/retail/promotions", "GET", session);
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

  // --- 4. Channel & Logic Nexus ---
  async listChannels(
    tenantId: string,
    session: SessionContext,
  ): Promise<RetailChannel[]> {
    return apiRequest<RetailChannel[]>("/retail/channels", "GET", session);
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

  // --- 6. Shift & Fiscal Integrity ---
  async openShift(
    tenantId: string,
    session: SessionContext,
    storeId: string,
    openingCash: number,
  ) {
    return apiRequest<RetailShift>("/retail/shifts/open", "POST", session, {
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
      `/retail/shifts/${shiftId}/close`,
      "PUT",
      session,
      {
        closingCash,
        notes,
      },
    );
  },

  async listShifts(
    tenantId: string,
    session: SessionContext,
    storeId?: string,
  ) {
    const path = storeId
      ? `/retail/shifts?store_id=${storeId}`
      : "/retail/shifts";
    return apiRequest<RetailShift[]>(path, "GET", session);
  },

  async processReturn(
    tenantId: string,
    session: SessionContext,
    orderId: string,
    itemIds: string[],
    shiftId?: string,
  ) {
    return apiRequest<{ success: boolean }>(
      `/retail/orders/${orderId}/return`,
      "POST",
      session,
      {
        itemIds,
        shiftId,
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
    const response = await apiRequest<{ data: any[] }>(
      "/retail/inventory-pools",
      "GET",
      session,
    );
    return response.data;
  },
};
