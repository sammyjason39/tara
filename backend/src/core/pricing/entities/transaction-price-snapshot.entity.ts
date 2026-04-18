export class TransactionPriceSnapshot {
  id: string;
  tenant_id: string;
  transaction_id: string; // ID from sales/order module
  price: number;
  baseCostAtTime: number;
  ruleId: string;
  priceVersionId: string;
  margin: number;
  currency: string;
  created_at: Date;
}
