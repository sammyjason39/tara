/**
 * Attendance Entity
 * Represents employee attendance records
 */
export class Attendance {
  id: string;
  tenant_id: string;
  employee_id: string;
  location_id: string;
  clock_in: Date;
  clock_out?: Date;
  date: string; // YYYY-MM-DD format
  hours_worked?: number;
  status: "present" | "absent" | "late" | "half_day";
  notes?: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}
