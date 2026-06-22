import { describe, it, expect, vi, beforeEach } from "vitest";
import { BadRequestException, NotFoundException } from "@nestjs/common";

import { ProcurementDbRepository } from "./procurement.db.repository";
import type { TenantScope } from "../../../shared/scope/tenant-scope";

/**
 * Task 4.4 — PO release with an atomic Finance Payable_Record.
 *
 * These tests exercise `releasePurchaseOrder` directly (with a fake Prisma
 * client) to assert:
 *   - On release the Finance Payable_Record is created with the originating
 *     `tenant_id` and every contract-required field populated (Req 6.3, 9.4).
 *   - A release that cannot populate a contract-required field (e.g. the
 *     vendor name, because the supplier is out of scope) is rejected with a
 *     `BadRequestException` naming the field, and NO write is performed so
 *     there is no partial Payable_Record or purchase order (Req 6.4).
 *   - When a transaction client is supplied, every read/write routes through it
 *     so the release + Payable_Record enrol in the surrounding
 *     Atomic_Operation (Req 9.4).
 *   - A Payable_Record write failure propagates so the surrounding
 *     Atomic_Operation rolls the release back (Req 9.10).
 */

const SCOPE: TenantScope = { tenant_id: "tnt-1" };

const RELEASE_DTO = {
  requisitionId: "req-1",
  supplierId: "sup-1",
  total_amount: 1500,
} as any;

function buildPrismaMock(overrides: Record<string, any> = {}) {
  return {
    procurement_requisitions: {
      findFirst: vi.fn().mockResolvedValue({
        id: "req-1",
        tenant_id: "tnt-1",
        branch_code: "HQ",
        currency: "IDR",
        status: "SUPPLIER_CONFIRMED",
      }),
      update: vi.fn(async ({ data }: any) => ({ id: "req-1", ...data })),
    },
    supplier_masters: {
      findFirst: vi.fn().mockResolvedValue({ id: "sup-1", name: "Acme Supplies" }),
    },
    procurement_final_pos: {
      create: vi.fn(async ({ data }: any) => ({
        id: "po-1",
        tenant_id: "tnt-1",
        requisition_id: "req-1",
        supplier_id: "sup-1",
        branch_code: "HQ",
        total_amount: data.total_amount,
        status: "RELEASED",
        issued_at: new Date("2024-01-01T00:00:00.000Z"),
        created_at: new Date("2024-01-01T00:00:00.000Z"),
        updated_at: new Date("2024-01-01T00:00:00.000Z"),
      })),
    },
    payables: {
      create: vi.fn(async ({ data }: any) => ({ id: "pay-1", ...data })),
    },
    ...overrides,
  } as any;
}

describe("ProcurementDbRepository — releasePurchaseOrder (task 4.4)", () => {
  let prisma: any;
  let repo: ProcurementDbRepository;

  beforeEach(() => {
    prisma = buildPrismaMock();
    repo = new ProcurementDbRepository(prisma);
  });

  it("creates the Finance Payable_Record with the originating tenant_id and every contract-required field", async () => {
    const result = await repo.releasePurchaseOrder(SCOPE, RELEASE_DTO);

    expect(prisma.procurement_final_pos.create).toHaveBeenCalledTimes(1);
    expect(prisma.procurement_requisitions.update).toHaveBeenCalledTimes(1);
    expect(prisma.payables.create).toHaveBeenCalledTimes(1);

    const payable = prisma.payables.create.mock.calls[0][0].data;
    expect(payable.tenant_id).toBe("tnt-1");
    expect(payable.vendor_name).toBe("Acme Supplies");
    expect(payable.amount).toBe(1500);
    expect(payable.currency).toBe("IDR");
    expect(payable.due_date).toBeInstanceOf(Date);
    expect(payable.status).toBeTruthy();

    expect(result.status).toBe("released");
    expect(result.tenant_id).toBe("tnt-1");
  });

  it("rejects the release naming the missing contract-required field when the vendor cannot be resolved, with no partial write", async () => {
    prisma.supplier_masters.findFirst.mockResolvedValue(null);

    await expect(repo.releasePurchaseOrder(SCOPE, RELEASE_DTO)).rejects.toThrow(
      BadRequestException,
    );
    await expect(repo.releasePurchaseOrder(SCOPE, RELEASE_DTO)).rejects.toThrow(
      /vendor_name/,
    );

    // No partial write: neither the PO, the requisition update, nor the payable
    // is persisted (Requirement 6.4).
    expect(prisma.procurement_final_pos.create).not.toHaveBeenCalled();
    expect(prisma.procurement_requisitions.update).not.toHaveBeenCalled();
    expect(prisma.payables.create).not.toHaveBeenCalled();
  });

  it("returns 404 when the requisition is outside scope", async () => {
    prisma.procurement_requisitions.findFirst.mockResolvedValueOnce(null);

    await expect(repo.releasePurchaseOrder(SCOPE, RELEASE_DTO)).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.procurement_final_pos.create).not.toHaveBeenCalled();
    expect(prisma.payables.create).not.toHaveBeenCalled();
  });

  it("routes every read and write through the supplied transaction client", async () => {
    const tx = buildPrismaMock();

    await repo.releasePurchaseOrder(SCOPE, RELEASE_DTO, tx);

    expect(tx.procurement_final_pos.create).toHaveBeenCalledTimes(1);
    expect(tx.payables.create).toHaveBeenCalledTimes(1);
    // The standalone client must NOT be touched when a tx is supplied.
    expect(prisma.procurement_final_pos.create).not.toHaveBeenCalled();
    expect(prisma.payables.create).not.toHaveBeenCalled();
  });

  it("propagates a Payable_Record write failure so the surrounding Atomic_Operation rolls the release back", async () => {
    prisma.payables.create.mockRejectedValueOnce(new Error("payable write failed"));

    await expect(repo.releasePurchaseOrder(SCOPE, RELEASE_DTO)).rejects.toThrow(
      /payable write failed/,
    );
  });
});
