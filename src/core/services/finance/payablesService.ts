import type { PayableBill } from "@/core/types/finance/payables";
import { apiRequest } from "@/core/api/apiClient";
import type { SessionContext } from "@/core/security/session";

export const payablesService = {
  async getPayables(
    tenantId: string,
    session?: SessionContext,
    status?: string,
  ): Promise<PayableBill[]> {
    const query = status ? `?status=${status}` : "";
    return apiRequest<PayableBill[]>(
      `/finance/payables${query}`,
      "GET",
      session,
      undefined,
      tenantId,
    );
  },

  async createPayable(
    payable: PayableBill,
    session?: SessionContext,
  ): Promise<PayableBill> {
    return apiRequest<PayableBill>(
      "/finance/payables",
      "POST",
      session,
      payable,
      payable.tenantId,
    );
  },

  async updatePayable(
    payableId: string,
    updates: Partial<PayableBill>,
    session?: SessionContext,
  ): Promise<PayableBill | null> {
    const tenantId = updates.tenantId || "";
    return apiRequest<PayableBill>(
      `/finance/payables/${payableId}`,
      "PATCH",
      session,
      updates,
      tenantId,
    );
  },

  async approvePayable(
    payableId: string,
    tenantId: string,
    session?: SessionContext,
  ): Promise<PayableBill | null> {
    return apiRequest<PayableBill>(
      `/finance/payables/${payableId}/approve`,
      "POST",
      session,
      undefined,
      tenantId,
    );
  },
};
