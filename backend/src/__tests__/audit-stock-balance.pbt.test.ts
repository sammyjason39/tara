/**
 * Property-Based Tests for Stock Balance Non-Negativity Invariant.
 *
 * Uses fast-check (fc.assert / fc.property) with vitest.
 * Each property runs a minimum of 100 iterations.
 *
 * Feature: full-module-production-audit, Property 5: Stock Balance Non-Negativity
 */

import { describe, test, expect } from "vitest";
import * as fc from "fast-check";
import { validateStockAdjustment } from "../shared/business-rules";

// ─── Property 5: Stock Balance Non-Negativity Invariant ─────────────────────
// Feature: full-module-production-audit, Property 5: Stock Balance Non-Negativity

describe("Property 5: Stock Balance Non-Negativity Invariant", () => {
  /**
   * Validates: Requirements 7.4, 7.5, 17.1
   */

  describe("Valid adjustments (currentBalance + delta ≥ 0) return valid: true", () => {
    test("for any currentBalance ≥ 0 and delta where currentBalance + delta ≥ 0, returns valid: true", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100000 }),  // currentBalance ≥ 0
          fc.integer({ min: 0, max: 100000 }),  // non-negative delta (always safe)
          (currentBalance, positiveDelta) => {
            const result = validateStockAdjustment(currentBalance, positiveDelta);

            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    test("negative delta that does not breach zero returns valid: true", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100000 }),  // currentBalance > 0
          (currentBalance) => {
            // Generate a negative delta that won't go below zero
            return fc.assert(
              fc.property(
                fc.integer({ min: -currentBalance, max: -1 }),  // delta in [-currentBalance, -1]
                (delta) => {
                  const result = validateStockAdjustment(currentBalance, delta);

                  expect(result.valid).toBe(true);
                  expect(result.error).toBeUndefined();
                }
              ),
              { numRuns: 5 }
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    test("exact zero result (currentBalance + delta = 0) returns valid: true", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100000 }),  // currentBalance ≥ 0
          (currentBalance) => {
            const delta = -currentBalance; // results in exactly 0
            const result = validateStockAdjustment(currentBalance, delta);

            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Invalid adjustments (currentBalance + delta < 0) return valid: false", () => {
    test("for any currentBalance ≥ 0 and delta where currentBalance + delta < 0, returns valid: false", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100000 }),  // currentBalance ≥ 0
          fc.integer({ min: 1, max: 100000 }),  // excess beyond balance
          (currentBalance, excess) => {
            const delta = -(currentBalance + excess); // guarantees negative result
            const result = validateStockAdjustment(currentBalance, delta);

            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error!.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test("removal from zero balance always returns valid: false", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -100000, max: -1 }),  // any negative delta
          (delta) => {
            const result = validateStockAdjustment(0, delta);

            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Sequential adjustments maintain non-negativity invariant", () => {
    test("for any sequence of adjustments starting from balance 0, currentBalance ≥ 0 holds after each accepted adjustment", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.integer({ min: -500, max: 500 }),  // deltas of varying magnitude
            { minLength: 1, maxLength: 50 }
          ),
          (deltas) => {
            let currentBalance = 0;

            for (const delta of deltas) {
              const result = validateStockAdjustment(currentBalance, delta);

              if (result.valid) {
                // If accepted, apply the delta
                currentBalance = currentBalance + delta;
                // Invariant: balance must remain non-negative
                expect(currentBalance).toBeGreaterThanOrEqual(0);
              } else {
                // If rejected, balance must remain unchanged
                expect(currentBalance).toBeGreaterThanOrEqual(0);
                // The rejection must be because the result would be negative
                expect(currentBalance + delta).toBeLessThan(0);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test("accepted adjustments always result in non-negative balance regardless of starting balance", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 10000 }),  // starting balance
          fc.array(
            fc.integer({ min: -1000, max: 1000 }),  // adjustment deltas
            { minLength: 1, maxLength: 30 }
          ),
          (startBalance, deltas) => {
            let currentBalance = startBalance;

            for (const delta of deltas) {
              const result = validateStockAdjustment(currentBalance, delta);

              if (result.valid) {
                currentBalance = currentBalance + delta;
                // Core invariant: balance never goes negative after an accepted adjustment
                expect(currentBalance).toBeGreaterThanOrEqual(0);
              }
              // Whether accepted or rejected, current balance stays non-negative
              expect(currentBalance).toBeGreaterThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
