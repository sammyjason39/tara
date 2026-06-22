import { formatCurrency as formatCurrencyCanonical } from "@/lib/format";

// Thin wrapper delegating to the canonical formatter. Preserves the legacy
// IDR / id-ID defaults so existing imports render unchanged.
// Prefer importing from `@/lib/format` and passing currency/locale explicitly.
export const formatCurrency = (
  amount: number,
  currency: string = "IDR",
): string => formatCurrencyCanonical(amount, currency, "id-ID");

export const parseCurrency = (value: string): number => {
  const numeric = value.replace(/[^0-9.-]+/g, "");
  return parseFloat(numeric) || 0;
};

export const convertCurrency = (amount: number, rate: number): number => {
  return Math.round(amount * rate);
};
