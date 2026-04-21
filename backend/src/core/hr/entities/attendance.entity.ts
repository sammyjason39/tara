/**
 * Attendance Entity
 * Represents employee attendance records
 */
export class Attendance {
  id: string;
  tenant_id: string;
  employee_id: string;
  location_id: string;
  date: Date;
  check_in?: any;
  check_out?: any;
  check_in_time?: Date;
  check_out_time?: Date;
  status: "PRESENT" | "ABSENT" | "LATE" | "OVERTIME" | "UNSCHEDULED" | string;
  type: string;
  source?: "BIOMETRIC" | "WEB" | "ADMIN_OVERRIDE" | string;
  device_id?: string;
  lateness_minutes: number;
  early_leave_minutes: number;
  overtime_minutes: number;
  is_locked: boolean;
  metadata?: any;
  audit_log?: any;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
  shift_id?: string;
  work_duration_minutes: number;
  work_schedule_id?: string;
  work_shift_id?: string;
}
