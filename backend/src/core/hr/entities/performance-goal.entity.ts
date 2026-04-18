export class PerformanceGoal {
  id: string;
  tenant_id: string;
  employee_id: string;
  title: string;
  description?: string;
  targetDate: Date;
  progress: number;
  status: string; // IN_PROGRESS, COMPLETED, OVERDUE, CANCELLED
  created_at: Date;
  updated_at: Date;

  employee?: any;
}
