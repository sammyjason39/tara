export class SuccessionCandidate {
  id: string;
  tenant_id: string;
  planId: string;
  employee_id: string;
  readiness: string;
  readinessScore: number;
  riskOfLoss: string;
  impactOfLoss: string;
  skillGaps: string[];
  created_at: Date;
  updated_at: Date;
}
