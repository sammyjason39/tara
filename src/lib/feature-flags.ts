export const FEATURE_KEYS = [
  "dashboard",
  "employees",
  "attendance",
  "leave",
  "payroll",
  "loans",
  "schedule",
  "sop",
  "notifications",
  "ai_assistant",
  "ai_logs",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export type FeatureModules = Record<FeatureKey, boolean>;

export interface FeatureDefinition {
  key: FeatureKey;
  label: string;
  description: string;
  group: "core" | "hr" | "finance" | "advanced";
}

export const DEFAULT_FEATURE_MODULES: FeatureModules = Object.fromEntries(
  FEATURE_KEYS.map((k) => [k, true]),
) as FeatureModules;

export const FEATURE_GROUP_LABELS: Record<FeatureDefinition["group"], string> = {
  core: "Inti",
  hr: "SDM & Kehadiran",
  finance: "Keuangan",
  advanced: "Lanjutan",
};

/** Web sidebar / route mapping */
export const WEB_ROUTE_FEATURES: Record<string, FeatureKey | null> = {
  "/web": "dashboard",
  "/web/employees": "employees",
  "/web/attendance": "attendance",
  "/web/leaves": "leave",
  "/web/payroll": "payroll",
  "/web/schedule": "schedule",
  "/web/sop": "sop",
  "/web/ai-logs": "ai_logs",
  "/web/notifications": "notifications",
  "/web/settings": null,
  "/web/profile": null,
};

/** Mobile bottom nav mapping */
export const MOBILE_ROUTE_FEATURES: Record<string, FeatureKey | null> = {
  "/m": "dashboard",
  "/m/clock": "attendance",
  "/m/leave": "leave",
  "/m/sop": "sop",
  "/m/notifications": "notifications",
  "/m/profile": null,
};

export function mergeFeatureModules(raw?: Partial<FeatureModules>): FeatureModules {
  return { ...DEFAULT_FEATURE_MODULES, ...raw };
}

export function isFeatureEnabled(
  modules: FeatureModules,
  feature: FeatureKey | null | undefined,
): boolean {
  if (!feature) return true;
  return modules[feature] ?? true;
}

export function routeFeatureForPath(pathname: string): FeatureKey | null {
  const normalized = pathname.replace(/\/+$/, "") || "/";

  if (normalized.startsWith("/web/employees")) return "employees";
  if (normalized.startsWith("/web/payroll")) return "payroll";
  if (normalized.startsWith("/web/settings")) return null;

  const web = WEB_ROUTE_FEATURES[normalized];
  if (web !== undefined) return web;

  const mobile = MOBILE_ROUTE_FEATURES[normalized];
  if (mobile !== undefined) return mobile;

  return null;
}
