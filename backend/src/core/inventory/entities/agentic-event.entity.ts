export class AgenticEvent {
  id: string;
  tenant_id: string;
  event_type: string;
  entity_id: string;
  entity_type: string;
  payload: any;
  status: string;
  processedAt?: Date;
  errorMsg?: string;
  created_at: Date;
}
