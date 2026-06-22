import * as React from "react";
import type { UseQueryResult } from "@tanstack/react-query";

import { EmptyState, ErrorState, LoadingSkeleton } from "./AsyncState";

/**
 * `QueryBoundary` maps a `@tanstack/react-query` result onto exactly ONE of the four
 * defined Async_State presentations — loading, empty, error, or populated — so that a
 * data-driven view never renders a blank screen or a perpetual spinner.
 *
 * The mapping is **total and exclusive**: for any combination of the observed query
 * fields, exactly one presentation is rendered (Requirements 1.2, 4.2, 4.3, 4.4, 4.5,
 * 3.9). The Error_State carries a retry control wired to `refetch`; the Empty_State, by
 * construction, does not (Requirements 4.4, 4.5, 4.7).
 *
 * A 30-second watchdog flips a query that is still pending past the deadline to the
 * Error_State, so a request that never settles surfaces a retry control rather than an
 * indefinite Loading_Indicator (Requirement 4.6).
 */

/** Default watchdog deadline for a still-pending initial request (Requirement 4.6). */
export const DEFAULT_QUERY_WATCHDOG_MS = 30_000;

/**
 * Default emptiness test: a view is empty when its data is `null`/`undefined` or an
 * array with no elements. Any other value is treated as populated.
 */
export function defaultIsEmpty<T>(data: T): boolean {
  if (data === null || data === undefined) {
    return true;
  }
  if (Array.isArray(data)) {
    return data.length === 0;
  }
  return false;
}

export interface QueryBoundaryProps<T> {
  /**
   * The subset of a `react-query` result the boundary observes. Only `isLoading`,
   * `isError`, `data`, and `refetch` are required.
   */
  query: Pick<UseQueryResult<T>, "isLoading" | "isError" | "data" | "refetch">;
  /** Emptiness test; defaults to {@link defaultIsEmpty} (null/undefined/empty array). */
  isEmpty?: (data: T) => boolean;
  /** Loading presentation; defaults to `<LoadingSkeleton/>`. */
  loading?: React.ReactNode;
  /** Empty presentation; defaults to `<EmptyState/>` (no retry control). */
  empty?: React.ReactNode;
  /**
   * Error presentation; defaults to `<ErrorState onRetry={refetch}/>`. When a custom
   * node is supplied, the caller owns its retry affordance.
   */
  error?: React.ReactNode;
  /** Watchdog deadline in ms; defaults to {@link DEFAULT_QUERY_WATCHDOG_MS}. */
  watchdogMs?: number;
  /** Populated render, invoked with the resolved, non-empty data. */
  children: (data: T) => React.ReactNode;
}

export function QueryBoundary<T>({
  query,
  isEmpty = defaultIsEmpty,
  loading,
  empty,
  error,
  watchdogMs = DEFAULT_QUERY_WATCHDOG_MS,
  children,
}: QueryBoundaryProps<T>) {
  const { isLoading, isError, data, refetch } = query;

  // Watchdog: while the request is pending, arm a timer that flips the view to the
  // Error_State if it has not settled within the deadline (Requirement 4.6). The
  // `retryNonce` lets a retry re-arm the timer even if `isLoading` has not changed.
  const [timedOut, setTimedOut] = React.useState(false);
  const [retryNonce, setRetryNonce] = React.useState(0);

  React.useEffect(() => {
    if (!isLoading) {
      // Settled (success or error): the watchdog is irrelevant, clear any timeout flag.
      setTimedOut(false);
      return;
    }
    // Pending: (re)arm the watchdog for this attempt.
    setTimedOut(false);
    if (watchdogMs <= 0) {
      return;
    }
    const timer = setTimeout(() => setTimedOut(true), watchdogMs);
    return () => clearTimeout(timer);
  }, [isLoading, retryNonce, watchdogMs]);

  const handleRetry = React.useCallback(() => {
    setTimedOut(false);
    setRetryNonce((nonce) => nonce + 1);
    void refetch?.();
  }, [refetch]);

  // ── Total, exclusive mapping. Precedence guarantees a single presentation. ──

  // 1. Error_State: an explicit failure, or the watchdog deadline elapsed while pending.
  if (isError || timedOut) {
    return <>{error ?? <ErrorState onRetry={handleRetry} />}</>;
  }

  // 2. Loading_Indicator: the request is still in flight (and has not timed out).
  if (isLoading) {
    return <>{loading ?? <LoadingSkeleton />}</>;
  }

  // 3. Settled successfully → distinguish empty from populated.
  if (isEmpty(data as T)) {
    return <>{empty ?? <EmptyState />}</>;
  }

  // 4. Populated: render the resolved, non-empty data.
  return <>{children(data as T)}</>;
}

export default QueryBoundary;
