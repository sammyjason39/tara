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
  qrCode: string;
  moduleTags: string[];
  active: boolean;
  departmentId?: string;
  image_url?: string;
  images?: any[];
  selling_price?: number;
  discount_rate?: number;
  discount_type?: string;
  pricing_tiers?: any;
  metadata?: any;
  created_at: Date;
  updated_at: Date;

}
