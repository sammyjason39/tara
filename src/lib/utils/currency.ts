export const formatCurrency = (
  amount: number,
  currency: string = "IDR",
): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
};

export const parseCurrency = (value: string): number => {
  const numeric = value.replace(/[^0-9.-]+/g, "");
  return parseFloat(numeric) || 0;
};

export const convertCurrency = (amount: number, rate: number): number => {
  return Math.round(amount * rate);
};
