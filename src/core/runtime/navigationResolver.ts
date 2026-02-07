// ============================================================================
// NAVIGATION RESOLVER (PHASE 3 CANONICAL)
// ============================================================================
//
// Builds navigation structure for the UI.
//
// Responsibilities:
// - Merge Core + Module pages
// - Enforce permissions (canonical enforcement point)
// - Respect module activation state
// - Keep inactive modules visible but non-navigable (locked UX)
//
// Non-responsibilities:
// - License validation
// - Routing registration
// - UI rendering
//
// Phase 3 Rule:
// - Modules declare pages ONLY via getPages()
// - Core derives navigation dynamically
//
// ============================================================================

import type {
  Permission,
  DeviceType,
  ModuleInstance,
  LayoutProfile,
} from "@/core/types";

import type { ModuleId } from "@/modules/shared/contract";

import { resolveCorePages } from "./corePageResolver";
import { resolveModules } from "./moduleResolver";

/* ============================================================================ */
/* NAVIGATION TYPES                                                             */
/* ============================================================================ */

export interface NavigationItem {
  id: string;

  /**
   * Display label for menus
   */
  label: string;

  /**
   * Route path.
   * Undefined = locked / inactive / inaccessible.
   */
  path?: string;

  /**
   * Optional icon identifier
   */
  icon?: string;

  /**
   * Owning module
   */
  moduleId: ModuleId;

  /**
   * Locked UX state
   */
  disabled?: boolean;

  /**
   * Navigation grouping (cashier/admin/ops/etc)
   */
  menuGroup?: string;
}

/* ============================================================================ */
/* PERMISSION ENFORCEMENT (CANONICAL CORE LOGIC)                                */
/* ============================================================================ */

/**
 * Checks whether a user satisfies required permissions.
 *
 * Canonical enforcement:
 * - '*' resource grants access to everything
 * - 'manage' grants all actions
 */
function hasPermission(
  userPermissions: Permission[],
  required?: Permission[],
): boolean {
  if (!required || required.length === 0) return true;

  return required.every((req) =>
    userPermissions.some(
      (p) =>
        (p.resource === "*" || p.resource === req.resource) &&
        (p.actions.includes("manage") ||
          req.actions.every((a) => p.actions.includes(a))),
    ),
  );
}

/* ============================================================================ */
/* RESOLVER INPUT                                                               */
/* ============================================================================ */

export interface ResolveNavigationOptions {
  /**
   * Runtime device context
   */
  deviceType: DeviceType;

  /**
   * User permission set (already resolved by Core IAM)
   */
  userPermissions: Permission[];

  /**
   * Active module runtime instances
   * (comes from persistence / licensing layer)
   */
  activeModuleInstances: ModuleInstance[];

  /**
   * Runtime layout context
   */
  layoutProfile: LayoutProfile;
}

/* ============================================================================ */
/* NAVIGATION RESOLVER (PRIMARY EXPORT)                                          */
/* ============================================================================ */

export function resolveNavigation(
  options: ResolveNavigationOptions,
): NavigationItem[] {
  const { deviceType, userPermissions, activeModuleInstances, layoutProfile } =
    options;

  const navigation: NavigationItem[] = [];

  // ===========================================================================
  // 1. CORE PAGES (ALWAYS ACTIVE)
  // ===========================================================================

  const corePages = resolveCorePages();

  for (const page of corePages) {
    if (!page.visible) continue;

    navigation.push({
      id: page.id,
      label: page.title,
      path: page.route,
      icon: page.icon,
      moduleId: "core",
      menuGroup: page.section,
      disabled: false,
    });
  }

  const toolsAllowed = hasPermission(userPermissions, [
    { resource: "core.tools", actions: ["read"] },
  ]);

  if (toolsAllowed) {
    navigation.push({
      id: "core-tools",
      label: "WorkSuite",
      path: "/core/tools",
      icon: "toolbox",
      moduleId: "core",
      menuGroup: "office",
      disabled: false,
    });
  }

  // ===========================================================================
  // 2. MODULE PAGES (DYNAMIC, PHASE 3)
  // ===========================================================================

  const resolvedModules = resolveModules({
    tenantId: "runtime",
    activeModuleInstances,
    deviceType,
    layoutProfile,
  });

  for (const module of resolvedModules) {
    for (const page of module.pages) {
      // -----------------------------------------------------------------------
      // Permission enforcement (Core-owned)
      // -----------------------------------------------------------------------

      const allowed = hasPermission(userPermissions, page.requiredPermissions);

      if (!allowed) {
        // Not visible at all if unauthorized
        continue;
      }

      // -----------------------------------------------------------------------
      // Locked UX behavior:
      // - Visible always
      // - Clickable only if module active
      // -----------------------------------------------------------------------

      navigation.push({
        id: `${module.id}:${page.id}`,
        label: page.title,

        // Only active modules produce navigable routes
        path: module.isActive ? page.route : undefined,

        // Module owns icon declaration
        icon: page.icon,

        moduleId: module.id,

        // Locked state if inactive
        disabled: !module.isActive,

        menuGroup: page.menuGroup,
      });
    }
  }

  return navigation;
}
