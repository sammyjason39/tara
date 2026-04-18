export interface AttendanceRecord {
  id: string;
  tenant_id: string;
  employee_id: string;
  date: string;
  clockInTime?: Date;
  clockOutTime?: Date;
  location_id?: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY';
  created_at: Date;
  updated_at: Date;
}
