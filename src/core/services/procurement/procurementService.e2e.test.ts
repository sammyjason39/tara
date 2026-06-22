import { beforeEach, describe, expect, it } from "vitest";

// Skip: Mock repositories removed during production audit (Task 8.1).
// Procurement flows are now tested via real E2E Playwright workflows.
describe.skip("procurementService (e2e with mock repo — DEPRECATED)", () => {
  it("placeholder", () => {});
});

/* Original imports (kept for reference):
import { registerDefaultRepos } from "@/core/persistence/repositoryRegistry";
import { Roles } from "@/core/security/roles";
import type { SessionContext } from "@/core/security/session";
import { mockProcurementRepo } from "@/core/repositories/procurement/mockProcurementRepo";
import { procurementService } from "./procurementService";

const tenantId = "tenant-procurement-e2e";

const procurementSession: SessionContext = {
  userId: "procurement-admin",
  tenantId,
  role: Roles.SUPERADMIN,
  departmentId: "PROCUREMENT",
};

const legalSession: SessionContext = {
  userId: "legal-admin",
  tenantId,
  role: Roles.SUPERADMIN,
  departmentId: "LEGAL",
};

const financeSession: SessionContext = {
  userId: "finance-admin",
  tenantId,
  role: Roles.SUPERADMIN,
  departmentId: "FINANCE",
};

const setupReleasedPo = (quotedTotal: number) => {
  const [supplier] = procurementService.listSupplierMasters(tenantId);
  const [branch] = procurementService
    .listSupplierBranches(tenantId)
    .filter((item) => item.supplierId === supplier.id);

  const requisition = procurementService.createRequisition(tenantId, procurementSession, {
    title: "E2E Requisition",
    description: "Procurement integration validation flow",
    category: "Machinery",
    branchCode: branch.branchCode,
    budgetClass: "OPEX",
    amount: 100_000_000,
    contractRequired: true,
  });

  procurementService.approveRequesterHod(tenantId, procurementSession, requisition.id);

  const draft = procurementService.buildDraftPurchaseOrder(tenantId, procurementSession, {
    requisitionId: requisition.id,
    supplierId: supplier.id,
    supplierBranchId: branch.id,
    contractType: "SPOT",
    lineItems: [
      {
        productSku: "MCH-CNC-12",
        description: "CNC Cutting Unit",
        quantity: 1,
        uom: "unit",
        unitPrice: 100_000_000,
      },
    ],
  });

  procurementService.approveDraftByProcurementHod(tenantId, procurementSession, draft.id);

  procurementService.confirmSupplierQuote(tenantId, procurementSession, {
    draftPoId: draft.id,
    quoteReference: "Q-001",
    quoteNotes: "Supplier quote confirmation",
    quotedTotal,
  });

  const contract = procurementService.upsertContractForRequisition(
    tenantId,
    procurementSession,
    {
      requisitionId: requisition.id,
      supplierId: supplier.id,
      notes: "Procurement ownership handoff",
      attachmentIds: ["doc-legal-1"],
    },
  );

  procurementService.approveLegalContract(tenantId, legalSession, contract.id);
  procurementService.signContractParty(tenantId, procurementSession, contract.id, "SUPPLIER");
  procurementService.signContractParty(
    tenantId,
    procurementSession,
    contract.id,
    "PROCUREMENT_HOD",
  );
  procurementService.signContractParty(tenantId, financeSession, contract.id, "FINANCE_HOD");

  procurementService.setFinalApproval(tenantId, procurementSession, requisition.id, "REQUESTER_HOD");
  procurementService.setFinalApproval(
    tenantId,
    procurementSession,
    requisition.id,
    "PROCUREMENT_HOD",
  );
  procurementService.setFinalApproval(tenantId, financeSession, requisition.id, "FINANCE_HOD");

  const finalPo = procurementService.releasePurchaseOrder(
    tenantId,
    procurementSession,
    requisition.id,
  );

  return { requisition, draft, contract, finalPo, supplier, branch };
};

describe("procurementService end-to-end integrations", () => {
  beforeEach(() => {
    registerDefaultRepos();
    window.localStorage.clear();
  });

  it("runs procurement happy path and pushes handoff queues into legal/inventory/it", () => {
    const { contract, finalPo, supplier, branch } = setupReleasedPo(100_000_000);

    const legalHandoff = procurementService
      .listLegalHandoffs(tenantId)
      .find((item) => item.contractId === contract.id);
    expect(legalHandoff).toBeDefined();
    expect(legalHandoff?.status).toBe("CONTRACT_ACCEPTED");

    const inventorySync = procurementService
      .listGoodsReceiptSyncs(tenantId)
      .find((item) => item.finalPoId === finalPo.id);
    expect(inventorySync).toBeDefined();
    expect(inventorySync?.status).toBe("PENDING_RECEIPT");

    const provisioning = procurementService
      .listSupplierAccessProvisioning(tenantId)
      .find(
        (item) =>
          item.supplierId === supplier.id && item.supplierBranchId === branch.id,
      );
    expect(provisioning).toBeDefined();
    expect(provisioning?.status).toBe("REQUESTED");

    procurementService.recordReceipt(tenantId, procurementSession, {
      finalPoId: finalPo.id,
      deliveryOnTime: true,
      quantityAccuracy: 98,
      qualityScore: 97,
      issueCount: 0,
      invoiceMismatch: false,
    });

    const syncedReceipt = procurementService
      .listGoodsReceiptSyncs(tenantId)
      .find((item) => item.finalPoId === finalPo.id);
    expect(syncedReceipt?.status).toBe("SYNCED");
  });

  it("flags approval bypass risk when a requisition is forced into draft-approved stage", () => {
    const requisition = procurementService.createRequisition(tenantId, procurementSession, {
      title: "Bypass Risk Case",
      description: "Should trigger approval bypass risk",
      category: "Office",
      branchCode: "JKT",
      budgetClass: "OPEX",
      amount: 20_000_000,
      contractRequired: false,
    });

    mockProcurementRepo.updateRequisition(tenantId, requisition.id, {
      status: "DRAFT_PO_APPROVED",
      approvals: { ...requisition.approvals, requesterHod: false },
    });

    const risks = procurementService.runRiskScan(tenantId, procurementSession);
    const hasBypassSignal = risks.some(
      (item) =>
        item.code === "APPROVAL_BYPASS_RISK" && item.entityId === requisition.id,
    );
    expect(hasBypassSignal).toBe(true);
  });

  it("raises price spike and invoice mismatch fraud signals", () => {
    const { draft, finalPo } = setupReleasedPo(130_000_000);

    procurementService.runRiskScan(tenantId, procurementSession);

    procurementService.recordReceipt(tenantId, procurementSession, {
      finalPoId: finalPo.id,
      deliveryOnTime: false,
      quantityAccuracy: 75,
      qualityScore: 72,
      issueCount: 2,
      invoiceMismatch: true,
    });

    const risks = procurementService.listRiskSignals(tenantId);
    const hasPriceSpikeSignal = risks.some(
      (item) => item.code === "PRICE_SPIKE" && item.entityId === draft.id,
    );
    const hasDuplicateInvoiceSignal = risks.some(
      (item) =>
        item.code === "DUPLICATE_INVOICE_PATTERN" && item.entityId === finalPo.id,
    );

    expect(hasPriceSpikeSignal).toBe(true);
    expect(hasDuplicateInvoiceSignal).toBe(true);
  });
});

