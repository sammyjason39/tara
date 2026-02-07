import type { AttendanceRecord } from "@/core/types/hr/attendance";
import { ensureSeed, nextId, saveToStorage } from "./storage";

const key = (tenantId: string) => `hr:${tenantId}:attendance`;

const seedAttendance = (tenantId: string): AttendanceRecord[] => [
  {
    id: `${tenantId}-att-001`,
    tenantId,
    employeeId: `${tenantId}-emp-001`,
    date: "2026-02-05",
    checkInAt: "2026-02-05T08:58:00.000Z",
    checkOutAt: "2026-02-05T17:10:00.000Z",
    status: "on_time",
    source: "kiosk",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: `${tenantId}-att-002`,
    tenantId,
    employeeId: `${tenantId}-emp-002`,
    date: "2026-02-05",
    checkInAt: "2026-02-05T09:23:00.000Z",
    status: "late",
    source: "kiosk",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: `${tenantId}-att-003`,
    tenantId,
    employeeId: `${tenantId}-emp-003`,
    date: "2026-02-05",
    status: "leave",
    source: "system",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const attendanceRepo = {
  list(tenantId: string): AttendanceRecord[] {
    return ensureSeed(key(tenantId), seedAttendance(tenantId));
  },

  create(
    tenantId: string,
    payload: Omit<AttendanceRecord, "id" | "tenantId" | "createdAt" | "updatedAt">,
  ): AttendanceRecord {
    const records = this.list(tenantId);
    const now = new Date().toISOString();
    const record: AttendanceRecord = {
      ...payload,
      id: nextId(`${tenantId}-att`),
      tenantId,
      createdAt: now,
      updatedAt: now,
    };
    const updated = [record, ...records];
    saveToStorage(key(tenantId), updated);
    return record;
  },
};
