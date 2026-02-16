// ============================================================================
// MODULE LAYOUT (PHASE 3)
// ============================================================================
//
// Purpose:
// - Shell wrapper for all industry modules
// - Provides consistent layout + outlet rendering
//
// Modules do NOT own layouts.
// Core owns layout enforcement.
//
// ============================================================================

import { Outlet, useParams, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export function ModuleLayout() {
  const { moduleId } = useParams();
  const location = useLocation();

  // Detect if we are in an operational or workspace route where we want a clean shell
  const isOperational = location.pathname.includes('/operational/');
  const isRetailBase = moduleId === 'retail' && (location.pathname.includes('/management/') || location.pathname.includes('/workspace'));
  
  const hideHeader = isOperational || isRetailBase;
  const noPadding = isOperational;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header - Suppressed for immersion-heavy modes */}
      {!hideHeader && (
        <header className="border-b px-6 py-3 font-semibold bg-white z-[40]">
          Module: {moduleId}
        </header>
      )}

      {/* Module Content */}
      <main className={cn("flex-1", !noPadding && "p-6")}>
        <Outlet />
      </main>
    </div>
  );
}
