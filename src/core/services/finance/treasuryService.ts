import type { SessionContext } from "@/core/security/session";
import { apiRequest } from "@/core/api/apiClient";
import type { MoneySource } from "@/core/types/finance/accounts";
import type { TreasuryTransfer } from "@/core/types/finance/treasury";

export const treasuryService = {
  async listSources(
    tenantId: string,
    session: SessionContext,
  ): Promise<MoneySource[]> {
    return apiRequest<MoneySource[]>(
      "/finance/treasury/sources",
      "GET",
      session,
      undefined,
      tenantId,
    );
  },

  async listTransfers(
    tenantId: string,
    session: SessionContext,
  ): Promise<TreasuryTransfer[]> {
    return apiRequest<TreasuryTransfer[]>(
      "/finance/treasury/transfers",
      "GET",
      session,
      undefined,
      tenantId,
    );
  },

  async createTransfer(
    tenantId: string,
    session: SessionContext,
    payload: { fromSourceId: string; toSourceId: string; amount: number },
  ): Promise<TreasuryTransfer> {
    return apiRequest<TreasuryTransfer>(
      "/finance/treasury/transfers",
      "POST",
      session,
      payload,
      tenantId,
    );
  },

  async reconcileSettlement(
    tenantId: string,
    session: SessionContext,
    sourceId: string,
    amount: number,
  ) {
    return apiRequest<any>(
      "/finance/treasury/settlements",
      "POST",
      session,
      { sourceId, amount },
      tenantId,
    );
  },
};
