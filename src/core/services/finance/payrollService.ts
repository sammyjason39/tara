import { PayrollEntry } from "../types/payrollTypes";
import { apiClient } from "../utils/apiClient";

export const payrollService = {
  async getPayrollEntries(
    tenantId: string,
    period?: string,
  ): Promise<PayrollEntry[]> {
    try {
      const response = await apiClient.get("/payroll", {
        params: { tenantId, period },
      });
      return response.data;
    } catch (err) {
      console.error("Error fetching payroll entries:", err);
      throw err;
    }
  },

  async createPayrollEntry(entry: PayrollEntry): Promise<PayrollEntry> {
    try {
      const response = await apiClient.post("/payroll", entry);
      return response.data;
    } catch (err) {
      console.error("Error creating payroll entry:", err);
      throw err;
    }
  },

  async updatePayrollEntry(
    entryId: string,
    updates: Partial<PayrollEntry>,
  ): Promise<PayrollEntry> {
    try {
      const response = await apiClient.put(`/payroll/${entryId}`, updates);
      return response.data;
    } catch (err) {
      console.error("Error updating payroll entry:", err);
      throw err;
    }
  },

  async runPayroll(tenantId: string, period: string): Promise<boolean> {
    try {
      await apiClient.post("/payroll/run", { tenantId, period });
      return true;
    } catch (err) {
      console.error("Error running payroll:", err);
      throw err;
    }
  },
};
