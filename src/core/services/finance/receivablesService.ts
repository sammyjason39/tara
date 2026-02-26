import type { ReceivableInvoice } from "@/core/types/finance/receivables";
import { apiRequest } from "@/core/api/apiClient";
import type { SessionContext } from "@/core/security/session";

export const receivablesService = {
  async getReceivables(
    tenantId: string,
    session?: SessionContext,
    status?: string,
  ): Promise<ReceivableInvoice[]> {
    const query = status ? `?status=${status}` : "";
    return apiRequest<ReceivableInvoice[]>(
      `/finance/receivables${query}`,
      "GET",
      session,
      undefined,
      tenantId,
    );
  },

  async createReceivable(
    receivable: ReceivableInvoice,
    session?: SessionContext,
  ): Promise<ReceivableInvoice> {
    return apiRequest<ReceivableInvoice>(
      "/finance/receivables",
      "POST",
      session,
      receivable,
      receivable.tenantId,
    );
  },

  async updateReceivable(
    receivableId: string,
    updates: Partial<ReceivableInvoice>,
    session?: SessionContext,
  ): Promise<ReceivableInvoice | null> {
    const tenantId = updates.tenantId || "";
    return apiRequest<ReceivableInvoice>(
      `/finance/receivables/${receivableId}`,
      "PATCH",
      session,
      updates,
      tenantId,
    );
  },

  async approveReceivable(
    receivableId: string,
    tenantId: string,
    session?: SessionContext,
  ): Promise<ReceivableInvoice | null> {
    return apiRequest<ReceivableInvoice>(
      `/finance/receivables/${receivableId}/approve`,
      "POST",
      session,
      undefined,
      tenantId,
    );
  },
};
