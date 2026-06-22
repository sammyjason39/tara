import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Home, RefreshCcw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "./ErrorBoundary";

/**
 * Recovery affordance shared by {@link PageErrorBoundary} and
 * {@link RootErrorBoundary}. It identifies the failed surface, offers a soft
 * retry (which clears the boundary state and resets react-query without a full
 * reload) and a return-to-safe-route control, while leaving any surrounding
 * Layout chrome (sidebar/header) operable when mounted inside a Layout.
 *
 * The `data-testid="error-boundary"` hook and the `Runtime Exception` heading
 * are preserved so Playwright can detect crash surfaces deterministically.
 */
interface ErrorFallbackProps {
  routeLabel?: string;
  /** Soft retry: clear boundary state + react-query reset (falls back to reload). */
  onRetry: () => void;
  /** Hard reload fallback when a soft retry cannot recover the surface. */
  onReload: () => void;
  /** Navigate back to a known-good Route. */
  onReturnToSafeRoute: () => void;
  /** Full-screen presentation for the root-level variant. */
  fullScreen?: boolean;
}

function ErrorFallback({
  routeLabel,
  onRetry,
  onReload,
  onReturnToSafeRoute,
  fullScreen = false,
}: ErrorFallbackProps) {
  return (
    <div
      data-testid="error-boundary"
      className={
        "glass-card flex flex-col items-center justify-center p-8 space-y-8 animate-in fade-in duration-700 rounded-[3rem] border border-border shadow-2xl " +
        (fullScreen ? "min-h-screen m-0" : "min-h-[400px] m-8")
      }
    >
      <div className="relative">
        <div className="h-24 w-24 bg-destructive rounded-[2.5rem] flex items-center justify-center animate-pulse">
          <ShieldAlert className="h-12 w-12 text-destructive-foreground" />
        </div>
        <div className="absolute -top-2 -right-2 h-8 w-8 bg-card rounded-full flex items-center justify-center shadow-lg border border-border">
          <AlertTriangle className="h-4 w-4 text-warning" />
        </div>
      </div>

      <div className="text-center space-y-3 max-w-md">
        <h2 className="text-3xl font-black tracking-tighter uppercase italic text-foreground leading-none">
          Runtime Exception
        </h2>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] leading-relaxed italic">
          {routeLabel
            ? `The "${routeLabel}" screen failed to render.`
            : "A critical logic branch has failed in the current module."}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <Button
          onClick={onRetry}
          className="rounded-2xl bg-primary hover:bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest px-8 h-12 shadow-xl gap-2 transition-all active:scale-95"
        >
          <RefreshCcw className="h-4 w-4" /> Retry
        </Button>
        <Button
          variant="outline"
          onClick={onReturnToSafeRoute}
          className="rounded-2xl border-border font-black text-[10px] uppercase tracking-widest px-8 h-12 gap-2 transition-all active:scale-95"
        >
          <Home className="h-4 w-4" /> Return to Safety
        </Button>
        <Button
          variant="ghost"
          onClick={onReload}
          className="rounded-2xl font-black text-[10px] uppercase tracking-widest px-6 h-12 text-muted-foreground transition-all active:scale-95"
        >
          Reload
        </Button>
      </div>

      <div className="pt-4 flex items-center gap-2">
        <div className="h-1 w-1 rounded-full bg-destructive" />
        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">
          Diagnostic Data captured for Audit
        </span>
      </div>
    </div>
  );
}

export interface PageErrorBoundaryProps {
  children: React.ReactNode;
  /** Identifies which Page failed in the error surface. */
  routeLabel?: string;
  /** Optional hook invoked alongside the soft retry. */
  onReset?: () => void;
}

/**
 * Route/outlet-level error boundary. Wraps the existing class
 * {@link ErrorBoundary} and standardizes the recovery affordance required by
 * Requirement 1.3: it identifies the failed Page (`routeLabel`), offers a soft
 * retry (clear boundary state + react-query reset, falling back to a reload)
 * and a return-to-safe-route control.
 *
 * Mounted INSIDE the Layout so the surrounding sidebar/header stay operable
 * when a Page throws.
 */
export function PageErrorBoundary({
  children,
  routeLabel,
  onReset,
}: PageErrorBoundaryProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Bumping the key remounts the inner ErrorBoundary, clearing its `hasError`
  // state so the children get a fresh render without a full page reload.
  const [resetKey, setResetKey] = useState(0);

  const handleRetry = useCallback(() => {
    // Soft reset: clear any errored react-query state, then remount the
    // boundary so the failed Page re-renders in place.
    queryClient.resetQueries();
    onReset?.();
    setResetKey((key) => key + 1);
  }, [queryClient, onReset]);

  const handleReload = useCallback(() => {
    window.location.reload();
  }, []);

  const handleReturnToSafeRoute = useCallback(() => {
    navigate("/core/dashboard");
  }, [navigate]);

  return (
    <ErrorBoundary
      key={resetKey}
      fallback={
        <ErrorFallback
          routeLabel={routeLabel}
          onRetry={handleRetry}
          onReload={handleReload}
          onReturnToSafeRoute={handleReturnToSafeRoute}
        />
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export interface RootErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional hook invoked alongside the soft retry. */
  onReset?: () => void;
}

/**
 * Top-level error boundary mounted inside `BrowserRouter`. Catches render
 * errors that escape the route shells and presents a full-screen recovery
 * surface. Uses a soft retry first (react-query reset + remount) and a reload
 * fallback, and routes the user back to the authenticated landing Route.
 */
export function RootErrorBoundary({ children, onReset }: RootErrorBoundaryProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [resetKey, setResetKey] = useState(0);

  const handleRetry = useCallback(() => {
    queryClient.resetQueries();
    onReset?.();
    setResetKey((key) => key + 1);
  }, [queryClient, onReset]);

  const handleReload = useCallback(() => {
    window.location.reload();
  }, []);

  const handleReturnToSafeRoute = useCallback(() => {
    navigate("/core/dashboard");
  }, [navigate]);

  return (
    <ErrorBoundary
      key={resetKey}
      fallback={
        <ErrorFallback
          routeLabel="Application"
          fullScreen
          onRetry={handleRetry}
          onReload={handleReload}
          onReturnToSafeRoute={handleReturnToSafeRoute}
        />
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export default PageErrorBoundary;