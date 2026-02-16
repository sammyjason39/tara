import type { RetailStore, POSDevice, RetailOrder, RetailLicense, RetailPromotion, RetailChannel, RetailShift } from "@/core/types/retail/retail";
import { ensureSeed, nextId, saveToStorage } from "@/core/repositories/hr/storage";
import { mockInventoryRepo } from "@/core/repositories/inventory/mockInventoryRepo";

const STORE_KEY = (tenantId: string) => `retail:${tenantId}:stores`;
const DEVICE_KEY = (tenantId: string) => `retail:${tenantId}:devices`;
const PROMO_KEY = (tenantId: string) => `retail:${tenantId}:promotions`;
const CHANNEL_KEY = (tenantId: string) => `retail:${tenantId}:channels`;
const ORDER_KEY = (tenantId: string) => `retail:${tenantId}:orders`;
const SHIFT_KEY = (tenantId: string) => `retail:${tenantId}:shifts`;

const SEED_STORES = (tenantId: string): RetailStore[] => [
  {
    id: "store-001",
    tenantId,
    name: "Downtown Flagship",
    code: "DT-001",
    address: "123 Main St, Metro City",
    status: "active",
    warehouseId: "wh-001",
    managerId: `${tenantId}-emp-001`,
    locationId: "loc-store-001", // Matches Attendance Location
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const SEED_PROMOS = (tenantId: string): RetailPromotion[] => [
  {
    id: "promo-001",
    tenantId,
    title: "Ramadan Special",
    type: "percentage",
    value: 15,
    startDate: "2026-03-01",
    endDate: "2026-04-01",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const SEED_CHANNELS = (tenantId: string): RetailChannel[] => [
  {
    id: "ch-001",
    tenantId,
    name: "Tokopedia",
    type: "MARKETPLACE",
    status: "active",
    syncFrequency: "15m",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const SEED_DEVICES = (tenantId: string): POSDevice[] => [
  {
    id: "pos-001",
    tenantId,
    storeId: "store-001",
    name: "Checkout 1",
    type: "pos_terminal",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "kiosk-001",
    tenantId,
    storeId: "store-001",
    name: "Self-Service Kiosk",
    type: "kiosk",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const retailRepo = {
  getLicense(tenantId: string): RetailLicense {
     // Mock License
     return {
        tenantId,
        status: "active",
        maxStores: 5,
        expiryDate: "2030-12-31",
     };
  },

  listStores(tenantId: string): RetailStore[] {
    return ensureSeed(STORE_KEY(tenantId), SEED_STORES(tenantId));
  },

  getStore(tenantId: string, storeId: string): RetailStore | undefined {
    return this.listStores(tenantId).find((s) => s.id === storeId);
  },

  createStore(tenantId: string, store: RetailStore): void {
    const key = STORE_KEY(tenantId);
    const stores = this.listStores(tenantId);
    const updated = [...stores, store];
    saveToStorage(key, updated);
  },

  updateStore(tenantId: string, store: RetailStore): void {
    const key = STORE_KEY(tenantId);
    const stores = this.listStores(tenantId);
    const updated = stores.map(s => s.id === store.id ? store : s);
    saveToStorage(key, updated);
  },

  deleteStore(tenantId: string, storeId: string): void {
    const key = STORE_KEY(tenantId);
    const stores = this.listStores(tenantId);
    const updated = stores.filter(s => s.id !== storeId);
    saveToStorage(key, updated);
  },

  listDevices(tenantId: string): POSDevice[] {
    return ensureSeed(DEVICE_KEY(tenantId), SEED_DEVICES(tenantId));
  },

  getDevice(tenantId: string, deviceId: string): POSDevice | undefined {
    return this.listDevices(tenantId).find((d) => d.id === deviceId);
  },

  listProducts(tenantId: string) {
    const items = mockInventoryRepo.listItems(tenantId);
    const balances = mockInventoryRepo.listBalances(tenantId);
    
    return items
      .filter(i => i.active)
      .map(item => {
        // Calculate total available stock across all locations
        // In a real app, we might filter by specific "Sales" locations
        const stock = balances
          .filter(b => b.itemId === item.id)
          .reduce((sum, b) => sum + (b.quantity - b.reservedQuantity), 0);
          
        return {
          id: item.id,
          name: item.name,
          sku: item.sku,
          stock,
          price: item.retailPrice || 0, 
          category: item.category
        };
      });
  },

  // --- Promotions ---
  listPromotions(tenantId: string): RetailPromotion[] {
    return ensureSeed(PROMO_KEY(tenantId), SEED_PROMOS(tenantId));
  },

  updatePromotion(tenantId: string, promotion: RetailPromotion): void {
    const key = PROMO_KEY(tenantId);
    const promos = this.listPromotions(tenantId);
    const updated = promos.map(p => p.id === promotion.id ? promotion : p);
    saveToStorage(key, updated);
  },

  // --- Channels ---
  listChannels(tenantId: string): RetailChannel[] {
    return ensureSeed(CHANNEL_KEY(tenantId), SEED_CHANNELS(tenantId));
  },

  getChannel(tenantId: string, channelId: string): RetailChannel | undefined {
    return this.listChannels(tenantId).find(c => c.id === channelId);
  },

  updateChannel(tenantId: string, channel: RetailChannel): void {
    const key = CHANNEL_KEY(tenantId);
    const channels = this.listChannels(tenantId);
    const updated = channels.map(c => c.id === channel.id ? channel : c);
    saveToStorage(key, updated);
  },

  createChannel(tenantId: string, channel: RetailChannel): void {
    const key = CHANNEL_KEY(tenantId);
    const channels = this.listChannels(tenantId);
    const updated = [...channels, channel];
    saveToStorage(key, updated);
  },

  deleteChannel(tenantId: string, channelId: string): void {
    const key = CHANNEL_KEY(tenantId);
    const channels = this.listChannels(tenantId);
    const updated = channels.filter(c => c.id !== channelId);
    saveToStorage(key, updated);
  },

  // --- Orders ---
  createOrder(tenantId: string, order: RetailOrder): void {
     const key = ORDER_KEY(tenantId);
     const orders = ensureSeed(key, []) as RetailOrder[];
     const updated = [...orders, order];
     saveToStorage(key, updated);
  },

  listOrders(tenantId: string, storeId?: string): RetailOrder[] {
     const orders = ensureSeed(ORDER_KEY(tenantId), []) as RetailOrder[];
     if (storeId) {
        return orders.filter(o => o.storeId === storeId);
     }
     return orders;
  },

  getOrder(tenantId: string, orderId: string): RetailOrder | undefined {
    return this.listOrders(tenantId).find(o => o.id === orderId);
  },

  updateOrder(tenantId: string, order: RetailOrder): void {
     const key = ORDER_KEY(tenantId);
     const orders = ensureSeed(key, []) as RetailOrder[];
     const updated = orders.map(o => o.id === order.id ? order : o);
     saveToStorage(key, updated);
  },

  // --- Shifts ---
  listShifts(tenantId: string): RetailShift[] {
    return ensureSeed(SHIFT_KEY(tenantId), []) as RetailShift[];
  },

  getShift(tenantId: string, shiftId: string): RetailShift | undefined {
    return this.listShifts(tenantId).find(s => s.id === shiftId);
  },

  createShift(tenantId: string, shift: RetailShift): void {
    const key = SHIFT_KEY(tenantId);
    const shifts = this.listShifts(tenantId);
    const updated = [...shifts, shift];
    saveToStorage(key, updated);
  },

  updateShift(tenantId: string, shift: RetailShift): void {
    const key = SHIFT_KEY(tenantId);
    const shifts = this.listShifts(tenantId);
    const updated = shifts.map(s => s.id === shift.id ? shift : s);
    saveToStorage(key, updated);
  },

  // --- System State (Authority) ---
  getSystemState(tenantId: string) {
    // In a real app, this would check real network/service status
    // For DEV_MOCK_MODE, we can toggle this via localStorage: 'retail.mock_offline'
    const isMockOffline = localStorage.getItem("retail.mock_offline") === "true";
    return {
      isOffline: isMockOffline,
      lastSync: new Date().toISOString(),
      serviceStatus: "operational" as const
    };
  }
};
