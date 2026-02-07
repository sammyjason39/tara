export const isRequired = (value: any): boolean => {
  return value !== null && value !== undefined && value !== "";
};

export const isPositiveNumber = (value: number): boolean => {
  return typeof value === "number" && value > 0;
};

export const validateCurrency = (value: string): boolean => {
  return /^[0-9,.]+$/.test(value);
};

export const validateDate = (value: string | Date): boolean => {
  return !isNaN(new Date(value).getTime());
};
