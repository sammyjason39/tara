/**
 * Feature: frontend-stabilization, Property 4: Contract gating correctness.
 *
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.6, 13.3**
 *
 * For any status string received from the Backend_API, a control gated on that
 * status is enabled **if and only if** the value equals the current
 * Backend_Contract enabling value. In particular, `canApprovePayment(s)` is
 * `true` exactly when `s === "REQUEST_CREATED"`, and `false` for:
 *   - the obsolete `"APPROVAL_PENDING"` literal the Backend_API no longer produces,
 *   - every other defined `PAYMENT_CREATE_STATE` value,
 *   - arbitrary unknown strings,
 *   - `null` / `undefined`.
 */

import { describe, it, expect } from "vitest";
import { fc, assertProperty } from "@/test/pbt";
import { canApprovePayment } from "./statusLabel";
import { PAYMENT_CREATE_STATE } from "./paymentStatus";

/** The single contract value that enables payment approval. */
const ENABLING_VALUE = PAYMENT_CREATE_STATE.REQUEST_CREATED;

/** The obsolete create-lifecycle literal the Backend_API no longer produces. */
const OBSOLETE_VALUE = "APPROVAL_PENDING";

/** Every defined contract value (the full enum, including the enabling one). */
const DEFINED_VALUES: readonly string[] = Object.values(PAYMENT_CREATE_STATE);

/**
 * An arbitrary covering the full gating input space:
 *   - the enabling value,
 *   - the obsolete value,
 *   - all other defined lifecycle states,
 *   - arbitrary random strings (overwhelmingly "unknown"),
 *   - `null` / `undefined`.
 *
 * Constructed as a weighted union so the meaningful contract literals are hit
 * frequently rather than being drowned out by random strings.
 */
const statusArb: fc.Arbitrary<string | null | undefined> = fc.oneof(
  fc.constant(ENABLING_VALUE),
  fc.constant(OBSOLETE_VALUE),
  fc.constantFrom(...DEFINED_VALUES),
  fc.constantFrom(null, undefined),
  fc.string(),
);

describe("Property 4: Contract gating correctness (Requirements 6.1, 6.2, 6.3, 6.6, 13.3)", () => {
  it("canApprovePayment is true if and only if status === 'REQUEST_CREATED'", () => {
    assertProperty(
      fc.property(statusArb, (status) => {
        expect(canApprovePayment(status)).toBe(status === ENABLING_VALUE);
      }),
    );
  });

  it("canApprovePayment is false for the obsolete APPROVAL_PENDING value", () => {
    assertProperty(
      fc.property(fc.constant(OBSOLETE_VALUE), (status) => {
        expect(canApprovePayment(status)).toBe(false);
      }),
    );
  });

  it("canApprovePayment is false for any defined state other than the enabling one", () => {
    const otherDefinedArb = fc.constantFrom(
      ...DEFINED_VALUES.filter((v) => v !== ENABLING_VALUE),
    );
    assertProperty(
      fc.property(otherDefinedArb, (status) => {
        expect(canApprovePayment(status)).toBe(false);
      }),
    );
  });

  it("canApprovePayment is false for unknown strings and null/undefined", () => {
    const nonEnablingArb = fc.oneof(
      fc.constantFrom(null, undefined),
      fc.string().filter((s) => s !== ENABLING_VALUE),
    );
    assertProperty(
      fc.property(nonEnablingArb, (status) => {
        expect(canApprovePayment(status)).toBe(false);
      }),
    );
  });
});

describe("Property 4: representative examples", () => {
  it("enables approval only on REQUEST_CREATED", () => {
    expect(canApprovePayment("REQUEST_CREATED")).toBe(true);
  });

  it("rejects the obsolete APPROVAL_PENDING literal", () => {
    expect(canApprovePayment("APPROVAL_PENDING")).toBe(false);
  });

  it("rejects other lifecycle states", () => {
    expect(canApprovePayment("APPROVED")).toBe(false);
    expect(canApprovePayment("SETTLED")).toBe(false);
    expect(canApprovePayment("REJECTED")).toBe(false);
  });

  it("rejects unknown, null, and undefined values", () => {
    expect(canApprovePayment("totally-unknown")).toBe(false);
    expect(canApprovePayment(null)).toBe(false);
    expect(canApprovePayment(undefined)).toBe(false);
  });
});
