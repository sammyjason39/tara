/**
 * Property-Based Tests for Quotation and POS Line Item Arithmetic.
 *
 * Uses fast-check (fc.assert / fc.property) with vitest.
 * Each property runs a minimum of 100 iterations.
 *
 * Feature: full-module-production-audit, Property 3: Quotation and POS Line Item Arithmetic
 */

import { describe, test, expect } from "vitest";
import * as fc from "fast-check";
import {
  calculateLineTotal,
  calculateGrandTotal,
  QuotationLineItem,
} from "../shared/business-rules";

// ─── Property 3: Quotation and POS Line Item Arithmetic ─────────────────────
// Feature: full-module-production-audit, Property 3: Quotation and POS Line Item Arithmetic

/**
 * Validates: Requirements 4.4, 8.2
 */

// ─── Arbitraries ────────────────────────────────────────────────────────────────

/** Generates a valid quantity between 1 and 1000 */
const arbQuantity = fc.integer({ min: 1, max: 1000 });

/** Generates a valid unit price between 0.01 and 100000 (2 decimal places) */
const arbUnitPrice = fc.double({ min: 0.01, max: 100000, noNaN: true, noDefaultInfinity: true })
  .map((v) => Math.round(v * 100) / 100);

/** Generates a valid discount percentage between 0 and 100 */
const arbDiscountPercent = fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true })
  .map((v) => Math.round(v * 100) / 100);

/** Generates a line item with percentage discount */
const arbPercentageLineItem: fc.Arbitrary<QuotationLineItem> = fc.tuple(
  arbQuantity,
  arbUnitPrice,
  arbDiscountPercent
).map(([quantity, unitPrice, discountValue]) => ({
  itemId: "item-1",
  quantity,
  unitPrice,
  discountType: "percentage" as const,
  discountValue,
}));

/** Generates a line item with fixed discount (0 to subtotal) */
const arbFixedLineItem: fc.Arbitrary<QuotationLineItem> = fc.tuple(
  arbQuantity,
  arbUnitPrice,
  fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true })
).map(([quantity, unitPrice, fraction]) => ({
  itemId: "item-1",
  quantity,
  unitPrice,
  discountType: "fixed" as const,
  // Fixed discount is between 0 and the subtotal (qty * unitPrice)
  discountValue: Math.round(fraction * quantity * unitPrice * 100) / 100,
}));

/** Generates any valid line item (percentage or fixed) */
const arbLineItem: fc.Arbitrary<QuotationLineItem> = fc.oneof(
  arbPercentageLineItem,
  arbFixedLineItem
);

// ─── Tests ──────────────────────────────────────────────────────────────────────

describe("Property 3: Quotation and POS Line Item Arithmetic", () => {
  describe("Percentage discount line total calculation", () => {
    test("lineTotal = qty × unitPrice × (1 - discountPercent/100) for percentage discounts", () => {
      fc.assert(
        fc.property(
          arbPercentageLineItem,
          (item) => {
            const result = calculateLineTotal(item);
            const expected = item.quantity * item.unitPrice * (1 - item.discountValue / 100);

            // Use approximate comparison due to floating-point arithmetic
            expect(result).toBeCloseTo(expected, 8);
          }
        ),
        { numRuns: 100 }
      );
    });

    test("percentage discount of 0% gives full subtotal", () => {
      fc.assert(
        fc.property(
          arbQuantity,
          arbUnitPrice,
          (quantity, unitPrice) => {
            const item: QuotationLineItem = {
              itemId: "item-1",
              quantity,
              unitPrice,
              discountType: "percentage",
              discountValue: 0,
            };
            const result = calculateLineTotal(item);
            const expected = quantity * unitPrice;

            expect(result).toBeCloseTo(expected, 8);
          }
        ),
        { numRuns: 100 }
      );
    });

    test("percentage discount of 100% gives zero", () => {
      fc.assert(
        fc.property(
          arbQuantity,
          arbUnitPrice,
          (quantity, unitPrice) => {
            const item: QuotationLineItem = {
              itemId: "item-1",
              quantity,
              unitPrice,
              discountType: "percentage",
              discountValue: 100,
            };
            const result = calculateLineTotal(item);

            expect(result).toBeCloseTo(0, 8);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Fixed discount line total calculation", () => {
    test("lineTotal = qty × unitPrice - fixedDiscount for fixed discounts", () => {
      fc.assert(
        fc.property(
          arbFixedLineItem,
          (item) => {
            const result = calculateLineTotal(item);
            const expected = item.quantity * item.unitPrice - item.discountValue;

            // Use approximate comparison due to floating-point arithmetic
            expect(result).toBeCloseTo(expected, 8);
          }
        ),
        { numRuns: 100 }
      );
    });

    test("fixed discount of 0 gives full subtotal", () => {
      fc.assert(
        fc.property(
          arbQuantity,
          arbUnitPrice,
          (quantity, unitPrice) => {
            const item: QuotationLineItem = {
              itemId: "item-1",
              quantity,
              unitPrice,
              discountType: "fixed",
              discountValue: 0,
            };
            const result = calculateLineTotal(item);
            const expected = quantity * unitPrice;

            expect(result).toBeCloseTo(expected, 8);
          }
        ),
        { numRuns: 100 }
      );
    });

    test("fixed discount equal to subtotal gives zero", () => {
      fc.assert(
        fc.property(
          arbQuantity,
          arbUnitPrice,
          (quantity, unitPrice) => {
            const subtotal = quantity * unitPrice;
            const item: QuotationLineItem = {
              itemId: "item-1",
              quantity,
              unitPrice,
              discountType: "fixed",
              discountValue: subtotal,
            };
            const result = calculateLineTotal(item);

            expect(result).toBeCloseTo(0, 8);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Grand total calculation", () => {
    test("grandTotal = sum of all lineTotals", () => {
      fc.assert(
        fc.property(
          fc.array(arbLineItem, { minLength: 1, maxLength: 20 }),
          (items) => {
            const grandTotal = calculateGrandTotal(items);
            const expectedSum = items.reduce(
              (sum, item) => sum + calculateLineTotal(item),
              0
            );

            expect(grandTotal).toBeCloseTo(expectedSum, 8);
          }
        ),
        { numRuns: 100 }
      );
    });

    test("grandTotal of a single item equals its lineTotal", () => {
      fc.assert(
        fc.property(
          arbLineItem,
          (item) => {
            const grandTotal = calculateGrandTotal([item]);
            const lineTotal = calculateLineTotal(item);

            expect(grandTotal).toBeCloseTo(lineTotal, 8);
          }
        ),
        { numRuns: 100 }
      );
    });

    test("grandTotal of empty array is 0", () => {
      expect(calculateGrandTotal([])).toBe(0);
    });

    test("grandTotal with mixed discount types equals sum of individual lineTotals", () => {
      fc.assert(
        fc.property(
          fc.array(arbPercentageLineItem, { minLength: 1, maxLength: 10 }),
          fc.array(arbFixedLineItem, { minLength: 1, maxLength: 10 }),
          (percentageItems, fixedItems) => {
            const allItems = [...percentageItems, ...fixedItems];
            const grandTotal = calculateGrandTotal(allItems);
            const expectedSum = allItems.reduce(
              (sum, item) => sum + calculateLineTotal(item),
              0
            );

            expect(grandTotal).toBeCloseTo(expectedSum, 8);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
