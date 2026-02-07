// ============================================================================
// CORE PAGE RESOLVER (PHASE 3 — ROUTE CONTRACT)
// ============================================================================
//
// Purpose:
// - Resolve ALL Core pages
// - Core pages are ALWAYS active
// - Core pages are FIRST-CLASS routable contracts
//
// Rules:
// - Core pages MUST provide React components
// - Routes MUST live under /core/...
// - No tenant can disable Core
//
// ============================================================================

import type React from "react";

/* ============================================================================ */
/* IMPORT CORE PAGE COMPONENTS                                                  */
/* ============================================================================ */

import Dashboard from "@/pages/core/Dashboard";
import Operations from "@/pages/core/Operations";
import Finance from "@/pages/core/Finance";
import Purchasing from "@/pages/core/Purchasing";
import InventoryModule from "@/pages/core/InventoryModule";
import Staff from "@/pages/core/Staff";
import Modules from "@/pages/core/Modules";
import Reports from "@/pages/core/Reports";
import Integrations from "@/pages/core/Integrations";
import Settings from "@/pages/core/Settings";
import Admin from "@/pages/core/Admin";
import Security from "@/pages/core/Security";

/* ============================================================================ */
/* CORE PAGE CONTRACT TYPE                                                      */
/* ============================================================================ */

export interface CorePageDefinition {
  id: string;
  title: string;

  /**
   * Canonical Core route.
   *
   * MUST live under:
   *   /core/<page>
   */
  route: string;

  icon?: string;

  /**
   * Navigation grouping
   */
  section: "office" | "administration" | "system";

  /**
   * Whether page appears in navigation
   */
  visible: boolean;

  /**
   * React component bound to this page.
   *
   * Phase 3 Enforcement:
   * - App.tsx derives routes directly from this
   */
  component: React.ComponentType;
}

/* ============================================================================ */
/* STATIC CORE PAGE DEFINITIONS (LOCKED)                                        */
/* ============================================================================ */

const CORE_PAGES: readonly CorePageDefinition[] = Object.freeze([
  {
    id: "dashboard",
    title: "Dashboard",
    route: "/core/dashboard",
    icon: "dashboard",
    section: "office",
    visible: true,
    component: Dashboard,
  },

  {
    id: "operations",
    title: "Operations",
    route: "/core/operations",
    icon: "clipboard",
    section: "office",
    visible: true,
    component: Operations,
  },

  {
    id: "finance",
    title: "Finance",
    route: "/core/finance",
    icon: "wallet",
    section: "office",
    visible: true,
    component: Finance,
  },

  {
    id: "purchasing",
    title: "Purchasing",
    route: "/core/purchasing",
    icon: "clipboard-check",
    section: "office",
    visible: true,
    component: Purchasing,
  },

  {
    id: "inventory",
    title: "Inventory",
    route: "/core/inventory",
    icon: "package",
    section: "office",
    visible: true,
    component: InventoryModule,
  },

  {
    id: "admin",
    title: "Administration",
    route: "/core/admin",
    icon: "shield",
    section: "administration",
    visible: true,
    component: Admin,
  },

  {
    id: "staff",
    title: "Staff",
    route: "/core/staff",
    icon: "users",
    section: "administration",
    visible: true,
    component: Staff,
  },

  {
    id: "modules",
    title: "Modules",
    route: "/core/modules",
    icon: "puzzle",
    section: "administration",
    visible: true,
    component: Modules,
  },

  {
    id: "reports",
    title: "Reports",
    route: "/core/reports",
    icon: "chart",
    section: "office",
    visible: true,
    component: Reports,
  },

  {
    id: "integrations",
    title: "Integrations",
    route: "/core/integrations",
    icon: "link",
    section: "system",
    visible: true,
    component: Integrations,
  },

  {
    id: "security",
    title: "Security",
    route: "/core/security",
    icon: "shield-check",
    section: "system",
    visible: true,
    component: Security,
  },

  {
    id: "settings",
    title: "Settings",
    route: "/core/settings",
    icon: "settings",
    section: "system",
    visible: true,
    component: Settings,
  },
]);

/* ============================================================================ */
/* RESOLVER API                                                                 */
/* ============================================================================ */

/**
 * Resolve all Core pages.
 *
 * Core is absolute:
 * - Always exists
 * - Always active
 * - Always routable
 */
export function resolveCorePages(): readonly CorePageDefinition[] {
  return CORE_PAGES;
}
