// ============================================================
// CLINIC MODULE
// Industry Module: Medical & Healthcare Operations
// ============================================================

import type {
  ModuleContract,
  ModulePageDefinition,
  ModuleConfig,
  ModuleConfigValidationResult,
  ReadonlyModuleConfig,
  Permission,
} from "../shared/contract";

import ClinicDesk from "@/pages/industry/clinic/ClinicDesk";

const MODULE_ID = "clinic" as const;
const MODULE_VERSION = "1.0.0" as const;
const BASE_ROUTE = `/m/${MODULE_ID}` as const;

const PERMISSIONS = {
  PATIENTS_READ: { resource: "clinic.patients", actions: ["read"] },
  PATIENTS_WRITE: { resource: "clinic.patients", actions: ["create", "update"] },
  RECORDS_READ: { resource: "clinic.records", actions: ["read"] },
  BILLING_MANAGE: { resource: "clinic.billing", actions: ["manage"] },
} satisfies Record<string, Permission>;

const PAGES: ReadonlyArray<ModulePageDefinition> = [
  {
    id: "desk",
    moduleId: MODULE_ID,
    title: "Clinic Desk",
    route: `${BASE_ROUTE}/desk`,
    menuGroup: "operations",
    requiredPermissions: [PERMISSIONS.PATIENTS_READ],
    component: ClinicDesk,
  },
];

export const clinicModule: ModuleContract = {
  id: MODULE_ID,
  name: "Clinic Operations",
  description: "Comprehensive patient care and clinic management.",
  version: MODULE_VERSION,
  category: "industry",

  requiredCoreServices: ["inventory", "financial", "audit"],
  requiredPermissions: Object.values(PERMISSIONS),
  supportedDeviceTypes: ["desktop", "tablet"],

  getDefaultConfig: () => ({}),
  validateConfig: () => ({ valid: true, errors: [] }),

  getPages: () => PAGES,

  async onActivate(tenantId) {
    console.info(`[Clinic] Activated for ${tenantId}`);
  },
};
