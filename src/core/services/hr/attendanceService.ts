import { attendanceRepo } from "@/core/repositories/hr/attendanceRepo";
import { employeeRepo } from "@/core/repositories/hr/employeeRepo";
import { workflowService } from "@/core/services/hr/workflowService";
import { audit } from "@/core/logging/audit";
import type { AttendanceEvent, AttendanceRecord } from "@/core/types/hr/attendance";
import type { SessionContext } from "@/core/security/session";
import { nextId } from "@/core/repositories/hr/storage";

import { schedulingService } from "@/core/services/hr/schedulingService";

// Helper to calculate distance
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

export const attendanceService = {
  getStats(tenantId: string) {
    const records = attendanceRepo.listRecords(tenantId);
    const today = new Date().toISOString().split("T")[0];
    const todayRecords = records.filter(r => r.date === today);

    return {
      present: todayRecords.filter(r => !r.checkOut).length,
      late: todayRecords.filter(r => r.status === "late").length,
      absent: 0, // Mock for now
      onLeave: 0 // Mock for now
    };
  },

  validateAccess(tenantId: string, locationId: string, deviceId: string, coordinates?: { lat: number; lng: number }) {
    const location = attendanceRepo.getLocation(tenantId, locationId);
    if (!location) throw new Error("Invalid location");

    const device = attendanceRepo.getDevice(tenantId, deviceId);
    if (!device || !device.isActive) throw new Error("Invalid or inactive device");

    if (device.type === "kiosk" && device.locationId && device.locationId !== locationId) {
       throw new Error("Device not authorized for this location");
    }

    if (coordinates) {
       const dist = getDistance(coordinates.lat, coordinates.lng, location.coordinates.lat, location.coordinates.lng);
       if (dist > location.geofenceRadius) {
         throw new Error(`You are outside the allowed geofence (${Math.round(dist)}m away)`);
       }
    }

    return true;
  },

  clockIn(tenantId: string, actor: SessionContext, input: {
      locationId: string;
      deviceId: string;
      coordinates?: { lat: number; lng: number };
      verificationMethod: AttendanceEvent["verificationMethod"];
  }) {
    // 1. Validate Access
    this.validateAccess(tenantId, input.locationId, input.deviceId, input.coordinates);

    // 2. Check if already clocked in
    const today = new Date().toISOString().split("T")[0];
    const existing = attendanceRepo.getRecord(tenantId, actor.userId, today);
    if (existing && existing.checkIn) {
      throw new Error("Already clocked in for today");
    }
    
    // Capture time once for consistency
    const now = new Date();

    // 3. Get Policy & Shift (Real Schedule Logic)
    const policy = attendanceRepo.getPolicy(tenantId);
    
    // Get assigned schedule for today (Standard -> Swap -> Override)
    const schedule = schedulingService.getDailySchedule(tenantId, actor.userId, today);
    
    if (!schedule) {
       // No schedule found = Unscheduled work? Or blocking?
       // For now allowing it but flagging as unscheduled
       console.warn(`[Attendance] No schedule found for ${actor.userId}`);
    }

    let status: AttendanceRecord["status"] = "on_time";
    let abnormalTags: string[] = [];
    let shiftStart = new Date(); // Default if unscheduled (could be policy driven)
    
    if (schedule) {
      // Parse shift start time (HH:mm)
      const [hours, minutes] = schedule.shift.startTime.split(":").map(Number);
      shiftStart.setHours(hours, minutes, 0, 0);

      const diffMinutes = (now.getTime() - shiftStart.getTime()) / 60000;

      if (diffMinutes > policy.gracePeriodMinutes) {
        status = "late";
        abnormalTags.push("late");
      }
    } else {
       // Unscheduled work handling
       abnormalTags.push("unscheduled");
    }

    // 4. Create Event
    const event: AttendanceEvent = {
       id: nextId("evt"),
       tenantId,
       employeeId: actor.userId,
       timestamp: now.toISOString(),
       type: "check_in",
       locationId: input.locationId,
       deviceId: input.deviceId,
       coordinates: input.coordinates,
       verificationMethod: input.verificationMethod
    };

    // 5. Create Record
    const record: AttendanceRecord = {
       id: nextId("att"),
       tenantId,
       employeeId: actor.userId,
       date: today,
       shiftId: "shift-default",
       policyId: policy.id,
       checkIn: event,
       status,
       abnormalTags,
       workDurationMinutes: 0,
       requiresAttention: status === "late",
       createdAt: now.toISOString(),
       updatedAt: now.toISOString(),
    };

    attendanceRepo.saveRecord(tenantId, record);

    // 6. Trigger Abnormal Workflow
    if (status === "late") {
       this.generateAbnormalCase(tenantId, actor, record);
    }

    audit.log({
        tenantId,
        actorId: actor.userId,
        action: "attendance.check_in",
        entityType: "attendance_record",
        entityId: record.id,
        after: { status, locationId: input.locationId }
    });

    return record;
  },

  clockOut(tenantId: string, actor: SessionContext, input: {
      locationId: string;
      deviceId: string;
      coordinates?: { lat: number; lng: number };
      verificationMethod: AttendanceEvent["verificationMethod"];
  }) {
     // 1. Validate Access
    this.validateAccess(tenantId, input.locationId, input.deviceId, input.coordinates);

    // 2. Find Record
    const today = new Date().toISOString().split("T")[0];
    const record = attendanceRepo.getRecord(tenantId, actor.userId, today);
    if (!record || !record.checkIn) {
       throw new Error("No check-in record found for today");
    }
    if (record.checkOut) {
       throw new Error("Already clocked out");
    }

    // 3. Create Event
    const now = new Date();
    const event: AttendanceEvent = {
       id: nextId("evt"),
       tenantId,
       employeeId: actor.userId,
       timestamp: now.toISOString(),
       type: "check_out",
       locationId: input.locationId,
       deviceId: input.deviceId,
       coordinates: input.coordinates,
       verificationMethod: input.verificationMethod
    };

    // 4. Update Record
    const checkInTime = new Date(record.checkIn.timestamp);
    const durationMinutes = Math.round((now.getTime() - checkInTime.getTime()) / 60000);

    const updatedRecord: AttendanceRecord = {
       ...record,
       checkOut: event,
       workDurationMinutes: durationMinutes,
       updatedAt: now.toISOString(),
    };

    attendanceRepo.saveRecord(tenantId, updatedRecord);

    audit.log({
        tenantId,
        actorId: actor.userId,
        action: "attendance.check_out",
        entityType: "attendance_record",
        entityId: record.id,
        after: { durationMinutes }
    });

    return updatedRecord;
  },

  generateAbnormalCase(tenantId: string, actor: SessionContext, record: AttendanceRecord) {
     const employee = employeeRepo.getById(tenantId, record.employeeId);
     // Fallback to searching all list if getById fails (superadmin case handled elsewhere but good safely)
     const targetEmployee = employee || employeeRepo.list(tenantId).find(e => e.userId === record.employeeId);
     
     if (!targetEmployee) return;

     workflowService.createRequest(tenantId, actor, {
        entityType: "ATTENDANCE",
        entityId: record.id,
        makerDept: targetEmployee.departmentId,
        destinationDept: "HR",
        notes: `Abnormal Attendance: ${record.status}`,
        metadata: {
           type: "abnormal_attendance",
           subtype: record.status,
           date: record.date
        }
     });
  }
}
