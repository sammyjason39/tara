export class JobRequisition {
  id: string;
  tenant_id: string;
  department_id?: string;
  title: string;
  status: "open" | "closed" | "screening" | "interview" | "offer" | "rejected";
  openings: number;
  created_at: Date;
  updated_at: Date;
}
