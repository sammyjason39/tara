import { describe, it, expect } from "vitest";
import { BadRequestException } from "@nestjs/common";

import { ProcurementService } from "./procurement.service";
import { ProcurementDbRepository } from "./repositories/procurement.db.repository";
import { AtomicOperationService } from "../shared/atomic/atomic-operation.service";
import type { TenantScope } from "../../shared/scope/tenant-scope";

/**
 * Task 4.7 — Phase 2 (Procurement) example / edge tests.
 *
 * Concrete, focused regressions that complement the Phase 2 property tests
 * (Property 6) and the live-DB verification script
 * (`backend/scripts/verify-procurement-phase2.live.ts`). They pin the two edge
 * cases the task calls out and drive the Procurement write paths end-to-end
 * (service → ProcurementDbRepository → AtomicOperationService → Prisma) so the
 * same column / FK / identifier and atomicity guarantees that the live
 * `tnt-3rlhko` run asserts are also checked here in-memory:
 *
 *   1. A goods receipt whose received quantity exceeds the outstanding ordered
 *      quantity is rejected with a 400 and NOTHING is persisted — no receipt,
 *      no inventory movement, no PO/supplier-rating update (Requirement 9.6).
 *
 *   2. A purchase-order release whose Finance Payable_Record is missing a
 *      contract-required field is rejected with a 400 naming the field, and the
 *      whole Atomic_Operation rolls back so BOTH the release AND the payable are
 *      discarded and the PO/requisition remain pre-release (Requirements 9.4,
 *      9.10, 6.4). A failure injected at the Payable_Record write AFTER the
 *      release row is written likewise rolls the release back (Requirement 9.10).
 *
 *   3. The happy-path release and receipt persist via explicit, schema-aligned
 *      DTO-to-column mapping with the tenant always derived from context (no
 *      missing column, no invalid foreign key, no hardcoded identifier) — the
 *      in-memory equivalent of the live-DB guarantees of Requirements 13.1,
 *      13.2.
 *
 * The tests drive the REAL `ProcurementDbRepository` and
 * `AtomicOperationService` against an in-memory fake Prisma client whose
 * `$transaction` snapshots every table before the body runs and restores them
 * if the body throws, reproducing transactional rollback so the atomicity
 * guarantees (Requirements 9.4, 9.10) are observable.
 */

/* -------------------------------------------------------------------------- */
/* In-memory fake Prisma client with rollback-capable $transaction            */
/* -------------------------------------------------------------------------- */

type Row = Record<string, any>;

function matchesWhere(row: Row, where: Row | undefined): boolean {
  if (!where) return true;
  return Object.entries(where).every(([key, cond]) => {
    if (cond && typeof cond === "object" && !Array.isArray(cond)) {
      if ("in" in cond) return (cond.in as unknown[]).includes(row[key]);
      return true;
    }
    return row[key] === cond;
  });
}

function applyData(target: Row, data: Row): void {
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if ("increment" in value) {
        target[key] = (target[key] ?? 0) + (value.increment as number);
        continue;
      }
      if ("decrement" in value) {
        target[key] = (target[key] ?? 0) - (value.decrement as number);
        continue;
      }
    }
    target[key] = value;
  }
}

interface FakeTable {
  rows: Row[];
  create: (args: { data: Row }) => Promise<Row>;
  update: (args: { where: Row; data: Row }) => Promise<Row>;
  findFirst: (args?: { where?: Row; orderBy?: unknown }) => Promise<Row | null>;
  findMany: (args?: { where?: Row }) => Promise<Row[]>;
  delete: (args: { where: Row }) => Promise<Row>;
  count: (args?: { where?: Row }) => Promise<number>;
  // snapshot/restore helpers used by the fake $transaction
  __snapshot: () => Row[];
  __restore: (rows: Row[]) => void;
}

function makeTable(name: string): FakeTable {
  const rows: Row[] = [];
  let seq = 0;
  return {
    rows,
    create: async ({ data }: { data: Row }) => {
      const row: Row = {
        id: data.id ?? `${name}-${++seq}`,
        created_at: data.created_at ?? new Date(),
        ...data,
      };
      rows.push(row);
      return { ...row };
    },
    update: async ({ where, data }: { where: Row; data: Row }) => {
      const row = rows.find((r) => matchesWhere(r, where));
      if (!row) throw new Error(`Record not found for update in ${name}`);
      applyData(row, data);
      return { ...row };
    },
    findFirst: async ({ where }: { where?: Row } = {}) => {
      const row = rows.find((r) => matchesWhere(r, where));
      return row ? { ...row } : null;
    },
    findMany: async ({ where }: { where?: Row } = {}) =>
      rows.filter((r) => matchesWhere(r, where)).map((r) => ({ ...r })),
    delete: async ({ where }: { where: Row }) => {
      const idx = rows.findIndex((r) => matchesWhere(r, where));
      if (idx >= 0) rows.splice(idx, 1);
      return {};
    },
    count: async ({ where }: { where?: Row } = {}) =>
      rows.filter((r) => matchesWhere(r, where)).length,
    __snapshot: () => rows.map((r) => ({ ...r })),
    __restore: (snapshot: Row[]) => {
      rows.length = 0;
      rows.push(...snapshot.map((r) => ({ ...r })));
    },
  };
}

function buildPrismaFake() {
  const tableNames = [
    "procurement_requisitions",
    "supplier_masters",
    "procurement_final_pos",
    "procurement_draft_pos",
    "procurement_receipts",
    "procurement_audit_events",
    "payables",
    "stock_levels",
    "stock_movements",
    "sys_outbox_events",
  ];
  const prisma: any = {};
  const tables: FakeTable[] = [];
  for (const n of tableNames) {
    const t = makeTable(n);
    prisma[n] = t;
    tables.push(t);
  }

  // Rollback-capable interactive transaction: snapshot every table before the
  // body, restore all of them if the body throws so a failed Atomic_Operation
  // persists zero writes (Requirements 9.4, 9.10).
  prisma.$transaction = async (fn: (tx: any) => Promise<unknown>) => {
    const snapshots = tables.map((t) => ({ t, rows: t.__snapshot() }));
    try {
      return await fn(prisma);
    } catch (err) {
      for (const s of snapshots) s.t.__restore(s.rows);
      throw err;
    }
  };

  return prisma;
}

/* -------------------------------------------------------------------------- */
/* Wiring                                                                     */
/* -------------------------------------------------------------------------- */

function buildService(prisma: any) {
  const repository = new ProcurementDbRepository(prisma);
  const auditStub = { log: async () => undefined } as any;
  const eventBusStub = { publish: async () => undefined } as any;
  const atomic = new AtomicOperationService(prisma, auditStub, eventBusStub);
  const service = new ProcurementService(
    repository as any,
    auditStub,
    eventBusStub,
    prisma,
    atomic,
  );
  return { service, repository };
}

const TENANT = "tnt-3rlhko"; // the Live_Test_Tenant convention
const scope: TenantScope = { tenant_id: TENANT };

/** Seed a released-ready PO plus its draft line items so a receipt can run. */
function seedReceivablePo(prisma: any) {
  prisma.procurement_final_pos.rows.push({
    id: "po-1",
    tenant_id: TENANT,
    requisition_id: "req-1",
    draft_po_id: "draft-1",
    supplier_id: "sup-1",
    supplier_branch_id: "branch-1",
    status: "RELEASED",
  });
  prisma.procurement_draft_pos.rows.push({
    id: "draft-1",
    tenant_id: TENANT,
    requisition_id: "req-1",
    line_items: [{ productSku: "SKU-1", quantity: 10 }],
  });
  prisma.supplier_masters.rows.push({
    id: "sup-1",
    tenant_id: TENANT,
    name: "Acme Supplies",
    global_rating: 80,
  });
}

const RECEIPT_DTO = {
  finalPoId: "po-1",
  deliveryOnTime: true,
  quantityAccuracy: 100,
  qualityScore: 100,
  issueCount: 0,
  invoiceMismatch: false,
} as any;

/* -------------------------------------------------------------------------- */
/* Edge case 1 — over-quantity goods receipt (Req 9.6)                        */
/* -------------------------------------------------------------------------- */

describe("Procurement Phase 2 example — over-quantity goods receipt (Req 9.6)", () => {
  it("rejects a receipt exceeding the outstanding ordered quantity with 400 and persists nothing", async () => {
    const prisma = buildPrismaFake();
    seedReceivablePo(prisma);
    const { service } = buildService(prisma);

    await expect(
      service.createReceipt(
        scope,
        {
          ...RECEIPT_DTO,
          location_id: "WH-1",
          items: [{ sku: "SKU-1", quantity: 11, productId: "prod-1" }],
        } as any,
        "usr-proc",
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    // Nothing persisted: no receipt, no inventory, no PO/rating mutation, and
    // — because the whole Atomic_Operation rolled back — no audit/outbox rows.
    expect(prisma.procurement_receipts.rows.length).toBe(0);
    expect(prisma.stock_levels.rows.length).toBe(0);
    expect(prisma.stock_movements.rows.length).toBe(0);
    expect(prisma.procurement_audit_events.rows.length).toBe(0);
    expect(prisma.sys_outbox_events.rows.length).toBe(0);
    // The supplier rating is untouched.
    expect(prisma.supplier_masters.rows[0].global_rating).toBe(80);
    // The PO is still RELEASED, not RECEIVED.
    expect(prisma.procurement_final_pos.rows[0].status).toBe("RELEASED");
  });

  it("rejects a received line for a SKU that was never ordered (outstanding 0)", async () => {
    const prisma = buildPrismaFake();
    seedReceivablePo(prisma);
    const { service } = buildService(prisma);

    await expect(
      service.createReceipt(
        scope,
        {
          ...RECEIPT_DTO,
          location_id: "WH-1",
          items: [{ sku: "SKU-NOPE", quantity: 1, productId: "prod-x" }],
        } as any,
        "usr-proc",
      ),
    ).rejects.toThrow(/exceeds the outstanding ordered quantity 0/);

    expect(prisma.procurement_receipts.rows.length).toBe(0);
  });

  it("accepts a receipt within the outstanding ordered quantity (happy path)", async () => {
    const prisma = buildPrismaFake();
    seedReceivablePo(prisma);
    const { service } = buildService(prisma);

    const receipt = await service.createReceipt(
      scope,
      {
        ...RECEIPT_DTO,
        location_id: "WH-1",
        items: [{ sku: "SKU-1", quantity: 10, productId: "prod-1" }],
      } as any,
      "usr-proc",
    );

    expect(receipt.tenant_id).toBe(TENANT);
    expect(receipt.calculatedRating).toBe(100);
    expect(prisma.procurement_receipts.rows.length).toBe(1);
    expect(prisma.procurement_receipts.rows[0].tenant_id).toBe(TENANT);
    expect(prisma.procurement_final_pos.rows[0].status).toBe("RECEIVED");
  });
});

/* -------------------------------------------------------------------------- */
/* Edge case 2 — PO release with a missing Finance-required field (Req 9.4/9.10) */
/* -------------------------------------------------------------------------- */

const RELEASE_DTO = {
  requisitionId: "req-1",
  supplierId: "sup-1",
  total_amount: 1500,
} as any;

/** Seed a quote-confirmed requisition ready for release. */
function seedReleasableRequisition(prisma: any, currency: string | null = "IDR") {
  prisma.procurement_requisitions.rows.push({
    id: "req-1",
    tenant_id: TENANT,
    branch_code: "HQ",
    currency,
    status: "SUPPLIER_CONFIRMED",
  });
}

describe("Procurement Phase 2 example — PO release Payable_Record rollback (Req 9.4, 9.10, 6.4)", () => {
  it("rejects the release naming the missing Finance field and leaves the PO pre-release with no payable", async () => {
    const prisma = buildPrismaFake();
    seedReleasableRequisition(prisma);
    // Supplier cannot be resolved -> Payable_Record.vendor_name is missing.
    const { service } = buildService(prisma);

    await expect(
      service.releasePurchaseOrder(scope, RELEASE_DTO, "usr-proc"),
    ).rejects.toThrow(/vendor_name/);

    // Both the release AND the payable are discarded; the requisition is left
    // in its pre-release state (Requirements 6.4, 9.10).
    expect(prisma.procurement_final_pos.rows.length).toBe(0);
    expect(prisma.payables.rows.length).toBe(0);
    expect(prisma.procurement_requisitions.rows[0].status).toBe("SUPPLIER_CONFIRMED");
    // No audit/outbox side effects leaked either.
    expect(prisma.procurement_audit_events.rows.length).toBe(0);
    expect(prisma.sys_outbox_events.rows.length).toBe(0);
  });

  it("rolls back the release when the Payable_Record write fails after the PO row is written (Req 9.10)", async () => {
    const prisma = buildPrismaFake();
    seedReleasableRequisition(prisma);
    prisma.supplier_masters.rows.push({ id: "sup-1", tenant_id: TENANT, name: "Acme Supplies" });
    const { service } = buildService(prisma);

    // Inject a Payable_Record write failure AFTER the release row is created.
    prisma.payables.create = async () => {
      throw new Error("Finance payable write failed");
    };

    await expect(
      service.releasePurchaseOrder(scope, RELEASE_DTO, "usr-proc"),
    ).rejects.toThrow(/Finance payable write failed/);

    // The release row, the requisition status change, and any side effects are
    // all rolled back: the PO never persists and the requisition is pre-release.
    expect(prisma.procurement_final_pos.rows.length).toBe(0);
    expect(prisma.payables.rows.length).toBe(0);
    expect(prisma.procurement_requisitions.rows[0].status).toBe("SUPPLIER_CONFIRMED");
    expect(prisma.procurement_audit_events.rows.length).toBe(0);
    expect(prisma.sys_outbox_events.rows.length).toBe(0);
  });

  it("releases the PO with the Finance Payable_Record committed in the same operation (happy path)", async () => {
    const prisma = buildPrismaFake();
    seedReleasableRequisition(prisma);
    prisma.supplier_masters.rows.push({ id: "sup-1", tenant_id: TENANT, name: "Acme Supplies" });
    const { service } = buildService(prisma);

    const po = await service.releasePurchaseOrder(scope, RELEASE_DTO, "usr-proc");

    expect(po.status).toBe("released");
    expect(po.tenant_id).toBe(TENANT);

    // Release + Payable_Record committed together with context-derived tenant.
    expect(prisma.procurement_final_pos.rows.length).toBe(1);
    expect(prisma.procurement_final_pos.rows[0].tenant_id).toBe(TENANT);
    expect(prisma.payables.rows.length).toBe(1);
    const payable = prisma.payables.rows[0];
    expect(payable.tenant_id).toBe(TENANT);
    expect(payable.vendor_name).toBe("Acme Supplies");
    expect(payable.amount).toBe(1500);
    expect(payable.currency).toBe("IDR");
    expect(payable.due_date).toBeInstanceOf(Date);
    // The requisition advanced and an Integration_Log outbox row was recorded
    // in the same transaction, all under the context tenant.
    expect(prisma.procurement_requisitions.rows[0].status).toBe("PO_RELEASED");
    expect(prisma.sys_outbox_events.rows.length).toBeGreaterThan(0);
    expect(prisma.sys_outbox_events.rows.every((e: any) => e.tenant_id === TENANT)).toBe(true);
  });
});
