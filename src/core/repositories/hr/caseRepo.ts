import type { HRCase } from "@/core/types/hr/case";
import { ensureSeed, nextId, saveToStorage } from "./storage";

const key = (tenantId: string) => `hr:${tenantId}:cases`;

const seedCases = (tenantId: string): HRCase[] => [
  {
    id: `${tenantId}-case-001`,
    tenantId,
    title: "Payroll adjustment request",
    type: "payroll_correction",
    status: "open",
    employeeId: `${tenantId}-emp-002`,
    departmentId: "dept-fin",
    ownerId: "user-demo",
    priority: "high",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const caseRepo = {
  list(tenantId: string): HRCase[] {
    return ensureSeed(key(tenantId), seedCases(tenantId));
  },

  get(tenantId: string, caseId: string): HRCase | undefined {
    return this.list(tenantId).find((item) => item.id === caseId);
  },

  create(tenantId: string, payload: Omit<HRCase, "id" | "tenantId" | "createdAt" | "updatedAt">): HRCase {
    const cases = this.list(tenantId);
    const now = new Date().toISOString();
    const record: HRCase = {
      ...payload,
      id: nextId(`${tenantId}-case`),
      tenantId,
      createdAt: now,
      updatedAt: now,
    };
    const updated = [record, ...cases];
    saveToStorage(key(tenantId), updated);
    return record;
  },

  update(tenantId: string, caseId: string, patch: Partial<HRCase>): HRCase | undefined {
    const cases = this.list(tenantId);
    let updatedCase: HRCase | undefined;
    const next = cases.map((item) => {
      if (item.id !== caseId) return item;
      updatedCase = { ...item, ...patch, updatedAt: new Date().toISOString() };
      return updatedCase;
    });
    if (!updatedCase) return undefined;
    saveToStorage(key(tenantId), next);
    return updatedCase;
  },
};
