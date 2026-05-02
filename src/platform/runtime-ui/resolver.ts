// ============================================================
// RUNTIME UI RESOLVER
// Dynamic navigation, page, and layout resolution
// ============================================================

import type {
  DeviceType,
  ModuleInstance,
  Role,
  PageDefinition,
  NavigationItem,
  LayoutType,
  Permission,
} from "@/core/types";

import type {
  ModuleContract,
  ModulePageDefinition,
  ModulePageContext,
  PermissionAction,
} from "@/modules/shared/contract";

// ============================================================
// CORE (STATIC) PAGE DEFINITIONS
// ============================================================

export const corePages: PageDefinition[] = [
  {
    id: "dashboard",
    moduleId: "core",
    path: "/core",
    title: "Dashboard",
    component: "core.dashboard",
    supportedDevices: ["desktop", "tablet", "mobile"],
    requiredPermissions: [],
    layout: "dashboard",
  },
  {
    id: "operations",
    moduleId: "core",
    path: "/core/operations",
    title: "Operations",
    component: "core.operations",
    supportedDevices: ["desktop", "tablet"],
    requiredPermissions: ["operations:read"],
    layout: "dashboard",
  },
  {
    id: "staff",
    moduleId: "core",
    path: "/core/staff",
    title: "Staff",
    component: "core.staff",
    supportedDevices: ["desktop", "tablet"],
    requiredPermissions: ["staff:read"],
    layout: "dashboard",
  },
  {
    id: "admin",
    moduleId: "core",
    path: "/core/admin",
    title: "Admin",
    component: "core.admin",
    supportedDevices: ["desktop"],
    requiredPermissions: ["admin:read"],
    layout: "dashboard",
  },
];

// ============================================================
// PERMISSION NORMALIZATION
// ============================================================

function normalizePermissions(perms?: Permission[]): string[] {
  if (!perms) return [];
  return perms.flatMap((p) =>
    (Array.isArray(p.actions) ? p.actions : []).map((action) => `${p.resource}:${action}`),
  );
}

// ============================================================
// ROLE / PERMISSION HELPERS
// ============================================================

function isSuperAdmin(roles: Role[] = []): boolean {
  return roles.some((r) => r.isSuperAdmin === true);
}

const PERMISSION_ACTIONS: readonly PermissionAction[] = [
  "create",
  "read",
  "update",
  "delete",
  "manage",
];

function isPermissionAction(value: string): value is PermissionAction {
  return PERMISSION_ACTIONS.includes(value as PermissionAction);
}

function hasPermission(roles: Role[], requiredPermissions: string[]): boolean {
  if (!requiredPermissions.length) return true;
  if (isSuperAdmin(roles)) return true;

  return roles.some((role) =>
    role.permissions.some((perm) =>
      requiredPermissions.some((req) => {
        const [resource, actionRaw] = req.split(":");

        if (!isPermissionAction(actionRaw)) {
          return false;
        }

        const action: PermissionAction = actionRaw;

        return (
          perm.resource === "*" ||
          (perm.resource === resource &&
            (perm.actions.includes("manage") || perm.actions.includes(action)))
        );
      }),
    ),
  );
}

// ============================================================
// MODULE PAGE NORMALIZER
// ============================================================

function normalizeModulePage(
  page: ModulePageDefinition,
  instance: ModuleInstance,
  ctx: ModulePageContext,
): PageDefinition {
  const hidden =
    typeof page.hidden === "function" ? page.hidden(ctx) : Boolean(page.hidden);

  return {
    id: page.id,
    moduleId: instance.moduleId,
    title: page.title,
    path: page.route,
    component: `${instance.moduleId}.${page.id}`,
    supportedDevices: page.supportedDeviceTypes ?? [],
    requiredPermissions: normalizePermissions(page.requiredPermissions),
    hidden,
    menuGroup: page.menuGroup,
    layout: "pos",
  };
}

// ============================================================
// ICON RESOLUTION (STRING-BASED)
// ============================================================

function resolveIcon(moduleId: string, pageId: string): string {
  const mapping: Record<string, Record<string, string>> = {
    core: {
      dashboard: "LayoutDashboard",
      operations: "ClipboardList",
      staff: "Users",
      admin: "Settings",
    },
    retail: {
      cashier: "ShoppingCart",
      inventory: "Package",
      shifts: "Clock",
      history: "History",
    },
    cafe: {
      cashier: "Coffee",
      tables: "Grid3X3",
      kitchen: "ChefHat",
    },
  };

  return mapping[moduleId]?.[pageId] ?? "LayoutDashboard";
}

// ============================================================
// NAVIGATION RESOLVER
// ============================================================

interface ResolveNavigationOptions {
  moduleId: string;
  deviceType: DeviceType;
  roles: Role[];
  activeModules: ModuleInstance[];
  moduleRegistry: Record<string, ModuleContract>;
  layoutProfile: ModulePageContext["layoutProfile"];
}

export function resolveNavigation(
  options: ResolveNavigationOptions,
): NavigationItem[] {
  const {
    moduleId,
    deviceType,
    roles,
    activeModules,
    moduleRegistry,
    layoutProfile,
  } = options;

  let pages: PageDefinition[] = [];

  if (moduleId === "core") {
    pages = corePages;
  } else {
    const instance = activeModules.find((m) => m.moduleId === moduleId);
    const contract = moduleRegistry[moduleId];
    if (!instance || !contract) return [];

    const ctx: ModulePageContext = {
      moduleConfig: instance.config,
      deviceType,
      layoutProfile,
    };

    pages = contract
      .getPages(instance.config)
      .map((p) => normalizeModulePage(p, instance, ctx));
  }

  return (Array.isArray(pages) ? pages : []).filter((page) => {
      if (!page.supportedDevices.includes(deviceType)) return false;
      if (page.hidden && !isSuperAdmin(roles)) return false;
      return hasPermission(roles, page.requiredPermissions ?? []);
    })
    .map((page) => ({
      id: page.id,
      label: page.title,
      path: page.path,
      moduleId: page.moduleId,
      icon: resolveIcon(page.moduleId, page.id),
      permission: page.requiredPermissions?.[0],
      menuGroup: page.menuGroup,
    }));
}

// ============================================================
// PAGE RESOLVER
// ============================================================

export function resolvePage(
  path: string,
  deviceType: DeviceType,
  activeModules: ModuleInstance[],
  moduleRegistry: Record<string, ModuleContract>,
  roles: Role[],
  layoutProfile: ModulePageContext["layoutProfile"],
): PageDefinition | undefined {
  const pages: PageDefinition[] = [...corePages];

  for (const instance of activeModules) {
    const contract = moduleRegistry[instance.moduleId];
    if (!contract) continue;

    const ctx: ModulePageContext = {
      moduleConfig: instance.config,
      deviceType,
      layoutProfile,
    };

    pages.push(
      ...contract
        .getPages(instance.config)
        .map((p) => normalizeModulePage(p, instance, ctx)),
    );
  }

  return pages.find((page) => {
    if (page.path !== path) return false;
    if (!page.supportedDevices.includes(deviceType)) return false;
    if (page.hidden && !isSuperAdmin(roles)) return false;
    return hasPermission(roles, page.requiredPermissions ?? []);
  });
}

// ============================================================
// LAYOUT RESOLVER
// ============================================================

export function resolveLayout(
  moduleId: string,
  instance?: ModuleInstance,
): LayoutType {
  if (moduleId === "core") return "dashboard";
  if (instance?.config?.layoutOverride)
    return instance.config.layoutOverride as LayoutType;
  return "pos";
}
