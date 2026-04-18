export class BudgetScenario {
  id: string;
  tenant_id: string;
  name: string;
  fiscal_year: number;
  status: string;
  total_budget: number;
  description?: string;
  created_at: Date;
  updated_at: Date;
}
