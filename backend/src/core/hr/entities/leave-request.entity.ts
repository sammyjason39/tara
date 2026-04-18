/**
 * Leave Request Entity
 * Represents employee leave requests
 */
export class LeaveRequest {
  id: string;
  tenant_id: string;
  employee_id: string;
  leave_type:
    | "annual"
    | "sick"
    | "unpaid"
    | "maternity"
    | "paternity"
    | "emergency";
  start_date: Date;
  end_date: Date;
  total_days: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  requested_at: Date;
  reviewed_by?: string;
  reviewed_at?: Date;
  review_notes?: string;
  created_at: Date;
  updated_at: Date;
}
