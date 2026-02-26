import type {
  EmergencyOverride,
  ScheduleAssignment,
  Shift,
  ShiftSwapRequest,
} from "@/core/types/hr/scheduling";
import { prisma } from "@/core/persistence/database/client";

/**
 * Mapping helper for Shift
 */
const mapToShift = (db: any): Shift => ({
  id: db.id,
  tenantId: db.tenantId,
  name: db.name,
  startTime: db.startTime,
  endTime: db.endTime,
  breakDuration: db.breakDuration,
  flexibleWindow: db.flexibleWindow,
  workDays: db.workDays,
  createdAt: db.createdAt.toISOString(),
  updatedAt: db.updatedAt.toISOString(),
} as Shift);

/**
 * Mapping helper for Assignment
 */
const mapToAssignment = (db: any): ScheduleAssignment => ({
  id: db.id,
  tenantId: db.tenantId,
  employeeId: db.employeeId,
  shiftId: db.shiftId,
  locationId: db.locationId,
  effectiveDate: db.effectiveDate.toISOString().split('T')[0],
  createdAt: db.createdAt.toISOString(),
  updatedAt: db.updatedAt.toISOString(),
} as ScheduleAssignment);

export const schedulingRepo = {
  /**
   * Shifts
   */
  async listShifts(tenantId: string): Promise<Shift[]> {
    const list = await prisma.shift.findMany({
      where: { tenantId: tenantId },
      orderBy: { name: 'asc' },
    });
    return list.map(mapToShift);
  },

  async getShift(tenantId: string, shiftId: string): Promise<Shift | undefined> {
    const record = await prisma.shift.findFirst({
      where: { id: shiftId, tenantId: tenantId },
    });
    return record ? mapToShift(record) : undefined;
  },

  /**
   * Assignments
   */
  async listAssignments(tenantId: string): Promise<ScheduleAssignment[]> {
    const list = await prisma.scheduleAssignment.findMany({
      where: { tenantId: tenantId },
    });
    return list.map(mapToAssignment);
  },

  async getAssignment(tenantId: string, employeeId: string): Promise<ScheduleAssignment | undefined> {
    const record = await prisma.scheduleAssignment.findFirst({
      where: { employeeId, tenantId: tenantId },
    });
    return record ? mapToAssignment(record) : undefined;
  },

  /**
   * Swaps & Overrides
   */
  async saveSwapRequest(tenantId: string, request: ShiftSwapRequest): Promise<void> {
    await prisma.shiftSwapRequest.upsert({
      where: { id: request.id },
      update: {
        status: request.status,
      },
      create: {
        id: request.id,
        tenantId: tenantId,
        requesterId: request.requesterId,
        targetId: request.targetEmployeeId,
        shiftId: request.shiftId,
        status: request.status,
      },
    });
  },

  async listSwaps(tenantId: string): Promise<ShiftSwapRequest[]> {
    const list = await prisma.shiftSwapRequest.findMany({
      where: { tenantId: tenantId },
    });
    return list.map((db) => ({
      id: db.id,
      tenantId: db.tenantId,
      requesterId: db.requesterId,
      targetEmployeeId: db.targetId,
      shiftId: db.shiftId,
      date: new Date().toISOString().split('T')[0], // Mock date if missing in DB
      status: db.status as any,
      reason: "Swap Request", // Mock reason if missing in DB
      createdAt: db.createdAt.toISOString(),
      updatedAt: db.updatedAt.toISOString(),
    }));
  },

  async saveOverride(tenantId: string, override: EmergencyOverride): Promise<void> {
    await prisma.emergencyOverride.upsert({
      where: { id: override.id },
      update: {
        reason: override.reason,
        startDate: new Date(override.date),
        endDate: new Date(override.date),
      },
      create: {
        id: override.id,
        tenantId: tenantId,
        employeeId: override.coveringEmployeeId,
        reason: override.reason,
        startDate: new Date(override.date),
        endDate: new Date(override.date),
      },
    });
  },

  async listOverrides(tenantId: string): Promise<EmergencyOverride[]> {
    const list = await prisma.emergencyOverride.findMany({
      where: { tenantId: tenantId },
    });
    return list.map((db) => ({
      id: db.id,
      tenantId: db.tenantId,
      absentEmployeeId: db.employeeId, // Assuming employeeId in DB is the one being covered?
      coveringEmployeeId: db.employeeId,
      shiftId: "shift-default",
      date: db.startDate.toISOString().split('T')[0],
      reason: db.reason,
      authorizedBy: "SYSTEM",
      payrollImpact: true,
      createdAt: db.createdAt.toISOString(),
      updatedAt: db.updatedAt.toISOString(),
    }));
  },
};
