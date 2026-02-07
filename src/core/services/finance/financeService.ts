import type { SessionContext } from "@/core/security/session";
import { mockFinanceRepo } from "@/core/repositories/finance/mockFinanceRepo";
import { audit } from "@/core/logging/audit";
import { workflowService } from "@/core/services/hr/workflowService";
import type { WorkflowRequest } from "@/core/tools/workflows/workflowTypes";
import { receivablesService } from "./receivablesService";
import { payablesService } from "./payablesService";
import { paymentsService } from "./paymentsService";

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
  /** Get inbox/workflow requests for finance user */
  async getInbox(
    tenantId: string,
    session: SessionContext,
  ): Promise<WorkflowRequest[]> {
    ensureTenant(tenantId, session);
    try {
      return workflowService.listRequests(tenantId, { entityType: "PAYROLL" });
    } catch {
      return []; // fallback empty
    }
  },

  /** Compute finance alerts: overdue invoices, pending bills */
  async getAlerts(
    tenantId: string,
    session: SessionContext,
  ): Promise<FinanceAlert[]> {
    ensureTenant(tenantId, session);
    try {
      const receivables = await receivablesService.getReceivables(tenantId);
      const payables = await payablesService.getPayables(tenantId);
      return [
        ...receivables.map((inv) => ({
          id: inv.id,
          type: "receivable",
          title: `Invoice ${inv.id} overdue`,
          description: `Customer ${inv.customerName} - ${inv.amount}`,
          severity: inv.status === "overdue" ? "high" : "medium",
          action: "Send reminder",
        })),
        ...payables.map((bill) => ({
          id: bill.id,
          type: "payable",
          title: `Bill ${bill.id} due`,
          description: `Vendor ${bill.vendorName} - ${bill.amount}`,
          severity: bill.status === "pending" ? "medium" : "low",
          action: "Request payment approval",
        })),
      ];
    } catch {
      // fallback to mock
      const receivables = repo.listReceivables(tenantId);
      const payables = repo.listPayables(tenantId);
      return [
        ...receivables.map((inv) => ({
          id: inv.id,
          type: "receivable",
          title: `Invoice ${inv.id} overdue`,
          description: `Customer ${inv.customerName} - ${inv.amount}`,
          severity: inv.status === "overdue" ? "high" : "medium",
          action: "Send reminder",
        })),
        ...payables.map((bill) => ({
          id: bill.id,
          type: "payable",
          title: `Bill ${bill.id} due`,
          description: `Vendor ${bill.vendorName} - ${bill.amount}`,
          severity: bill.status === "pending" ? "medium" : "low",
          action: "Request payment approval",
        })),
      ];
    }
  },

  /** Create a new payment request */
  async createPaymentRequest(
    tenantId: string,
    session: SessionContext,
    payload: {
      amount: number;
      method: string;
      destination: string;
      purpose: string;
    },
  ) {
    ensureTenant(tenantId, session);
    try {
      const request = await paymentsService.executePayment({
        tenantId,
        amount: payload.amount,
        method: payload.method,
        destination: payload.destination,
        purpose: payload.purpose,
      });
      workflowService.createRequest(tenantId, session, {
        entityType: "PAYMENT",
        entityId: request.id,
        makerDept: session.departmentId,
        destinationDept: "FINANCE",
        notes: payload.purpose,
        metadata: { amount: String(payload.amount), method: payload.method },
      });
      audit.log({
        tenantId,
        actorId: session.userId,
        action: "finance.payment.request",
        entityType: "payment_request",
        entityId: request.id,
        after: { workflowId: request.workflowId },
      });
      return request;
    } catch {
      // fallback to mock
      const now = new Date().toISOString();
      const request = repo.createPaymentRequest(tenantId, {
        id: `pay-${Date.now()}`,
        tenantId,
        amount: payload.amount,
        currency: "IDR",
        method: payload.method as any,
        destination: payload.destination,
        purpose: payload.purpose,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });
      const wf = workflowService.createRequest(tenantId, session, {
        entityType: "PAYMENT",
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
    }
  },
};
