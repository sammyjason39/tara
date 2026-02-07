import { LedgerBalance, LedgerEntry } from "@/core/types/finance/ledger";

export const ledgerService = {
  // Fetch ledger entries for a tenant, optionally filtered by department or date range
  async getEntries(
    tenantId: string,
    departmentId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<LedgerEntry[]> {
    try {
      const response = await apiClient.get("/ledger", {
        params: { tenantId, departmentId, startDate, endDate },
      });
      return response.data;
    } catch (err) {
      console.error("Error fetching ledger entries:", err);
      throw err;
    }
  },

  // Create a new ledger entry
  async createEntry(entry: LedgerEntry): Promise<LedgerEntry> {
    try {
      const response = await apiClient.post("/ledger", entry);
      return response.data;
    } catch (err) {
      console.error("Error creating ledger entry:", err);
      throw err;
    }
  },

  // Update existing ledger entry
  async updateEntry(
    entryId: string,
    updates: Partial<LedgerEntry>,
  ): Promise<LedgerEntry> {
    try {
      const response = await apiClient.put(`/ledger/${entryId}`, updates);
      return response.data;
    } catch (err) {
      console.error("Error updating ledger entry:", err);
      throw err;
    }
  },

  // Delete a ledger entry
  async deleteEntry(entryId: string): Promise<void> {
    try {
      await apiClient.delete(`/ledger/${entryId}`);
    } catch (err) {
      console.error("Error deleting ledger entry:", err);
      throw err;
    }
  },

  // Get ledger balances (by account or department)
  async getBalances(
    tenantId: string,
    departmentId?: string,
  ): Promise<LedgerBalance[]> {
    try {
      const response = await apiClient.get("/ledger/balances", {
        params: { tenantId, departmentId },
      });
      return response.data;
    } catch (err) {
      console.error("Error fetching ledger balances:", err);
      throw err;
    }
  },
};
