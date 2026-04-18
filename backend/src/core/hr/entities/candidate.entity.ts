/**
 * Candidate Entity
 * Represents an individual in the recruitment funnel
 */
export class Candidate {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  requisitionId: string;
  source: string;
  status: "applied" | "screening" | "interview" | "offer" | "hired" | "rejected";
  resumeUrl?: string;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;

  requisition?: any;
}
