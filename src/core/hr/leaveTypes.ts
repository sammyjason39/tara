export type LeaveType = "annual" | "sick" | "unpaid" | "special";

export type LeaveStatus = "draft" | "pending" | "approved" | "rejected" | "returned";

export type LeaveRequest = {
  id: string;
  tenantId: string;
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
  status: LeaveStatus;
  workflowId?: string;
  createdAt: string;
  updatedAt: string;
};
