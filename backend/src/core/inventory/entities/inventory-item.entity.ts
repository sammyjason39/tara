export class InventoryItem {
  id: string;
  tenantId: string;
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
  imageUrl?: string;
  images?: any[];
  sellingPrice?: number;
  discountRate?: number;
  discountType?: string;
  pricingTiers?: any;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;

}
