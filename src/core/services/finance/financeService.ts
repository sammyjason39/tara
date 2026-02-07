// src/core/services/finance/financeService.ts
import type { SessionContext } from "@/core/security/session";
import { mockFinanceRepo } from "@/core/repositories/finance/mockFinanceRepo";
import { audit } from "@/core/logging/audit";
import { workflowService } from "@/core/services/hr/workflowService";
import type { WorkflowRequest } from "@/core/tools/workflows/workflowTypes";
import type { Asset } from "@/core/repositories/finance/financeRepository";
import { PaymentMethod } from "@/core/types/finance/payments";

const repo = mockFinanceRepo;

const ensureTenant = (tenantId: string, session: SessionContext) => {
  if (session.role === "SUPERADMIN") return;
  if (tenantId !== session.tenantId) throw new Error("Tenant access denied");
};

export type FinanceAlert = {
  id: string;
  type: "approval" | "cash" | "receivable" | "payable" | "compliance";
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  action?: string;
};

export const financeService = {
  async getInbox(
    tenantId: string,
    session: SessionContext,
  ): Promise<WorkflowRequest[]> {
    ensureTenant(tenantId, session);
    try {
      return workflowService.listRequests(tenantId, { entityType: "PAYROLL" });
    } catch {
      return [];
    }
  },

  async getAlerts(
    tenantId: string,
    session: SessionContext,
  ): Promise<FinanceAlert[]> {
    ensureTenant(tenantId, session);
    const receivables = repo.listReceivables(tenantId);
    const payables = repo.listPayables(tenantId);
    return [
      ...receivables.map((inv) => ({
        id: inv.id,
        type: "receivable" as const,
        title: `Invoice ${inv.id} overdue`,
        description: `Customer ${inv.customerName} - ${inv.amount}`,
        severity:
          inv.status === "overdue" ? ("high" as const) : ("medium" as const),
        action: "Send reminder",
      })),
      ...payables.map((bill) => ({
        id: bill.id,
        type: "payable" as const,
        title: `Bill ${bill.id} due`,
        description: `Vendor ${bill.vendorName} - ${bill.amount}`,
        severity:
          bill.status === "pending" ? ("medium" as const) : ("low" as const),
        action: "Request payment approval",
      })),
    ];
  },

  async createPaymentRequest(
    tenantId: string,
    session: SessionContext,
    payload: {
      amount: number;
      method: PaymentMethod;
      destination: string;
      purpose: string;
    },
  ) {
    ensureTenant(tenantId, session);
    const now = new Date().toISOString();
    const request = repo.createPaymentRequest(tenantId, {
      id: `pay-${Date.now()}`,
      tenantId,
      amount: payload.amount,
      currency: "IDR",
      method: payload.method,
      destination: payload.destination,
      purpose: payload.purpose,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    const wf = workflowService.createRequest(tenantId, session, {
      entityType: "PURCHASE",
      entityId: request.id,
      makerDept: session.departmentId,
      destinationDept: "FINANCE",
      notes: payload.purpose,
      metadata: { amount: String(payload.amount), method: payload.method },
    });

    repo.updatePaymentRequest(tenantId, request.id, { workflowId: wf.id });

    audit.log({
      tenantId,
      actorId: session.userId,
      action: "finance.payment.request",
      entityType: "payment_request",
      entityId: request.id,
      after: { workflowId: wf.id },
    });

    return request;
  },

  async listAssets(
    tenantId: string,
    session: SessionContext,
  ): Promise<Asset[]> {
    ensureTenant(tenantId, session);
    return repo.listAssets(tenantId);
  },

  async createAsset(
    tenantId: string,
    session: SessionContext,
    asset: Omit<Asset, "id" | "status" | "createdAt">,
  ): Promise<Asset> {
    ensureTenant(tenantId, session);
    const newAsset = repo.createAsset(tenantId, asset);

    // Route creation through workflow using allowed entity type
    workflowService.createRequest(tenantId, session, {
      entityType: "ASSET_REQUEST", // make sure this exists in WorkflowEntityType
      entityId: newAsset.id,
      makerDept: session.departmentId,
      destinationDept: "FINANCE",
      notes: `New asset created: ${newAsset.name}`,
    });

    // Audit log
    audit.log({
      tenantId,
      actorId: session.userId,
      action: "finance.asset.create",
      entityType: "asset",
      entityId: newAsset.id,
      after: newAsset,
    });

    return newAsset;
  },
};
