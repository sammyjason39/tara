export type MoneySourceType = "BANK" | "CASH_REGISTER" | "E_WALLET" | "GATEWAY_SETTLEMENT" | "PETTY_CASH";

export type CurrencyCode = "IDR" | "USD";

export interface MoneySource {
  id: string;
  tenantId: string;
  name: string;
  type: MoneySourceType;
  currency: CurrencyCode;
  balance: number;
  pendingSettlement?: number;
  provider?: string;
  lastUpdated: string;
}
