import { beforeEach, describe, expect, it } from "vitest";
import { Roles } from "@/core/security/roles";
import type { SessionContext } from "@/core/security/session";
import { paymentService } from "./paymentService";

const tenantId = "tenant-payment-test";
const session: SessionContext = {
  userId: "payment-ops",
  tenantId,
  role: Roles.SUPERADMIN,
  departmentId: "FINANCE",
};

describe("paymentService", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("enforces idempotent request creation", () => {
    const first = paymentService.createExecutionRequest(tenantId, session, {
      type: "VENDOR_PAYOUT",
      amount: 1000000,
      destination: "PT Vendor One",
    });
    const second = paymentService.createExecutionRequest(tenantId, session, {
      type: "VENDOR_PAYOUT",
      amount: 1000000,
      destination: "PT Vendor One",
    });
    expect(second.id).toBe(first.id);
  });

  it("completes approval -> routing -> execution -> settlement and generates evidence", () => {
    const created = paymentService.createExecutionRequest(tenantId, session, {
      type: "TREASURY_TRANSFER",
      amount: 2500000,
      destination: "Branch Treasury",
      channel: "BANK_TRANSFER",
    });

    paymentService.approveRequest(tenantId, session, created.id);
    paymentService.selectProvider(tenantId, session, created.id);
    const executed = paymentService.executePayment(tenantId, session, created.id);
    expect(executed.status).toBe("SETTLEMENT_PENDING");

    const settled = paymentService.confirmSettlement(tenantId, session, created.id);
    expect(settled.status).toBe("SETTLED");
    expect(settled.ledgerSyncTriggeredAt).toBeTruthy();

    const evidence = paymentService.listEvidencePacks(tenantId);
    expect(evidence.length).toBeGreaterThan(0);
    expect(evidence[0]?.paymentId).toBe(created.id);
  });

  it("creates chargeback when dispute is resolved", () => {
    const seedPayment = paymentService
      .listTransactions(tenantId)
      .find((item) => item.status === "SETTLED");
    expect(seedPayment).toBeTruthy();

    const dispute = paymentService.openDispute(tenantId, session, {
      paymentId: seedPayment!.id,
      amount: 100000,
      reason: "Unauthorized charge",
    });
    paymentService.attachDisputeEvidence(tenantId, session, dispute.id, "slip-001");
    paymentService.progressDispute(tenantId, session, dispute.id, "PROVIDER_SUBMITTED");
    paymentService.resolveDispute(tenantId, session, dispute.id, "WON");

    const chargebacks = paymentService.listChargebacks(tenantId);
    expect(chargebacks.length).toBeGreaterThan(0);
    expect(chargebacks[0]?.disputeId).toBe(dispute.id);
  });
});

