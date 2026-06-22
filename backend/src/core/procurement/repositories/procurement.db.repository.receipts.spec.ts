import { describe, it, expect, vi, beforeEach } from "vitest";
import { BadRequestException, NotFoundException } from "@nestjs/common";

import { ProcurementDbRepository } from "./procurement.db.repository";
import type { TenantScope } from "../../../shared/scope/tenant-scope";

/**
 * Task 4.5 — Goods receipt and contract lifecycle atomicity.
 *
 * These tests exercise the repository methods directly (with a fake Prisma
 * client) to assert the behaviour introduced by task 4.5:
 *   - A goods receipt persists the receipt row, updates the associated
 *     inventory (stock level + movement), updates the PO status, and
 *     recalculates the supplier rating — all on the SAME client so they share
 *     one Atomic_Operation (Requirement 9.5).
 *   - A receipt whose received quantity exceeds the outstanding ordered
 *     quantity is rejected with a `BadRequestException` BEFORE any write, so
 *     nothing is persisted (Requirement 9.6).
 *   - Contract legal-approval and sign transitions are validated against the
 *     contract's CURRENT state read before any write; an illegal transition is
 *     rejected naming current+target and leaves the contract unchanged
 *     (Requirement 9.7).
 */

const SCOPE: TenantScope = { tenant_id: "tnt-1" };

const RECEIPT_DTO = {
  finalPoId: "po-1",
  deliveryOnTime: true,
  quantityAccuracy: 100,
  qualityScore: 100,
  issueCount: 0,
  invoiceMismatch: false,
} as any;

function buildReceiptPrismaMock(overrides: Record<string, any> = {}) {
  return {
    procurement_final_pos: {
      findFirst: vi.fn().mockResolvedValue({
        id: "po-1",
        tenant_id: "tnt-1",
        requisition_id: "req-1",
        draft_po_id: "draft-1",
        supplier_id: "sup-1",
        supplier_branch_id: "branch-1",
      }),
      update: vi.fn(async ({ data }: any) => ({ id: "po-1", ...data })),
    },
    procurement_draft_pos: {
      findFirst: vi.fn().mockResolvedValue({
        id: "draft-1",
        line_items: [{ productSku: "SKU-1", quantity: 10 }],
      }),
    },
    procurement_receipts: {
      create: vi.fn(async ({ data }: any) => ({
        id: "rcpt-1",
        ...data,
        created_at: new Date("2024-01-01T00:00:00.000Z"),
      })),
    },
    supplier_masters: {
      update: vi.fn(async ({ data }: any) => ({ id: "sup-1", ...data })),
    },
    stock_levels: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(async ({ data }: any) => ({ id: "lvl-1", ...data })),
      update: vi.fn(async ({ data }: any) => ({ id: "lvl-1", ...data })),
    },
    stock_movements: {
      create: vi.fn(async ({ data }: any) => ({ id: "mov-1", ...data })),
    },
    ...overrides,
  } as any;
}

describe("ProcurementDbRepository — createReceipt (task 4.5)", () => {
  let prisma: any;
  let repo: ProcurementDbRepository;

  beforeEach(() => {
    prisma = buildReceiptPrismaMock();
    repo = new ProcurementDbRepository(prisma);
  });

  it("persists the receipt, updates PO status, and recalculates the supplier rating", async () => {
    const result = await repo.createReceipt(SCOPE, RECEIPT_DTO, "user-1");

    expect(prisma.procurement_receipts.create).toHaveBeenCalledTimes(1);
    const receipt = prisma.procurement_receipts.create.mock.calls[0][0].data;
    expect(receipt.tenant_id).toBe("tnt-1");
    expect(receipt.final_po_id).toBe("po-1");
    expect(receipt.supplier_id).toBe("sup-1");

    expect(prisma.procurement_final_pos.update).toHaveBeenCalledTimes(1);
    expect(prisma.procurement_final_pos.update.mock.calls[0][0].data.status).toBe("RECEIVED");

    expect(prisma.supplier_masters.update).toHaveBeenCalledTimes(1);
    // Perfect delivery: 25 + 50 + 25 = 100
    expect(result.calculatedRating).toBe(100);
  });

  it("takes received lines into inventory within the same operation", async () => {
    await repo.createReceipt(
      SCOPE,
      { ...RECEIPT_DTO, location_id: "WH-1", items: [{ sku: "SKU-1", quantity: 5, productId: "prod-1" }] },
      "user-1",
    );

    expect(prisma.stock_levels.create).toHaveBeenCalledTimes(1);
    expect(prisma.stock_levels.create.mock.calls[0][0].data.on_hand).toBe(5);
    expect(prisma.stock_movements.create).toHaveBeenCalledTimes(1);
    const move = prisma.stock_movements.create.mock.calls[0][0].data;
    expect(move.type).toBe("INTAKE");
    expect(move.product_id).toBe("prod-1");
    expect(move.reference_id).toBe("po-1");
  });

  it("rejects a receipt exceeding the outstanding ordered quantity with no write", async () => {
    await expect(
      repo.createReceipt(
        SCOPE,
        { ...RECEIPT_DTO, location_id: "WH-1", items: [{ sku: "SKU-1", quantity: 11, productId: "prod-1" }] },
        "user-1",
      ),
    ).rejects.toThrow(BadRequestException);

    // Nothing persisted: no receipt, no inventory, no PO/rating update (Req 9.6).
    expect(prisma.procurement_receipts.create).not.toHaveBeenCalled();
    expect(prisma.stock_levels.create).not.toHaveBeenCalled();
    expect(prisma.stock_movements.create).not.toHaveBeenCalled();
    expect(prisma.procurement_final_pos.update).not.toHaveBeenCalled();
    expect(prisma.supplier_masters.update).not.toHaveBeenCalled();
  });

  it("rejects a received line for a SKU that was never ordered", async () => {
    await expect(
      repo.createReceipt(
        SCOPE,
        { ...RECEIPT_DTO, location_id: "WH-1", items: [{ sku: "SKU-UNKNOWN", quantity: 1, productId: "prod-x" }] },
        "user-1",
      ),
    ).rejects.toThrow(/exceeds the outstanding ordered quantity 0/);
    expect(prisma.procurement_receipts.create).not.toHaveBeenCalled();
  });

  it("returns 404 when the final PO is outside scope", async () => {
    prisma.procurement_final_pos.findFirst.mockResolvedValueOnce(null);
    await expect(repo.createReceipt(SCOPE, RECEIPT_DTO, "user-1")).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.procurement_receipts.create).not.toHaveBeenCalled();
  });

  it("routes every read and write through the supplied transaction client", async () => {
    const tx = buildReceiptPrismaMock();
    await repo.createReceipt(SCOPE, RECEIPT_DTO, "user-1", tx);

    expect(tx.procurement_receipts.create).toHaveBeenCalledTimes(1);
    expect(prisma.procurement_receipts.create).not.toHaveBeenCalled();
  });
});

describe("ProcurementDbRepository — contract lifecycle (task 4.5)", () => {
  let prisma: any;
  let repo: ProcurementDbRepository;

  function buildContractPrismaMock(contract: any) {
    return {
      procurement_contracts: {
        findFirst: vi.fn().mockResolvedValue(contract),
        update: vi.fn(async ({ data }: any) => ({ id: contract?.id ?? "c-1", ...contract, ...data })),
      },
    } as any;
  }

  it("approves a contract in LEGAL_REVIEW", async () => {
    prisma = buildContractPrismaMock({ id: "c-1", status: "LEGAL_REVIEW" });
    repo = new ProcurementDbRepository(prisma);

    const result = await repo.approveLegalContract(SCOPE, "c-1");
    expect(result.status).toBe("LEGAL_APPROVED");
    expect(prisma.procurement_contracts.update).toHaveBeenCalledTimes(1);
  });

  it("rejects legal approval from a non-reviewable state, leaving the contract unchanged", async () => {
    prisma = buildContractPrismaMock({ id: "c-1", status: "SIGNED" });
    repo = new ProcurementDbRepository(prisma);

    await expect(repo.approveLegalContract(SCOPE, "c-1")).rejects.toThrow(
      /from 'SIGNED' to 'LEGAL_APPROVED'/,
    );
    expect(prisma.procurement_contracts.update).not.toHaveBeenCalled();
  });

  it("signs an approved contract and advances to PARTIAL_SIGNED", async () => {
    prisma = buildContractPrismaMock({
      id: "c-1",
      status: "LEGAL_APPROVED",
      signed_by_supplier: false,
      signed_by_proc_hod: false,
      signed_by_finance_hod: false,
    });
    repo = new ProcurementDbRepository(prisma);

    const result = await repo.signContract(SCOPE, "c-1", { party: "SUPPLIER" } as any);
    expect(prisma.procurement_contracts.update).toHaveBeenCalledTimes(1);
    const data = prisma.procurement_contracts.update.mock.calls[0][0].data;
    expect(data.signed_by_supplier).toBe(true);
    expect(data.status).toBe("PARTIAL_SIGNED");
    expect(result.status).toBe("PARTIAL_SIGNED");
  });

  it("marks a contract SIGNED once all three parties have signed", async () => {
    prisma = buildContractPrismaMock({
      id: "c-1",
      status: "PARTIAL_SIGNED",
      signed_by_supplier: true,
      signed_by_proc_hod: true,
      signed_by_finance_hod: false,
    });
    repo = new ProcurementDbRepository(prisma);

    const result = await repo.signContract(SCOPE, "c-1", { party: "FINANCE_HOD" } as any);
    expect(result.status).toBe("SIGNED");
  });

  it("rejects signing a contract that has not been legally approved", async () => {
    prisma = buildContractPrismaMock({ id: "c-1", status: "LEGAL_REVIEW" });
    repo = new ProcurementDbRepository(prisma);

    await expect(
      repo.signContract(SCOPE, "c-1", { party: "SUPPLIER" } as any),
    ).rejects.toThrow(/from 'LEGAL_REVIEW' to 'SIGNED'/);
    expect(prisma.procurement_contracts.update).not.toHaveBeenCalled();
  });
});
