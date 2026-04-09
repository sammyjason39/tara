/**
 * Employee Entity
 * Represents an employee in the system
 */
export class Employee {
  id: string;
  tenantId: string;
  locationId?: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  departmentId: string;
  userId?: string;
  managerId?: string;
  position: string;
  positionId?: string; // Relation alias for services
  jobTitle?: string; // Compatibility alias
  currency?: string; // Related to compensation/company
  roleTitle: string;
  status: 
    | "candidate" 
    | "offer" 
    | "hired" 
    | "probation" 
    | "active" 
    | "transferred" 
    | "promoted" 
    | "on_leave" 
    | "suspended" 
    | "terminated";
  employmentType: "full_time" | "part_time" | "contractor" | "intern" | "temporary";
  baseSalary?: number;
  hourlyRate?: number;
  documentsMetadata?: any;
  hireDate: Date;
  terminationDate?: Date;
  hrEmployeeSkills?: any[];
  createdAt: Date;
  updatedAt: Date;
}
