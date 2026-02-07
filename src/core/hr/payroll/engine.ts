import type { Payslip, PayrollComponent, PayrollRun } from "./types";
import { calculateNetPay } from "./calculator";

const RUN_KEY = "core.hr.payroll.runs";

const createId = (prefix: string) =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const readRuns = (): PayrollRun[] => {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(RUN_KEY);
  return raw ? (JSON.parse(raw) as PayrollRun[]) : [];
};

const writeRuns = (items: PayrollRun[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RUN_KEY, JSON.stringify(items));
};

export function createPayrollRun(tenantId: string, periodStart: string, periodEnd: string): PayrollRun {
  const now = new Date().toISOString();
  const run: PayrollRun = {
    id: createId("payrun"),
    tenantId,
    periodStart,
    periodEnd,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
  writeRuns([run, ...readRuns()]);
  return run;
}

export function listPayrollRuns(tenantId: string): PayrollRun[] {
  return readRuns().filter((run) => run.tenantId === tenantId);
}

export function updatePayrollRun(
  tenantId: string,
  runId: string,
  patch: Partial<PayrollRun>,
): PayrollRun | undefined {
  const runs = readRuns();
  let updated: PayrollRun | undefined;
  const next = runs.map((run) => {
    if (run.tenantId !== tenantId || run.id !== runId) return run;
    updated = { ...run, ...patch, updatedAt: new Date().toISOString() };
    return updated;
  });
  if (!updated) return undefined;
  writeRuns(next);
  return updated;
}

export function generatePayslip(
  tenantId: string,
  employeeId: string,
  periodStart: string,
  periodEnd: string,
  components: PayrollComponent[],
): Payslip {
  const grossPay = components
    .filter((component) => component.type !== "deduction" && component.type !== "tax")
    .reduce((sum, component) => sum + component.amount, 0);
  const netPay = calculateNetPay(components);

  return {
    id: createId("payslip"),
    tenantId,
    employeeId,
    periodStart,
    periodEnd,
    grossPay,
    netPay,
    components,
    createdAt: new Date().toISOString(),
  };
}
