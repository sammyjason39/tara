export interface Shift {
  id: string;
  tenant_id: string;
  name: string;
  start_time: string; // e.g. "09:00"
  end_time: string;   // e.g. "17:00"
  location_id?: string;
  department_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface EmployeeShiftAssignment {
  id: string;
  tenant_id: string;
  employee_id: string;
  shift_id: string;
  date: string;
}
