import type { Department } from "./departmentTypes";

const now = new Date().toISOString();

export const defaultDepartments: Department[] = [
  { id: "dept-hr", code: "HR", name: "Human Resources", createdAt: now, updatedAt: now, status: "active" },
  { id: "dept-fin", code: "FINANCE", name: "Finance", createdAt: now, updatedAt: now, status: "active" },
  { id: "dept-legal", code: "LEGAL", name: "Legal", createdAt: now, updatedAt: now, status: "active" },
  { id: "dept-proc", code: "PROCUREMENT", name: "Procurement", createdAt: now, updatedAt: now, status: "active" },
  { id: "dept-ops", code: "OPERATIONS", name: "Operations", createdAt: now, updatedAt: now, status: "active" },
  { id: "dept-it", code: "IT", name: "IT", createdAt: now, updatedAt: now, status: "active" },
  { id: "dept-admin", code: "ADMIN", name: "Administration", createdAt: now, updatedAt: now, status: "active" },
];
