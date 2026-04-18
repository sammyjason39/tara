export class PerformanceReview {
  id: string;
  tenant_id: string;
  cycleId: string;
  employee_id: string;
  reviewerId: string;
  status: "pending" | "submitted" | "calibrated" | "approved";
  rating?: number;
  comments?: string;
  created_at: Date;
  updated_at: Date;
}
