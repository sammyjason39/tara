export class TrainingProgram {
  id: string;
  tenant_id: string;
  name: string;
  status: string;
  completionRate: number;
  dueDate?: Date;
  created_at: Date;
  updated_at: Date;

  assignments?: any[];
  skills?: any[];
}
