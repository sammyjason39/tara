import type { RetailStore, POSDevice, RetailOrder } from "@/core/types/retail/retail";
import type { Product, ProductCategory, PriceZone } from "@/core/types/retail/catalog";
import type { StockLevel, StockMovement } from "@/core/types/retail/inventory";
import type { CashierShift } from "@/core/types/retail/shifts";
import { ensureSeed, nextId, saveToStorage } from "@/core/repositories/hr/storage";
import type { IRetailRepo, ICatalogRepo, IInventoryRepo, IShiftRepo, IOrderRepo } from "./retailInterfaces";

const KEYS = {
  STORES: (tid: string) => `retail:${tid}:stores`,
  DEVICES: (tid: string) => `retail:${tid}:devices`,
  CATEGORIES: (tid: string) => `retail:${tid}:categories`,
  PRODUCTS: (tid: string) => `retail:${tid}:products`,
  STOCK: (tid: string) => `retail:${tid}:stock`,
  MOVEMENTS: (tid: string) => `retail:${tid}:movements`,
  SHIFTS: (tid: string) => `retail:${tid}:shifts`,
  ORDERS: (tid: string) => `retail:${tid}:orders`,
};

export const retailMockRepo: IRetailRepo & ICatalogRepo & IInventoryRepo & IShiftRepo & IOrderRepo = {
  // --- Retail Repo ---
  listStores(tenantId: string) {
    return ensureSeed(KEYS.STORES(tenantId), [
      { id: "store-001", tenantId, name: "Jakarta Flagship", code: "JKT-01", address: "Sudirman Ave", status: "active", warehouseId: "wh-001", managerId: "emp-001", locationId: "loc-001", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ]);
  },
  getStore(tenantId: string, storeId: string) {
    return this.listStores(tenantId).find(s => s.id === storeId);
  },
  listDevices(tenantId: string, storeId?: string) {
    const devices = ensureSeed(KEYS.DEVICES(tenantId), [
      { id: "dev-001", tenantId, storeId: "store-001", name: "Register 1", type: "pos_terminal" as const, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ]);
    return storeId ? devices.filter(d => d.storeId === storeId) : devices;
  },
  getDevice(tenantId: string, deviceId: string) {
    return this.listDevices(tenantId).find(d => d.id === deviceId);
  },

  // --- Catalog Repo ---
  listCategories(tenantId: string) {
    return ensureSeed(KEYS.CATEGORIES(tenantId), [
      { id: "cat-001", tenantId, name: "Coffee Beans", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: "cat-002", tenantId, name: "Equipment", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ]);
  },
  listProducts(tenantId: string, categoryId?: string) {
    const products = ensureSeed(KEYS.PRODUCTS(tenantId), [
      { id: "prod-001", tenantId, categoryId: "cat-001", name: "Premium Arabica 250g", sku: "CC-ARB-250", barcode: "882910", basePrice: 120000, taxRate: 0.11, unit: "pcs", status: "active" as const, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: "prod-002", tenantId, categoryId: "cat-001", name: "House Blend 500g", sku: "CC-HB-500", barcode: "882911", basePrice: 180000, taxRate: 0.11, unit: "pcs", status: "active" as const, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ]);
    return categoryId ? products.filter(p => p.categoryId === categoryId) : products;
  },
  getProduct(tenantId: string, productId: string) {
    return this.listProducts(tenantId).find(p => p.id === productId);
  },
  getPriceZone(tenantId: string, locationId: string) {
    return undefined; // Not implemented in mock
  },

  // --- Inventory Repo ---
  listStockLevels(tenantId: string, locationId: string) {
    return ensureSeed(KEYS.STOCK(tenantId), [
      { id: "stock-001", tenantId, locationId: "loc-001", productId: "prod-001", onHand: 50, reserved: 0, available: 50, minBuffer: 10, maxCapacity: 100, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: "stock-002", tenantId, locationId: "loc-001", productId: "prod-002", onHand: 30, reserved: 5, available: 25, minBuffer: 5, maxCapacity: 50, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ]);
  },
  getStockLevel(tenantId: string, locationId: string, productId: string) {
    return this.listStockLevels(tenantId, locationId).find(s => s.productId === productId);
  },
  recordMovement(tenantId: string, movement: Partial<StockMovement>) {
    const key = KEYS.MOVEMENTS(tenantId);
    const moves = ensureSeed(key, []);
    const fullMove = { ...movement, id: nextId("mv"), createdAt: new Date().toISOString() };
    saveToStorage(key, [...moves, fullMove]);
  },
  updateStock(tenantId: string, locationId: string, productId: string, delta: number) {
    const key = KEYS.STOCK(tenantId);
    const stocks = this.listStockLevels(tenantId, locationId);
    const updated = stocks.map(s => {
      if (s.productId === productId) {
        const newOnHand = s.onHand + delta;
        return { ...s, onHand: newOnHand, available: newOnHand - s.reserved, updatedAt: new Date().toISOString() };
      }
      return s;
    });
    saveToStorage(key, updated);
  },

  // --- Shift Repo ---
  getOpenShift(tenantId: string, deviceId: string) {
    return this.listShifts(tenantId).find(s => s.deviceId === deviceId && s.status === "open");
  },
  createShift(tenantId: string, shift: Partial<CashierShift>) {
    const key = KEYS.SHIFTS(tenantId);
    const shifts = ensureSeed(key, []);
    const newShift = { ...shift, id: nextId("sh"), status: "open", openedAt: new Date().toISOString(), createdAt: new Date().toISOString() } as CashierShift;
    saveToStorage(key, [...shifts, newShift]);
    return newShift;
  },
  closeShift(tenantId: string, shiftId: string, data: Partial<CashierShift>) {
    const key = KEYS.SHIFTS(tenantId);
    const shifts = this.listShifts(tenantId);
    const updated = shifts.map(s => s.id === shiftId ? { ...s, ...data, status: "closed", closedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : s);
    saveToStorage(key, updated);
  },
  listShifts(tenantId: string, locationId?: string) {
    const shifts = ensureSeed(KEYS.SHIFTS(tenantId), []);
    return locationId ? shifts.filter(s => s.locationId === locationId) : shifts;
  },

  // --- Order Repo ---
  createOrder(tenantId: string, order: RetailOrder) {
    const key = KEYS.ORDERS(tenantId);
    const orders = ensureSeed(key, []);
    saveToStorage(key, [...orders, order]);
    // Also update inventory
    order.items.forEach(item => {
      this.updateStock(tenantId, order.storeId, item.itemId, -item.quantity);
      this.recordMovement(tenantId, {
        tenantId, productId: item.itemId, fromLocationId: order.storeId, toLocationId: "customer",
        quantity: item.quantity, type: "sale", referenceId: order.id, performedBy: order.cashierId
      });
    });
  },
  getOrder(tenantId: string, orderId: string) {
    return this.listOrders(tenantId, {}).find(o => o.id === orderId);
  },
  listOrders(tenantId: string, filter: { storeId?: string, cashierId?: string }) {
    let orders = ensureSeed(KEYS.ORDERS(tenantId), []);
    if (filter.storeId) orders = orders.filter(o => o.storeId === filter.storeId);
    if (filter.cashierId) orders = orders.filter(o => o.cashierId === filter.cashierId);
    return orders;
  }
};
