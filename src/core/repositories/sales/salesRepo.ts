import { prisma } from "@/core/persistence/database/client";
import type { SalesRepository } from "@/core/repositories/sales/salesRepository";
import type {
  SalesLead,
  SalesOpportunity,
  SalesQuote,
  SalesTimelineEvent,
  SalesTask,
  SalesAlert,
  SalesOrder,
  SalesAuditEvent,
} from "@/core/types/sales/sales";

// Mapping functions
const mapLead = (db: any): SalesLead => ({
  id: db.id,
  tenantId: db.tenantId,
  companyName: db.companyName,
  contactName: db.contactName,
  contactEmail: db.contactEmail || undefined,
  contactPhone: db.contactPhone || undefined,
  source: db.source as any,
  ownerId: db.ownerId,
  ownerName: db.ownerName,
  score: db.score,
  potentialValue: Number(db.potentialValue),
  currency: db.currency as any,
  priority: db.priority as any,
  status: db.status as any,
  slaDueAt: db.slaDueAt.toISOString(),
  firstResponseAt: db.firstResponseAt?.toISOString(),
  createdAt: db.createdAt.toISOString(),
  updatedAt: db.updatedAt.toISOString(),
});

const mapOpportunity = (db: any): SalesOpportunity => ({
  id: db.id,
  tenantId: db.tenantId,
  leadId: db.leadId || undefined,
  accountName: db.accountName,
  ownerId: db.ownerId,
  ownerName: db.ownerName,
  stage: db.stage as any,
  probability: db.probability,
  amount: Number(db.amount),
  currency: db.currency as any,
  expectedCloseDate: db.expectedCloseDate.toISOString(),
  health: db.health as any,
  nextAction: db.nextAction || "",
  lastActivityAt: db.lastActivityAt.toISOString(),
  createdAt: db.createdAt.toISOString(),
  updatedAt: db.updatedAt.toISOString(),
});

const mapQuote = (db: any): SalesQuote => ({
  id: db.id,
  tenantId: db.tenantId,
  opportunityId: db.opportunityId,
  accountName: db.accountName,
  version: db.version,
  amount: Number(db.amount),
  discountPercent: Number(db.discountPercent),
  netAmount: Number(db.netAmount),
  currency: db.currency as any,
  status: db.status as any,
  validUntil: db.validUntil.toISOString(),
  approvalBy: db.approvalBy || undefined,
  approvalAt: db.approvalAt?.toISOString(),
  notes: db.notes || undefined,
  createdBy: db.createdBy,
  createdAt: db.createdAt.toISOString(),
  updatedAt: db.updatedAt.toISOString(),
});

const mapTimelineEvent = (db: any): SalesTimelineEvent => ({
  id: db.id,
  tenantId: db.tenantId,
  opportunityId: db.opportunityId,
  leadId: db.leadId || undefined,
  channel: db.channel as any,
  direction: db.direction as any,
  summary: db.summary,
  detail: db.detail || undefined,
  createdBy: db.createdBy,
  createdAt: db.createdAt.toISOString(),
});

const mapTask = (db: any): SalesTask => ({
  id: db.id,
  tenantId: db.tenantId,
  opportunityId: db.opportunityId || undefined,
  leadId: db.leadId || undefined,
  title: db.title,
  ownerId: db.ownerId,
  ownerName: db.ownerName,
  status: db.status as any,
  priority: db.priority as any,
  dueAt: db.dueAt.toISOString(),
  completedAt: db.completedAt?.toISOString(),
  createdAt: db.createdAt.toISOString(),
  updatedAt: db.updatedAt.toISOString(),
});

const mapAlert = (db: any): SalesAlert => ({
  id: db.id,
  tenantId: db.tenantId,
  type: db.type as any,
  severity: db.severity as any,
  entityType: db.entityType as any,
  entityId: db.entityId,
  message: db.message,
  acknowledged: db.acknowledged,
  createdAt: db.createdAt.toISOString(),
  updatedAt: db.updatedAt.toISOString(),
});

const mapOrder = (db: any): SalesOrder => ({
  id: db.id,
  tenantId: db.tenantId,
  opportunityId: db.opportunityId,
  quoteId: db.quoteId || undefined,
  customerName: db.customerName,
  amount: Number(db.amount),
  currency: db.currency as any,
  status: db.status as any,
  inventoryCheck: db.inventoryCheck as any,
  financeInvoiceId: db.financeInvoiceId || undefined,
  createdBy: db.createdBy,
  createdAt: db.createdAt.toISOString(),
  updatedAt: db.updatedAt.toISOString(),
});

const mapAuditEvent = (db: any): SalesAuditEvent => ({
  id: db.id,
  tenantId: db.tenantId,
  actorId: db.actorId,
  action: db.action,
  entityType: db.entityType as any,
  entityId: db.entityId,
  detail: db.detail,
  createdAt: db.createdAt.toISOString(),
});

export const salesRepo: SalesRepository = {
  async listLeads(tenantId) {
    const items = await prisma.salesLead.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return items.map(mapLead);
  },
  async createLead(tenantId, payload) {
    const item = await prisma.salesLead.create({
      data: {
        id: payload.id,
        tenantId: tenantId,
        companyName: payload.companyName,
        contactName: payload.contactName,
        contactEmail: payload.contactEmail,
        contactPhone: payload.contactPhone,
        source: payload.source,
        ownerId: payload.ownerId,
        ownerName: payload.ownerName,
        score: payload.score,
        potentialValue: payload.potentialValue,
        currency: payload.currency,
        priority: payload.priority,
        status: payload.status,
        slaDueAt: new Date(payload.slaDueAt),
      },
    });
    return mapLead(item);
  },
  async updateLead(tenantId, id, patch) {
    const item = await prisma.salesLead.update({
      where: { id, tenantId: tenantId },
      data: {
        companyName: patch.companyName,
        contactName: patch.contactName,
        contactEmail: patch.contactEmail,
        contactPhone: patch.contactPhone,
        source: patch.source,
        ownerId: patch.ownerId,
        ownerName: patch.ownerName,
        score: patch.score,
        potentialValue: patch.potentialValue,
        currency: patch.currency,
        priority: patch.priority,
        status: patch.status,
        firstResponseAt: patch.firstResponseAt ? new Date(patch.firstResponseAt) : undefined,
      },
    });
    return mapLead(item);
  },

  async listOpportunities(tenantId) {
    const items = await prisma.salesOpportunity.findMany({
      where: { tenantId: tenantId },
      orderBy: { lastActivityAt: 'desc' },
    });
    return items.map(mapOpportunity);
  },
  async createOpportunity(tenantId, payload) {
    const item = await prisma.salesOpportunity.create({
      data: {
        id: payload.id,
        tenantId: tenantId,
        leadId: payload.leadId,
        accountName: payload.accountName,
        ownerId: payload.ownerId,
        ownerName: payload.ownerName,
        stage: payload.stage,
        probability: payload.probability,
        amount: payload.amount,
        currency: payload.currency,
        expectedCloseDate: new Date(payload.expectedCloseDate),
        health: payload.health,
        nextAction: payload.nextAction,
      },
    });
    return mapOpportunity(item);
  },
  async updateOpportunity(tenantId, id, patch) {
    const item = await prisma.salesOpportunity.update({
      where: { id, tenantId: tenantId },
      data: {
        stage: patch.stage,
        probability: patch.probability,
        amount: patch.amount,
        currency: patch.currency,
        expectedCloseDate: patch.expectedCloseDate ? new Date(patch.expectedCloseDate) : undefined,
        health: patch.health,
        nextAction: patch.nextAction,
        lastActivityAt: new Date(),
      },
    });
    return mapOpportunity(item);
  },

  async listQuotes(tenantId) {
    const items = await prisma.salesQuote.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return items.map(mapQuote);
  },
  async createQuote(tenantId, payload) {
    const item = await prisma.salesQuote.create({
      data: {
        id: payload.id,
        tenantId: tenantId,
        opportunityId: payload.opportunityId,
        accountName: payload.accountName,
        version: payload.version,
        amount: payload.amount,
        discountPercent: payload.discountPercent,
        netAmount: payload.netAmount,
        currency: payload.currency,
        status: payload.status,
        validUntil: new Date(payload.validUntil),
        createdBy: payload.createdBy,
        notes: payload.notes,
      },
    });
    return mapQuote(item);
  },
  async updateQuote(tenantId, id, patch) {
    const item = await prisma.salesQuote.update({
      where: { id, tenantId: tenantId },
      data: {
        status: patch.status,
        approvalBy: patch.approvalBy,
        approvalAt: patch.approvalAt ? new Date(patch.approvalAt) : undefined,
        notes: patch.notes,
        version: patch.version,
        amount: patch.amount,
        discountPercent: patch.discountPercent,
        netAmount: patch.netAmount,
      },
    });
    return mapQuote(item);
  },

  async listTimelineEvents(tenantId) {
    const items = await prisma.salesTimelineEvent.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return items.map(mapTimelineEvent);
  },
  async createTimelineEvent(tenantId, payload) {
    const item = await prisma.salesTimelineEvent.create({
      data: {
        id: payload.id,
        tenantId: tenantId,
        opportunityId: payload.opportunityId,
        leadId: payload.leadId,
        channel: payload.channel,
        direction: payload.direction,
        summary: payload.summary,
        detail: payload.detail,
        createdBy: payload.createdBy,
      },
    });
    return mapTimelineEvent(item);
  },

  async listTasks(tenantId) {
    const items = await prisma.salesTask.findMany({
      where: { tenantId: tenantId },
      orderBy: { dueAt: 'asc' },
    });
    return items.map(mapTask);
  },
  async createTask(tenantId, payload) {
    const item = await prisma.salesTask.create({
      data: {
        id: payload.id,
        tenantId: tenantId,
        opportunityId: payload.opportunityId,
        leadId: payload.leadId,
        title: payload.title,
        ownerId: payload.ownerId,
        ownerName: payload.ownerName,
        status: payload.status,
        priority: payload.priority,
        dueAt: new Date(payload.dueAt),
      },
    });
    return mapTask(item);
  },
  async updateTask(tenantId, id, patch) {
    const item = await prisma.salesTask.update({
      where: { id, tenantId: tenantId },
      data: {
        status: patch.status,
        priority: patch.priority,
        dueAt: patch.dueAt ? new Date(patch.dueAt) : undefined,
        completedAt: patch.completedAt ? new Date(patch.completedAt) : undefined,
      },
    });
    return mapTask(item);
  },

  async listAlerts(tenantId) {
    const items = await prisma.salesAlert.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return items.map(mapAlert);
  },
  async createAlert(tenantId, payload) {
    const item = await prisma.salesAlert.create({
      data: {
        id: payload.id,
        tenantId: tenantId,
        type: payload.type,
        severity: payload.severity,
        entityType: payload.entityType,
        entityId: payload.entityId,
        message: payload.message,
        acknowledged: payload.acknowledged,
      },
    });
    return mapAlert(item);
  },
  async updateAlert(tenantId, id, patch) {
    const item = await prisma.salesAlert.update({
      where: { id, tenantId: tenantId },
      data: {
        acknowledged: patch.acknowledged,
      },
    });
    return mapAlert(item);
  },

  async listOrders(tenantId) {
    const items = await prisma.salesOrder.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return items.map(mapOrder);
  },
  async createOrder(tenantId, payload) {
    const item = await prisma.salesOrder.create({
      data: {
        id: payload.id,
        tenantId: tenantId,
        opportunityId: payload.opportunityId,
        quoteId: payload.quoteId,
        customerName: payload.customerName,
        amount: payload.amount,
        currency: payload.currency,
        status: payload.status,
        inventoryCheck: payload.inventoryCheck,
        financeInvoiceId: payload.financeInvoiceId,
        createdBy: payload.createdBy,
      },
    });
    return mapOrder(item);
  },
  async updateOrder(tenantId, id, patch) {
    const item = await prisma.salesOrder.update({
      where: { id, tenantId: tenantId },
      data: {
        status: patch.status,
        inventoryCheck: patch.inventoryCheck,
        financeInvoiceId: patch.financeInvoiceId,
      },
    });
    return mapOrder(item);
  },

  async listAuditEvents(tenantId) {
    const items = await prisma.salesAuditEvent.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return items.map(mapAuditEvent);
  },
  async createAuditEvent(tenantId, payload) {
    const item = await prisma.salesAuditEvent.create({
      data: {
        id: payload.id,
        tenantId: tenantId,
        actorId: payload.actorId,
        action: payload.action,
        entityType: payload.entityType,
        entityId: payload.entityId,
        detail: payload.detail,
      },
    });
    return mapAuditEvent(item);
  },
};
