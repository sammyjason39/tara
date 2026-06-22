/**
 * Property-Based Test — Stock Opname Parity
 * Spec: .kiro/specs/stock-opname-parity
 *
 * Property 3: Quick Register creates items with anomaly flag
 * **Validates: Requirements 1, 1.1, 1.2, 1.3, 1.4, 1.5**
 *
 * This test uses fast-check (≥100 iterations) to verify that when
 * handleQuickRegisterIncomplete() creates items from unresolved barcodes,
 * the resulting items always have:
 *   - is_anomaly: true
 *   - category mapped to "Anomaly"
 *   - status: "incomplete"
 *
 * TEST METHODOLOGY:
 *   - Generate arbitrary lists of barcodes (including edge cases: single, many)
 *   - Validate the payload construction logic (buildQuickRegisterPayload)
 *   - Validate the response resolution logic (resolveQuickRegisterResponse)
 *   - Verify invariants hold across all generated inputs
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  ANOMALY_CATEGORY_NAME,
  buildQuickRegisterPayload,
  resolveQuickRegisterResponse,
  QuickRegisterPayloadItem,
  QuickRegisterResolvedItem,
} from "@/lib/quick-register";

// --- Generators ------------------------------------------------------------

/**
 * Generates a non-empty list of unique barcodes (alphanumeric, 5-30 chars).
 * Covers edge case of single barcode via minLength: 1.
 */
const barcodesArb = fc.array(
  fc.stringMatching(/^[A-Za-z0-9]{5,30}$/),
  { minLength: 1, maxLength: 50 }
).filter((arr) => {
  // Ensure all barcodes are unique
  const unique = new Set(arr);
  return unique.size === arr.length && arr.every((b) => b.trim().length > 0);
});

/**
 * Generates mock backend response data (array of records with varying fields).
 */
function mockResponseDataArb(count: number) {
  return fc.array(
    fc.record({
      id: fc.string({ minLength: 10, maxLength: 36 }),
      sku: fc.stringMatching(/^[A-Za-z0-9]{5,20}$/),
      name: fc.string({ minLength: 1, maxLength: 100 }),
      category_id: fc.string({ minLength: 10, maxLength: 36 }),
      is_anomaly: fc.constant(true),
      status: fc.constant("incomplete" as const),
    }),
    { minLength: count, maxLength: count }
  );
}

// --- Property Tests --------------------------------------------------------

describe("Property 3: Quick Register creates items with anomaly flag", () => {
  /**
   * **Validates: Requirements 1, 1.1, 1.2, 1.3, 1.4, 1.5**
   *
   * Core invariant: For any non-empty list of barcodes, buildQuickRegisterPayload
   * produces items where EVERY item has:
   *   - is_anomaly === true
   *   - category === "Anomaly"
   *   - status === "incomplete"
   */
  it("buildQuickRegisterPayload: all items have is_anomaly: true, category 'Anomaly', status 'incomplete'", () => {
    fc.assert(
      fc.property(barcodesArb, (barcodes) => {
        const payload = buildQuickRegisterPayload(barcodes);

        // Same number of items as barcodes
        expect(payload.length).toBe(barcodes.length);

        payload.forEach((item: QuickRegisterPayloadItem, idx: number) => {
          const barcode = barcodes[idx];

          // Requirement 1.1: Created without requiring full details
          expect(item.sku).toBe(barcode);
          expect(item.barcode).toBe(barcode);
          expect(item.name).toBe(`Unregistered Item - ${barcode}`);

          // Requirement 1.2: Anomaly category assigned
          expect(item.category).toBe(ANOMALY_CATEGORY_NAME);

          // Property 3 invariant: is_anomaly flag is true
          expect(item.is_anomaly).toBe(true);

          // Requirement 1.1 / status: status is "incomplete"
          expect(item.status).toBe("incomplete");

          // Additional fields are correctly set
          expect(item.base_price).toBe(0);
          expect(item.uom).toBe("pcs");
          expect(item.active).toBe(false);
          expect(item.type).toBe("ITEM");
        });
      }),
      { numRuns: 150 }
    );
  });

  /**
   * **Validates: Requirements 1.4, 1.5**
   *
   * Invariant: resolveQuickRegisterResponse always produces items
   * with barcode, is_anomaly: true, and status: "incomplete",
   * regardless of what the backend returns.
   */
  it("resolveQuickRegisterResponse: resolved items always have barcode, is_anomaly: true, status 'incomplete'", () => {
    fc.assert(
      fc.property(
        barcodesArb.chain((barcodes) =>
          mockResponseDataArb(barcodes.length).map((responseData) => ({
            barcodes,
            responseData,
          }))
        ),
        ({ barcodes, responseData }) => {
          const resolved = resolveQuickRegisterResponse(barcodes, responseData);

          expect(resolved.length).toBe(barcodes.length);

          resolved.forEach((item: QuickRegisterResolvedItem, idx: number) => {
            // Requirement 1.4: Barcode always present for reconciliation
            expect(item.barcode).toBe(barcodes[idx]);

            // Property 3 invariant: is_anomaly always true
            expect(item.is_anomaly).toBe(true);

            // Requirement 1.1: status always "incomplete"
            expect(item.status).toBe("incomplete");
          });
        }
      ),
      { numRuns: 150 }
    );
  });

  /**
   * **Validates: Requirements 1.4**
   *
   * Edge case: When backend returns empty/partial data, resolved items
   * still have barcode and anomaly flags.
   */
  it("resolveQuickRegisterResponse: handles empty backend response gracefully", () => {
    fc.assert(
      fc.property(barcodesArb, (barcodes) => {
        // Simulate backend returning empty array
        const resolved = resolveQuickRegisterResponse(barcodes, []);

        expect(resolved.length).toBe(barcodes.length);

        resolved.forEach((item: QuickRegisterResolvedItem, idx: number) => {
          expect(item.barcode).toBe(barcodes[idx]);
          expect(item.is_anomaly).toBe(true);
          expect(item.status).toBe("incomplete");
        });
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Edge case: Single barcode
   */
  it("buildQuickRegisterPayload: single barcode produces exactly one anomaly item", () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[A-Za-z0-9]{5,30}$/),
        (barcode) => {
          const payload = buildQuickRegisterPayload([barcode]);

          expect(payload.length).toBe(1);
          expect(payload[0].sku).toBe(barcode);
          expect(payload[0].barcode).toBe(barcode);
          expect(payload[0].category).toBe(ANOMALY_CATEGORY_NAME);
          expect(payload[0].is_anomaly).toBe(true);
          expect(payload[0].status).toBe("incomplete");
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Edge case: Empty barcodes list produces empty payload
   */
  it("buildQuickRegisterPayload: empty barcodes list produces empty payload", () => {
    const payload = buildQuickRegisterPayload([]);
    expect(payload).toEqual([]);
    expect(payload.length).toBe(0);
  });

  /**
   * Property: Payload preserves barcode order (bijection between input barcodes
   * and output items).
   */
  it("buildQuickRegisterPayload: preserves barcode order in output", () => {
    fc.assert(
      fc.property(barcodesArb, (barcodes) => {
        const payload = buildQuickRegisterPayload(barcodes);

        // Order preserved: payload[i].barcode === barcodes[i]
        barcodes.forEach((barcode, idx) => {
          expect(payload[idx].barcode).toBe(barcode);
          expect(payload[idx].sku).toBe(barcode);
        });
      }),
      { numRuns: 100 }
    );
  });
});
