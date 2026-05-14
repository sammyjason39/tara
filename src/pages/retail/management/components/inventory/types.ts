export type InventoryItemView = {
  id: string;
  sku: string;
  name: string;
  category: string;
  categoryId: string;
  onHand: number;
  reserved: number;
  available: number;
  minBuffer: number;
  status: "ok" | "low" | "critical" | "overstock" | "pending";
  barcode?: string;
  price?: number;
  unit?: string;
  type?: string;
  description?: string;
  imageUrl?: string;
};

export type InventoryFilters = {
  search: string;
  status: string;
  category: string;
  type: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy: "name-asc" | "name-desc" | "price-asc" | "price-desc" | "quantity-asc" | "quantity-desc";
};
