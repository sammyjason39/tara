export interface SalesNextAction {
  id: string;
  title: string;
  detail: string;
  priority: 'P1' | 'P2' | 'P3';
  opportunityId?: string;
  leadId?: string;
}
