import type { PayrollRun } from "@/core/types/hr/payroll";
import { ensureSeed, nextId, saveToStorage } from "./storage";

const key = (tenantId: string) => `hr:${tenantId}:payroll-runs`;

const seedRuns = (tenantId: string): PayrollRun[] => [
  {
    id: `${tenantId}-pay-001`,
    tenantId,
    periodStart: "2026-02-01",
    periodEnd: "2026-02-15",
    status: "draft",
    totalEmployees: 42,
    totalGrossPay: 420000,
    totalNetPay: 320000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: `${tenantId}-pay-000`,
    tenantId,
    periodStart: "2026-01-16",
    periodEnd: "2026-01-31",
    status: "approved",
    totalEmployees: 40,
    totalGrossPay: 390000,
    totalNetPay: 300000,
    approvedBy: `${tenantId}-emp-001`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const payrollRepo = {
  listRuns(tenantId: string): PayrollRun[] {
    return ensureSeed(key(tenantId), seedRuns(tenantId));
  },

  getRun(tenantId: string, runId: string): PayrollRun | undefined {
    return this.listRuns(tenantId).find((run) => run.id === runId);
  },

  createRun(
    tenantId: string,
    payload: Omit<PayrollRun, "id" | "tenantId" | "createdAt" | "updatedAt">,
  ): PayrollRun {
    const runs = this.listRuns(tenantId);
    const now = new Date().toISOString();
    const run: PayrollRun = {
      ...payload,
      id: nextId(`${tenantId}-pay`),
      tenantId,
      createdAt: now,
      updatedAt: now,
    };
    const updated = [run, ...runs];
    saveToStorage(key(tenantId), updated);
    return run;
  },

  updateRun(tenantId: string, runId: string, patch: Partial<PayrollRun>): PayrollRun | null {
    const runs = this.listRuns(tenantId);
    let updatedRun: PayrollRun | null = null;
    const updated = runs.map((run) => {
      if (run.id !== runId) return run;
      updatedRun = { ...run, ...patch, updatedAt: new Date().toISOString() };
      return updatedRun;
    });
    if (!updatedRun) return null;
    saveToStorage(key(tenantId), updated);
    return updatedRun;
  },
};
