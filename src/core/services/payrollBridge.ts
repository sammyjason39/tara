export type FinancePayload = {
  tenantId: string;
  payrollRunId: string;
  journalEntries: Array<{ account: string; debit: number; credit: number }>;
  cashRequirement: number;
};

export function exportPayrollToFinance(tenantId: string, payrollRunId: string): FinancePayload {
  return {
    tenantId,
    payrollRunId,
    journalEntries: [],
    cashRequirement: 0,
  };
}
