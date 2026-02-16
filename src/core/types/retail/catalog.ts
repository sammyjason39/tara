import type { HRAuditFields } from "@/core/types/hr/base";

export interface ProductCategory extends HRAuditFields {
  id: string;
  tenantId: string;
  name: string;
  parentId?: string;
  icon?: string;
}

export interface Product extends HRAuditFields {
  id: string;
  tenantId: string;
  categoryId: string;
  name: string;
  sku: string;
  barcode: string;
  description?: string;
  unit: string; // e.g., "pcs", "kg"
  basePrice: number;
  taxRate: number; // e.g., 0.11 for 11%
  imageUrl?: string;
  status: "active" | "inactive" | "discontinued";
}

export interface PriceZone extends HRAuditFields {
  id: string;
  tenantId: string;
  name: string;
  locationIds: string[]; // Locations where this pricing applies
  adjustments: {
    productId: string;
    markup?: number;
    discount?: number;
    finalPrice: number;
  }[];
}
