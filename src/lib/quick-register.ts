/**
 * Quick Register Logic for Stock Opname Parity
 *
 * Pure utility functions that encapsulate the Quick Register payload
 * construction and response handling. Items registered via Quick Register
 * are created as incomplete stubs in the "Anomaly" category.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

export const ANOMALY_CATEGORY_NAME = "Anomaly";

/**
 * Shape of an item payload sent to the backend for Quick Register.
 */
export interface QuickRegisterPayloadItem {
  sku: string;
  name: string;
  category: string;
  barcode: string;
  base_price: number;
  uom: string;
  description: string;
  active: boolean;
  type: string;
  status: "incomplete";
  is_anomaly: true;
}

/**
 * Shape of a resolved item returned after Quick Register succeeds.
 */
export interface QuickRegisterResolvedItem {
  barcode: string;
  is_anomaly: true;
  status: "incomplete";
  [key: string]: unknown;
}

/**
 * Builds the batch payload for Quick Register.
 *
 * Given a list of barcodes, returns payload items that will be sent to the
 * backend. Each item has:
 *   - is_anomaly: true
 *   - category: "Anomaly"
 *   - status: "incomplete"
 *
 * Requirement 1.1: Items created without requiring full details
 * Requirement 1.2: Anomaly category and flag assigned
 */
export function buildQuickRegisterPayload(
  barcodes: string[]
): QuickRegisterPayloadItem[] {
  return barcodes.map((barcode) => ({
    sku: barcode,
    name: `Unregistered Item - ${barcode}`,
    category: ANOMALY_CATEGORY_NAME,
    barcode,
    base_price: 0,
    uom: "pcs",
    description: "Auto-created during stock opname. Pending completion.",
    active: false,
    type: "ITEM",
    status: "incomplete" as const,
    is_anomaly: true as const,
  }));
}

/**
 * Resolves backend response into items with guaranteed barcode field.
 *
 * Requirement 1.4: Barcodes removed from unresolved list on success
 * (each resolved item carries its barcode so the parent can reconcile).
 */
export function resolveQuickRegisterResponse(
  barcodes: string[],
  responseData: Record<string, unknown>[]
): QuickRegisterResolvedItem[] {
  return barcodes.map((barcode, i) => ({
    ...(responseData[i] || {}),
    barcode,
    is_anomaly: true as const,
    status: "incomplete" as const,
  }));
}
