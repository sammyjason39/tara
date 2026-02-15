import {
  ensureSeed,
  loadFromStorage,
  saveToStorage,
} from "@/core/repositories/hr/storage";
import type { PaymentRepository } from "@/core/repositories/payment/paymentRepository";
import type {
  DevicePool,
  EvidencePack,
  PaymentAuditEvent,
  PaymentChargeback,
  PaymentDispute,
  PaymentProvider,
  PaymentRefund,
  PaymentTransaction,
  PosDevice,
  RoutingPolicy,
  SettlementRecord,
} from "@/core/types/payment/payment";

const nowIso = () => new Date().toISOString();

const transactionsKey = (tenantId: string) => `payment:${tenantId}:transactions`;
const providersKey = (tenantId: string) => `payment:${tenantId}:providers`;
const routingKey = (tenantId: string) => `payment:${tenantId}:routing`;
const devicesKey = (tenantId: string) => `payment:${tenantId}:devices`;
const poolsKey = (tenantId: string) => `payment:${tenantId}:pools`;
const disputesKey = (tenantId: string) => `payment:${tenantId}:disputes`;
const chargebacksKey = (tenantId: string) => `payment:${tenantId}:chargebacks`;
const refundsKey = (tenantId: string) => `payment:${tenantId}:refunds`;
const settlementsKey = (tenantId: string) => `payment:${tenantId}:settlements`;
const evidenceKey = (tenantId: string) => `payment:${tenantId}:evidence`;
const auditKey = (tenantId: string) => `payment:${tenantId}:audit`;

const seedProviders = (tenantId: string): PaymentProvider[] => [
  {
    id: "BANK_BCA",
    tenantId,
    name: "Bank BCA",
    channels: ["BANK_TRANSFER", "QR"],
    status: "HEALTHY",
    maxAmountPerTxn: 1000000000,
    settlementSlaHours: 6,
    priority: 1,
    lastHeartbeatAt: nowIso(),
  },
  {
    id: "BANK_MANDIRI",
    tenantId,
    name: "Bank Mandiri",
    channels: ["BANK_TRANSFER", "QR"],
    status: "HEALTHY",
    maxAmountPerTxn: 1000000000,
    settlementSlaHours: 8,
    priority: 2,
    lastHeartbeatAt: nowIso(),
  },
  {
    id: "STRIPE",
    tenantId,
    name: "Stripe",
    channels: ["CARD_ONLINE", "CARD_POS", "WALLET"],
    status: "HEALTHY",
    maxAmountPerTxn: 750000000,
    settlementSlaHours: 24,
    priority: 3,
    lastHeartbeatAt: nowIso(),
  },
  {
    id: "ADYEN",
    tenantId,
    name: "Adyen",
    channels: ["CARD_ONLINE", "CARD_POS", "WALLET"],
    status: "HEALTHY",
    maxAmountPerTxn: 750000000,
    settlementSlaHours: 24,
    priority: 4,
    lastHeartbeatAt: nowIso(),
  },
];

const seedRouting = (tenantId: string): RoutingPolicy[] => [
  {
    id: `${tenantId}-routing-primary`,
    tenantId,
    name: "Default enterprise routing",
    enabled: true,
    priorities: ["BANK_BCA", "BANK_MANDIRI", "STRIPE"],
    fallbackProviders: ["BANK_MANDIRI", "STRIPE", "ADYEN"],
    maxRetries: 3,
    exponentialBackoffSeconds: 2,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

const seedDevices = (tenantId: string): PosDevice[] => [
  {
    id: `${tenantId}-pos-01`,
    tenantId,
    location: "Jakarta HQ",
    deviceCode: "POS-01",
    approved: true,
    status: "ONLINE",
    providerId: "ADYEN",
    lastUsedAt: nowIso(),
  },
  {
    id: `${tenantId}-pos-02`,
    tenantId,
    location: "Jakarta HQ",
    deviceCode: "POS-02",
    approved: true,
    status: "ONLINE",
    providerId: "STRIPE",
    lastUsedAt: nowIso(),
  },
  {
    id: `${tenantId}-pos-03`,
    tenantId,
    location: "Jakarta HQ",
    deviceCode: "POS-03",
    approved: true,
    status: "MAINTENANCE",
    providerId: "ADYEN",
  },
];

const seedPools = (tenantId: string): DevicePool[] => [
  {
    id: `${tenantId}-pool-jkt`,
    tenantId,
    location: "Jakarta HQ",
    primaryDeviceId: `${tenantId}-pos-01`,
    fallbackDeviceIds: [`${tenantId}-pos-02`, `${tenantId}-pos-03`],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

const seedTransactions = (tenantId: string): PaymentTransaction[] => [
  {
    id: `${tenantId}-pay-001`,
    tenantId,
    externalReference: "AP-INV-10021",
    type: "VENDOR_PAYOUT",
    amount: 25000000,
    currency: "IDR",
    destination: "PT Fresh Supply Co",
    source: "BCA Operating",
    channel: "BANK_TRANSFER",
    providerId: "BANK_BCA",
    idempotencyKey: `${tenantId}-idem-001`,
    status: "SETTLED",
    retryAttempts: [{ attempt: 1, attemptedAt: nowIso(), providerId: "BANK_BCA", result: "SUCCESS" }],
    settlementId: `${tenantId}-set-001`,
    ledgerSyncTriggeredAt: nowIso(),
    evidencePackId: `${tenantId}-ev-001`,
    createdBy: "system",
    approvedBy: "fin-manager",
    approvedAt: nowIso(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

const seedSettlements = (tenantId: string): SettlementRecord[] => [
  {
    id: `${tenantId}-set-001`,
    tenantId,
    paymentId: `${tenantId}-pay-001`,
    providerReference: "BCA-SETTLE-77881",
    status: "CONFIRMED",
    confirmedAt: nowIso(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

const seedEvidence = (tenantId: string): EvidencePack[] => [
  {
    id: `${tenantId}-ev-001`,
    tenantId,
    paymentId: `${tenantId}-pay-001`,
    providerProof: "BCA-TRANSFER-SLIP-77881",
    approvalSignatures: ["fin-manager", "treasury-lead"],
    checksum: "chk-seed-001",
    payload: "{\"payment\":\"seed\"}",
    createdAt: nowIso(),
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

export const mockPaymentRepo: PaymentRepository = {
  listTransactions(tenantId) {
    return ensureSeed<PaymentTransaction[]>(
      transactionsKey(tenantId),
      seedTransactions(tenantId),
    );
  },
  createTransaction(tenantId, payload) {
    const next = [payload, ...this.listTransactions(tenantId)];
    saveToStorage(transactionsKey(tenantId), next);
    return payload;
  },
  updateTransaction(tenantId, id, patch) {
    const { updated, next } = updateById(this.listTransactions(tenantId), id, patch);
    if (updated) saveToStorage(transactionsKey(tenantId), next);
    return updated;
  },

  listProviders(tenantId) {
    return ensureSeed<PaymentProvider[]>(providersKey(tenantId), seedProviders(tenantId));
  },
  updateProvider(tenantId, id, patch) {
    const { updated, next } = updateById(this.listProviders(tenantId), id, patch);
    if (updated) saveToStorage(providersKey(tenantId), next);
    return updated;
  },

  listRoutingPolicies(tenantId) {
    return ensureSeed<RoutingPolicy[]>(routingKey(tenantId), seedRouting(tenantId));
  },
  updateRoutingPolicy(tenantId, id, patch) {
    const { updated, next } = updateById(this.listRoutingPolicies(tenantId), id, patch);
    if (updated) saveToStorage(routingKey(tenantId), next);
    return updated;
  },

  listDevices(tenantId) {
    return ensureSeed<PosDevice[]>(devicesKey(tenantId), seedDevices(tenantId));
  },
  updateDevice(tenantId, id, patch) {
    const { updated, next } = updateById(this.listDevices(tenantId), id, patch);
    if (updated) saveToStorage(devicesKey(tenantId), next);
    return updated;
  },
  listDevicePools(tenantId) {
    return ensureSeed<DevicePool[]>(poolsKey(tenantId), seedPools(tenantId));
  },

  listDisputes(tenantId) {
    return loadFromStorage<PaymentDispute[]>(disputesKey(tenantId), []);
  },
  createDispute(tenantId, payload) {
    const next = [payload, ...this.listDisputes(tenantId)];
    saveToStorage(disputesKey(tenantId), next);
    return payload;
  },
  updateDispute(tenantId, id, patch) {
    const { updated, next } = updateById(this.listDisputes(tenantId), id, patch);
    if (updated) saveToStorage(disputesKey(tenantId), next);
    return updated;
  },

  listChargebacks(tenantId) {
    return loadFromStorage<PaymentChargeback[]>(chargebacksKey(tenantId), []);
  },
  createChargeback(tenantId, payload) {
    const next = [payload, ...this.listChargebacks(tenantId)];
    saveToStorage(chargebacksKey(tenantId), next);
    return payload;
  },
  updateChargeback(tenantId, id, patch) {
    const { updated, next } = updateById(this.listChargebacks(tenantId), id, patch);
    if (updated) saveToStorage(chargebacksKey(tenantId), next);
    return updated;
  },

  listRefunds(tenantId) {
    return loadFromStorage<PaymentRefund[]>(refundsKey(tenantId), []);
  },
  createRefund(tenantId, payload) {
    const next = [payload, ...this.listRefunds(tenantId)];
    saveToStorage(refundsKey(tenantId), next);
    return payload;
  },
  updateRefund(tenantId, id, patch) {
    const { updated, next } = updateById(this.listRefunds(tenantId), id, patch);
    if (updated) saveToStorage(refundsKey(tenantId), next);
    return updated;
  },

  listSettlements(tenantId) {
    return ensureSeed<SettlementRecord[]>(
      settlementsKey(tenantId),
      seedSettlements(tenantId),
    );
  },
  createSettlement(tenantId, payload) {
    const next = [payload, ...this.listSettlements(tenantId)];
    saveToStorage(settlementsKey(tenantId), next);
    return payload;
  },
  updateSettlement(tenantId, id, patch) {
    const { updated, next } = updateById(this.listSettlements(tenantId), id, patch);
    if (updated) saveToStorage(settlementsKey(tenantId), next);
    return updated;
  },

  listEvidencePacks(tenantId) {
    return ensureSeed<EvidencePack[]>(evidenceKey(tenantId), seedEvidence(tenantId));
  },
  createEvidencePack(tenantId, payload) {
    const next = [payload, ...this.listEvidencePacks(tenantId)];
    saveToStorage(evidenceKey(tenantId), next);
    return payload;
  },

  listAuditEvents(tenantId) {
    return loadFromStorage<PaymentAuditEvent[]>(auditKey(tenantId), []);
  },
  createAuditEvent(tenantId, payload) {
    const next = [payload, ...this.listAuditEvents(tenantId)];
    saveToStorage(auditKey(tenantId), next);
    return payload;
  },
};

