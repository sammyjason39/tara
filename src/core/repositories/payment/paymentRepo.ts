import { prisma } from "@/core/persistence/database/client";
import type { PaymentRepository } from "@/core/repositories/payment/paymentRepository";
import type {
  PaymentProvider,
  RoutingPolicy,
  PosDevice,
  DevicePool,
  PaymentTransaction,
  SettlementRecord,
  PaymentRefund,
  PaymentDispute,
  PaymentChargeback,
  EvidencePack,
  PaymentAuditEvent,
} from "@/core/types/payment/payment";

// Mapping functions
const mapProvider = (db: any): PaymentProvider => ({
  id: db.id as any,
  tenantId: db.tenantId,
  name: db.name,
  channels: db.channels as any,
  status: db.status as any,
  maxAmountPerTxn: Number(db.maxAmountPerTxn),
  settlementSlaHours: db.settlementSlaHours,
  priority: db.priority,
  lastHeartbeatAt: db.lastHeartbeatAt.toISOString(),
});

const mapRoutingPolicy = (db: any): RoutingPolicy => ({
  id: db.id,
  tenantId: db.tenantId,
  name: db.name,
  enabled: db.enabled,
  priorities: db.priorities as any,
  fallbackProviders: db.fallbackProviders as any,
  maxRetries: db.maxRetries,
  exponentialBackoffSeconds: db.exponentialBackoffSeconds,
  createdAt: db.createdAt.toISOString(),
  updatedAt: db.updatedAt.toISOString(),
});

const mapPosDevice = (db: any): PosDevice => ({
  id: db.id,
  tenantId: db.tenantId,
  location: db.locationId,
  deviceCode: db.deviceCode,
  approved: db.approved,
  status: db.status as any,
  providerId: db.providerId as any,
  lastUsedAt: db.lastUsedAt?.toISOString(),
});

const mapDevicePool = (db: any): DevicePool => ({
  id: db.id,
  tenantId: db.tenantId,
  location: db.locationId,
  primaryDeviceId: db.primaryDeviceId,
  fallbackDeviceIds: db.fallbackDeviceIds,
  createdAt: db.createdAt.toISOString(),
  updatedAt: db.updatedAt.toISOString(),
});

const mapTransaction = (db: any): PaymentTransaction => ({
  id: db.id,
  tenantId: db.tenantId,
  externalReference: db.externalReference || undefined,
  type: db.type as any,
  amount: Number(db.amount),
  currency: db.currency as any,
  destination: db.destination,
  source: db.source || undefined,
  channel: db.channel as any,
  providerId: db.providerId as any,
  idempotencyKey: db.idempotencyKey,
  status: db.status as any,
  retryAttempts: (Array.isArray(db.retryAttempts) ? db.retryAttempts : []).map((r: any) => ({
    attempt: r.attempt,
    attemptedAt: r.attemptedAt.toISOString(),
    providerId: r.providerId as any,
    result: r.result as any,
    reason: r.reason || undefined,
  })) || [],
  settlementId: db.settlementId || undefined,
  ledgerSyncTriggeredAt: db.ledgerSyncAt?.toISOString(),
  evidencePackId: db.evidencePackId || undefined,
  createdBy: db.createdBy,
  approvedBy: db.approvedBy || undefined,
  approvedAt: db.approvedAt?.toISOString(),
  createdAt: db.createdAt.toISOString(),
  updatedAt: db.updatedAt.toISOString(),
});

const mapSettlementRecord = (db: any): SettlementRecord => ({
  id: db.id,
  tenantId: db.tenantId,
  paymentId: db.paymentId,
  providerReference: db.providerReference,
  status: db.status as any,
  confirmedAt: db.confirmedAt?.toISOString(),
  createdAt: db.createdAt.toISOString(),
  updatedAt: db.updatedAt.toISOString(),
});

const mapRefund = (db: any): PaymentRefund => ({
  id: db.id,
  tenantId: db.tenantId,
  paymentId: db.paymentId,
  type: db.type as any,
  amount: Number(db.amount),
  reason: db.reason,
  status: db.status as any,
  requestedBy: db.requestedBy,
  approvedBy: db.approvedBy || undefined,
  scheduledAt: db.scheduledAt?.toISOString(),
  providerReference: db.providerReference || undefined,
  createdAt: db.createdAt.toISOString(),
  updatedAt: db.updatedAt.toISOString(),
});

const mapDispute = (db: any): PaymentDispute => ({
  id: db.id,
  tenantId: db.tenantId,
  paymentId: db.paymentId,
  reason: db.reason,
  amount: Number(db.amount),
  status: db.status as any,
  openedBy: db.openedBy,
  evidence: db.evidence,
  providerCaseId: db.providerCaseId || undefined,
  resolution: db.resolution as any,
  createdAt: db.createdAt.toISOString(),
  updatedAt: db.updatedAt.toISOString(),
});

const mapChargeback = (db: any): PaymentChargeback => ({
  id: db.id,
  tenantId: db.tenantId,
  paymentId: db.paymentId,
  disputeId: db.disputeId,
  amount: Number(db.amount),
  status: db.status as any,
  createdAt: db.createdAt.toISOString(),
  updatedAt: db.updatedAt.toISOString(),
});

const mapEvidencePack = (db: any): EvidencePack => ({
  id: db.id,
  tenantId: db.tenantId,
  paymentId: db.paymentId,
  providerProof: db.providerProof,
  approvalSignatures: db.approvalSignatures,
  checksum: db.checksum,
  payload: db.payload,
  createdAt: db.createdAt.toISOString(),
});

const mapAuditEvent = (db: any): PaymentAuditEvent => ({
  id: db.id,
  tenantId: db.tenantId,
  actorId: db.actorId,
  action: db.action,
  entityType: db.entityType as any,
  entityId: db.entityId,
  detail: db.detail,
  createdAt: db.createdAt.toISOString(),
});

export const paymentRepo: PaymentRepository = {
  async listTransactions(tenantId) {
    const items = await prisma.paymentTransaction.findMany({
      where: { tenantId: tenantId },
      include: { retryAttempts: true },
      orderBy: { createdAt: 'desc' },
    });
    return (Array.isArray(items) ? items : []).map(mapTransaction);
  },
  async createTransaction(tenantId, payload) {
    const item = await prisma.paymentTransaction.create({
      data: {
        id: payload.id,
        tenantId: tenantId,
        externalReference: payload.externalReference,
        type: payload.type,
        amount: payload.amount,
        currency: payload.currency,
        destination: payload.destination,
        source: payload.source,
        channel: payload.channel,
        providerId: payload.providerId,
        idempotencyKey: payload.idempotencyKey,
        status: payload.status,
        createdBy: payload.createdBy,
        approvedBy: payload.approvedBy,
        approvedAt: payload.approvedAt ? new Date(payload.approvedAt) : undefined,
      },
      include: { retryAttempts: true },
    });
    return mapTransaction(item);
  },
  async updateTransaction(tenantId, id, patch) {
    const item = await prisma.paymentTransaction.update({
      where: { id, tenantId: tenantId },
      data: {
        status: patch.status,
        approvedBy: patch.approvedBy,
        approvedAt: patch.approvedAt ? new Date(patch.approvedAt) : undefined,
        ledgerSyncAt: patch.ledgerSyncTriggeredAt ? new Date(patch.ledgerSyncTriggeredAt) : undefined,
      },
      include: { retryAttempts: true },
    });
    return mapTransaction(item);
  },

  async listProviders(tenantId) {
    const items = await prisma.paymentProvider.findMany({
      where: { tenantId: tenantId },
      orderBy: { priority: 'asc' },
    });
    return (Array.isArray(items) ? items : []).map(mapProvider);
  },
  async updateProvider(tenantId, id, patch) {
    const item = await prisma.paymentProvider.update({
      where: { id, tenantId: tenantId },
      data: {
        status: patch.status,
        lastHeartbeatAt: patch.lastHeartbeatAt ? new Date(patch.lastHeartbeatAt) : undefined,
      },
    });
    return mapProvider(item);
  },

  async listRoutingPolicies(tenantId) {
    const items = await prisma.paymentRoutingPolicy.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return (Array.isArray(items) ? items : []).map(mapRoutingPolicy);
  },
  async updateRoutingPolicy(tenantId, id, patch) {
    const item = await prisma.paymentRoutingPolicy.update({
      where: { id, tenantId: tenantId },
      data: {
        enabled: patch.enabled,
        priorities: patch.priorities,
        fallbackProviders: patch.fallbackProviders,
      },
    });
    return mapRoutingPolicy(item);
  },

  async listDevices(tenantId) {
    const items = await prisma.paymentPosDevice.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return (Array.isArray(items) ? items : []).map(mapPosDevice);
  },
  async updateDevice(tenantId, id, patch) {
    const item = await prisma.paymentPosDevice.update({
      where: { id, tenantId: tenantId },
      data: {
        status: patch.status,
        lastUsedAt: patch.lastUsedAt ? new Date(patch.lastUsedAt) : undefined,
      },
    });
    return mapPosDevice(item);
  },
  async listDevicePools(tenantId) {
    const items = await prisma.paymentDevicePool.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return (Array.isArray(items) ? items : []).map(mapDevicePool);
  },

  async listDisputes(tenantId) {
    const items = await prisma.paymentDispute.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return (Array.isArray(items) ? items : []).map(mapDispute);
  },
  async createDispute(tenantId, payload) {
    const item = await prisma.paymentDispute.create({
      data: {
        id: payload.id,
        tenantId: tenantId,
        paymentId: payload.paymentId,
        reason: payload.reason,
        amount: payload.amount,
        status: payload.status,
        openedBy: payload.openedBy,
        evidence: payload.evidence,
        providerCaseId: payload.providerCaseId,
      },
    });
    return mapDispute(item);
  },
  async updateDispute(tenantId, id, patch) {
    const item = await prisma.paymentDispute.update({
      where: { id, tenantId: tenantId },
      data: {
        status: patch.status,
        resolution: patch.resolution,
        providerCaseId: patch.providerCaseId,
      },
    });
    return mapDispute(item);
  },

  async listChargebacks(tenantId) {
    const items = await prisma.paymentChargeback.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return (Array.isArray(items) ? items : []).map(mapChargeback);
  },
  async createChargeback(tenantId, payload) {
    const item = await prisma.paymentChargeback.create({
      data: {
        id: payload.id,
        tenantId: tenantId,
        paymentId: payload.paymentId,
        disputeId: payload.disputeId,
        amount: payload.amount,
        status: payload.status,
      },
    });
    return mapChargeback(item);
  },
  async updateChargeback(tenantId, id, patch) {
    const item = await prisma.paymentChargeback.update({
      where: { id, tenantId: tenantId },
      data: {
        status: patch.status,
      },
    });
    return mapChargeback(item);
  },

  async listRefunds(tenantId) {
    const items = await prisma.paymentRefund.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return (Array.isArray(items) ? items : []).map(mapRefund);
  },
  async createRefund(tenantId, payload) {
    const item = await prisma.paymentRefund.create({
      data: {
        id: payload.id,
        tenantId: tenantId,
        paymentId: payload.paymentId,
        type: payload.type,
        amount: payload.amount,
        reason: payload.reason,
        status: payload.status,
        requestedBy: payload.requestedBy,
        scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : undefined,
      },
    });
    return mapRefund(item);
  },
  async updateRefund(tenantId, id, patch) {
    const item = await prisma.paymentRefund.update({
      where: { id, tenantId: tenantId },
      data: {
        status: patch.status,
        approvedBy: patch.approvedBy,
        providerReference: patch.providerReference,
      },
    });
    return mapRefund(item);
  },

  async listSettlements(tenantId) {
    const items = await prisma.paymentSettlementRecord.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return (Array.isArray(items) ? items : []).map(mapSettlementRecord);
  },
  async createSettlement(tenantId, payload) {
    const item = await prisma.paymentSettlementRecord.create({
      data: {
        id: payload.id,
        tenantId: tenantId,
        paymentId: payload.paymentId,
        providerReference: payload.providerReference,
        status: payload.status,
        confirmedAt: payload.confirmedAt ? new Date(payload.confirmedAt) : undefined,
      },
    });
    return mapSettlementRecord(item);
  },
  async updateSettlement(tenantId, id, patch) {
    const item = await prisma.paymentSettlementRecord.update({
      where: { id, tenantId: tenantId },
      data: {
        status: patch.status,
        confirmedAt: patch.confirmedAt ? new Date(patch.confirmedAt) : undefined,
        providerReference: patch.providerReference,
      },
    });
    return mapSettlementRecord(item);
  },

  async listEvidencePacks(tenantId) {
    const items = await prisma.paymentEvidencePack.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return (Array.isArray(items) ? items : []).map(mapEvidencePack);
  },
  async createEvidencePack(tenantId, payload) {
    const item = await prisma.paymentEvidencePack.create({
      data: {
        id: payload.id,
        tenantId: tenantId,
        paymentId: payload.paymentId,
        providerProof: payload.providerProof,
        approvalSignatures: payload.approvalSignatures,
        checksum: payload.checksum,
        payload: payload.payload,
      },
    });
    return mapEvidencePack(item);
  },

  async listAuditEvents(tenantId) {
    const items = await prisma.paymentAuditEvent.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return (Array.isArray(items) ? items : []).map(mapAuditEvent);
  },
  async createAuditEvent(tenantId, payload) {
    const item = await prisma.paymentAuditEvent.create({
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
