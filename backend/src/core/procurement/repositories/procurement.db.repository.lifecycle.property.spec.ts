// Feature: core-departments-stabilization, Property 6: Lifecycle transitions succeed only from valid states
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { BadRequestException } from "@nestjs/common";

import { ProcurementDbRepository } from "./procurement.db.repository";
import type { TenantScope } from "../../../shared/scope/tenant-scope";

/**
 * Property 6: Lifecycle transitions succeed only from valid states
 * Validates: Requirements 8.5, 8.9, 9.2, 9.3, 9.6, 9.7, 10.5, 10.6, 11.3, 11.4,
 *            12.3, 12.4, 12.7, 12.8, 12.9, 12.10
 *
 * For any stateful Procurement_Workflow entity (requisition, draft PO, contract)
 * and any requested transition, the transition succeeds and persists the new
 * state (recording the acting party where the transition records one) if and
 * only if it is a valid edge from the entity's CURRENT state; otherwise it is
 * rejected with a client-error (400 `BadRequestException`) that names the current
 * and the rejected target state, leaving the state unchanged and observably in
 * exactly one defined status.
 *
 * ── Scope (design "implement once, parameterised; earliest applicable phase") ─
 *   Property 6 is introduced in Phase 2 (Procurement) and parameterised across
 *   every Procurement_Workflow transition method on the real repository:
 *     • approveRequesterHod        requisition: PENDING_REQUESTER_HOD → APPROVED_REQUESTER_HOD
 *     • approveFinal               requisition: APPROVED_REQUESTER_HOD/FINAL_APPROVAL_PENDING → FINAL_*
 *     • approveDraftByProcurementHod  draft PO: DRAFT → PROCUREMENT_HOD_APPROVED
 *     • confirmSupplierQuote          draft PO: PROCUREMENT_HOD_APPROVED → SUPPLIER_CONFIRMED
 *     • approveLegalContract       contract: LEGAL_REVIEW → LEGAL_APPROVED
 *     • signContract               contract: LEGAL_APPROVED/PARTIAL_SIGNED → SIGNED/PARTIAL_SIGNED
 *   Sales / Marketing / Payment lifecycles (Phases 3–5) reuse this same property
 *   shape in their phases; this spec exercises the Procurement instances.
 *
 * Strategy (design Testing Strategy): drive the REAL repository transition
 * methods against a fake Prisma boundary (no live DB). An in-memory store stands
 * in for the `procurement_requisitions`, `procurement_draft_pos`, and
 * `procurement_contracts` tables, honouring the `{ id, tenant_id }` `where`
 * filters the repository relies on. fast-check generates the entity's CURRENT
 * status from the full universe of defined statuses (both inside and outside the
 * guard set) so both valid and invalid edges are explored, at ≥ 100 runs.
 */

const SCOPE: TenantScope = { tenant_id: "tnt-1" };

/* -------------------------------------------------------------------------- */
/* The defined-status universe per entity, and the repository's guard sets.   */
/* (Mirrors the transition guards in procurement.db.repository.ts.)           */
/* -------------------------------------------------------------------------- */

const REQUISITION_STATUSES = [
  "PENDING_REQUESTER_HOD",
  "APPROVED_REQUESTER_HOD",
  "FINAL_APPROVAL_PENDING",
  "FINAL_APPROVED",
  "DRAFT_PO_PREPARED",
  "DRAFT_PO_APPROVED",
  "SUPPLIER_CONFIRMED",
  "RELEASED",
  "RECEIVED",
  "REJECTED",
] as const;

const DRAFT_PO_STATUSES = [
  "DRAFT",
  "PROCUREMENT_HOD_APPROVED",
  "SUPPLIER_CONFIRMED",
  "FINAL_PO",
  "RELEASED",
  "RECEIVED",
] as const;

const CONTRACT_STATUSES = [
  "LEGAL_REVIEW",
  "LEGAL_APPROVED",
  "PARTIAL_SIGNED",
  "SIGNED",
] as const;

const REQUESTER_HOD_APPROVABLE = new Set(["PENDING_REQUESTER_HOD"]);
const FINAL_APPROVABLE = new Set([
  "APPROVED_REQUESTER_HOD",
  "FINAL_APPROVAL_PENDING",
]);
const DRAFT_PROC_HOD_APPROVABLE = new Set(["DRAFT"]);
const DRAFT_QUOTE_CONFIRMABLE = new Set(["PROCUREMENT_HOD_APPROVED"]);
const CONTRACT_LEGAL_APPROVABLE = new Set(["LEGAL_REVIEW"]);
const CONTRACT_SIGNABLE = new Set(["LEGAL_APPROVED", "PARTIAL_SIGNED"]);

/* -------------------------------------------------------------------------- */
/* Fake Prisma boundary: in-memory stores honouring the {id,tenant_id} filter.*/
/* -------------------------------------------------------------------------- */

type Row = Record<string, any>;

class TableStore {
  rows: Row[] = [];

  seed(row: Row): void {
    this.rows.push(row);
  }

  statusOf(id: string): string | undefined {
    return this.rows.find((r) => r.id === id)?.status;
  }
}

function makeTable(store: TableStore) {
  const scoped = (r: Row, where: any) =>
    r.id === where.id && r.tenant_id === where.tenant_id;

  return {
    findFirst: async ({ where }: any) =>
      store.rows.find((r) => scoped(r, where)) ?? null,
    update: async ({ where, data }: any) => {
      const idx = store.rows.findIndex((r) => scoped(r, where));
      // Mirror Prisma: updating a non-existent/out-of-scope row is an error.
      if (idx < 0) throw new Error("Record to update not found.");
      store.rows[idx] = { ...store.rows[idx], ...data, updated_at: new Date() };
      return store.rows[idx];
    },
  };
}

function makePrisma(
  requisitions: TableStore,
  draftPos: TableStore,
  contracts: TableStore,
) {
  return {
    procurement_requisitions: makeTable(requisitions),
    procurement_draft_pos: makeTable(draftPos),
    procurement_contracts: makeTable(contracts),
  } as any;
}

/** Assert a caught value is a 400 BadRequestException naming current+target. */
function expectInvalidTransition(
  err: unknown,
  current: string,
  target: string,
): void {
  expect(err).toBeInstanceOf(BadRequestException);
  expect((err as BadRequestException).getStatus()).toBe(400);
  const message = (err as BadRequestException).message;
  expect(message).toContain(`'${current}'`);
  expect(message).toContain(`'${target}'`);
  expect(message).toContain(`from '${current}' to '${target}'`);
}

const idArb = fc
  .string({ minLength: 1, maxLength: 8 })
  .map((s) => `id-${s.replace(/[^a-zA-Z0-9]/g, "_")}`);

describe("Property 6: Procurement_Workflow lifecycle transitions succeed only from valid states", () => {
  /* ---------------------------------------------------------------------- */
  /* Requisition: approveRequesterHod                                        */
  /* ---------------------------------------------------------------------- */
  it("approveRequesterHod succeeds iff PENDING_REQUESTER_HOD; else 400 with state unchanged", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        fc.constantFrom(...REQUISITION_STATUSES),
        async (reqId, current) => {
          const requisitions = new TableStore();
          requisitions.seed({ id: reqId, tenant_id: SCOPE.tenant_id, status: current });
          const repo = new ProcurementDbRepository(
            makePrisma(requisitions, new TableStore(), new TableStore()),
          );

          const target = "APPROVED_REQUESTER_HOD";
          const valid = REQUESTER_HOD_APPROVABLE.has(current);

          if (valid) {
            const result = await repo.approveRequesterHod(SCOPE, reqId);
            expect(result.status).toBe(target);
            expect(requisitions.statusOf(reqId)).toBe(target);
          } else {
            let caught: unknown;
            try {
              await repo.approveRequesterHod(SCOPE, reqId);
            } catch (e) {
              caught = e;
            }
            expectInvalidTransition(caught, current, target);
            expect(requisitions.statusOf(reqId)).toBe(current);
          }
          // Observably in exactly one defined status.
          expect(REQUISITION_STATUSES).toContain(requisitions.statusOf(reqId));
        },
      ),
      { numRuns: 120 },
    );
  });

  /* ---------------------------------------------------------------------- */
  /* Requisition: approveFinal (target depends on approver)                  */
  /* ---------------------------------------------------------------------- */
  it("approveFinal succeeds iff APPROVED_REQUESTER_HOD/FINAL_APPROVAL_PENDING; else 400 unchanged", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        fc.constantFrom(...REQUISITION_STATUSES),
        fc.constantFrom("FINANCE_HOD", "PROCUREMENT_HOD", "REQUESTER_HOD"),
        async (reqId, current, approver) => {
          const requisitions = new TableStore();
          requisitions.seed({ id: reqId, tenant_id: SCOPE.tenant_id, status: current });
          const repo = new ProcurementDbRepository(
            makePrisma(requisitions, new TableStore(), new TableStore()),
          );

          const target =
            approver === "FINANCE_HOD" ? "FINAL_APPROVED" : "FINAL_APPROVAL_PENDING";
          const valid = FINAL_APPROVABLE.has(current);

          if (valid) {
            const result = await repo.approveFinal(SCOPE, reqId, { approver } as any);
            expect(result.status).toBe(target);
            expect(requisitions.statusOf(reqId)).toBe(target);
          } else {
            let caught: unknown;
            try {
              await repo.approveFinal(SCOPE, reqId, { approver } as any);
            } catch (e) {
              caught = e;
            }
            expectInvalidTransition(caught, current, target);
            expect(requisitions.statusOf(reqId)).toBe(current);
          }
          expect(REQUISITION_STATUSES).toContain(requisitions.statusOf(reqId));
        },
      ),
      { numRuns: 120 },
    );
  });

  /* ---------------------------------------------------------------------- */
  /* Draft PO: approveDraftByProcurementHod (also advances the requisition)  */
  /* ---------------------------------------------------------------------- */
  it("approveDraftByProcurementHod succeeds iff DRAFT; else 400 with draft+requisition unchanged", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        fc.constantFrom(...DRAFT_PO_STATUSES),
        fc.constantFrom(...REQUISITION_STATUSES),
        async (draftId, reqId, current, reqStatus) => {
          const requisitions = new TableStore();
          const draftPos = new TableStore();
          requisitions.seed({ id: reqId, tenant_id: SCOPE.tenant_id, status: reqStatus });
          draftPos.seed({
            id: draftId,
            tenant_id: SCOPE.tenant_id,
            status: current,
            requisition_id: reqId,
            quoted_total: 0,
          });
          const repo = new ProcurementDbRepository(
            makePrisma(requisitions, draftPos, new TableStore()),
          );

          const target = "PROCUREMENT_HOD_APPROVED";
          const valid = DRAFT_PROC_HOD_APPROVABLE.has(current);

          if (valid) {
            const result = await repo.approveDraftByProcurementHod(SCOPE, draftId);
            expect(result.status).toBe(target);
            expect(draftPos.statusOf(draftId)).toBe(target);
            // Side-effect advance of the owning requisition (one Atomic_Operation).
            expect(requisitions.statusOf(reqId)).toBe("DRAFT_PO_APPROVED");
          } else {
            let caught: unknown;
            try {
              await repo.approveDraftByProcurementHod(SCOPE, draftId);
            } catch (e) {
              caught = e;
            }
            expectInvalidTransition(caught, current, target);
            // State unchanged: neither the draft nor the requisition moved.
            expect(draftPos.statusOf(draftId)).toBe(current);
            expect(requisitions.statusOf(reqId)).toBe(reqStatus);
          }
          expect(DRAFT_PO_STATUSES).toContain(draftPos.statusOf(draftId));
        },
      ),
      { numRuns: 120 },
    );
  });

  /* ---------------------------------------------------------------------- */
  /* Draft PO: confirmSupplierQuote (also advances the requisition)          */
  /* ---------------------------------------------------------------------- */
  it("confirmSupplierQuote succeeds iff PROCUREMENT_HOD_APPROVED; else 400 unchanged", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        fc.constantFrom(...DRAFT_PO_STATUSES),
        fc.constantFrom(...REQUISITION_STATUSES),
        async (draftId, reqId, current, reqStatus) => {
          const requisitions = new TableStore();
          const draftPos = new TableStore();
          requisitions.seed({ id: reqId, tenant_id: SCOPE.tenant_id, status: reqStatus });
          draftPos.seed({
            id: draftId,
            tenant_id: SCOPE.tenant_id,
            status: current,
            requisition_id: reqId,
            quoted_total: 0,
          });
          const repo = new ProcurementDbRepository(
            makePrisma(requisitions, draftPos, new TableStore()),
          );

          const target = "SUPPLIER_CONFIRMED";
          const valid = DRAFT_QUOTE_CONFIRMABLE.has(current);

          if (valid) {
            const result = await repo.confirmSupplierQuote(SCOPE, draftId, {
              quoteReference: "Q-1",
            } as any);
            expect(result.status).toBe(target);
            expect(draftPos.statusOf(draftId)).toBe(target);
            expect(requisitions.statusOf(reqId)).toBe("SUPPLIER_CONFIRMED");
          } else {
            let caught: unknown;
            try {
              await repo.confirmSupplierQuote(SCOPE, draftId, {
                quoteReference: "Q-1",
              } as any);
            } catch (e) {
              caught = e;
            }
            expectInvalidTransition(caught, current, target);
            expect(draftPos.statusOf(draftId)).toBe(current);
            expect(requisitions.statusOf(reqId)).toBe(reqStatus);
          }
          expect(DRAFT_PO_STATUSES).toContain(draftPos.statusOf(draftId));
        },
      ),
      { numRuns: 120 },
    );
  });

  /* ---------------------------------------------------------------------- */
  /* Contract: approveLegalContract                                          */
  /* ---------------------------------------------------------------------- */
  it("approveLegalContract succeeds iff LEGAL_REVIEW; else 400 with state unchanged", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        fc.constantFrom(...CONTRACT_STATUSES),
        async (contractId, current) => {
          const contracts = new TableStore();
          contracts.seed({ id: contractId, tenant_id: SCOPE.tenant_id, status: current });
          const repo = new ProcurementDbRepository(
            makePrisma(new TableStore(), new TableStore(), contracts),
          );

          const target = "LEGAL_APPROVED";
          const valid = CONTRACT_LEGAL_APPROVABLE.has(current);

          if (valid) {
            const result = await repo.approveLegalContract(SCOPE, contractId);
            expect(result.status).toBe(target);
            expect(contracts.statusOf(contractId)).toBe(target);
          } else {
            let caught: unknown;
            try {
              await repo.approveLegalContract(SCOPE, contractId);
            } catch (e) {
              caught = e;
            }
            expectInvalidTransition(caught, current, target);
            expect(contracts.statusOf(contractId)).toBe(current);
          }
          expect(CONTRACT_STATUSES).toContain(contracts.statusOf(contractId));
        },
      ),
      { numRuns: 120 },
    );
  });

  /* ---------------------------------------------------------------------- */
  /* Contract: signContract (records the signing party; target named SIGNED) */
  /* ---------------------------------------------------------------------- */
  it("signContract succeeds iff LEGAL_APPROVED/PARTIAL_SIGNED; records the party; else 400 unchanged", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        fc.constantFrom(...CONTRACT_STATUSES),
        fc.constantFrom("SUPPLIER", "PROCUREMENT_HOD", "FINANCE_HOD"),
        async (contractId, current, party) => {
          const contracts = new TableStore();
          contracts.seed({
            id: contractId,
            tenant_id: SCOPE.tenant_id,
            status: current,
            signed_by_supplier: false,
            signed_by_proc_hod: false,
            signed_by_finance_hod: false,
          });
          const repo = new ProcurementDbRepository(
            makePrisma(new TableStore(), new TableStore(), contracts),
          );

          // The repository names the worst-case target "SIGNED" in its guard error.
          const target = "SIGNED";
          const valid = CONTRACT_SIGNABLE.has(current);

          if (valid) {
            const result = await repo.signContract(SCOPE, contractId, { party } as any);
            // One party signs a fresh contract -> PARTIAL_SIGNED (not yet all three).
            expect(result.status).toBe("PARTIAL_SIGNED");
            expect(contracts.statusOf(contractId)).toBe("PARTIAL_SIGNED");
            // The acting party is recorded.
            const row = contracts.rows.find((r) => r.id === contractId)!;
            const flag =
              party === "SUPPLIER"
                ? row.signed_by_supplier
                : party === "PROCUREMENT_HOD"
                  ? row.signed_by_proc_hod
                  : row.signed_by_finance_hod;
            expect(flag).toBe(true);
          } else {
            let caught: unknown;
            try {
              await repo.signContract(SCOPE, contractId, { party } as any);
            } catch (e) {
              caught = e;
            }
            expectInvalidTransition(caught, current, target);
            expect(contracts.statusOf(contractId)).toBe(current);
          }
          expect(CONTRACT_STATUSES).toContain(contracts.statusOf(contractId));
        },
      ),
      { numRuns: 120 },
    );
  });
});
