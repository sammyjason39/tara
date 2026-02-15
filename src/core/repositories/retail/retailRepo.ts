import type { RetailStore, POSDevice, RetailOrder, RetailLicense } from "@/core/types/retail/retail";
import { ensureSeed, nextId, saveToStorage } from "@/core/repositories/hr/storage";

const STORE_KEY = (tenantId: string) => `retail:${tenantId}:stores`;
const DEVICE_KEY = (tenantId: string) => `retail:${tenantId}:devices`;
const ORDER_KEY = (tenantId: string) => `retail:${tenantId}:orders`;

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

  listDevices(tenantId: string): POSDevice[] {
    return ensureSeed(DEVICE_KEY(tenantId), SEED_DEVICES(tenantId));
  },

  getDevice(tenantId: string, deviceId: string): POSDevice | undefined {
    return this.listDevices(tenantId).find((d) => d.id === deviceId);
  },

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

  updateOrder(tenantId: string, order: RetailOrder): void {
     const key = ORDER_KEY(tenantId);
     const orders = ensureSeed(key, []) as RetailOrder[];
     const updated = orders.map(o => o.id === order.id ? order : o);
     saveToStorage(key, updated);
  }
};
