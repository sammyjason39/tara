export class ExchangeRate {
  id: string;
  tenant_id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  effectiveDate: Date;
  created_at: Date;
  updated_at: Date;
}
