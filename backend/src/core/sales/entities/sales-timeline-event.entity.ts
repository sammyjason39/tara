export class SalesTimelineEvent {
  id: string;
  tenantId: string;
  opportunityId: string;
  leadId?: string;
  channel: 'note' | 'email' | 'whatsapp' | 'sms' | 'call' | 'meeting';
  direction: 'outbound' | 'inbound' | 'internal';
  summary: string;
  detail?: string;
  createdBy: string;
  createdAt: Date;
}
