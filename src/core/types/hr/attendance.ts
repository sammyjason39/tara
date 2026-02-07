import type { HRAuditFields } from "./base";

export type AttendanceStatus = "on_time" | "late" | "absent" | "remote" | "leave";

export interface AttendanceRecord extends HRAuditFields {
  id: string;
  tenantId: string;
  employeeId: string;
  date: string;
  checkInAt?: string;
  checkOutAt?: string;
  status: AttendanceStatus;
  source: "kiosk" | "mobile" | "manual" | "system";
}
