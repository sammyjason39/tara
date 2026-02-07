import type { FinanceRepository } from "./financeRepository";
import type { MoneySource } from "@/core/types/finance/accounts";
import type { TreasuryTransfer, SettlementRecord } from "@/core/types/finance/treasury";
import type { PaymentRequest } from "@/core/types/finance/payments";
import type { ReceivableInvoice } from "@/core/types/finance/receivables";
import type { PayableBill } from "@/core/types/finance/payables";
import type { JournalEntry } from "@/core/types/finance/ledger";
import { ensureSeed, loadFromStorage, nextId, saveToStorage } from "@/core/repositories/hr/storage";

const sourcesKey = (tenantId: string) => `fin:${tenantId}:sources`;
const transfersKey = (tenantId: string) => `fin:${tenantId}:transfers`;
const settlementsKey = (tenantId: string) => `fin:${tenantId}:settlements`;
const paymentsKey = (tenantId: string) => `fin:${tenantId}:payments`;
const receivablesKey = (tenantId: string) => `fin:${tenantId}:receivables`;
const payablesKey = (tenantId: string) => `fin:${tenantId}:payables`;
const journalKey = (tenantId: string) => `fin:${tenantId}:journals`;

const now = () => new Date().toISOString();

const seedSources = (tenantId: string): MoneySource[] => [
  {
    id: `${tenantId}-bank-001`,
    tenantId,
    name: "BCA Operating",
    type: "BANK",
    currency: "IDR",
    balance: 125000000,
    pendingSettlement: 4500000,
    provider: "BCA",
    lastUpdated: now(),
  },
  {
    id: `${tenantId}-wallet-gopay`,
    tenantId,
    name: "GoPay Wallet",
    type: "E_WALLET",
    currency: "IDR",
    balance: 18500000,
    pendingSettlement: 1200000,
    provider: "GoPay",
    lastUpdated: now(),
  },
  {
    id: `${tenantId}-cash-001`,
    tenantId,
    name: "Store Cash Register A",
    type: "CASH_REGISTER",
    currency: "IDR",
    balance: 3200000,
    pendingSettlement: 0,
    provider: "POS",
    lastUpdated: now(),
  },
];

const seedReceivables = (tenantId: string): ReceivableInvoice[] => [
  {
    id: `${tenantId}-ar-001`,
    tenantId,
    customerName: "Acme Retail",
    amount: 28000000,
    currency: "IDR",
    dueDate: "2026-03-05",
    status: "issued",
    agingBucket: "0-30",
    createdAt: now(),
    updatedAt: now(),
  },
];

const seedPayables = (tenantId: string): PayableBill[] => [
  {
    id: `${tenantId}-ap-001`,
    tenantId,
    vendorName: "Fresh Supply Co",
    amount: 18000000,
    currency: "IDR",
    dueDate: "2026-02-20",
    status: "pending",
    createdAt: now(),
    updatedAt: now(),
  },
];

export const mockFinanceRepo: FinanceRepository = {
  listSources(tenantId) {
    return ensureSeed(sourcesKey(tenantId), seedSources(tenantId));
  },
  updateSource(tenantId, sourceId, patch) {
    const items = this.listSources(tenantId);
    let updated: MoneySource | null = null;
    const next = items.map((item) => {
      if (item.id !== sourceId) return item;
      updated = { ...item, ...patch, lastUpdated: now() };
      return updated;
    });
    if (updated) saveToStorage(sourcesKey(tenantId), next);
    return updated;
  },

  listTransfers(tenantId) {
    return loadFromStorage<TreasuryTransfer[]>(transfersKey(tenantId), []);
  },
  createTransfer(tenantId, transfer) {
    const items = this.listTransfers(tenantId);
    const next = [transfer, ...items];
    saveToStorage(transfersKey(tenantId), next);
    return transfer;
  },

  listSettlements(tenantId) {
    return loadFromStorage<SettlementRecord[]>(settlementsKey(tenantId), []);
  },
  createSettlement(tenantId, settlement) {
    const items = this.listSettlements(tenantId);
    const next = [settlement, ...items];
    saveToStorage(settlementsKey(tenantId), next);
    return settlement;
  },

  listPaymentRequests(tenantId) {
    return loadFromStorage<PaymentRequest[]>(paymentsKey(tenantId), []);
  },
  createPaymentRequest(tenantId, payload) {
    const items = this.listPaymentRequests(tenantId);
    const next = [payload, ...items];
    saveToStorage(paymentsKey(tenantId), next);
    return payload;
  },
  updatePaymentRequest(tenantId, id, patch) {
    const items = this.listPaymentRequests(tenantId);
    let updated: PaymentRequest | null = null;
    const next = items.map((item) => {
      if (item.id !== id) return item;
      updated = { ...item, ...patch, updatedAt: now() };
      return updated;
    });
    if (updated) saveToStorage(paymentsKey(tenantId), next);
    return updated;
  },

  listReceivables(tenantId) {
    return ensureSeed(receivablesKey(tenantId), seedReceivables(tenantId));
  },
  createReceivable(tenantId, payload) {
    const items = this.listReceivables(tenantId);
    const next = [payload, ...items];
    saveToStorage(receivablesKey(tenantId), next);
    return payload;
  },

  listPayables(tenantId) {
    return ensureSeed(payablesKey(tenantId), seedPayables(tenantId));
  },
  createPayable(tenantId, payload) {
    const items = this.listPayables(tenantId);
    const next = [payload, ...items];
    saveToStorage(payablesKey(tenantId), next);
    return payload;
  },

  listJournalEntries(tenantId) {
    return loadFromStorage<JournalEntry[]>(journalKey(tenantId), []);
  },
  createJournalEntry(tenantId, payload) {
    const items = this.listJournalEntries(tenantId);
    const next = [payload, ...items];
    saveToStorage(journalKey(tenantId), next);
    return payload;
  },
  updateJournalEntry(tenantId, id, patch) {
    const items = this.listJournalEntries(tenantId);
    let updated: JournalEntry | null = null;
    const next = items.map((entry) => {
      if (entry.id !== id) return entry;
      updated = { ...entry, ...patch, updatedAt: now() };
      return updated;
    });
    if (updated) saveToStorage(journalKey(tenantId), next);
    return updated;
  },
};
