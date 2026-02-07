import type { HRAuditFields } from "./base";

export type LeaveType = "annual" | "sick" | "personal" | "unpaid" | "maternity" | "paternity";
export type LeaveStatus = "requested" | "approved" | "rejected" | "cancelled";

export interface LeaveRequest extends HRAuditFields {
  id: string;
  tenantId: string;
  employeeId: string;
  departmentId: string;
  type: LeaveType;
  status: LeaveStatus;
  startDate: string;
  endDate: string;
  reason?: string;
  approverId?: string;
  approvalId?: string;
}
