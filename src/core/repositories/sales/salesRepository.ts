import type {
  SalesAlert,
  SalesAuditEvent,
  SalesLead,
  SalesOpportunity,
  SalesOrder,
  SalesQuote,
  SalesTask,
  SalesTimelineEvent,
} from "@/core/types/sales/sales";

export interface SalesRepository {
  listLeads: (tenantId: string) => SalesLead[];
  createLead: (tenantId: string, payload: SalesLead) => SalesLead;
  updateLead: (
    tenantId: string,
    id: string,
    patch: Partial<SalesLead>,
  ) => SalesLead | null;

  listOpportunities: (tenantId: string) => SalesOpportunity[];
  createOpportunity: (
    tenantId: string,
    payload: SalesOpportunity,
  ) => SalesOpportunity;
  updateOpportunity: (
    tenantId: string,
    id: string,
    patch: Partial<SalesOpportunity>,
  ) => SalesOpportunity | null;

  listQuotes: (tenantId: string) => SalesQuote[];
  createQuote: (tenantId: string, payload: SalesQuote) => SalesQuote;
  updateQuote: (
    tenantId: string,
    id: string,
    patch: Partial<SalesQuote>,
  ) => SalesQuote | null;

  listTimelineEvents: (tenantId: string) => SalesTimelineEvent[];
  createTimelineEvent: (
    tenantId: string,
    payload: SalesTimelineEvent,
  ) => SalesTimelineEvent;

  listTasks: (tenantId: string) => SalesTask[];
  createTask: (tenantId: string, payload: SalesTask) => SalesTask;
  updateTask: (
    tenantId: string,
    id: string,
    patch: Partial<SalesTask>,
  ) => SalesTask | null;

  listAlerts: (tenantId: string) => SalesAlert[];
  createAlert: (tenantId: string, payload: SalesAlert) => SalesAlert;
  updateAlert: (
    tenantId: string,
    id: string,
    patch: Partial<SalesAlert>,
  ) => SalesAlert | null;

  listOrders: (tenantId: string) => SalesOrder[];
  createOrder: (tenantId: string, payload: SalesOrder) => SalesOrder;
  updateOrder: (
    tenantId: string,
    id: string,
    patch: Partial<SalesOrder>,
  ) => SalesOrder | null;

  listAuditEvents: (tenantId: string) => SalesAuditEvent[];
  createAuditEvent: (
    tenantId: string,
    payload: SalesAuditEvent,
  ) => SalesAuditEvent;
}
