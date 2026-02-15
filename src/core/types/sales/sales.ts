export type LeadSource =
  | "MARKETING"
  | "REFERRAL"
  | "INBOUND"
  | "OUTBOUND"
  | "PARTNER";

export type LeadPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type LeadStatus =
  | "NEW"
  | "ASSIGNED"
  | "CONTACTED"
  | "QUALIFIED"
  | "DISQUALIFIED"
  | "CONVERTED";

export type OpportunityStage =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "PROPOSAL"
  | "NEGOTIATION"
  | "CLOSED_WON"
  | "CLOSED_LOST";

export type OpportunityHealth = "LOW_RISK" | "MEDIUM_RISK" | "HIGH_RISK";

export type QuoteStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "SENT"
  | "ACCEPTED"
  | "EXPIRED";

export type TimelineChannel =
  | "NOTE"
  | "EMAIL"
  | "WHATSAPP"
  | "SMS"
  | "CALL"
  | "MEETING";

export type SalesTaskStatus = "PENDING" | "IN_PROGRESS" | "DONE" | "OVERDUE";
export type SalesTaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type SalesAlertType =
  | "LEAD_SLA_BREACH"
  | "FOLLOW_UP_OVERDUE"
  | "DEAL_RISK"
  | "QUOTE_APPROVAL_DELAY";

export type SalesAlertSeverity = "LOW" | "MEDIUM" | "HIGH";

export type SalesOrderStatus =
  | "DRAFT"
  | "PENDING_FINANCE_HANDOFF"
  | "INVOICED"
  | "CLOSED";

export type SalesLead = {
  id: string;
  tenantId: string;
  companyName: string;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  source: LeadSource;
  ownerId: string;
  ownerName: string;
  score: number;
  potentialValue: number;
  currency: "IDR" | "USD";
  priority: LeadPriority;
  status: LeadStatus;
  slaDueAt: string;
  firstResponseAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type SalesOpportunity = {
  id: string;
  tenantId: string;
  leadId?: string;
  accountName: string;
  ownerId: string;
  ownerName: string;
  stage: OpportunityStage;
  probability: number;
  amount: number;
  currency: "IDR" | "USD";
  expectedCloseDate: string;
  health: OpportunityHealth;
  nextAction: string;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
};

export type SalesQuote = {
  id: string;
  tenantId: string;
  opportunityId: string;
  accountName: string;
  version: number;
  amount: number;
  discountPercent: number;
  netAmount: number;
  currency: "IDR" | "USD";
  status: QuoteStatus;
  validUntil: string;
  approvalBy?: string;
  approvalAt?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type SalesTimelineEvent = {
  id: string;
  tenantId: string;
  opportunityId: string;
  leadId?: string;
  channel: TimelineChannel;
  direction: "OUTBOUND" | "INBOUND" | "INTERNAL";
  summary: string;
  detail?: string;
  createdBy: string;
  createdAt: string;
};

export type SalesTask = {
  id: string;
  tenantId: string;
  opportunityId?: string;
  leadId?: string;
  title: string;
  ownerId: string;
  ownerName: string;
  status: SalesTaskStatus;
  priority: SalesTaskPriority;
  dueAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type SalesAlert = {
  id: string;
  tenantId: string;
  type: SalesAlertType;
  severity: SalesAlertSeverity;
  entityType: "LEAD" | "OPPORTUNITY" | "QUOTE" | "TASK";
  entityId: string;
  message: string;
  acknowledged: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SalesOrder = {
  id: string;
  tenantId: string;
  opportunityId: string;
  quoteId?: string;
  customerName: string;
  amount: number;
  currency: "IDR" | "USD";
  status: SalesOrderStatus;
  inventoryCheck: "AVAILABLE" | "PARTIAL" | "UNAVAILABLE";
  financeInvoiceId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type SalesAuditEvent = {
  id: string;
  tenantId: string;
  actorId: string;
  action: string;
  entityType:
    | "LEAD"
    | "OPPORTUNITY"
    | "QUOTE"
    | "TIMELINE"
    | "TASK"
    | "ORDER"
    | "ALERT";
  entityId: string;
  detail: string;
  createdAt: string;
};

export type SalesNextAction = {
  id: string;
  priority: "P1" | "P2" | "P3";
  title: string;
  detail: string;
  targetRoute: string;
};

export type SalesDashboardMetrics = {
  openLeads: number;
  slaDueToday: number;
  overdueFollowUps: number;
  openOpportunities: number;
  pipelineValue: number;
  weightedPipelineValue: number;
  pendingQuoteApprovals: number;
  dealRiskCount: number;
};

export type SalesManagerMetrics = {
  totalReps: number;
  openPipeline: number;
  weightedForecast: number;
  stalledDeals: number;
  slaBreaches: number;
  approvalsPending: number;
};

export type SalesExecutiveForecast = {
  openPipelineValue: number;
  weightedForecastValue: number;
  wonThisPeriod: number;
  lostThisPeriod: number;
  conversionRate: number;
  avgDealCycleDays: number;
  forecastAccuracy: number;
};
