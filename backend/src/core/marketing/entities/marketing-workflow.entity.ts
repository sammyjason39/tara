export class MarketingWorkflowStep {
  id: string;
  order: number;
  channel: "email" | "whatsapp" | "retargeting";
  waitHours: number;
  messageTemplate: string;
}

export class MarketingWorkflow {
  id: string;
  tenant_id: string;
  name: string;
  status: "draft" | "active" | "paused";
  trigger: "new_lead" | "score_below_threshold" | "reengagement";
  steps: MarketingWorkflowStep[];
  aiSuggestion?: string;
  created_at: Date;
  updated_at: Date;
  branch_id?: string;
  ecommerce_id?: string;
}


