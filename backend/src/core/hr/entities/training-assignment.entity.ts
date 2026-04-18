export class TrainingAssignment {
  id: string;
  tenant_id: string;
  programId: string;
  employee_id: string;
  status: string; // in_progress, completed
  assignedAt: Date;
  completedAt?: Date;
  created_at: Date;
  updated_at: Date;

  employee?: any;
  program?: any;
}
