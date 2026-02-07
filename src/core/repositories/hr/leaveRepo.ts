import type { LeaveRequest } from "@/core/types/hr/leave";
import { ensureSeed, nextId, saveToStorage } from "./storage";

const key = (tenantId: string) => `hr:${tenantId}:leave`;

const seedLeave = (tenantId: string): LeaveRequest[] => [
  {
    id: `${tenantId}-leave-001`,
    tenantId,
    employeeId: `${tenantId}-emp-003`,
    departmentId: "dept-compl",
    type: "annual",
    status: "requested",
    startDate: "2026-02-10",
    endDate: "2026-02-14",
    reason: "Planned leave",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: `${tenantId}-leave-002`,
    tenantId,
    employeeId: `${tenantId}-emp-001`,
    departmentId: "dept-ops",
    type: "sick",
    status: "approved",
    startDate: "2026-02-03",
    endDate: "2026-02-04",
    approverId: `${tenantId}-emp-005`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const leaveRepo = {
  list(tenantId: string): LeaveRequest[] {
    return ensureSeed(key(tenantId), seedLeave(tenantId));
  },

  create(
    tenantId: string,
    payload: Omit<LeaveRequest, "id" | "tenantId" | "createdAt" | "updatedAt">,
  ): LeaveRequest {
    const records = this.list(tenantId);
    const now = new Date().toISOString();
    const record: LeaveRequest = {
      ...payload,
      id: nextId(`${tenantId}-leave`),
      tenantId,
      createdAt: now,
      updatedAt: now,
    };
    const updated = [record, ...records];
    saveToStorage(key(tenantId), updated);
    return record;
  },

  update(tenantId: string, leaveId: string, patch: Partial<LeaveRequest>): LeaveRequest | null {
    const records = this.list(tenantId);
    let updatedRecord: LeaveRequest | null = null;
    const updated = records.map((record) => {
      if (record.id !== leaveId) return record;
      updatedRecord = { ...record, ...patch, updatedAt: new Date().toISOString() };
      return updatedRecord;
    });
    if (!updatedRecord) return null;
    saveToStorage(key(tenantId), updated);
    return updatedRecord;
  },
};
