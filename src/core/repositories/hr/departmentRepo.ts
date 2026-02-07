import type { Department } from "@/core/types/hr/department";
import { ensureSeed, saveToStorage } from "./storage";

const key = (tenantId: string) => `hr:${tenantId}:departments`;

const seedDepartments = (tenantId: string): Department[] => [
  {
    id: "dept-ops",
    tenantId,
    name: "Operations",
    code: "OPS",
    status: "active",
    headId: `${tenantId}-emp-001`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "dept-fin",
    tenantId,
    name: "Finance",
    code: "FIN",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "dept-compl",
    tenantId,
    name: "Compliance",
    code: "COMP",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "dept-hr",
    tenantId,
    name: "HR",
    code: "HR",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "dept-sec",
    tenantId,
    name: "Security",
    code: "SEC",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const departmentRepo = {
  list(tenantId: string): Department[] {
    return ensureSeed(key(tenantId), seedDepartments(tenantId));
  },

  create(tenantId: string, payload: Omit<Department, "tenantId" | "createdAt" | "updatedAt">): Department {
    const departments = this.list(tenantId);
    const now = new Date().toISOString();
    const department: Department = {
      ...payload,
      tenantId,
      createdAt: now,
      updatedAt: now,
    };
    const updated = [department, ...departments];
    saveToStorage(key(tenantId), updated);
    return department;
  },
};
