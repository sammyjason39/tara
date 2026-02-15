import type { HRAuditFields } from "@/core/types/hr/base";

export type RetailStoreStatus = "active" | "inactive" | "maintenance";

export interface RetailStore extends HRAuditFields {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  address: string;
  status: RetailStoreStatus;
  warehouseId: string; // Linked Inventory Warehouse
  managerId: string; // Store Manager (Employee ID)
  locationId: string; // Linked HR Location for Geofencing
}

export type POSDeviceType = "pos_terminal" | "kiosk" | "mobile_pos" | "scanner" | "refund_desk";

export interface POSDevice extends HRAuditFields {
  id: string;
  tenantId: string;
  storeId: string;
  name: string;
  type: POSDeviceType;
  isActive: boolean;
  macAddress?: string; // For trusted device enforcement
}

export type OrderStatus = "draft" | "pending_payment" | "paid" | "fulfilled" | "cancelled" | "refunded";

export interface RetailOrderItem {
  itemId: string; // Inventory Item ID
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discount?: number;
}

export interface RetailOrder extends HRAuditFields {
  id: string;
  tenantId: string;
  storeId: string;
  deviceId: string;
  cashierId: string; // Employee ID
  customerName?: string;
  status: OrderStatus;
  items: RetailOrderItem[];
  subtotal: number;
  tax: number;
  totalAmount: number;
  paymentMethod?: "card" | "cash" | "qr" | "store_credit";
  paymentReference?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RetailLicense {
  tenantId: string;
  status: "active" | "expired" | "frozen";
  maxStores: number;
  expiryDate: string;
}
