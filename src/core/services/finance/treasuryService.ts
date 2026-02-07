import type { SessionContext } from "@/core/security/session";
import { mockFinanceRepo } from "@/core/repositories/finance/mockFinanceRepo";
import type { MoneySource } from "@/core/types/finance/accounts";
import type { TreasuryTransfer } from "@/core/types/finance/treasury";
import { audit } from "@/core/logging/audit";
import { workflowService } from "@/core/services/hr/workflowService";

const repo = mockFinanceRepo;

const ensureTenant = (tenantId: string, session: SessionContext) => {
  if (session.role === "SUPERADMIN") return;
  if (tenantId !== session.tenantId) throw new Error("Tenant access denied");
};

const id = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const treasuryService = {
  async listSources(tenantId: string, session: SessionContext): Promise<MoneySource[]> {
    ensureTenant(tenantId, session);
    return repo.listSources(tenantId);
  },

  async listTransfers(tenantId: string, session: SessionContext): Promise<TreasuryTransfer[]> {
    ensureTenant(tenantId, session);
    return repo.listTransfers(tenantId);
  },

  async createTransfer(
    tenantId: string,
    session: SessionContext,
    payload: { fromSourceId: string; toSourceId: string; amount: number },
  ): Promise<TreasuryTransfer> {
    ensureTenant(tenantId, session);
    const transfer: TreasuryTransfer = {
      id: id("trf"),
      tenantId,
      fromSourceId: payload.fromSourceId,
      toSourceId: payload.toSourceId,
      amount: payload.amount,
      currency: "IDR",
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    repo.createTransfer(tenantId, transfer);
    workflowService.createRequest(tenantId, session, {
      entityType: "PURCHASE",
      entityId: transfer.id,
      makerDept: session.departmentId,
      destinationDept: "FINANCE",
      notes: "Treasury transfer approval",
    });
    audit.log({
      tenantId,
      actorId: session.userId,
      action: "treasury.transfer.create",
      entityType: "treasury_transfer",
      entityId: transfer.id,
      after: { amount: payload.amount },
    });
    return transfer;
  },

  async reconcileSettlement(
    tenantId: string,
    session: SessionContext,
    sourceId: string,
    amount: number,
  ) {
    ensureTenant(tenantId, session);
    const record = repo.createSettlement(tenantId, {
      id: id("stl"),
      tenantId,
      sourceId,
      amount,
      currency: "IDR",
      status: "reconciled",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    audit.log({
      tenantId,
      actorId: session.userId,
      action: "treasury.settlement.reconcile",
      entityType: "settlement",
      entityId: record.id,
      after: { sourceId, amount },
    });
    return record;
  },
};
