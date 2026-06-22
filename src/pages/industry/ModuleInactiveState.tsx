import { Lock } from "lucide-react";

import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";

/**
 * Presentation shown when an Industry module is INACTIVE for the authenticated
 * tenant. Rather than rendering a broken Page (empty tables, dead controls), the
 * Industry Page_Group conveys the unavailable state explicitly with a clear,
 * theme-token-based surface (Requirements 16.4, 2.5).
 *
 * It deliberately exposes NO data controls — only an optional, non-destructive
 * navigation affordance toward the Module Hub so an operator with the right
 * permissions can request activation.
 */
export interface ModuleInactiveStateProps {
  /** Human-readable module name, e.g. "Clinic Operations". */
  moduleName: string;
  /** Optional handler for the "go activate" affordance (e.g. navigate to ModuleHub). */
  onManageModules?: () => void;
}

export function ModuleInactiveState({
  moduleName,
  onManageModules,
}: ModuleInactiveStateProps) {
  return (
    <GlassCard
      data-testid="module-inactive-state"
      role="status"
      className="flex flex-col items-center justify-center rounded-[2rem] p-12 text-center"
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-muted text-muted-foreground">
        <Lock className="h-8 w-8" aria-hidden="true" />
      </div>
      <h3 className="mb-2 text-xl font-black uppercase tracking-tight text-foreground">
        {moduleName} is not active
      </h3>
      <p className="max-w-md text-sm font-medium leading-relaxed text-muted-foreground">
        This module is not activated for your organization, so its workspace is
        unavailable. Activate it from the Module Hub to start using these
        industry workflows.
      </p>
      {onManageModules ? (
        <Button variant="outline" onClick={onManageModules} className="mt-8 gap-2">
          <Lock className="h-4 w-4" aria-hidden="true" />
          Manage modules
        </Button>
      ) : null}
    </GlassCard>
  );
}

export default ModuleInactiveState;
