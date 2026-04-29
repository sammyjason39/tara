/**
 * Employee Entity
 * Represents an employee in the system
 */
export class Employee {
  id: string;
  tenant_id: string;
  location_id?: string;
  company_id?: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone?: string;
  department_id: string;
  user_id?: string;
  manager_id?: string;
  position: string;
  position_id?: string; // Relation alias for services
  job_title?: string; // Compatibility alias
  currency?: string; // Related to compensation/company
  role_title: string;
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
  employment_type: "full_time" | "part_time" | "contractor" | "intern" | "temporary";
  base_salary?: number;
  hourly_rate?: number;
  documents_metadata?: any;
  hire_date: Date;
  termination_date?: Date;
  hr_employee_skills?: any[];
  created_at: Date;
  updated_at: Date;
}
