import {
  ensureSeed,
  loadFromStorage,
  saveToStorage,
} from "@/core/repositories/hr/storage";
import type { SalesRepository } from "@/core/repositories/sales/salesRepository";
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

const nowIso = () => new Date().toISOString();

const leadsKey = (tenantId: string) => `sales:${tenantId}:leads`;
const opportunitiesKey = (tenantId: string) => `sales:${tenantId}:opportunities`;
const quotesKey = (tenantId: string) => `sales:${tenantId}:quotes`;
const timelineKey = (tenantId: string) => `sales:${tenantId}:timeline`;
const tasksKey = (tenantId: string) => `sales:${tenantId}:tasks`;
const alertsKey = (tenantId: string) => `sales:${tenantId}:alerts`;
const ordersKey = (tenantId: string) => `sales:${tenantId}:orders`;
const auditKey = (tenantId: string) => `sales:${tenantId}:audit`;

const seedLeads = (tenantId: string): SalesLead[] => [
  {
    id: `${tenantId}-lead-001`,
    tenantId,
    companyName: "Acme Retail",
    contactName: "Lena Ward",
    contactEmail: "lena.ward@acmeretail.example",
    contactPhone: "+1-202-555-0114",
    source: "MARKETING",
    ownerId: "rep-jessie",
    ownerName: "Jessie Allan",
    score: 88,
    potentialValue: 420000,
    currency: "USD",
    priority: "HIGH",
    status: "CONTACTED",
    slaDueAt: new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString(),
    firstResponseAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    updatedAt: nowIso(),
  },
  {
    id: `${tenantId}-lead-002`,
    tenantId,
    companyName: "Northline Group",
    contactName: "Carlos Nguyen",
    contactEmail: "carlos@northline.example",
    source: "REFERRAL",
    ownerId: "rep-ava",
    ownerName: "Ava Reynolds",
    score: 75,
    potentialValue: 250000,
    currency: "USD",
    priority: "MEDIUM",
    status: "NEW",
    slaDueAt: new Date(Date.now() + 1000 * 60 * 60 * 1).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    updatedAt: nowIso(),
  },
  {
    id: `${tenantId}-lead-003`,
    tenantId,
    companyName: "Zenith Partners",
    contactName: "Yuna Kim",
    contactEmail: "yuna@zenith.example",
    source: "INBOUND",
    ownerId: "rep-henry",
    ownerName: "Henry Pham",
    score: 92,
    potentialValue: 900000,
    currency: "USD",
    priority: "URGENT",
    status: "QUALIFIED",
    slaDueAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    firstResponseAt: new Date(Date.now() - 1000 * 60 * 60 * 7).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    updatedAt: nowIso(),
  },
];

const seedOpportunities = (tenantId: string): SalesOpportunity[] => [
  {
    id: `${tenantId}-opp-001`,
    tenantId,
    leadId: `${tenantId}-lead-001`,
    accountName: "Acme Retail",
    ownerId: "rep-jessie",
    ownerName: "Jessie Allan",
    stage: "PROPOSAL",
    probability: 62,
    amount: 420000,
    currency: "USD",
    expectedCloseDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21).toISOString().slice(0, 10),
    health: "MEDIUM_RISK",
    nextAction: "Send revised proposal with implementation timeline.",
    lastActivityAt: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    updatedAt: nowIso(),
  },
  {
    id: `${tenantId}-opp-002`,
    tenantId,
    leadId: `${tenantId}-lead-003`,
    accountName: "Zenith Partners",
    ownerId: "rep-henry",
    ownerName: "Henry Pham",
    stage: "NEGOTIATION",
    probability: 78,
    amount: 900000,
    currency: "USD",
    expectedCloseDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().slice(0, 10),
    health: "LOW_RISK",
    nextAction: "Confirm legal redline comments and close.",
    lastActivityAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString(),
    updatedAt: nowIso(),
  },
];

const seedQuotes = (tenantId: string): SalesQuote[] => [
  {
    id: `${tenantId}-quote-001`,
    tenantId,
    opportunityId: `${tenantId}-opp-001`,
    accountName: "Acme Retail",
    version: 2,
    amount: 420000,
    discountPercent: 5,
    netAmount: 399000,
    currency: "USD",
    status: "PENDING_APPROVAL",
    validUntil: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10).toISOString().slice(0, 10),
    createdBy: "rep-jessie",
    notes: "Bundled implementation and support.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 15).toISOString(),
    updatedAt: nowIso(),
  },
];

const seedTimeline = (tenantId: string): SalesTimelineEvent[] => [
  {
    id: `${tenantId}-timeline-001`,
    tenantId,
    opportunityId: `${tenantId}-opp-001`,
    leadId: `${tenantId}-lead-001`,
    channel: "EMAIL",
    direction: "OUTBOUND",
    summary: "Proposal follow-up sent",
    detail: "Shared revised scope and requested feedback by Friday.",
    createdBy: "rep-jessie",
    createdAt: new Date(Date.now() - 1000 * 60 * 70).toISOString(),
  },
  {
    id: `${tenantId}-timeline-002`,
    tenantId,
    opportunityId: `${tenantId}-opp-002`,
    leadId: `${tenantId}-lead-003`,
    channel: "CALL",
    direction: "INBOUND",
    summary: "Negotiation call with procurement lead",
    detail: "Commercial terms accepted, legal review pending.",
    createdBy: "rep-henry",
    createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
  },
];

const seedTasks = (tenantId: string): SalesTask[] => [
  {
    id: `${tenantId}-task-001`,
    tenantId,
    opportunityId: `${tenantId}-opp-001`,
    title: "Send revised payment milestone matrix",
    ownerId: "rep-jessie",
    ownerName: "Jessie Allan",
    status: "IN_PROGRESS",
    priority: "HIGH",
    dueAt: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    updatedAt: nowIso(),
  },
  {
    id: `${tenantId}-task-002`,
    tenantId,
    opportunityId: `${tenantId}-opp-002`,
    title: "Collect signed legal redline summary",
    ownerId: "rep-henry",
    ownerName: "Henry Pham",
    status: "OVERDUE",
    priority: "URGENT",
    dueAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    updatedAt: nowIso(),
  },
];

const seedAlerts = (tenantId: string): SalesAlert[] => [
  {
    id: `${tenantId}-alert-001`,
    tenantId,
    type: "LEAD_SLA_BREACH",
    severity: "HIGH",
    entityType: "LEAD",
    entityId: `${tenantId}-lead-003`,
    message: "Lead response SLA breached by 2 hours.",
    acknowledged: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
    updatedAt: nowIso(),
  },
];

const seedOrders = (tenantId: string): SalesOrder[] => [
  {
    id: `${tenantId}-order-001`,
    tenantId,
    opportunityId: `${tenantId}-opp-002`,
    customerName: "Zenith Partners",
    amount: 900000,
    currency: "USD",
    status: "PENDING_FINANCE_HANDOFF",
    inventoryCheck: "AVAILABLE",
    createdBy: "rep-henry",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    updatedAt: nowIso(),
  },
];

const seedAudit = (tenantId: string): SalesAuditEvent[] => [
  {
    id: `${tenantId}-audit-001`,
    tenantId,
    actorId: "rep-jessie",
    action: "lead.contacted",
    entityType: "LEAD",
    entityId: `${tenantId}-lead-001`,
    detail: "First outreach completed within SLA.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
  },
];

const updateById = <T extends { id: string }>(
  items: T[],
  id: string,
  patch: Partial<T>,
): { updated: T | null; next: T[] } => {
  let updated: T | null = null;
  const next = items.map((item) => {
    if (item.id !== id) return item;
    updated = { ...item, ...patch };
    return updated;
  });
  return { updated, next };
};

export const mockSalesRepo: SalesRepository = {
  listLeads(tenantId) {
    return ensureSeed<SalesLead[]>(leadsKey(tenantId), seedLeads(tenantId));
  },
  createLead(tenantId, payload) {
    const next = [payload, ...this.listLeads(tenantId)];
    saveToStorage(leadsKey(tenantId), next);
    return payload;
  },
  updateLead(tenantId, id, patch) {
    const { updated, next } = updateById(this.listLeads(tenantId), id, patch);
    if (updated) saveToStorage(leadsKey(tenantId), next);
    return updated;
  },

  listOpportunities(tenantId) {
    return ensureSeed<SalesOpportunity[]>(
      opportunitiesKey(tenantId),
      seedOpportunities(tenantId),
    );
  },
  createOpportunity(tenantId, payload) {
    const next = [payload, ...this.listOpportunities(tenantId)];
    saveToStorage(opportunitiesKey(tenantId), next);
    return payload;
  },
  updateOpportunity(tenantId, id, patch) {
    const { updated, next } = updateById(
      this.listOpportunities(tenantId),
      id,
      patch,
    );
    if (updated) saveToStorage(opportunitiesKey(tenantId), next);
    return updated;
  },

  listQuotes(tenantId) {
    return ensureSeed<SalesQuote[]>(quotesKey(tenantId), seedQuotes(tenantId));
  },
  createQuote(tenantId, payload) {
    const next = [payload, ...this.listQuotes(tenantId)];
    saveToStorage(quotesKey(tenantId), next);
    return payload;
  },
  updateQuote(tenantId, id, patch) {
    const { updated, next } = updateById(this.listQuotes(tenantId), id, patch);
    if (updated) saveToStorage(quotesKey(tenantId), next);
    return updated;
  },

  listTimelineEvents(tenantId) {
    return ensureSeed<SalesTimelineEvent[]>(timelineKey(tenantId), seedTimeline(tenantId));
  },
  createTimelineEvent(tenantId, payload) {
    const next = [payload, ...this.listTimelineEvents(tenantId)];
    saveToStorage(timelineKey(tenantId), next);
    return payload;
  },

  listTasks(tenantId) {
    return ensureSeed<SalesTask[]>(tasksKey(tenantId), seedTasks(tenantId));
  },
  createTask(tenantId, payload) {
    const next = [payload, ...this.listTasks(tenantId)];
    saveToStorage(tasksKey(tenantId), next);
    return payload;
  },
  updateTask(tenantId, id, patch) {
    const { updated, next } = updateById(this.listTasks(tenantId), id, patch);
    if (updated) saveToStorage(tasksKey(tenantId), next);
    return updated;
  },

  listAlerts(tenantId) {
    return ensureSeed<SalesAlert[]>(alertsKey(tenantId), seedAlerts(tenantId));
  },
  createAlert(tenantId, payload) {
    const next = [payload, ...this.listAlerts(tenantId)];
    saveToStorage(alertsKey(tenantId), next);
    return payload;
  },
  updateAlert(tenantId, id, patch) {
    const { updated, next } = updateById(this.listAlerts(tenantId), id, patch);
    if (updated) saveToStorage(alertsKey(tenantId), next);
    return updated;
  },

  listOrders(tenantId) {
    return ensureSeed<SalesOrder[]>(ordersKey(tenantId), seedOrders(tenantId));
  },
  createOrder(tenantId, payload) {
    const next = [payload, ...this.listOrders(tenantId)];
    saveToStorage(ordersKey(tenantId), next);
    return payload;
  },
  updateOrder(tenantId, id, patch) {
    const { updated, next } = updateById(this.listOrders(tenantId), id, patch);
    if (updated) saveToStorage(ordersKey(tenantId), next);
    return updated;
  },

  listAuditEvents(tenantId) {
    return ensureSeed<SalesAuditEvent[]>(auditKey(tenantId), seedAudit(tenantId));
  },
  createAuditEvent(tenantId, payload) {
    const next = [payload, ...this.listAuditEvents(tenantId)];
    saveToStorage(auditKey(tenantId), next);
    return payload;
  },
};
