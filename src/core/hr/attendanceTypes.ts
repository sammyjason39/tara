export type AttendanceStatus = "on_time" | "late" | "absent" | "remote";

export type AttendanceLog = {
  id: string;
  tenantId: string;
  employeeId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: AttendanceStatus;
  createdAt: string;
  updatedAt: string;
};
