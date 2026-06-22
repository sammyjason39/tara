import { describe, it, expect } from "vitest";
import { assertProperty, fc } from "@/test/pbt";
import {
  statusLabel,
  UNKNOWN_STATUS_LABEL,
  type StatusFamily,
} from "@/lib/contract/statusLabel";
import {
  PAYMENT_CREATE_STATE,
  type PaymentCreateState,
} from "@/lib/contract/paymentStatus";

/**
 * Property 5: Status-label mapping is total.
 *
 * **Validates: Requirements 6.4, 6.6**
 *
 * `statusLabel(value, "payment")` is a TOTAL function: for every possible input
 * — a known Backend_Contract value, an unrecognized string, or
 * `null`/`undefined` — it returns a defined, non-empty label. For known
 * contract values it returns the mapped human label (Req 6.4); for everything
 * else (unknown string / null / undefined) it returns the defined fallback
 * `UNKNOWN_STATUS_LABEL` and NEVER renders the raw, undefined, or null value as
 * a status (Req 6.6).
 */

const FAMILY: StatusFamily = "payment";

/** The contract-defined payment create lifecycle values (known inputs). */
const KNOWN_VALUES = Object.values(PAYMENT_CREATE_STATE) as PaymentCreateState[];

/** Arbitrary that yields a known, contract-defined payment status value. */
const knownStatus = fc.constantFrom(...KNOWN_VALUES);

/**
 * Arbitrary that yields a string the contract does NOT define. Any generated
 * string that happens to collide with a known value is filtered out so this
 * generator strictly explores the "unknown" input space — including the
 * obsolete `APPROVAL_PENDING` literal and empty/whitespace strings.
 */
const unknownStatusString = fc.oneof(
  fc
    .string()
    .filter((s) => !(KNOWN_VALUES as string[]).includes(s)),
  fc.constantFrom("APPROVAL_PENDING", "", "   ", "request_created", "unknown"),
);

/** The missing-value sentinels a Backend_API response can produce. */
const missingValue = fc.constantFrom<string | null | undefined>(null, undefined);

/**
 * Assert the universal totality guarantee that holds for EVERY input:
 * the label is a non-empty string.
 */
function expectDefinedNonEmptyLabel(label: string): void {
  expect(typeof label).toBe("string");
  expect(label.length).toBeGreaterThan(0);
}

describe("Property 5: status-label mapping is total (Req 6.4, 6.6)", () => {
  it("always returns a defined, non-empty label for ANY input (known, unknown, null, undefined)", () => {
    assertProperty(
      fc.property(
        fc.oneof(knownStatus, unknownStatusString, missingValue),
        (value) => {
          expectDefinedNonEmptyLabel(statusLabel(value, FAMILY));
        },
      ),
    );
  });

  it("maps every known contract value to its defined human label (Req 6.4)", () => {
    assertProperty(
      fc.property(knownStatus, (value) => {
        const label = statusLabel(value, FAMILY);
        expectDefinedNonEmptyLabel(label);
        // A known value resolves to a real, human label — never the fallback.
        expect(label).not.toBe(UNKNOWN_STATUS_LABEL);
      }),
    );
  });

  it("returns the defined fallback and NEVER the raw value for unknown strings (Req 6.6)", () => {
    assertProperty(
      fc.property(unknownStatusString, (value) => {
        const label = statusLabel(value, FAMILY);
        expectDefinedNonEmptyLabel(label);
        expect(label).toBe(UNKNOWN_STATUS_LABEL);
        // The unknown raw value must never be rendered back as the status,
        // unless the contract label itself legitimately equals it.
        if (value !== UNKNOWN_STATUS_LABEL) {
          expect(label).not.toBe(value);
        }
      }),
    );
  });

  it("returns the defined fallback and NEVER undefined/null for missing inputs (Req 6.6)", () => {
    assertProperty(
      fc.property(missingValue, (value) => {
        const label = statusLabel(value, FAMILY);
        expectDefinedNonEmptyLabel(label);
        expect(label).toBe(UNKNOWN_STATUS_LABEL);
        // Never leak the literal "undefined" / "null" as a status.
        expect(label).not.toBe("undefined");
        expect(label).not.toBe("null");
      }),
    );
  });
});
