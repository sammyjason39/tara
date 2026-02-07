import type { HRAuditFields } from "./base";

export type EmploymentStatus = "active" | "inactive" | "terminated" | "on_leave";
export type EmploymentType = "full_time" | "part_time" | "contractor" | "intern";

export interface Employee extends HRAuditFields {
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
  managerId?: string;
  roleTitle: string;
  location: string;
  status: EmploymentStatus;
  employmentType: EmploymentType;
  baseSalary?: number;
  hourlyRate?: number;
  hireDate: string;
  terminationDate?: string;
}
