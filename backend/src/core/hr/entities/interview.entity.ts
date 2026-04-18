export class Interview {
  id: string;
  tenant_id: string;
  candidateId: string;
  interviewerId: string;
  title: string;
  scheduledAt: Date;
  duration: number;
  location?: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  notes?: string;
  created_at: Date;
  updated_at: Date;
}
