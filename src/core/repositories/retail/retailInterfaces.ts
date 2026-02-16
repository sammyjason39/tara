import type { RetailStore, POSDevice, RetailOrder } from "@/core/types/retail/retail";
import type { Product, ProductCategory, PriceZone } from "@/core/types/retail/catalog";
import type { StockLevel, StockMovement } from "@/core/types/retail/inventory";
import type { CashierShift, ShiftReconciliation } from "@/core/types/retail/shifts";

export interface IRetailRepo {
  listStores(tenantId: string): RetailStore[];
  getStore(tenantId: string, storeId: string): RetailStore | undefined;
  listDevices(tenantId: string, storeId?: string): POSDevice[];
  getDevice(tenantId: string, deviceId: string): POSDevice | undefined;
}

export interface ICatalogRepo {
  listCategories(tenantId: string): ProductCategory[];
  listProducts(tenantId: string, categoryId?: string): Product[];
  getProduct(tenantId: string, productId: string): Product | undefined;
  getPriceZone(tenantId: string, locationId: string): PriceZone | undefined;
}

export interface IInventoryRepo {
  getStockLevel(tenantId: string, locationId: string, productId: string): StockLevel | undefined;
  listStockLevels(tenantId: string, locationId: string): StockLevel[];
  recordMovement(tenantId: string, movement: Partial<StockMovement>): void;
  updateStock(tenantId: string, locationId: string, productId: string, delta: number): void;
}

export interface IShiftRepo {
  getOpenShift(tenantId: string, deviceId: string): CashierShift | undefined;
  createShift(tenantId: string, shift: Partial<CashierShift>): CashierShift;
  closeShift(tenantId: string, shiftId: string, data: Partial<CashierShift>): void;
  listShifts(tenantId: string, locationId?: string): CashierShift[];
}

export interface IOrderRepo {
  createOrder(tenantId: string, order: RetailOrder): void;
  getOrder(tenantId: string, orderId: string): RetailOrder | undefined;
  listOrders(tenantId: string, filter: { storeId?: string, cashierId?: string }): RetailOrder[];
}
