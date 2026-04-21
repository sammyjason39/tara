import { apiRequest } from "@/core/api/apiClient";
import type { SessionContext } from "@/core/security/session";
import type { AttendanceEvent, AttendanceRecord } from "@/core/types/hr/attendance";

export const attendanceService = {
  async getStats(tenantId: string, session: SessionContext) {
    // Calling backend to get attendance records and calculating stats
    // Or ideally backend provides a stats endpoint
    const today = new Date().toISOString().split("T")[0];
    const records = await apiRequest<AttendanceRecord[]>("/v1/hr/attendance", "GET", session);
    const todayRecords = records.filter(r => r.date === today);
    
    return {
      present: todayRecords.filter(r => !r.checkOut).length,
      late: todayRecords.filter(r => r.status === "late").length,
      absent: 0, // Mock
      onLeave: 0 // Mock
    };
  },

  async validateAccess(tenantId: string, locationId: string, deviceId: string, coordinates?: { lat: number; lng: number }) {
    // Stub validation for now
    return true;
  },

  async clockIn(tenantId: string, actor: SessionContext, input: {
      locationId: string;
      deviceId: string;
      coordinates?: { lat: number; lng: number };
      verificationMethod: AttendanceEvent["verificationMethod"];
      reason?: string;
  }) {
    return apiRequest<AttendanceRecord>("/v1/hr/attendance/clock-in", "POST", actor, {
      locationId: input.locationId,
      employeeId: actor.userId,
      reason: input.reason
    });
  },

  async clockOut(tenantId: string, actor: SessionContext, input: {
      locationId: string;
      deviceId: string;
      coordinates?: { lat: number; lng: number };
      verificationMethod: AttendanceEvent["verificationMethod"];
  }) {
    return apiRequest<AttendanceRecord>("/v1/hr/attendance/clock-out", "POST", actor, {
      employeeId: actor.userId
    });
  },

  async generateAbnormalCase(tenantId: string, actor: SessionContext, record: AttendanceRecord) {
     console.log("Generating abnormal case for", record.id);
  },

  async listAttendance(tenantId: string, actor: SessionContext, startDate?: string, endDate?: string) {
    let query = "";
    if (startDate) query += `?startDate=${startDate}`;
    if (endDate) query += `&endDate=${endDate}`;
    
    // Note: Backend endpoint /hr/attendance currently returns records for the tenant
    // It might need employeeId filter if the UI expects it
    // The previous implementation used attendanceRepo.list(tenantId)
    return apiRequest<AttendanceRecord[]>(`/hr/attendance${query}`, "GET", actor);
  }
};

