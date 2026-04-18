import { SuccessionCandidate } from "./succession-candidate.entity";

export class SuccessionPlan {
  id: string;
  tenant_id: string;
  position_id: string;
  isCritical: boolean;
  strategy?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;

  candidates?: SuccessionCandidate[];
}
