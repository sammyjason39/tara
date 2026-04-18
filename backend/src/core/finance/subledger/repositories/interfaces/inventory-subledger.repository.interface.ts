import { Prisma } from '@prisma/client';
import { InventorySubledgerEntry } from '../../entities/inventory-subledger-entry.entity';
import { CostLayer } from '../../entities/cost-layer.entity';
import { CostSnapshot } from '../../entities/cost-snapshot.entity';

export interface IInventorySubledgerRepository {
  // Entry Management
  createEntry(tenant_id: string, data: Partial<InventorySubledgerEntry>, tx?: Prisma.TransactionClient): Promise<InventorySubledgerEntry>;
  getEntryById(tenant_id: string, id: string, tx?: Prisma.TransactionClient): Promise<InventorySubledgerEntry>;
  findEntryBySourceEvent(tenant_id: string, sourceEventId: string, entryType: string, tx?: Prisma.TransactionClient): Promise<InventorySubledgerEntry | null>;
  updateEntryStatus(tenant_id: string, id: string, status: string, metadata?: any, tx?: Prisma.TransactionClient): Promise<InventorySubledgerEntry>;
  lockEntry(tenant_id: string, id: string, tx?: Prisma.TransactionClient): Promise<InventorySubledgerEntry>;

  // Cost Layer Management
  getCostLayers(tenant_id: string, skuId: string, location_id: string, tx?: Prisma.TransactionClient): Promise<CostLayer[]>;
  createCostLayer(tenant_id: string, data: Partial<CostLayer>, tx?: Prisma.TransactionClient): Promise<CostLayer>;
  updateCostLayer(tenant_id: string, id: string, data: Partial<CostLayer>, tx?: Prisma.TransactionClient): Promise<CostLayer>;
  createCostSnapshot(tenant_id: string, data: Partial<CostSnapshot>, tx?: Prisma.TransactionClient): Promise<CostSnapshot>;
  
  // Valuation
  getCurrentValuation(tenant_id: string, skuId: string, location_id: string, tx?: Prisma.TransactionClient): Promise<{ unitCost: Prisma.Decimal; currency: string; method: string }>;
}
