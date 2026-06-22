import * as React from "react";
import { AlertTriangle, Inbox, RefreshCw, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Async-state presentational primitives consumed by `QueryBoundary`.
 *
 * These are intentionally token-based (no Hardcoded_Color) and Glass_Card-consistent
 * (they share the `glass-card` surface treatment) so that the loading, empty, and error
 * presentations of every data-driven view look uniform across the Web_App.
 *
 * - `LoadingSkeleton` — Loading_Indicator (Requirement 4.1)
 * - `EmptyState`      — Empty_State, explanatory text, NO retry control (Requirements 4.3, 4.5)
 * - `ErrorState`      — Error_State, explanatory text WITH a retry control (Requirements 4.4, 4.5)
 */

/** Shared Glass_Card-consistent surface for the empty/error presentations. */
const asyncSurface =
  "glass-card flex flex-col items-center justify-center rounded-[2rem] p-10 text-center";

/* ─── LoadingSkeleton ─────────────────────────────────────────────── */

export type LoadingSkeletonVariant = "rows" | "cards";

export interface LoadingSkeletonProps {
  /** Skeleton layout to render: stacked list rows or a grid of cards. */
  variant?: LoadingSkeletonVariant;
  /** Number of skeleton placeholders to render. */
  count?: number;
  /** Accessible label announced to assistive tech while loading. */
  label?: string;
  className?: string;
}

/**
 * Loading_Indicator presentation: a set of token-based skeleton rows or cards rendered
 * inside a Glass_Card-consistent surface. Exposes `role="status"` + `aria-busy` so the
 * loading state is programmatically determinable (Requirements 4.1, 10.1).
 */
export function LoadingSkeleton({
  variant = "rows",
  count = 4,
  label = "Loading content",
  className,
}: LoadingSkeletonProps) {
  const items = Array.from({ length: Math.max(1, count) });

  if (variant === "cards") {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-live="polite"
        data-testid="loading-skeleton"
        className={cn(
          "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
          className,
        )}
      >
        <span className="sr-only">{label}</span>
        {items.map((_, index) => (
          <div
            key={index}
            className="glass-card flex flex-col gap-4 rounded-[2rem] p-6"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-2xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      data-testid="loading-skeleton"
      className={cn("glass-card space-y-4 rounded-[2rem] p-6", className)}
    >
      <span className="sr-only">{label}</span>
      {items.map((_, index) => (
        <div key={index} className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

/* ─── EmptyState ──────────────────────────────────────────────────── */

export interface AsyncEmptyStateProps {
  /** Short heading explaining the absence of data. */
  title?: string;
  /** Longer explanatory text that distinguishes empty from error (Requirement 4.5). */
  description?: string;
  /** Optional icon; defaults to a neutral inbox glyph from the shared lucide set. */
  icon?: LucideIcon;
  /**
   * Optional, non-retry call to action (e.g. "Create the first record").
   * An Empty_State deliberately exposes NO retry control (Requirement 4.5).
   */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Empty_State presentation shown when a request succeeds with zero records. Presents
 * distinct explanatory text and, by construction, NO retry control so that absence of
 * data is never presented the same way as a failure (Requirements 4.3, 4.5).
 */
export function EmptyState({
  title = "Nothing here yet",
  description = "No records exist for this view in the current tenant scope.",
  icon: Icon = Inbox,
  action,
  className,
}: AsyncEmptyStateProps) {
  return (
    <div data-testid="empty-state" className={cn(asyncSurface, className)}>
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-muted text-muted-foreground">
        <Icon className="h-8 w-8" aria-hidden="true" />
      </div>
      <h3 className="mb-2 text-xl font-black uppercase tracking-tight text-foreground">
        {title}
      </h3>
      <p className="max-w-md text-sm font-medium leading-relaxed text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-8">{action}</div> : null}
    </div>
  );
}

/* ─── ErrorState ──────────────────────────────────────────────────── */

export interface ErrorStateProps {
  /** Short heading stating that the data could not be loaded. */
  title?: string;
  /** Longer explanatory text that distinguishes error from empty (Requirement 4.5). */
  description?: string;
  /** Optional icon; defaults to a warning glyph from the shared lucide set. */
  icon?: LucideIcon;
  /** Retry handler wired to the query refetch by `QueryBoundary` (Requirement 4.7). */
  onRetry?: () => void;
  /** Label for the retry control. */
  retryLabel?: string;
  className?: string;
}

/**
 * Error_State presentation shown when a request fails (or times out). Presents distinct
 * explanatory text AND a retry control so that failure to load is clearly different from
 * an empty result (Requirements 4.4, 4.5). The retry control re-initiates the request
 * when activated (Requirement 4.7).
 */
export function ErrorState({
  title = "Couldn't load this data",
  description = "Something went wrong while loading this view. Check your connection and try again.",
  icon: Icon = AlertTriangle,
  onRetry,
  retryLabel = "Retry",
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      data-testid="error-state"
      className={cn(asyncSurface, className)}
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-destructive/10 text-destructive">
        <Icon className="h-8 w-8" aria-hidden="true" />
      </div>
      <h3 className="mb-2 text-xl font-black uppercase tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mb-8 max-w-md text-sm font-medium leading-relaxed text-muted-foreground">
        {description}
      </p>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry} className="gap-2">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
