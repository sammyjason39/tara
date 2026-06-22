import { describe, it, expect } from "vitest";
import { assertProperty, fc } from "@/test/pbt";
import {
  safeText,
  formatCurrency,
  formatNumber,
  formatDate,
  formatDateTime,
} from "@/lib/format";

/**
 * Property 2: Safe-value formatting never leaks empty/invalid text.
 *
 * **Validates: Requirements 5.4**
 *
 * For arbitrary inputs — including the "missing/invalid" sentinels a
 * Backend_API response can produce when it omits an optional field
 * (`null` / `undefined` / `NaN` / empty string) as well as ordinary numbers,
 * strings, and dates — `safeText` and every canonical formatter must return a
 * non-empty string that is NEVER the raw literal `"undefined"`, `"null"`,
 * `"NaN"`, or `""`. This is the user-facing totality guarantee of Requirement
 * 5.4: those four tokens must never reach the screen as text.
 */

/** The literals that must never be rendered as user-facing text (Req 5.4). */
const FORBIDDEN_LITERALS = ["undefined", "null", "NaN", ""] as const;

/**
 * Assert a formatter output satisfies the Requirement 5.4 guarantee:
 * it is a non-empty string and is none of the forbidden literals.
 */
function expectSafe(output: string): void {
  expect(typeof output).toBe("string");
  expect(output.length).toBeGreaterThan(0);
  for (const bad of FORBIDDEN_LITERALS) {
    expect(output).not.toBe(bad);
  }
}

/**
 * Arbitrary "missing/invalid" sentinels: the values a view must guard against
 * per Requirement 5.4.
 */
const invalidSentinel = fc.constantFrom<unknown>(
  null,
  undefined,
  NaN,
  "",
  "   ",
);

/**
 * Arbitrary numbers, including the non-finite values (`NaN`, `±Infinity`) that
 * must be treated as invalid.
 */
const anyNumber = fc.oneof(
  fc.integer(),
  fc.double(),
  fc.constantFrom(NaN, Infinity, -Infinity, 0, -0),
);

/**
 * Arbitrary strings. The literal forbidden tokens (`"undefined"`, `"null"`,
 * `"NaN"`) are excluded because, as genuine user-supplied strings, those are
 * legitimate values `safeText` is expected to echo back verbatim — echoing a
 * real string is not the "leak" Requirement 5.4 prohibits. Empty/whitespace
 * strings are covered by `invalidSentinel` above.
 */
const anyDisplayString = fc
  .string()
  .filter(
    (s) =>
      s.trim() !== "" &&
      !(["undefined", "null", "nan"] as const).includes(
        s.trim().toLowerCase() as never,
      ),
  );

/** Arbitrary dates, including invalid ones (e.g. unparseable strings). */
const anyDateLike = fc.oneof(
  fc.date(),
  fc.integer(),
  fc.constantFrom<string | number | Date | null | undefined>(
    "not-a-date",
    "",
    null,
    undefined,
    NaN,
  ),
);

describe("Property 2: safe-value formatting never leaks empty/invalid text (Req 5.4)", () => {
  it("safeText returns a non-empty, non-leaking string for any input", () => {
    assertProperty(
      fc.property(
        fc.oneof(invalidSentinel, anyNumber, anyDisplayString, fc.date()),
        (value) => {
          expectSafe(safeText(value));
        },
      ),
    );
  });

  it("safeText returns the defined fallback (never a bad literal) for missing/invalid sentinels", () => {
    assertProperty(
      fc.property(invalidSentinel, (value) => {
        expectSafe(safeText(value));
      }),
    );
  });

  it("formatCurrency never renders undefined/null/NaN/empty for any number-or-missing input", () => {
    assertProperty(
      fc.property(
        fc.oneof(anyNumber, fc.constantFrom<number | null | undefined>(null, undefined)),
        (value) => {
          expectSafe(formatCurrency(value as number | null | undefined));
        },
      ),
    );
  });

  it("formatNumber never renders undefined/null/NaN/empty for any number-or-missing input", () => {
    assertProperty(
      fc.property(
        fc.oneof(anyNumber, fc.constantFrom<number | null | undefined>(null, undefined)),
        (value) => {
          expectSafe(formatNumber(value as number | null | undefined));
        },
      ),
    );
  });

  it("formatDate never renders undefined/null/NaN/empty for any date-like input", () => {
    assertProperty(
      fc.property(anyDateLike, (value) => {
        expectSafe(formatDate(value));
      }),
    );
  });

  it("formatDateTime never renders undefined/null/NaN/empty for any date-like input", () => {
    assertProperty(
      fc.property(anyDateLike, (value) => {
        expectSafe(formatDateTime(value));
      }),
    );
  });
});
