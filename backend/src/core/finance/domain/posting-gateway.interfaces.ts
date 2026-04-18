export enum PostingState {
  RECEIVED = 'RECEIVED',
  VALIDATED = 'VALIDATED',
  RULE_RESOLVED = 'RULE_RESOLVED',
  DRAFT_CREATED = 'DRAFT_CREATED',
  POSTED = 'POSTED',
  FAILED = 'FAILED',
  RETRY_PENDING = 'RETRY_PENDING',
  DLQ = 'DLQ',
}

export interface FinancialPostingRequest {
  request_id: string;
  tenant_id: string;
  company_id: string;
  source_module: string;
  sourceEventId: string;
  event_type: string;
  eventVersion: string;
  schemaVersion: string;
  payload: any;
  metadata?: Record<string, any>;
  created_at: Date;
}

export interface FinancialPostingResult {
  request_id: string;
  status: PostingState;
  journalId?: string;
  ledgerSequence?: number;
  errorCode?: string;
  errorMessage?: string;
  attempts: number;
}

export interface PostingContext {
  tenant_id: string;
  company_id: string;
  transactionCurrency: string;
  baseCurrency: string;
  exchangeRate: number;
  user_id?: string;
  correlation_id?: string;
}

export interface StateTransition {
  from: PostingState;
  to: PostingState;
  timestamp: Date;
  reason?: string;
}

export interface PostingAuditLog {
  id: string;
  request_id: string;
  stateTransitions: StateTransition[];
  fullRequestSnapshot: string; // Base64 or GZIP
  metadata?: Record<string, any>;
  created_at: Date;
}

export interface FinancialEventRegistry {
  event_type: string;
  eventVersion: string;
  schemaVersion: string;
  ruleTemplateId: string;
  isActive: boolean;
}
