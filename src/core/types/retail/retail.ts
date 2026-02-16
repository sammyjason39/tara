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

export type PromotionType = "percentage" | "fixed_amount" | "bogo" | "bundle";
export type PromotionStatus = "draft" | "active" | "scheduled" | "expired";

export interface RetailPromotion extends HRAuditFields {
  id: string;
  tenantId: string;
  title: string;
  type: PromotionType;
  value: number;
  startDate: string;
  endDate: string;
  status: PromotionStatus;
  target?: "all" | "category" | "specific_items";
  targetIds?: string[];
}

export type ChannelType = "DIRECT" | "OWNED" | "MARKETPLACE";
export type ChannelStatus = "active" | "inactive" | "warning";

export interface RetailChannel extends HRAuditFields {
  id: string;
  tenantId: string;
  name: string;
  type: ChannelType;
  status: ChannelStatus;
  syncFrequency: string; // e.g. "5m", "1h"
  lastSync?: string;
}

export interface RetailShift extends HRAuditFields {
  id: string;
  tenantId: string;
  storeId: string;
  employeeId: string;
  startTime: string;
  endTime?: string;
  openingCash: number;
  closingCash?: number;
  expectedCash?: number;
  status: "open" | "closed";
  notes?: string;
}
