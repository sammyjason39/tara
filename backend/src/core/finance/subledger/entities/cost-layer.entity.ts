import { Prisma } from '@prisma/client';

export class CostLayer {
  id: string;
  tenant_id: string;
  skuId: string;
  location_id: string;
  qty: Prisma.Decimal;
  remainingQty: Prisma.Decimal;
  unitCost: Prisma.Decimal;
  currency: string;
  method: 'FIFO' | 'LIFO' | 'AVERAGE';
  sourceEventId: string;
  created_at: Date;
}
