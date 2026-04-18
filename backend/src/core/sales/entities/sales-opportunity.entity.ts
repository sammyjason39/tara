export class SalesOpportunity {
  id: string;
  tenant_id: string;
  lead_id?: string;
  account_name: string;
  owner_id: string;
  owner_name: string;
  stage:
    | "new"
    | "contacted"
    | "qualified"
    | "proposal"
    | "negotiation"
    | "closed_won"
    | "closed_lost";
  probability: number;
  amount: number;
  currency: "IDR" | "USD";
  expected_close_date: Date;
  health: "low_risk" | "medium_risk" | "high_risk";
  nextAction: string;
  lastActivityAt: Date;
  created_at: Date;
  updated_at: Date;
}
