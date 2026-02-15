// ============================================================
// RETAIL MODULE
// Industry Module: Retail POS
// ============================================================

import type {
  ModuleContract,
  ModulePageDefinition,
  ModuleConfig,
  ModuleConfigValidationResult,
  ReadonlyModuleConfig,
  Permission,
} from "../shared/contract";

// ============================================================
// PAGE COMPONENT IMPORTS (MODULE OWNED)
// ============================================================

import RetailWorkspace from "@/pages/retail/RetailWorkspace";
import RetailPOS from "@/pages/retail/RetailPOS";
import RetailManagement from "@/pages/retail/RetailManagement";
import RetailVerification from "@/pages/retail/RetailVerification";
import RetailInventory from "@/pages/retail/RetailInventory";

// ============================================================
// MODULE IDENTITY (LOCKED)
// ============================================================

const MODULE_ID = "retail" as const;
const MODULE_VERSION = "2.0.0" as const;

/**
 * Canonical module route prefix.
 * ALL module pages MUST live under this base.
 */
const BASE_ROUTE = `/m/${MODULE_ID}` as const;

// ============================================================
// CONFIGURATION
// ============================================================

export interface RetailModuleConfig extends ModuleConfig {
  taxRate: number;
  features: {
    barcodeScanning: boolean;
    requireShiftStart: boolean;
  };
}

const DEFAULT_CONFIG: RetailModuleConfig = {
  taxRate: 10, // Updated to match service logic
  features: {
    barcodeScanning: true,
    requireShiftStart: true,
  },
};

// ============================================================
// PERMISSIONS (CANONICAL)
// ============================================================

const PERMISSIONS = {
  RETAIL_ACCESS: {
    resource: "retail",
    actions: ["read", "manage"],
  },
  SALES_CREATE: {
    resource: "sales",
    actions: ["create"],
  },
} satisfies Record<string, Permission>;

// ============================================================
// PAGE DECLARATIONS (PHASE 3 COMPLIANT)
// ============================================================

const PAGES: ReadonlyArray<ModulePageDefinition> = [
  {
    id: "workspace",
    moduleId: MODULE_ID,
    title: "Retail Home",
    route: "/m/retail/workspace",
    icon: "Layout",
    menuGroup: "overview",
    requiredPermissions: [PERMISSIONS.RETAIL_ACCESS],
    component: RetailWorkspace,
  },
  {
    id: "pos",
    moduleId: MODULE_ID,
    title: "POS Terminal",
    route: "/m/retail/pos",
    icon: "ShoppingCart",
    menuGroup: "operations",
    requiredPermissions: [PERMISSIONS.RETAIL_ACCESS],
    component: RetailPOS,
  },
  {
    id: "management",
    moduleId: MODULE_ID,
    title: "Command Center",
    route: "/m/retail/management",
    icon: "BarChart3",
    menuGroup: "management",
    requiredPermissions: [PERMISSIONS.RETAIL_ACCESS],
    component: RetailManagement,
  },
  {
    id: "verification",
    moduleId: MODULE_ID,
    title: "Verification Desk",
    route: "/m/retail/verification",
    icon: "ShieldCheck",
    menuGroup: "operations",
    requiredPermissions: [PERMISSIONS.RETAIL_ACCESS],
    component: RetailVerification,
  },
  {
    id: "inventory",
    moduleId: MODULE_ID,
    title: "Stock & Receiving",
    route: "/m/retail/inventory",
    icon: "Package",
    menuGroup: "operations",
    requiredPermissions: [PERMISSIONS.RETAIL_ACCESS],
    component: RetailInventory,
  },
];

// ============================================================
// CONFIG VALIDATION (STRICT)
// ============================================================

function validateConfig(config: ModuleConfig): ModuleConfigValidationResult {
  const errors: string[] = [];
  const cfg = config as Partial<RetailModuleConfig>;

  if (typeof cfg.taxRate !== "number" || cfg.taxRate < 0) {
    errors.push("taxRate must be a non-negative number");
  }

  if (!cfg.features) {
    errors.push("features configuration is required");
  } else {
    if (typeof cfg.features.barcodeScanning !== "boolean") {
      errors.push("features.barcodeScanning must be a boolean");
    }
    if (typeof cfg.features.requireShiftStart !== "boolean") {
      errors.push("features.requireShiftStart must be a boolean");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================
// MODULE CONTRACT (FINAL)
// ============================================================

export const retailModule: ModuleContract = {
  id: MODULE_ID,
  name: "Retail Operations",
  description: "Retail sales and inventory",
  version: MODULE_VERSION,
  category: "industry",

  requiredCoreServices: ["inventory", "financial", "shift"],

  requiredPermissions: Object.values(PERMISSIONS),

  supportedDeviceTypes: ["desktop", "tablet", "kiosk"],

  getDefaultConfig: () => structuredClone(DEFAULT_CONFIG),

  validateConfig,

  /**
   * Single source of truth for navigation + routing.
   */
  getPages: (_config: ReadonlyModuleConfig) => PAGES,

  async onActivate(tenantId) {
    console.info(`[Retail] Activated for tenant ${tenantId}`);
  },

  async onDeactivate(tenantId) {
    console.info(`[Retail] Deactivated for tenant ${tenantId}`);
  },
};
