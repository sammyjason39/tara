// ============================================================
// FARMING MODULE
// Industry Module: Agriculture & Livestock Operations
// ============================================================

import type {
  ModuleContract,
  ModulePageDefinition,
  ModuleConfig,
  ModuleConfigValidationResult,
  ReadonlyModuleConfig,
  Permission,
} from "../shared/contract";

import FarmDesk from "@/pages/industry/farming/FarmDesk";

const MODULE_ID = "farming" as const;
const MODULE_VERSION = "1.0.0" as const;
const BASE_ROUTE = `/m/${MODULE_ID}` as const;

const PERMISSIONS = {
  LIVESTOCK_READ: { resource: "farming.livestock", actions: ["read"] },
  LIVESTOCK_WRITE: { resource: "farming.livestock", actions: ["create", "update"] },
  IOT_READ: { resource: "farming.sensors", actions: ["read"] },
  CROPS_MANAGE: { resource: "farming.crops", actions: ["manage"] },
} satisfies Record<string, Permission>;

const PAGES: ReadonlyArray<ModulePageDefinition> = [
  {
    id: "desk",
    moduleId: MODULE_ID,
    title: "Farm Desk",
    route: `${BASE_ROUTE}/desk`,
    menuGroup: "operations",
    requiredPermissions: [PERMISSIONS.LIVESTOCK_READ],
    component: FarmDesk,
  },
];

export const farmingModule: ModuleContract = {
  id: MODULE_ID,
  name: "Farm & Livestock",
  description: "Smart farming, livestock tracking, and IoT sensor integration.",
  version: MODULE_VERSION,
  category: "industry",

  requiredCoreServices: ["inventory", "iot", "audit"],
  requiredPermissions: Object.values(PERMISSIONS),
  supportedDeviceTypes: ["desktop", "tablet", "kiosk"],

  getDefaultConfig: () => ({}),
  validateConfig: () => ({ valid: true, errors: [] }),

  getPages: () => PAGES,

  async onActivate(tenantId) {
    console.info(`[Farming] Activated for ${tenantId}`);
  },
};
