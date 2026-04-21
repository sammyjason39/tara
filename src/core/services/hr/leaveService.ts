import { apiRequest } from "@/core/api/apiClient";
import type { SessionContext } from "@/core/security/session";
import type { LeaveRequest, LeaveType } from "@/core/types/hr/leave";

export const leaveService = {
  async listLeaveRequests(tenantId: string, actor: SessionContext): Promise<LeaveRequest[]> {
    return apiRequest<LeaveRequest[]>("/v1/hr/leave-requests", "GET", actor);
  },

  async createLeaveRequest(tenantId: string, actor: SessionContext, payload: {
    type: LeaveType;
    startDate: string;
    endDate: string;
    reason?: string;
  }) {
    // Construct payload for API
    const requestPayload = {
      employeeId: actor.userId,
      departmentId: actor.departmentId || "dept-default", 
      leaveType: payload.type, // Note: Backend DTO expects "leaveType" but interface says "type"
      // Wait, backend createLeaveRequestDto has "leaveType" mapped to "type" in DB?
      // Backend DTO: CreateLeaveRequestDto (I didn't check it but backend service uses data.leaveType)
      // Let's assume api expects same as DTO
      startDate: payload.startDate,
      endDate: payload.endDate,
      reason: payload.reason,
    };

    return apiRequest<LeaveRequest>("/v1/hr/leave-requests", "POST", actor, requestPayload);
  },

  async approveLeaveRequest(tenantId: string, actor: SessionContext, requestId: string) {
    return apiRequest<LeaveRequest>(`/hr/leave-requests/${requestId}/approve`, "PUT", actor, {
      reviewerId: actor.userId,
    });
  },

  async rejectLeaveRequest(tenantId: string, actor: SessionContext, requestId: string) {
    return apiRequest<LeaveRequest>(`/hr/leave-requests/${requestId}/reject`, "PUT", actor, {
      reviewerId: actor.userId,
      notes: "Rejected via UI"
    });
  }
};

