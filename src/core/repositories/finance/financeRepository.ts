import type { MoneySource } from "@/core/types/finance/accounts";
import type { TreasuryTransfer, SettlementRecord } from "@/core/types/finance/treasury";
import type { PaymentRequest } from "@/core/types/finance/payments";
import type { ReceivableInvoice } from "@/core/types/finance/receivables";
import type { PayableBill } from "@/core/types/finance/payables";
import type { JournalEntry } from "@/core/types/finance/ledger";

export interface FinanceRepository {
  listSources: (tenantId: string) => MoneySource[];
  updateSource: (tenantId: string, sourceId: string, patch: Partial<MoneySource>) => MoneySource | null;

  listTransfers: (tenantId: string) => TreasuryTransfer[];
  createTransfer: (tenantId: string, transfer: TreasuryTransfer) => TreasuryTransfer;
  listSettlements: (tenantId: string) => SettlementRecord[];
  createSettlement: (tenantId: string, settlement: SettlementRecord) => SettlementRecord;

  listPaymentRequests: (tenantId: string) => PaymentRequest[];
  createPaymentRequest: (tenantId: string, payload: PaymentRequest) => PaymentRequest;
  updatePaymentRequest: (tenantId: string, id: string, patch: Partial<PaymentRequest>) => PaymentRequest | null;

  listReceivables: (tenantId: string) => ReceivableInvoice[];
  createReceivable: (tenantId: string, payload: ReceivableInvoice) => ReceivableInvoice;

  listPayables: (tenantId: string) => PayableBill[];
  createPayable: (tenantId: string, payload: PayableBill) => PayableBill;

  listJournalEntries: (tenantId: string) => JournalEntry[];
  createJournalEntry: (tenantId: string, payload: JournalEntry) => JournalEntry;
  updateJournalEntry: (tenantId: string, id: string, patch: Partial<JournalEntry>) => JournalEntry | null;
}
