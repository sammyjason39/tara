export class PriceVersion {
  id: string;
  tenant_id: string;
  skuId: string;
  ruleId: string;
  baseCost: number;
  computedPrice: number;
  currency: string;
  effectiveFrom: Date;
  isCurrent: boolean;
  created_at: Date;
}
