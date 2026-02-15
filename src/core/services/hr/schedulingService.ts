import type { SessionContext } from "@/core/security/session";
import type {
  DailySchedule,
  EmergencyOverride,
  ShiftSwapRequest,
} from "@/core/types/hr/scheduling";
import { schedulingRepo } from "@/core/repositories/hr/schedulingRepo";
import { workflowService } from "@/core/services/hr/workflowService";
import { nextId } from "@/core/repositories/hr/storage";
import { audit } from "@/core/logging/audit";

export const schedulingService = {
  getDailySchedule(
    tenantId: string,
    employeeId: string,
    date: string,
  ): DailySchedule | null {
    // 1. Check for Emergency Overrides (Highest Priority)
    const overrides = schedulingRepo
      .listOverrides(tenantId)
      .filter((o) => o.date === date && o.coveringEmployeeId === employeeId);

    if (overrides.length > 0) {
      const override = overrides[0]; // Take first overlap
      const shift = schedulingRepo.getShift(tenantId, override.shiftId);
      if (shift) {
        return {
          date,
          employeeId,
          shift,
          locationId: "loc-override", // Or derive from shift/assignment
          source: "OVERRIDE",
          overrideReferenceId: override.id,
        };
      }
    }

    // 2. Check for Approved Shift Swaps
    const swaps = schedulingRepo
      .listSwaps(tenantId)
      .filter(
        (s) =>
          s.date === date &&
          s.status === "APPROVED" &&
          (s.requesterId === employeeId || s.targetEmployeeId === employeeId),
      );

    // If I requested a swap away, I have NO shift (unless I swapped FOR another)
    // Simplified logic: If I am target, I get the shift. If I am requester, I lose my shift.
    const swappedIn = swaps.find((s) => s.targetEmployeeId === employeeId);
    if (swappedIn) {
      const shift = schedulingRepo.getShift(tenantId, swappedIn.shiftId);
      if (shift) {
        return {
          date,
          employeeId,
          shift,
          locationId: "loc-swap",
          source: "SWAP",
          overrideReferenceId: swappedIn.id,
        };
      }
    }

    const swappedOut = swaps.find((s) => s.requesterId === employeeId);
    if (swappedOut) {
      return null; // I gave away my shift
    }

    // 3. Fallback to Standard Schedule Assignment
    const assignment = schedulingRepo.getAssignment(tenantId, employeeId);
    if (assignment) {
      // Check if day matches
      const dayOfWeek = new Date(date).getDay();
      const shift = schedulingRepo.getShift(tenantId, assignment.shiftId);
      if (shift && shift.workDays.includes(dayOfWeek)) {
        return {
          date,
          employeeId,
          shift,
          locationId: assignment.locationId,
          source: "STANDARD",
        };
      }
    }

    return null;
  },

  requestSwap(
    tenantId: string,
    session: SessionContext,
    targetEmployeeId: string,
    shiftId: string,
    date: string,
    reason: string,
  ) {
    const request: ShiftSwapRequest = {
      id: nextId("swap"),
      tenantId,
      requesterId: session.userId,
      targetEmployeeId,
      shiftId,
      date,
      status: "PENDING",
      reason,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    schedulingRepo.saveSwapRequest(tenantId, request);

    // Create Workflow
    workflowService.createRequest(tenantId, session, {
      entityType: "SHIFT_SWAP",
      entityId: request.id,
      makerDept: session.departmentId,
      destinationDept: session.departmentId, // HOD Approval
      notes: `Shift Swap Request: ${reason}`,
      metadata: { date, targetEmployeeId },
    });

    return request;
  },

  submitOverride(
    tenantId: string,
    session: SessionContext,
    absentEmployeeId: string,
    coveringEmployeeId: string,
    shiftId: string,
    date: string,
    reason: string,
  ) {
    const override: EmergencyOverride = {
      id: nextId("override"),
      tenantId,
      absentEmployeeId,
      coveringEmployeeId,
      shiftId,
      date,
      reason,
      authorizedBy: session.userId,
      payrollImpact: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    schedulingRepo.saveOverride(tenantId, override);

    // Create Audit Workflow (Auto-approved effectively, but logged)
    workflowService.createRequest(tenantId, session, {
      entityType: "EMERGENCY_OVERRIDE",
      entityId: override.id,
      makerDept: session.departmentId,
      destinationDept: "HR",
      notes: `Emergency Override: ${reason} (Authorized by ${session.userId})`,
      metadata: { date, absentEmployeeId, coveringEmployeeId },
    });

    audit.log({
      tenantId,
      actorId: session.userId,
      action: "schedule.override",
      entityType: "schedule_override",
      entityId: override.id,
      after: { coveringEmployeeId },
    });

    return override;
  },
};
