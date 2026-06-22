export class InventoryItem {
  id: string;
  tenant_id: string;
  sku: string;
  name: string;
  category:
    | "raw_material"
    | "finished_good"
    | "consumable"
    | "asset"
    | "spare_part";
  uom: string;
  barcode: string;
  qr_code: string;
  module_tags: string[];
  active: boolean;
  status: string;
  department_id?: string;
  image_url?: string;
  images?: any[];
  selling_price?: number;
  discount_rate?: number;
  discount_type?: string;
  pricing_tiers?: any;
  metadata?: any;
  current_stock?: number;
  currentStock?: number;
  min_stock?: number;
  minStock?: number;
  is_anomaly?: boolean;
  created_at: Date;
  updated_at: Date;
}
