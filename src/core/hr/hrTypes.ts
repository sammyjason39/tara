export type StaffStatus = "active" | "inactive" | "terminated" | "on_leave";
export type EmploymentType = "full_time" | "part_time" | "contractor" | "intern";

export type StaffRecord = {
  id: string;
  tenantId: string;
  userId?: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  departmentId: string;
  roleTitle: string;
  location: string;
  status: StaffStatus;
  employmentType: EmploymentType;
  hireDate: string;
  baseSalary: number;
  hourlyRate: number;
  createdAt: string;
  updatedAt: string;
};
