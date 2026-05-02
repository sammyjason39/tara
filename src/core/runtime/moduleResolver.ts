// ============================================================================
// MODULE RESOLVER (CORE RUNTIME)
// ============================================================================
//
// Resolves module activation + runtime-visible pages
// for a given tenant + runtime context.
//
// PURE FUNCTION.
// NO SIDE EFFECTS.
// NO UI.
// NO PERMISSION ENFORCEMENT.
//
// Phase 3 Contract Rules:
// - All modules MUST expose getPages()
// - Pages include React components
// - Core filters by device + hidden(ctx)
//
// ============================================================================

import type {
  ModulePageDefinition,
  ModulePageContext,
  ModuleId,
} from "@/modules/shared/contract";

import type { ModuleInstance, DeviceType, LayoutProfile } from "@/core/types";

import { getAllModuleContracts } from "@/core/runtime/moduleRegistry";

/* ============================================================================ */
/* RESOLVED OUTPUT TYPES                                                        */
/* ============================================================================ */

export interface ResolvedModule {
  id: ModuleId;
  name: string;
  description: string;
  category: "core" | "industry";

  /**
   * Activation state for this tenant.
   * (Licensing + persistence decides this)
   */
  isActive: boolean;

  /**
   * Runtime-visible pages.
   *
   * Rules:
   * - Empty if inactive
   * - Filtered by device + hidden(ctx)
   */
  pages: ReadonlyArray<ModulePageDefinition>;
}

/* ============================================================================ */
/* RESOLVER INPUT                                                               */
/* ============================================================================ */

export interface ModuleResolutionInput {
  tenantId: string;

  /**
   * Active module instances for tenant.
   *
   * Only active modules appear here.
   * Each instance includes tenant config.
   */
  activeModuleInstances: ModuleInstance[];

  /**
   * Runtime environment context.
   */
  deviceType: DeviceType;
  layoutProfile: LayoutProfile;
}

/* ============================================================================ */
/* INTERNAL FILTER HELPERS                                                      */
/* ============================================================================ */

/**
 * Apply canonical visibility filtering rules:
 * - Device compatibility
 * - hidden flag or hidden(ctx)
 */
function filterVisiblePages(
  pages: ReadonlyArray<ModulePageDefinition>,
  ctx: ModulePageContext,
): ModulePageDefinition[] {
  return (Array.isArray(pages) ? pages : []).filter((page) => {
    // ------------------------------------------------------------------------
    // Device Compatibility
    // ------------------------------------------------------------------------

    if (
      page.supportedDeviceTypes &&
      !page.supportedDeviceTypes.includes(ctx.deviceType)
    ) {
      return false;
    }

    // ------------------------------------------------------------------------
    // Static Hidden Flag
    // ------------------------------------------------------------------------

    if (page.hidden === true) {
      return false;
    }

    // ------------------------------------------------------------------------
    // Dynamic Hidden Resolver
    // ------------------------------------------------------------------------

    if (typeof page.hidden === "function") {
      return !page.hidden(ctx);
    }

    return true;
  });
}

/* ============================================================================ */
/* MODULE RESOLUTION (PRIMARY API)                                               */
/* ============================================================================ */

/**
 * Resolve all modules for runtime navigation + routing derivation.
 *
 * Output guarantees:
 * - Every registered module appears
 * - Inactive modules return pages: []
 * - Active modules return filtered pages
 */
export function resolveModules(
  input: ModuleResolutionInput,
): ReadonlyArray<ResolvedModule> {
  const { activeModuleInstances, deviceType, layoutProfile } = input;

  // Map active modules by id for O(1) lookup
  const activeModuleMap = new Map<ModuleId, ModuleInstance>(
    (Array.isArray(activeModuleInstances) ? activeModuleInstances : []).map((m) => [m.moduleId, m]),
  );

  const resolved: ResolvedModule[] = [];

  // Registry contains ALL modules known to the system
  const contracts = getAllModuleContracts();

  for (const contract of contracts) {
    const instance = activeModuleMap.get(contract.id);
    const isActive = Boolean(instance);

    // Default: inactive modules contribute no pages
    let pages: ModulePageDefinition[] = [];

    // Active module: resolve runtime-visible pages
    if (isActive && instance) {
      const ctx: ModulePageContext = {
        moduleConfig: instance.config,
        deviceType,
        layoutProfile,
      };

      // Phase 3 Rule: getPages() is mandatory
      const declaredPages = contract.getPages(instance.config);

      pages = filterVisiblePages(declaredPages, ctx);
    }

    resolved.push({
      id: contract.id,
      name: contract.name,
      description: contract.description,
      category: contract.category,
      isActive,
      pages,
    });
  }

  return resolved;
}
