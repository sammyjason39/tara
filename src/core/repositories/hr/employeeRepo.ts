import type { Employee } from "@/core/types/hr/employee";
import { ensureSeed, loadFromStorage, nextId, saveToStorage } from "./storage";

const key = (tenantId: string) => `hr:${tenantId}:employees`;

const seedEmployees = (tenantId: string): Employee[] => [
  {
    id: `${tenantId}-emp-001`,
    tenantId,
    userId: "user-demo",
    employeeCode: "EMP-001",
    firstName: "Amelia",
    lastName: "Hart",
    fullName: "Amelia Hart",
    email: "amelia.hart@company.com",
    phone: "+1 (555) 010-1001",
    departmentId: "dept-ops",
    managerId: "mgr-001",
    roleTitle: "Regional Manager",
    location: "West Region",
    status: "active",
    employmentType: "full_time",
    baseSalary: 8500,
    hourlyRate: 45,
    hireDate: "2024-03-12",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: `${tenantId}-emp-002`,
    tenantId,
    employeeCode: "EMP-002",
    firstName: "Victor",
    lastName: "Lim",
    fullName: "Victor Lim",
    email: "victor.lim@company.com",
    phone: "+1 (555) 010-1002",
    departmentId: "dept-fin",
    roleTitle: "Finance Controller",
    location: "HQ",
    status: "active",
    employmentType: "full_time",
    baseSalary: 9200,
    hourlyRate: 50,
    hireDate: "2023-11-05",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: `${tenantId}-emp-003`,
    tenantId,
    employeeCode: "EMP-003",
    firstName: "Sofia",
    lastName: "Ramirez",
    fullName: "Sofia Ramirez",
    email: "sofia.ramirez@company.com",
    phone: "+1 (555) 010-1003",
    departmentId: "dept-compl",
    roleTitle: "Compliance Lead",
    location: "EMEA",
    status: "on_leave",
    employmentType: "full_time",
    baseSalary: 7600,
    hourlyRate: 40,
    hireDate: "2022-06-18",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tenant-other-emp-001",
    tenantId: "tenant-other",
    userId: "user-cross",
    employeeCode: "EMP-CROSS-01",
    firstName: "Global",
    lastName: "Admin",
    fullName: "Global Admin",
    email: "global.admin@company.com",
    phone: "+1 (555) 999-9999",
    departmentId: "dept-ops",
    roleTitle: "Global Director",
    location: "Global HQ",
    status: "active",
    employmentType: "full_time",
    baseSalary: 12000,
    hourlyRate: 75,
    hireDate: "2020-01-01",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const employeeRepo = {
  list(tenantId: string): Employee[] {
    return ensureSeed(key(tenantId), seedEmployees(tenantId));
  },

  getById(tenantId: string, employeeId: string): Employee | undefined {
    return this.list(tenantId).find((emp) => emp.id === employeeId);
  },

  create(tenantId: string, payload: Omit<Employee, "id" | "tenantId" | "createdAt" | "updatedAt">): Employee {
    const employees = this.list(tenantId);
    const now = new Date().toISOString();
    const employee: Employee = {
      ...payload,
      id: nextId(`${tenantId}-emp`),
      tenantId,
      createdAt: now,
      updatedAt: now,
    };
    const updated = [employee, ...employees];
    saveToStorage(key(tenantId), updated);
    return employee;
  },

  update(tenantId: string, employeeId: string, patch: Partial<Employee>): Employee | null {
    const employees = this.list(tenantId);
    let updatedEmployee: Employee | null = null;
    const updated = employees.map((emp) => {
      if (emp.id !== employeeId) return emp;
      updatedEmployee = {
        ...emp,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      return updatedEmployee;
    });
    if (!updatedEmployee) return null;
    saveToStorage(key(tenantId), updated);
    return updatedEmployee;
  },

  delete(tenantId: string, employeeId: string): void {
    const employees = this.list(tenantId);
    const updated = employees.filter((emp) => emp.id !== employeeId);
    saveToStorage(key(tenantId), updated);
  },
};
