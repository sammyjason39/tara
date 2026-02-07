import type { PayableBill } from "@/core/types/finance/payables";
import { mockFinanceRepo } from "@/core/repositories/finance/mockFinanceRepo";

const repo = mockFinanceRepo;

export const payablesService = {
  async getPayables(tenantId: string, _status?: string): Promise<PayableBill[]> {
    return repo.listPayables(tenantId);
  },

  async createPayable(payable: PayableBill): Promise<PayableBill> {
    return repo.createPayable(payable.tenantId, payable);
  },

  async updatePayable(_payableId: string, _updates: Partial<PayableBill>): Promise<PayableBill | null> {
    // Mock repo doesn't support update for payables yet
    return null;
  },

  async approvePayable(_approval: { payableId: string }): Promise<PayableBill | null> {
    // Mock repo doesn't support approval yet
    return null;
  },
};
