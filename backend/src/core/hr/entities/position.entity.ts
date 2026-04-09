/**
 * Position Entity
 * Represents a budgeted job slot (Headcount management)
 */
export class Position {
  id: string;
  tenantId: string;
  locationId: string;
  departmentId: string;
  title: string;
  grade: string;
  status: "open" | "filled" | "frozen" | "closed";
  budgetedSalary?: number;
  reportsToPositionId?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;

  positionSkills?: any[]; // Position skills
  department?: any;
  location?: any;
}
