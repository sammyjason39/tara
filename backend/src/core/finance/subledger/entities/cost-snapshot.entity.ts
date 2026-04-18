import { Prisma } from '@prisma/client';

export class CostSnapshot {
  id: string;
  tenant_id: string;
  skuId: string;
  location_id: string;
  totalQty: Prisma.Decimal;
  totalValuation: Prisma.Decimal;
  avgUnitCost: Prisma.Decimal;
  currency: string;
  snapshotDate: Date;
  layersUsed?: { layerId: string; qty: Prisma.Decimal }[];
  
  // Enhanced Traceability
  inventoryTransactionIds?: string[];
  subledgerEntryIds?: string[];
  
}
