import type { HRAuditFields } from "./base";

export interface Shift extends HRAuditFields {
  id: string;
  tenantId: string;
  name: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  breakDuration: number; // minutes
  flexibleWindow: number; // +/- minutes allowed
  workDays: number[]; // 0-6 (Sun-Sat)
}

export interface ScheduleAssignment extends HRAuditFields {
  id: string;
  tenantId: string;
  employeeId: string;
  shiftId: string;
  locationId: string;
  effectiveDate: string; // YYYY-MM-DD
  endDate?: string;
  overrideDate?: string; // If specific date only
}

export interface ShiftSwapRequest extends HRAuditFields {
  id: string;
  tenantId: string;
  requesterId: string;
  targetEmployeeId: string;
  shiftId: string; // The shift being swapped
  targetShiftId?: string; // If swapping two shifts
  date: string; // YYYY-MM-DD
  status: "PENDING" | "APPROVED" | "REJECTED";
  reason: string;
  notes?: string;
}

export interface EmergencyOverride extends HRAuditFields {
  id: string;
  tenantId: string;
  absentEmployeeId: string;
  coveringEmployeeId: string;
  shiftId: string;
  date: string; // YYYY-MM-DD
  reason: string;
  authorizedBy: string; // Manager ID
  payrollImpact: boolean;
}

export interface DailySchedule {
  date: string;
  employeeId: string;
  shift: Shift;
  locationId: string;
  source: "STANDARD" | "SWAP" | "OVERRIDE";
  overrideReferenceId?: string;
}
