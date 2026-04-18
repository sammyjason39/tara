import { InventorySubledgerEntry } from './entities/inventory-subledger-entry.entity';

export abstract class IInventorySubledgerService {
  abstract recordEntry(tenant_id: string, data: Partial<InventorySubledgerEntry>): Promise<InventorySubledgerEntry>;
  abstract getSkuValuation(tenant_id: string, skuId: string, location_id: string): Promise<{ unitCost: number; currency: string; method: string }>;
}
