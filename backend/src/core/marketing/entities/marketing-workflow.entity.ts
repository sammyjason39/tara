export class MarketingWorkflowStep {
  id: string;
  order: number;
  channel: 'email' | 'whatsapp' | 'retargeting';
  waitHours: number;
  messageTemplate: string;
}

export class MarketingWorkflow {
  id: string;
  tenantId: string;
  name: string;
  status: 'draft' | 'active' | 'paused';
  trigger: 'new_lead' | 'score_below_threshold' | 'reengagement';
  steps: MarketingWorkflowStep[];
  aiSuggestion?: string;
  createdAt: Date;
  updatedAt: Date;
}

