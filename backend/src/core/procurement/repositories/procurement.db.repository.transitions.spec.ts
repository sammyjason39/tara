import { describe, it, expect, vi, beforeEach } from "vitest";
import { BadRequestException, NotFoundException } from "@nestjs/common";

import { ProcurementDbRepository } from "./procurement.db.repository";
import type { TenantScope } from "../../../shared/scope/tenant-scope";

/**
 * Task 4.3 — Atomic Procurement_Workflow transitions.
 *
 * These tests exercise the repository transition methods directly (with a fake
 * Prisma client) to assert the state-machine discipline introduced by task 4.3:
 *   - A transition is validated against the entity's CURRENT status read before
 *     any write (Requirements 9.2, 9.3, 4.6, 4.7).
 *   - An illegal transition is rejected with a `BadRequestException` whose
 *     message names the current and the rejected target state, and NO update is
 *     performed so the entity is left unchanged (Requirement 9.3, 4.7).
 *   - A legal transition advances the status (and any side-effect write).
 *   - Passing a transaction client routes every read/write through that client
 *     so the transition enrols in the surrounding Atomic_Operation.
 */

const SCOPE: TenantScope = { tenant_id: "tnt-1" };

function buildPrismaMock(overrides: Record<string, any> = {}) {
  const echoUpdate = () =>
    vi.fn(async ({ data }: any) => ({
      id: "x",
      tenant_id: "tnt-1",
      requisition_id: "req-1",
      quoted_total: 0,
      created_at: new Date("2024-01-01T00:00:00.000Z"),
      updated_at: new Date("2024-01-01T00:00:00.000Z"),
      ...data,
    }));

  return {
    procurement_requisitions: {
      findFirst: vi.fn(),
      update: echoUpdate(),
    },
    procurement_draft_pos: {
      findFirst: vi.fn(),
      update: echoUpdate(),
    },
    ...overrides,
  } as any;
}

describe("ProcurementDbRepository — approveRequesterHod (task 4.3)", () => {
  let prisma: any;
  let repo: ProcurementDbRepository;

  beforeEach(() => {
    prisma = buildPrismaMock();
    repo = new ProcurementDbRepository(prisma);
  });

  it("advances a PENDING_REQUESTER_HOD requisition to APPROVED_REQUESTER_HOD", async () => {
    prisma.procurement_requisitions.findFirst.mockResolvedValueOnce({
      id: "req-1",
      status: "PENDING_REQUESTER_HOD",
    });

    const result = await repo.approveRequesterHod(SCOPE, "req-1");

    expect(prisma.procurement_requisitions.update).toHaveBeenCalledTimes(1);
    const data = prisma.procurement_requisitions.update.mock.calls[0][0].data;
    expect(data.status).toBe("APPROVED_REQUESTER_HOD");
    expect(result.status).toBe("APPROVED_REQUESTER_HOD");
  });

  it("rejects an invalid transition naming current+target and leaves status unchanged", async () => {
    prisma.procurement_requisitions.findFirst.mockResolvedValue({
      id: "req-1",
      status: "FINAL_APPROVED",
    });

    await expect(repo.approveRequesterHod(SCOPE, "req-1")).rejects.toThrow(
      BadRequestException,
    );
    await expect(repo.approveRequesterHod(SCOPE, "req-1")).rejects.toThrow(
      /from 'FINAL_APPROVED' to 'APPROVED_REQUESTER_HOD'/,
    );

    // No write was performed: the entity is left unchanged (Req 4.7, 9.3).
    expect(prisma.procurement_requisitions.update).not.toHaveBeenCalled();
  });

  it("returns 404 when the requisition is outside scope", async () => {
    prisma.procurement_requisitions.findFirst.mockResolvedValueOnce(null);
    await expect(repo.approveRequesterHod(SCOPE, "req-x")).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.procurement_requisitions.update).not.toHaveBeenCalled();
  });

  it("routes reads and writes through the supplied transaction client", async () => {
    const txUpdate = vi.fn(async ({ data }: any) => ({
      id: "req-1",
      status: data.status,
      quoted_total: 0,
    }));
    const tx: any = {
      procurement_requisitions: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce({ id: "req-1", status: "PENDING_REQUESTER_HOD" }),
        update: txUpdate,
      },
    };

    await repo.approveRequesterHod(SCOPE, "req-1", tx);

    expect(tx.procurement_requisitions.findFirst).toHaveBeenCalledTimes(1);
    expect(txUpdate).toHaveBeenCalledTimes(1);
    // The standalone client must NOT be used when a tx is supplied.
    expect(prisma.procurement_requisitions.findFirst).not.toHaveBeenCalled();
    expect(prisma.procurement_requisitions.update).not.toHaveBeenCalled();
  });
});

describe("ProcurementDbRepository — approveFinal (task 4.3)", () => {
  let prisma: any;
  let repo: ProcurementDbRepository;

  beforeEach(() => {
    prisma = buildPrismaMock();
    repo = new ProcurementDbRepository(prisma);
  });

  it("advances an APPROVED_REQUESTER_HOD requisition to FINAL_APPROVED for FINANCE_HOD", async () => {
    prisma.procurement_requisitions.findFirst.mockResolvedValueOnce({
      id: "req-1",
      status: "APPROVED_REQUESTER_HOD",
    });

    const result = await repo.approveFinal(SCOPE, "req-1", {
      approver: "FINANCE_HOD",
    } as any);

    expect(result.status).toBe("FINAL_APPROVED");
  });

  it("rejects final approval from a non-approvable state, leaving status unchanged", async () => {
    prisma.procurement_requisitions.findFirst.mockResolvedValueOnce({
      id: "req-1",
      status: "PENDING_REQUESTER_HOD",
    });

    await expect(
      repo.approveFinal(SCOPE, "req-1", { approver: "FINANCE_HOD" } as any),
    ).rejects.toThrow(/from 'PENDING_REQUESTER_HOD' to 'FINAL_APPROVED'/);
    expect(prisma.procurement_requisitions.update).not.toHaveBeenCalled();
  });
});

describe("ProcurementDbRepository — draft PO transitions (task 4.3)", () => {
  let prisma: any;
  let repo: ProcurementDbRepository;

  beforeEach(() => {
    prisma = buildPrismaMock();
    repo = new ProcurementDbRepository(prisma);
  });

  it("approves a DRAFT draft PO and advances the requisition", async () => {
    prisma.procurement_draft_pos.findFirst.mockResolvedValueOnce({
      id: "draft-1",
      status: "DRAFT",
      requisition_id: "req-1",
    });

    const result = await repo.approveDraftByProcurementHod(SCOPE, "draft-1");

    expect(result.status).toBe("PROCUREMENT_HOD_APPROVED");
    // draft update + requisition advance both performed.
    expect(prisma.procurement_draft_pos.update).toHaveBeenCalledTimes(1);
    expect(prisma.procurement_requisitions.update).toHaveBeenCalledTimes(1);
  });

  it("rejects procurement-HOD approval when the draft is not in DRAFT", async () => {
    prisma.procurement_draft_pos.findFirst.mockResolvedValueOnce({
      id: "draft-1",
      status: "SUPPLIER_CONFIRMED",
      requisition_id: "req-1",
    });

    await expect(
      repo.approveDraftByProcurementHod(SCOPE, "draft-1"),
    ).rejects.toThrow(/from 'SUPPLIER_CONFIRMED' to 'PROCUREMENT_HOD_APPROVED'/);
    expect(prisma.procurement_draft_pos.update).not.toHaveBeenCalled();
    expect(prisma.procurement_requisitions.update).not.toHaveBeenCalled();
  });

  it("confirms a supplier quote only after procurement-HOD approval", async () => {
    prisma.procurement_draft_pos.findFirst.mockResolvedValueOnce({
      id: "draft-1",
      status: "PROCUREMENT_HOD_APPROVED",
      requisition_id: "req-1",
    });

    const result = await repo.confirmSupplierQuote(SCOPE, "draft-1", {
      quoteReference: "Q-1",
    } as any);

    expect(result.status).toBe("SUPPLIER_CONFIRMED");
  });

  it("rejects quote confirmation from an invalid state, leaving status unchanged", async () => {
    prisma.procurement_draft_pos.findFirst.mockResolvedValueOnce({
      id: "draft-1",
      status: "DRAFT",
      requisition_id: "req-1",
    });

    await expect(
      repo.confirmSupplierQuote(SCOPE, "draft-1", { quoteReference: "Q-1" } as any),
    ).rejects.toThrow(/from 'DRAFT' to 'SUPPLIER_CONFIRMED'/);
    expect(prisma.procurement_draft_pos.update).not.toHaveBeenCalled();
  });
});
