import type { ReceivableInvoice } from "@/core/types/finance/receivables";
import { mockFinanceRepo } from "@/core/repositories/finance/mockFinanceRepo";

const repo = mockFinanceRepo;

export const receivablesService = {
  async getReceivables(tenantId: string, _status?: string): Promise<ReceivableInvoice[]> {
    return repo.listReceivables(tenantId);
  },

  async createReceivable(receivable: ReceivableInvoice): Promise<ReceivableInvoice> {
    return repo.createReceivable(receivable.tenantId, receivable);
  },

  async updateReceivable(_receivableId: string, _updates: Partial<ReceivableInvoice>): Promise<ReceivableInvoice | null> {
    return null;
  },

  async approveReceivable(_approval: { receivableId: string }): Promise<ReceivableInvoice | null> {
    return null;
  },
};
