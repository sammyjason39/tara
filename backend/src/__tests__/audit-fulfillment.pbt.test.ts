/**
 * Property-Based Tests for Order Fulfillment Atomicity.
 *
 * Uses fast-check (fc.assert / fc.property) with vitest.
 * Each property runs a minimum of 100 iterations.
 *
 * Feature: full-module-production-audit, Property 6: Order Fulfillment Atomicity
 *
 * Validates: Requirements 17.3, 17.4
 */

import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { fulfillOrder, FulfillmentLineItem } from '../shared/business-rules/index';

// ─── Arbitraries ────────────────────────────────────────────────────────────────

/**
 * Generate a unique item ID.
 * Filters out JavaScript prototype property names to avoid object key issues.
 */
const RESERVED_KEYS = new Set(['__proto__', 'constructor', 'toString', 'valueOf', 'hasOwnProperty']);

const itemIdArb = fc.stringMatching(/^[a-zA-Z0-9_-]{1,10}$/)
  .filter((s) => s.length > 0 && !RESERVED_KEYS.has(s));

/**
 * Generate a line item with a positive quantity (1-1000).
 */
const lineItemArb = (itemId: string): fc.Arbitrary<FulfillmentLineItem> =>
  fc.integer({ min: 1, max: 1000 }).map((quantity) => ({
    itemId,
    quantity,
  }));

/**
 * Generate an order (1-20 line items) with unique item IDs and a stock map
 * where ALL items have sufficient stock (stock >= quantity for every line item).
 */
const sufficientStockOrderArb = fc
  .integer({ min: 1, max: 20 })
  .chain((orderSize) =>
    fc
      .uniqueArray(itemIdArb, { minLength: orderSize, maxLength: orderSize })
      .chain((itemIds) =>
        fc.tuple(
          ...itemIds.map((id) =>
            fc.integer({ min: 1, max: 1000 }).chain((quantity) =>
              fc.integer({ min: quantity, max: quantity + 5000 }).map((stock) => ({
                itemId: id,
                quantity,
                stock,
              }))
            )
          )
        )
      )
  )
  .map((entries) => {
    const lineItems: FulfillmentLineItem[] = entries.map((e) => ({
      itemId: e.itemId,
      quantity: e.quantity,
    }));
    const stockMap: Record<string, number> = {};
    for (const e of entries) {
      stockMap[e.itemId] = e.stock;
    }
    return { lineItems, stockMap };
  });

/**
 * Generate an order (2-20 line items) with unique item IDs where at least one
 * item has INSUFFICIENT stock (stock < quantity), while others may or may not.
 */
const insufficientStockOrderArb = fc
  .integer({ min: 2, max: 20 })
  .chain((orderSize) =>
    fc
      .uniqueArray(itemIdArb, { minLength: orderSize, maxLength: orderSize })
      .chain((itemIds) => {
        // Pick a random index to be the insufficient item
        return fc.integer({ min: 0, max: itemIds.length - 1 }).chain((insufficientIdx) =>
          fc.tuple(
            ...itemIds.map((id, idx) =>
              fc.integer({ min: 1, max: 1000 }).chain((quantity) => {
                if (idx === insufficientIdx) {
                  // Insufficient: stock < quantity
                  return fc
                    .integer({ min: 0, max: Math.max(0, quantity - 1) })
                    .map((stock) => ({
                      itemId: id,
                      quantity,
                      stock,
                    }));
                } else {
                  // Others: may have sufficient stock
                  return fc
                    .integer({ min: quantity, max: quantity + 5000 })
                    .map((stock) => ({
                      itemId: id,
                      quantity,
                      stock,
                    }));
                }
              })
            )
          )
        );
      })
  )
  .map((entries) => {
    const lineItems: FulfillmentLineItem[] = entries.map((e) => ({
      itemId: e.itemId,
      quantity: e.quantity,
    }));
    const stockMap: Record<string, number> = {};
    for (const e of entries) {
      stockMap[e.itemId] = e.stock;
    }
    return { lineItems, stockMap };
  });

// ─── Property 6: Order Fulfillment Atomicity ────────────────────────────────────
// Feature: full-module-production-audit, Property 6: Order Fulfillment Atomicity

describe('Property 6: Order Fulfillment Atomicity', () => {
  /**
   * Validates: Requirements 17.3, 17.4
   */

  // ── 6a: All sufficient stock → all deducted simultaneously ─────────────────
  test(
    'if ALL line items have sufficient stock, deduct all simultaneously',
    () => {
      // **Validates: Requirements 17.3**
      fc.assert(
        fc.property(sufficientStockOrderArb, ({ lineItems, stockMap }) => {
          const originalStock = { ...stockMap };
          const result = fulfillOrder(lineItems, stockMap);

          // Must succeed
          expect(result.success).toBe(true);
          expect(result.updatedStock).toBeDefined();

          // All items should be deducted by their ordered quantity
          for (const item of lineItems) {
            const expected = originalStock[item.itemId] - item.quantity;
            expect(result.updatedStock![item.itemId]).toBe(expected);
          }

          // No balance should be negative
          for (const itemId of Object.keys(result.updatedStock!)) {
            expect(result.updatedStock![itemId]).toBeGreaterThanOrEqual(0);
          }

          // Original stock map must NOT be mutated
          expect(stockMap).toEqual(originalStock);
        }),
        { numRuns: 100 },
      );
    },
  );

  // ── 6b: Any insufficient stock → reject entire fulfillment, balances unchanged
  test(
    'if ANY line item has insufficient stock, reject entire fulfillment and leave ALL balances unchanged',
    () => {
      // **Validates: Requirements 17.4**
      fc.assert(
        fc.property(insufficientStockOrderArb, ({ lineItems, stockMap }) => {
          const originalStock = { ...stockMap };
          const result = fulfillOrder(lineItems, stockMap);

          // Must be rejected
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.insufficientItems).toBeDefined();
          expect(result.insufficientItems!.length).toBeGreaterThan(0);

          // Updated stock should NOT be returned (no partial deduction)
          expect(result.updatedStock).toBeUndefined();

          // Original stock map must NOT be mutated
          expect(stockMap).toEqual(originalStock);
        }),
        { numRuns: 100 },
      );
    },
  );

  // ── 6c: Mixed scenarios — varying order sizes ──────────────────────────────
  test(
    'atomicity holds across varying order sizes (1-20 items) and stock levels',
    () => {
      // **Validates: Requirements 17.3, 17.4**
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }),
          fc.boolean(),
          (orderSize, allSufficient) => {
            // Generate items with unique IDs
            const lineItems: FulfillmentLineItem[] = [];
            const stockMap: Record<string, number> = {};

            for (let i = 0; i < orderSize; i++) {
              const itemId = `item-${i}`;
              const quantity = Math.floor(Math.random() * 100) + 1;
              lineItems.push({ itemId, quantity });

              if (allSufficient) {
                // All items get enough stock
                stockMap[itemId] = quantity + Math.floor(Math.random() * 500);
              } else if (i === 0) {
                // First item gets insufficient stock
                stockMap[itemId] = Math.max(0, quantity - 1 - Math.floor(Math.random() * 10));
              } else {
                // Other items get enough stock
                stockMap[itemId] = quantity + Math.floor(Math.random() * 500);
              }
            }

            const originalStock = { ...stockMap };
            const result = fulfillOrder(lineItems, stockMap);

            if (allSufficient) {
              expect(result.success).toBe(true);
              expect(result.updatedStock).toBeDefined();
              // Each deducted correctly
              for (const item of lineItems) {
                expect(result.updatedStock![item.itemId]).toBe(
                  originalStock[item.itemId] - item.quantity,
                );
              }
            } else {
              expect(result.success).toBe(false);
              // No changes to stock
              expect(stockMap).toEqual(originalStock);
            }
          },
        ),
        { numRuns: 100 },
      );
    },
  );
});
