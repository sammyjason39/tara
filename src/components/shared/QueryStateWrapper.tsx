import * as React from "react";
import { AlertTriangle, Inbox, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ApiError } from "@/core/api/apiClient";

/**
 * QueryStateWrapper — a props-driven state multiplexer that renders exactly one of
 * four presentations: loading spinner, error state, empty state, or populated children.
 *
 * Differs from `QueryBoundary` in that it accepts raw boolean flags rather than a
 * TanStack Query result object, making it usable with any async data source.
 *
 * Requirements: 9.4 (loading within 100ms), 9.5 (error with retry), 9.6 (empty state),
 * 9.7 (30s timeout with retry).
 */

/* ─── LoadingSpinner ──────────────────────────────────────────────── */

export interface LoadingSpinnerProps {
  /** Accessible label announced to assistive tech. */
  label?: string;
  className?: string;
}

/**
 * A lightweight animated spinner that renders immediately (within 100ms of mount).
 * Uses CSS animation — no delayed rendering or deferred paint logic.
 * Requirement 9.4: loading indicator displays within 100ms of request start.
 */
export function LoadingSpinner({
  label = "Loading…",
  className,
}: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      data-testid="loading-spinner"
      className={cn(
        "flex flex-col items-center justify-center gap-3 p-10",
        className,
      )}
    >
      <Loader2
        className="h-8 w-8 animate-spin text-primary"
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/* ─── ErrorState ──────────────────────────────────────────────────── */

export interface QueryErrorStateProps {
  /** Human-readable error message to display. */
  message?: string;
  /** Retry handler that re-initiates the failed request. */
  onRetry?: () => void;
  className?: string;
}

/**
 * Error presentation with retry action. Displays the error message and a retry button.
 * Requirement 9.5: error state with retry action.
 * Requirement 9.7: timeout errors also surface here with retry.
 */
export function QueryErrorState({
  message = "Something went wrong while loading this data. Check your connection and try again.",
  onRetry,
  className,
}: QueryErrorStateProps) {
  return (
    <div
      role="alert"
      data-testid="query-error-state"
      className={cn(
        "glass-card flex flex-col items-center justify-center rounded-[2rem] p-10 text-center",
        className,
      )}
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-destructive/10 text-destructive">
        <AlertTriangle className="h-8 w-8" aria-hidden="true" />
      </div>
      <h3 className="mb-2 text-xl font-black uppercase tracking-tight text-foreground">
        Couldn&apos;t load this data
      </h3>
      <p className="mb-8 max-w-md text-sm font-medium leading-relaxed text-muted-foreground">
        {message}
      </p>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry} className="gap-2">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Retry
        </Button>
      ) : null}
    </div>
  );
}

/* ─── EmptyState ──────────────────────────────────────────────────── */

export interface QueryEmptyStateProps {
  /** Descriptive message about why there's no data. */
  message?: string;
  className?: string;
}

/**
 * Empty-state presentation shown when a request succeeds with zero records.
 * Requirement 9.6: descriptive empty-state message, no hardcoded placeholder data.
 */
export function QueryEmptyState({
  message = "No records are available for this view.",
  className,
}: QueryEmptyStateProps) {
  return (
    <div
      data-testid="query-empty-state"
      className={cn(
        "glass-card flex flex-col items-center justify-center rounded-[2rem] p-10 text-center",
        className,
      )}
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-muted text-muted-foreground">
        <Inbox className="h-8 w-8" aria-hidden="true" />
      </div>
      <h3 className="mb-2 text-xl font-black uppercase tracking-tight text-foreground">
        Nothing here yet
      </h3>
      <p className="max-w-md text-sm font-medium leading-relaxed text-muted-foreground">
        {message}
      </p>
    </div>
  );
}

/* ─── QueryStateWrapper ───────────────────────────────────────────── */

/** Default timeout deadline for requests (Requirement 9.7). */
export const QUERY_TIMEOUT_MS = 30_000;

export interface QueryStateWrapperProps {
  /** Whether data is currently being fetched. */
  isLoading: boolean;
  /** Whether the request resulted in an error. */
  isError: boolean;
  /** The error object from a failed request. */
  error?: ApiError;
  /** Whether the data set is empty (zero records). */
  isEmpty: boolean;
  /** Retry handler that re-initiates the failed request. */
  onRetry: () => void;
  /** The content to render when data is available and non-empty. */
  children: React.ReactNode;
  /** Custom empty message. */
  emptyMessage?: string;
  /** Optional timeout override in ms (default 30000). */
  timeoutMs?: number;
  className?: string;
}

/**
 * Composes LoadingSpinner, QueryErrorState, and QueryEmptyState based on state props.
 * Includes a 30-second watchdog: if isLoading remains true past the deadline, the
 * component switches to the error state with a retry action (Requirement 9.7).
 */
export function QueryStateWrapper({
  isLoading,
  isError,
  error,
  isEmpty,
  onRetry,
  children,
  emptyMessage,
  timeoutMs = QUERY_TIMEOUT_MS,
  className,
}: QueryStateWrapperProps) {
  const [timedOut, setTimedOut] = React.useState(false);

  // Watchdog: flip to error after timeout while still loading (Requirement 9.7).
  React.useEffect(() => {
    if (!isLoading) {
      setTimedOut(false);
      return;
    }
    if (timeoutMs <= 0) return;

    const timer = setTimeout(() => setTimedOut(true), timeoutMs);
    return () => clearTimeout(timer);
  }, [isLoading, timeoutMs]);

  // Reset timeout flag when retry is triggered
  const handleRetry = React.useCallback(() => {
    setTimedOut(false);
    onRetry();
  }, [onRetry]);

  // Priority: error/timeout → loading → empty → populated
  if (isError || timedOut) {
    const message = timedOut
      ? "The request timed out after 30 seconds. Please check your connection and try again."
      : error?.message;
    return (
      <QueryErrorState
        message={message}
        onRetry={handleRetry}
        className={className}
      />
    );
  }

  if (isLoading) {
    return <LoadingSpinner className={className} />;
  }

  if (isEmpty) {
    return <QueryEmptyState message={emptyMessage} className={className} />;
  }

  return <>{children}</>;
}

export default QueryStateWrapper;
