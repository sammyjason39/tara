/** Generates a category-prefixed SKU for new items, mimicking DB-style continuation.
 *  Format: CAT-YYYYMMDD-XXXX  e.g. FOOD-20260302-4821 */
export const generateSkuFromCategory = (categoryName: string): string => {
  const prefix =
    categoryName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6) || "ITEM";
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const seq = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${datePart}-${seq}`;
};

export const generateBarcode = (sku: string): string => {
  return sku.replace(/[^A-Z0-9]/g, "") + Date.now().toString().slice(-4);
};
