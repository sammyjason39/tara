import type { PayrollEntry } from "@/core/types/finance/payrollTypes";

// Finance-side payroll service (distinct from HR payroll service)
// Uses in-memory mock for now
let entries: PayrollEntry[] = [];

export const payrollService = {
  async getPayrollEntries(tenantId: string, _period?: string): Promise<PayrollEntry[]> {
    return entries.filter((e) => e.tenantId === tenantId);
  },

  async createPayrollEntry(entry: PayrollEntry): Promise<PayrollEntry> {
    entries = [entry, ...entries];
    return entry;
  },

  async updatePayrollEntry(entryId: string, updates: Partial<PayrollEntry>): Promise<PayrollEntry> {
    let updated: PayrollEntry | null = null;
    entries = entries.map((e) => {
      if (e.id === entryId) {
        updated = { ...e, ...updates, updatedAt: new Date().toISOString() };
        return updated;
      }
      return e;
    });
    if (!updated) throw new Error("Payroll entry not found");
    return updated;
  },

  async runPayroll(_tenantId: string, _period: string): Promise<boolean> {
    return true;
  },
};
