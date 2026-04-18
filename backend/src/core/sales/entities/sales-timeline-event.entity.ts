export class SalesTimelineEvent {
  id: string;
  tenant_id: string;
  opportunityId: string;
  lead_id?: string;
  channel: "note" | "email" | "whatsapp" | "sms" | "call" | "meeting";
  direction: "outbound" | "inbound" | "internal";
  summary: string;
  detail?: string;
  createdBy: string;
  created_at: Date;
}
