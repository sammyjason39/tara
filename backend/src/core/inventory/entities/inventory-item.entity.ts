export class InventoryItem {
  id: string;
  tenantId: string;
  sku: string;
  name: string;
  category: 'raw_material' | 'finished_good' | 'consumable' | 'asset' | 'spare_part';
  uom: string;
  barcode: string;
  qrCode: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

