/**
 * Property 1: Async-state mapping is total and exclusive.
 *
 * **Validates: Requirements 1.2, 4.2, 4.3, 4.4, 4.5**
 *
 * For ANY combination of the observed `react-query` result fields
 * (`isLoading` / `isError` / data present / data empty), `QueryBoundary` renders
 * EXACTLY ONE of the four defined Async_State presentations — loading-skeleton,
 * empty-state, error-state, or populated children — and never a blank screen
 * (Requirements 1.2, 4.2, 4.3). The Error_State always carries a retry control
 * and the Empty_State never does, so failure and absence-of-data are never
 * presented identically (Requirements 4.4, 4.5).
 *
 * On the initial synchronous render the 30s watchdog has not yet fired, so the
 * rendered presentation is a pure function of the supplied fields and the
 * precedence defined by `QueryBoundary`:
 *   error (isError)  →  loading (isLoading)  →  empty (isEmpty(data))  →  populated
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";

import { fc, assertProperty } from "@/test/pbt";
import { QueryBoundary, defaultIsEmpty } from "./QueryBoundary";

/** The four mutually exclusive presentation test ids `QueryBoundary` can render. */
const PRESENTATIONS = [
  "loading-skeleton",
  "empty-state",
  "error-state",
  "populated",
] as const;
type Presentation = (typeof PRESENTATIONS)[number];

/** The presentation the populated branch renders (a marker child). */
function populatedChild() {
  return <div data-testid="populated">populated content</div>;
}

/** Returns the list of presentation test ids currently mounted in the DOM. */
function presentationsFound(): Presentation[] {
  return PRESENTATIONS.filter((id) => screen.queryByTestId(id) !== null);
}

/**
 * The expected presentation for a field combination, mirroring `QueryBoundary`'s
 * documented precedence. `defaultIsEmpty` is reused so the oracle and the
 * implementation share the same emptiness definition.
 */
function expectedPresentation(
  isLoading: boolean,
  isError: boolean,
  data: unknown,
): Presentation {
  if (isError) return "error-state";
  if (isLoading) return "loading-skeleton";
  if (defaultIsEmpty(data)) return "empty-state";
  return "populated";
}

/**
 * Arbitrary `data` payloads spanning every shape the emptiness test cares about:
 *   - null / undefined            → empty
 *   - empty array                 → empty
 *   - non-empty array of records  → populated
 *   - number / non-empty string   → populated (non-array, non-null)
 */
const dataArb: fc.Arbitrary<unknown> = fc.oneof(
  fc.constant<unknown>(null),
  fc.constant<unknown>(undefined),
  fc.constant<unknown>([]),
  fc.array(fc.record({ id: fc.string() }), { minLength: 1, maxLength: 5 }),
  fc.integer(),
  fc.string({ minLength: 1 }),
);

const resultArb = fc.record({
  isLoading: fc.boolean(),
  isError: fc.boolean(),
  data: dataArb,
});

afterEach(() => cleanup());

describe("Property 1: Async-state mapping is total and exclusive (Req 1.2, 4.2-4.5)", () => {
  it("renders exactly one presentation for any result combination, never blank", () => {
    assertProperty(
      fc.property(resultArb, ({ isLoading, isError, data }) => {
        cleanup();
        const refetch = vi.fn();

        render(
          <QueryBoundary
            query={{ isLoading, isError, data, refetch } as never}
          >
            {populatedChild}
          </QueryBoundary>,
        );

        const found = presentationsFound();
        const expected = expectedPresentation(isLoading, isError, data);

        // Total + exclusive: exactly one presentation, and it is the expected one.
        // A length of exactly 1 also proves the view is never blank (Req 1.2).
        expect(found).toEqual([expected]);
      }),
    );
  });

  it("Error_State always exposes a retry control; Empty_State never does (Req 4.4, 4.5)", () => {
    assertProperty(
      fc.property(resultArb, ({ isLoading, isError, data }) => {
        cleanup();
        const refetch = vi.fn();

        render(
          <QueryBoundary
            query={{ isLoading, isError, data, refetch } as never}
          >
            {populatedChild}
          </QueryBoundary>,
        );

        const expected = expectedPresentation(isLoading, isError, data);

        if (expected === "error-state") {
          const surface = screen.getByTestId("error-state");
          expect(within(surface).queryByRole("button")).not.toBeNull();
        }

        if (expected === "empty-state") {
          const surface = screen.getByTestId("empty-state");
          expect(within(surface).queryByRole("button")).toBeNull();
        }
      }),
    );
  });
});

describe("Property 1: representative async-state examples (Req 1.2, 4.2-4.5)", () => {
  function renderBoundary(query: {
    isLoading: boolean;
    isError: boolean;
    data: unknown;
  }) {
    return render(
      <QueryBoundary query={{ ...query, refetch: vi.fn() } as never}>
        {populatedChild}
      </QueryBoundary>,
    );
  }

  it("maps a pending request to the loading skeleton", () => {
    renderBoundary({ isLoading: true, isError: false, data: undefined });
    expect(presentationsFound()).toEqual(["loading-skeleton"]);
  });

  it("maps a successful empty result to the empty state without a retry control", () => {
    renderBoundary({ isLoading: false, isError: false, data: [] });
    expect(presentationsFound()).toEqual(["empty-state"]);
    expect(
      within(screen.getByTestId("empty-state")).queryByRole("button"),
    ).toBeNull();
  });

  it("maps a failed request to the error state with a retry control", () => {
    renderBoundary({ isLoading: false, isError: true, data: undefined });
    expect(presentationsFound()).toEqual(["error-state"]);
    expect(
      within(screen.getByTestId("error-state")).queryByRole("button"),
    ).not.toBeNull();
  });

  it("maps a populated result to the children", () => {
    renderBoundary({ isLoading: false, isError: false, data: [{ id: "1" }] });
    expect(presentationsFound()).toEqual(["populated"]);
  });

  it("prefers error over loading when both flags are set", () => {
    renderBoundary({ isLoading: true, isError: true, data: undefined });
    expect(presentationsFound()).toEqual(["error-state"]);
  });
});
