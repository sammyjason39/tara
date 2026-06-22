/**
 * Property 3: Formatting output invariants.
 *
 * **Validates: Requirements 5.5**
 *
 * For any finite number, `formatCurrency` output contains a currency symbol or
 * currency code and applies digit grouping for large values, and `formatNumber`
 * applies digit grouping (for values >= 1000) with consistent precision; for any
 * valid date input, `formatDate` produces output in a single consistent,
 * locale-appropriate pattern.
 *
 * The canonical formatters are pinned to `DEFAULT_LOCALE` ("en-US"), so the
 * concrete, locale-specific invariants asserted here are:
 *   - currency renders the "$" symbol (USD in en-US),
 *   - the en-US thousands separator is "," and the decimal separator is ".",
 *   - `formatNumber` never renders more than 2 fraction digits (its default
 *     `maximumFractionDigits`),
 *   - `formatDate` (medium) renders exactly one pattern: "MMM D, YYYY".
 */

import { describe, it, expect } from "vitest";
import { fc, assertProperty } from "@/test/pbt";
import {
  formatCurrency,
  formatNumber,
  formatDate,
  DEFAULT_CURRENCY,
  DEFAULT_LOCALE,
} from "@/lib/format";

/** The en-US thousands grouping separator. */
const GROUP_SEP = ",";

/**
 * Returns the integer portion of a formatted number string: everything before
 * the first decimal point, with the sign and any leading currency symbol
 * stripped so only grouped digits remain.
 */
function integerPart(formatted: string): string {
  const withoutDecimals = formatted.split(".")[0];
  // Strip everything that is not a digit or the group separator.
  return withoutDecimals.replace(/[^\d,]/g, "");
}

/** Returns the fractional portion (digits after the decimal point), or "". */
function fractionPart(formatted: string): string {
  const parts = formatted.split(".");
  if (parts.length < 2) return "";
  return parts[1].replace(/[^\d]/g, "");
}

/**
 * A finite number whose magnitude is >= 1000, so that digit grouping is
 * guaranteed to apply in the en-US locale (the integer part has >= 4 digits).
 */
const largeNumberArb: fc.Arbitrary<number> = fc
  .tuple(
    fc.double({ min: 1000, max: 1e12, noNaN: true, noDefaultInfinity: true }),
    fc.boolean(),
  )
  .map(([magnitude, negative]) => (negative ? -magnitude : magnitude));

/** Any finite number, large or small, positive or negative. */
const finiteNumberArb: fc.Arbitrary<number> = fc.double({
  min: -1e12,
  max: 1e12,
  noNaN: true,
  noDefaultInfinity: true,
});

/** A valid date within a modern range (keeps the year at 4 digits). */
const validDateArb: fc.Arbitrary<Date> = fc.date({
  min: new Date("1970-01-01T00:00:00.000Z"),
  max: new Date("2100-12-31T23:59:59.999Z"),
  noInvalidDate: true,
});

describe("Property 3: Formatting output invariants (Requirement 5.5)", () => {
  it("formatCurrency always renders a currency symbol/code", () => {
    assertProperty(
      fc.property(finiteNumberArb, (value) => {
        const out = formatCurrency(value);
        // en-US + USD renders the "$" currency symbol.
        expect(out).toContain("$");
      }),
    );
  });

  it("formatCurrency applies digit grouping for large values", () => {
    assertProperty(
      fc.property(largeNumberArb, (value) => {
        const out = formatCurrency(value);
        expect(out).toContain("$");
        // Integer part of a value >= 1000 must contain the grouping separator.
        expect(integerPart(out)).toContain(GROUP_SEP);
      }),
    );
  });

  it("formatNumber applies digit grouping for values >= 1000", () => {
    assertProperty(
      fc.property(largeNumberArb, (value) => {
        const out = formatNumber(value);
        expect(integerPart(out)).toContain(GROUP_SEP);
      }),
    );
  });

  it("formatNumber renders consistent precision (at most 2 fraction digits)", () => {
    assertProperty(
      fc.property(finiteNumberArb, (value) => {
        const out = formatNumber(value);
        expect(fractionPart(out).length).toBeLessThanOrEqual(2);
      }),
    );
  });

  it("formatDate produces a single consistent locale pattern (MMM D, YYYY)", () => {
    // en-US medium dateStyle => e.g. "Jan 5, 2024" — one pattern for every date.
    const mediumPattern = /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/;
    assertProperty(
      fc.property(validDateArb, (date) => {
        const out = formatDate(date);
        expect(out).toMatch(mediumPattern);
      }),
    );
  });
});

describe("Property 3: representative examples (Requirement 5.5)", () => {
  it("formats a large currency amount with symbol and grouping", () => {
    expect(formatCurrency(1234567.5)).toBe("$1,234,567.50");
  });

  it("formats a large number with grouping and capped precision", () => {
    expect(formatNumber(1234567.891)).toBe("1,234,567.89");
  });

  it("formats a date in the consistent medium pattern", () => {
    expect(formatDate(new Date("2024-01-05T00:00:00.000Z"))).toMatch(
      /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/,
    );
  });

  it("uses the configured defaults", () => {
    expect(DEFAULT_CURRENCY).toBe("USD");
    expect(DEFAULT_LOCALE).toBe("en-US");
  });
});
