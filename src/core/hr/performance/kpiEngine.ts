import type { KpiTemplate, ReviewCycle } from "./types";

const KPI_KEY = "core.hr.kpi.templates";
const CYCLE_KEY = "core.hr.kpi.cycles";

const read = <T>(key: string): T[] => {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T[]) : [];
};

const write = <T>(key: string, items: T[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(items));
};

const createId = (prefix: string) =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function createKpiTemplate(
  tenantId: string,
  departmentId: string,
  title: string,
  weight: number,
): KpiTemplate {
  const now = new Date().toISOString();
  const record: KpiTemplate = {
    id: createId("kpi"),
    tenantId,
    departmentId,
    title,
    weight,
    createdAt: now,
    updatedAt: now,
  };
  write(KPI_KEY, [...read<KpiTemplate>(KPI_KEY), record]);
  return record;
}

export function listKpiTemplates(tenantId: string, departmentId?: string): KpiTemplate[] {
  return read<KpiTemplate>(KPI_KEY).filter(
    (item) => item.tenantId === tenantId && (!departmentId || item.departmentId === departmentId),
  );
}

export function createReviewCycle(
  tenantId: string,
  payload: Omit<ReviewCycle, "id" | "tenantId" | "createdAt" | "updatedAt">,
): ReviewCycle {
  const now = new Date().toISOString();
  const cycle: ReviewCycle = {
    id: createId("cycle"),
    tenantId,
    ...payload,
    createdAt: now,
    updatedAt: now,
  };
  write(CYCLE_KEY, [...read<ReviewCycle>(CYCLE_KEY), cycle]);
  return cycle;
}

export function listReviewCycles(tenantId: string): ReviewCycle[] {
  return read<ReviewCycle>(CYCLE_KEY).filter((item) => item.tenantId === tenantId);
}
