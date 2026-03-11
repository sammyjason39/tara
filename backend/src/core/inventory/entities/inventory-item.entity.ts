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
  createdAt: Date;
  updatedAt: Date;
}
