import type { StaffRecord } from "./hrTypes";
import type { StaffRepository } from "./staffRepository";

const STORAGE_KEY = "core.hr.staff.repo";

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `staff-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const seedStaff = (tenantId: string): StaffRecord[] => {
  const now = new Date().toISOString();
  return [
    {
      id: createId(),
      tenantId,
      employeeCode: "EMP-1001",
      firstName: "Alya",
      lastName: "Putri",
      fullName: "Alya Putri",
      email: "alya.putri@tenant-demo.local",
      departmentId: "dept-hr",
      roleTitle: "HR Manager",
      location: "HQ",
      status: "active",
      employmentType: "full_time",
      hireDate: "2022-07-01",
      baseSalary: 12000000,
      hourlyRate: 80000,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: createId(),
      tenantId,
      employeeCode: "EMP-1002",
      firstName: "Bima",
      lastName: "Santoso",
      fullName: "Bima Santoso",
      email: "bima.santoso@tenant-demo.local",
      departmentId: "dept-fin",
      roleTitle: "Finance Admin",
      location: "HQ",
      status: "active",
      employmentType: "full_time",
      hireDate: "2021-09-15",
      baseSalary: 15000000,
      hourlyRate: 90000,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: createId(),
      tenantId,
      employeeCode: "EMP-1003",
      firstName: "Chandra",
      lastName: "Wijaya",
      fullName: "Chandra Wijaya",
      email: "chandra.wijaya@tenant-demo.local",
      departmentId: "dept-ops",
      roleTitle: "Operations Lead",
      location: "West Region",
      status: "on_leave",
      employmentType: "full_time",
      hireDate: "2020-01-20",
      baseSalary: 11000000,
      hourlyRate: 75000,
      createdAt: now,
      updatedAt: now,
    },
  ];
};

const read = (): StaffRecord[] => {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as StaffRecord[]) : [];
};

const write = (items: StaffRecord[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

const ensureSeed = (tenantId: string) => {
  const items = read();
  if (items.some((item) => item.tenantId === tenantId)) return;
  const next = [...items, ...seedStaff(tenantId)];
  write(next);
};

export const mockStaffRepo: StaffRepository = {
  listStaff(tenantId) {
    ensureSeed(tenantId);
    return read().filter((item) => item.tenantId === tenantId);
  },
  getStaff(tenantId, staffId) {
    ensureSeed(tenantId);
    return read().find(
      (item) => item.tenantId === tenantId && item.id === staffId,
    );
  },
  createStaff(tenantId, payload) {
    const items = read();
    const next = [...items, payload];
    write(next);
    return payload;
  },
  updateStaff(tenantId, payload) {
    const next = read().map((item) =>
      item.tenantId === tenantId && item.id === payload.id ? payload : item,
    );
    write(next);
    return payload;
  },
  deactivateStaff(tenantId, staffId) {
    const items = read();
    const current = items.find(
      (item) => item.tenantId === tenantId && item.id === staffId,
    );
    if (!current) return undefined;
    const next = items.map((item) =>
      item.tenantId === tenantId && item.id === staffId
        ? { ...item, status: "inactive", updatedAt: new Date().toISOString() }
        : item,
    );
    write(next);
    return { ...current, status: "inactive", updatedAt: new Date().toISOString() };
  },
};
