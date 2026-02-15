import type {
  EmergencyOverride,
  ScheduleAssignment,
  Shift,
  ShiftSwapRequest,
} from "@/core/types/hr/scheduling";
import { ensureSeed, nextId, saveToStorage } from "./storage";

const SHIFTS_KEY = (tenantId: string) => `hr:${tenantId}:schedules:shifts`;
const ASSIGNMENTS_KEY = (tenantId: string) => `hr:${tenantId}:schedules:assignments`;
const MOVES_KEY = (tenantId: string) => `hr:${tenantId}:schedules:moves`; // Swaps & Overrides

const SEED_SHIFTS = (tenantId: string): Shift[] => [
  {
    id: "shift-morning",
    tenantId,
    name: "Morning Standard",
    startTime: "09:00",
    endTime: "17:00",
    breakDuration: 60,
    flexibleWindow: 15,
    workDays: [1, 2, 3, 4, 5],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "shift-evening",
    tenantId,
    name: "Evening Operations",
    startTime: "14:00",
    endTime: "22:00",
    breakDuration: 45,
    flexibleWindow: 10,
    workDays: [1, 2, 3, 4, 5, 6],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const SEED_ASSIGNMENTS = (tenantId: string): ScheduleAssignment[] => [
  {
    id: "assign-001",
    tenantId,
    employeeId: `${tenantId}-emp-001`,
    shiftId: "shift-morning",
    locationId: "loc-hq",
    effectiveDate: "2024-01-01",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "assign-002",
    tenantId,
    employeeId: `${tenantId}-emp-002`,
    shiftId: "shift-evening",
    locationId: "loc-store-001",
    effectiveDate: "2024-01-01",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const schedulingRepo = {
  listShifts(tenantId: string): Shift[] {
    return ensureSeed(SHIFTS_KEY(tenantId), SEED_SHIFTS(tenantId));
  },

  getShift(tenantId: string, shiftId: string): Shift | undefined {
    return this.listShifts(tenantId).find((s) => s.id === shiftId);
  },

  listAssignments(tenantId: string): ScheduleAssignment[] {
    return ensureSeed(ASSIGNMENTS_KEY(tenantId), SEED_ASSIGNMENTS(tenantId));
  },

  getAssignment(tenantId: string, employeeId: string): ScheduleAssignment | undefined {
    // Logic: Find latest active assignment
    // Mock: just finding the first matching for now
    return this.listAssignments(tenantId).find((a) => a.employeeId === employeeId);
  },

  // Swaps & Overrides
  saveSwapRequest(tenantId: string, request: ShiftSwapRequest) {
    const key = `${MOVES_KEY(tenantId)}:swaps`;
    const swaps = ensureSeed(key, []) as ShiftSwapRequest[];
    const updated = [...swaps.filter((s) => s.id !== request.id), request];
    saveToStorage(key, updated);
  },

  listSwaps(tenantId: string): ShiftSwapRequest[] {
    const key = `${MOVES_KEY(tenantId)}:swaps`;
    return ensureSeed(key, []) as ShiftSwapRequest[];
  },

  saveOverride(tenantId: string, override: EmergencyOverride) {
    const key = `${MOVES_KEY(tenantId)}:overrides`;
    const overrides = ensureSeed(key, []) as EmergencyOverride[];
    const updated = [...overrides.filter((o) => o.id !== override.id), override];
    saveToStorage(key, updated);
  },

  listOverrides(tenantId: string): EmergencyOverride[] {
    const key = `${MOVES_KEY(tenantId)}:overrides`;
    return ensureSeed(key, []) as EmergencyOverride[];
  },
};
