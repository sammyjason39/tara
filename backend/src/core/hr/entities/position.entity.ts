/**
 * Position Entity
 * Represents a budgeted job slot (Headcount management)
 */
export class Position {
  id: string;
  tenant_id: string;
  location_id: string;
  department_id: string;
  title: string;
  grade: string;
  status: "open" | "filled" | "frozen" | "closed";
  budgetedSalary?: number;
  reportsToPositionId?: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;

  positionSkills?: any[]; // Position skills
  department?: any;
  location?: any;
}
