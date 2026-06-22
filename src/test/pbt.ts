/**
 * Property-Based Testing (PBT) test-utils helper.
 *
 * Wires `fast-check` together with Vitest so that property-based tests across
 * the frontend-stabilization spec run with a consistent, enforced configuration.
 *
 * Per the Verification_Suite design (Requirements 11.1, 11.2), every property
 * test runs a **minimum of 100 iterations**. This helper centralizes that
 * default so individual tests do not have to repeat the `numRuns` option, and
 * so the minimum can never be accidentally lowered below 100.
 *
 * Usage:
 *
 *   import { describe, expect } from "vitest";
 *   import fc from "fast-check";
 *   import { assertProperty } from "@/test/pbt";
 *
 *   describe("canApprovePayment", () => {
 *     it("is true iff REQUEST_CREATED", () => {
 *       assertProperty(
 *         fc.property(fc.string(), (status) => {
 *           expect(canApprovePayment(status)).toBe(status === "REQUEST_CREATED");
 *         }),
 *       );
 *     });
 *   });
 */

import fc from "fast-check";

/** The minimum number of generated cases every property test must run. */
export const MIN_RUNS = 100;

/**
 * Build the fast-check run parameters, guaranteeing at least {@link MIN_RUNS}
 * iterations. Any caller-supplied `numRuns` below the minimum is raised to it.
 */
export function pbtParameters<T>(
  params?: fc.Parameters<T>,
): fc.Parameters<T> {
  const requested = params?.numRuns ?? MIN_RUNS;
  return {
    ...params,
    numRuns: Math.max(requested, MIN_RUNS),
  };
}

/**
 * Assert a fast-check property using Vitest, enforcing the ≥100-run minimum.
 *
 * This is a thin wrapper over `fc.assert` that injects {@link pbtParameters},
 * so a failing property surfaces fast-check's shrunk counterexample as a normal
 * Vitest failure.
 *
 * Supports both synchronous and asynchronous properties.
 */
export function assertProperty<T>(
  property: fc.IRawProperty<T>,
  params?: fc.Parameters<T>,
): unknown {
  return fc.assert(property as fc.IRawProperty<T, boolean>, pbtParameters(params));
}

/** Re-export fast-check so tests can import generators from a single place. */
export { fc };
