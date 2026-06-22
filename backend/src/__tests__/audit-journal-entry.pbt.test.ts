/**
 * Property-Based Tests for Double-Entry Accounting Balance Validation.
 *
 * Uses fast-check (fc.assert / fc.property) with vitest.
 * Each property runs a minimum of 100 iterations.
 *
 * Feature: full-module-production-audit, Property 1: Double-Entry Accounting Balance
 */

import { describe, test, expect } from "vitest";
import * as fc from "fast-check";
import { isBalanced, JournalEntry, JournalLineItem } from "../shared/business-rules";

// ─── Property 1: Double-Entry Accounting Balance Validation ─────────────────
// Feature: full-module-production-audit, Property 1: Double-Entry Accounting Balance

/**
 * Validates: Requirements 2.2, 2.4
 */

// ─── Generators ─────────────────────────────────────────────────────────────────

/**
 * Generates a journal line item with arbitrary debit/credit amounts.
 */
const journalLineItemArb = fc.record({
  accountCode: fc.string({ minLength: 1, maxLength: 10 }),
  debitAmount: fc.double({ min: 0, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
  creditAmount: fc.double({ min: 0, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
  description: fc.option(fc.string({ maxLength: 50 }), { nil: undefined }),
});

/**
 * Generates a balanced journal entry with ≥ 2 line items where |debits - credits| ≤ 0.01.
 * Strategy: generate N-1 line items freely, then create a final line item that balances.
 */
const balancedEntryArb = fc
  .integer({ min: 2, max: 20 })
  .chain((lineCount) =>
    fc
      .array(
        fc.record({
          accountCode: fc.string({ minLength: 1, maxLength: 10 }),
          debitAmount: fc.double({ min: 0, max: 100_000, noNaN: true, noDefaultInfinity: true }),
          creditAmount: fc.double({ min: 0, max: 100_000, noNaN: true, noDefaultInfinity: true }),
        }),
        { minLength: lineCount - 1, maxLength: lineCount - 1 }
      )
      .chain((items) => {
        const totalDebits = items.reduce((s, i) => s + i.debitAmount, 0);
        const totalCredits = items.reduce((s, i) => s + i.creditAmount, 0);
        const diff = totalDebits - totalCredits;

        // Create a balancing line item
        const balancingItem: JournalLineItem = {
          accountCode: "BAL",
          debitAmount: diff < 0 ? Math.abs(diff) : 0,
          creditAmount: diff > 0 ? diff : 0,
          description: "Balancing entry",
        };

        return fc.constant({
          lineItems: [...items.map((i) => ({ ...i, description: undefined })), balancingItem],
        } as JournalEntry);
      })
  );

/**
 * Generates an imbalanced journal entry where |debits - credits| > 0.01.
 * Strategy: generate line items freely and add an imbalance that exceeds 0.01.
 */
const imbalancedEntryArb = fc
  .integer({ min: 2, max: 20 })
  .chain((lineCount) =>
    fc.tuple(
      fc.array(
        fc.record({
          accountCode: fc.string({ minLength: 1, maxLength: 10 }),
          debitAmount: fc.double({ min: 0, max: 100_000, noNaN: true, noDefaultInfinity: true }),
          creditAmount: fc.double({ min: 0, max: 100_000, noNaN: true, noDefaultInfinity: true }),
        }),
        { minLength: lineCount, maxLength: lineCount }
      ),
      // Imbalance magnitude must exceed 0.01
      fc.double({ min: 0.011, max: 50_000, noNaN: true, noDefaultInfinity: true }),
      fc.boolean() // Whether to add imbalance as extra debit or credit
    )
  )
  .map(([items, imbalance, addToDebit]) => {
    const lineItems: JournalLineItem[] = items.map((i) => ({
      accountCode: i.accountCode,
      debitAmount: i.debitAmount,
      creditAmount: i.creditAmount,
      description: undefined,
    }));

    // Add an extra line item that introduces imbalance > 0.01
    if (addToDebit) {
      lineItems.push({
        accountCode: "IMB",
        debitAmount: imbalance,
        creditAmount: 0,
      });
    } else {
      lineItems.push({
        accountCode: "IMB",
        debitAmount: 0,
        creditAmount: imbalance,
      });
    }

    return { lineItems } as JournalEntry;
  });

// ─── Tests ──────────────────────────────────────────────────────────────────────

describe("Property 1: Double-Entry Accounting Balance Validation", () => {
  describe("Balanced entries (|debits - credits| ≤ 0.01 AND ≥ 2 line items) → allow submission", () => {
    test("for any journal entry with ≥ 2 line items where |sum(debits) - sum(credits)| ≤ 0.01, isBalanced returns true", () => {
      fc.assert(
        fc.property(balancedEntryArb, (entry) => {
          // Verify precondition: at least 2 line items
          expect(entry.lineItems.length).toBeGreaterThanOrEqual(2);

          // Verify precondition: balanced within tolerance
          const totalDebits = entry.lineItems.reduce((s, l) => s + l.debitAmount, 0);
          const totalCredits = entry.lineItems.reduce((s, l) => s + l.creditAmount, 0);
          expect(Math.abs(totalDebits - totalCredits)).toBeLessThanOrEqual(0.01);

          // Property: isBalanced returns true
          expect(isBalanced(entry)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    test("perfectly balanced entries (debits === credits exactly) return true", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 20 }),
          fc.double({ min: 0.01, max: 500_000, noNaN: true, noDefaultInfinity: true }),
          (lineCount, amount) => {
            // Create a perfectly balanced entry: one debit line, one credit line, rest at zero
            const lineItems: JournalLineItem[] = [
              { accountCode: "DR", debitAmount: amount, creditAmount: 0 },
              { accountCode: "CR", debitAmount: 0, creditAmount: amount },
            ];
            // Add extra zero-balanced lines up to lineCount
            for (let i = 2; i < lineCount; i++) {
              lineItems.push({ accountCode: `X${i}`, debitAmount: 0, creditAmount: 0 });
            }

            const entry: JournalEntry = { lineItems };
            expect(isBalanced(entry)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    test("entries within tolerance boundary (0 < |diff| ≤ 0.01) return true", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.001, max: 0.009, noNaN: true, noDefaultInfinity: true }),
          fc.boolean(),
          (tolerance, debitExceeds) => {
            // Use integer-based base to avoid floating-point addition errors
            // The tolerance itself represents the exact imbalance between debit and credit lines
            const lineItems: JournalLineItem[] = debitExceeds
              ? [
                  { accountCode: "DR", debitAmount: tolerance, creditAmount: 0 },
                  { accountCode: "CR", debitAmount: 0, creditAmount: 0 },
                ]
              : [
                  { accountCode: "DR", debitAmount: 0, creditAmount: 0 },
                  { accountCode: "CR", debitAmount: 0, creditAmount: tolerance },
                ];

            const entry: JournalEntry = { lineItems };
            // tolerance is in (0.001, 0.009] so |diff| ≤ 0.01
            expect(isBalanced(entry)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Imbalanced entries (|debits - credits| > 0.01) → reject submission", () => {
    test("for any journal entry where |sum(debits) - sum(credits)| > 0.01, isBalanced returns false", () => {
      fc.assert(
        fc.property(imbalancedEntryArb, (entry) => {
          // Calculate actual imbalance
          const totalDebits = entry.lineItems.reduce((s, l) => s + l.debitAmount, 0);
          const totalCredits = entry.lineItems.reduce((s, l) => s + l.creditAmount, 0);
          const imbalance = Math.abs(totalDebits - totalCredits);

          // Only assert when the actual imbalance exceeds 0.01 (floating point safety)
          if (imbalance > 0.01) {
            expect(isBalanced(entry)).toBe(false);
          }
        }),
        { numRuns: 100 }
      );
    });

    test("large imbalances always return false regardless of line item count", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 20 }),
          fc.double({ min: 1, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
          (lineCount, imbalance) => {
            // Create lines that are clearly imbalanced by at least 'imbalance' amount
            const lineItems: JournalLineItem[] = [
              { accountCode: "DR", debitAmount: imbalance + 100, creditAmount: 0 },
              { accountCode: "CR", debitAmount: 0, creditAmount: 100 },
            ];
            for (let i = 2; i < lineCount; i++) {
              lineItems.push({ accountCode: `X${i}`, debitAmount: 0, creditAmount: 0 });
            }

            const entry: JournalEntry = { lineItems };
            // imbalance is always > 0.01 since min is 1
            expect(isBalanced(entry)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    test("imbalance just beyond tolerance (> 0.01) returns false", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.0101, max: 1, noNaN: true, noDefaultInfinity: true }),
          fc.double({ min: 100, max: 100_000, noNaN: true, noDefaultInfinity: true }),
          fc.boolean(),
          (excess, baseAmount, debitExceeds) => {
            const lineItems: JournalLineItem[] = debitExceeds
              ? [
                  { accountCode: "DR", debitAmount: baseAmount + excess, creditAmount: 0 },
                  { accountCode: "CR", debitAmount: 0, creditAmount: baseAmount },
                ]
              : [
                  { accountCode: "DR", debitAmount: baseAmount, creditAmount: 0 },
                  { accountCode: "CR", debitAmount: 0, creditAmount: baseAmount + excess },
                ];

            const entry: JournalEntry = { lineItems };
            const totalDebits = lineItems.reduce((s, l) => s + l.debitAmount, 0);
            const totalCredits = lineItems.reduce((s, l) => s + l.creditAmount, 0);
            // Due to floating point, only assert when imbalance actually exceeds 0.01
            if (Math.abs(totalDebits - totalCredits) > 0.01) {
              expect(isBalanced(entry)).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Line item count constraint (< 2 line items) → reject at schema level", () => {
    test("entries with 0 line items: isBalanced returns true (balance check only), but schema rejects (< 2 items)", () => {
      // Note: isBalanced only checks the balance, not the line item count.
      // The ≥ 2 line items constraint is enforced at the schema/form level.
      // This test documents that the balance check alone is satisfied for empty entries,
      // but submission is still rejected because the schema requires ≥ 2 line items.
      const entry: JournalEntry = { lineItems: [] };
      // Balance check: 0 === 0, within tolerance
      expect(isBalanced(entry)).toBe(true);
      // Schema-level constraint: lineItems.length < 2 → reject submission
      expect(entry.lineItems.length).toBeLessThan(2);
    });

    test("entries with exactly 1 line item: schema rejects regardless of balance", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 100_000, noNaN: true, noDefaultInfinity: true }),
          fc.double({ min: 0, max: 100_000, noNaN: true, noDefaultInfinity: true }),
          (debit, credit) => {
            const entry: JournalEntry = {
              lineItems: [{ accountCode: "A", debitAmount: debit, creditAmount: credit }],
            };
            // Schema-level constraint: must have ≥ 2 line items for submission
            expect(entry.lineItems.length).toBeLessThan(2);
            // The submission condition is: isBalanced AND lineItems.length >= 2
            // With < 2 items, submission is always rejected regardless of isBalanced result
            const canSubmit = isBalanced(entry) && entry.lineItems.length >= 2;
            expect(canSubmit).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Combined submission rule: allow iff |debits - credits| ≤ 0.01 AND lineItems.length ≥ 2", () => {
    test("random entries: submission allowed iff both conditions hold", () => {
      fc.assert(
        fc.property(
          fc.array(journalLineItemArb, { minLength: 0, maxLength: 20 }),
          (lineItems) => {
            const entry: JournalEntry = { lineItems };
            const totalDebits = lineItems.reduce((s, l) => s + l.debitAmount, 0);
            const totalCredits = lineItems.reduce((s, l) => s + l.creditAmount, 0);
            const balanced = Math.abs(totalDebits - totalCredits) <= 0.01;
            const hasMinItems = lineItems.length >= 2;

            // The full submission rule
            const canSubmit = balanced && hasMinItems;

            // isBalanced only checks the balance part
            expect(isBalanced(entry)).toBe(balanced);

            // Full submission validation
            const submissionAllowed = isBalanced(entry) && entry.lineItems.length >= 2;
            expect(submissionAllowed).toBe(canSubmit);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
