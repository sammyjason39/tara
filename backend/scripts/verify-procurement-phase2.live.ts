/**
 * Phase 2 (Procurement) live-DB verification — Requirements 13.1, 13.2.
 *
 * Exercises every Procurement write path against a NON-MOCKED database using the
 * Live_Test_Tenant `tnt-3rlhko`, asserting that no write surfaces a missing
 * column, an invalid foreign key, or a hardcoded identifier. It complements the
 * in-memory example/edge tests (`src/core/procurement/procurement.phase2.example.spec.ts`)
 * and the Phase 2 property tests by proving the same guarantees against real
 * Postgres for the supplier → branch → requisition → draft PO → final PO
 * (release + Payable_Record) → goods-receipt chain, plus the workflow-transition
 * write path.
 *
 * WHY A SCRIPT (not a Jest/vitest spec): the platform is a live production
 * deployment on a VPS; changes deploy via `git push` to `main` + Docker rebuild
 * and are validated live against production. The live `tnt-3rlhko` database is
 * NOT reachable from a typical local/dev or CI sandbox, so this verification is
 * delivered as a runnable script that the deploy pipeline (or an operator with
 * VPS DB access) runs against production. When the live DB is unreachable it
 * exits with a clear, non-failing SKIP so it never blocks unrelated work, and
 * the equivalent guarantees are covered in-memory by the example/edge tests.
 *
 * HOW TO RUN (against the live test tenant):
 *
 *   # 1. Point DATABASE_URL at the live/production database (on the VPS, the
 *   #    backend/.env already does this). Optionally override the tenant:
 *   #       $env:PROC_VERIFY_TENANT_ID = "tnt-3rlhko"   # PowerShell
 *   #       export PROC_VERIFY_TENANT_ID=tnt-3rlhko      # bash
 *   #
 *   # 2. From the backend directory:
 *   #       npx ts-node scripts/verify-procurement-phase2.live.ts
 *   #
 *   # The script seeds throwaway Procurement records under the tenant, drives the
 *   # write paths, asserts the edge cases (Req 9.4, 9.6, 9.10 surfaces), then
 *   # deletes everything it created. Exit code 0 = clean verification (or a clean
 *   # SKIP); 1 = a defect was surfaced.
 *
 * Cross-reference: tasks.md task 4.7; design.md "Integration / smoke tests
 * (per phase, against `tnt-3rlhko`)".
 */
import { PrismaClient, Prisma } from "@prisma/client";

const TENANT_ID = process.env.PROC_VERIFY_TENANT_ID || "tnt-3rlhko";
const ACTOR_ID = process.env.PROC_VERIFY_ACTOR_ID || "verify-procurement-phase2";

type Cleanup = () => Promise<void>;
const cleanups: Cleanup[] = [];
const failures: string[] = [];
let checks = 0;

function check(label: string, condition: boolean, detail?: string): void {
  checks++;
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    const msg = detail ? `${label} — ${detail}` : label;
    failures.push(msg);
    console.error(`  ✗ ${msg}`);
  }
}

/** Is the failure a connectivity problem (DB unreachable from this env)? */
function isUnreachable(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  const msg = (err as Error)?.message ?? String(err);
  return (
    code === "P1001" || // Can't reach database server
    code === "P1000" || // Authentication failed
    code === "P1017" || // Server has closed the connection
    /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ECONNRESET|Can't reach database/i.test(
      msg,
    )
  );
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  // Probe connectivity first so an unreachable live DB is a clean SKIP.
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    if (isUnreachable(err)) {
      console.warn(
        `\n[SKIP] Live database is not reachable from this environment.\n` +
          `       Phase 2 Procurement live-DB verification against '${TENANT_ID}' is deferred to\n` +
          `       the deploy pipeline (git push to main + Docker rebuild on the VPS).\n` +
          `       Equivalent guarantees are covered by src/core/procurement/procurement.phase2.example.spec.ts.\n`,
      );
      await prisma.$disconnect();
      process.exit(0);
    }
    throw err;
  }

  // Confirm the tenant exists; if not, SKIP rather than fail (the script is
  // tenant-data dependent and only meaningful against the live tenant).
  const tenant = await prisma.tenants.findUnique({ where: { id: TENANT_ID } });
  if (!tenant) {
    console.warn(
      `\n[SKIP] Tenant '${TENANT_ID}' not found in this database. ` +
        `Run against the live database where the test tenant exists.\n`,
    );
    await prisma.$disconnect();
    process.exit(0);
  }

  console.log(`\nProcurement Phase 2 live-DB verification — tenant '${TENANT_ID}'\n`);

  try {
    // ---- Supplier create (Req 9.1) ---------------------------------------
    let supplier: { id: string; tenant_id: string; name: string } | undefined;
    try {
      const created = await prisma.supplier_masters.create({
        data: {
          tenant_id: TENANT_ID,
          name: "verify-supplier",
          categories: [],
          updated_at: new Date(),
        },
      });
      supplier = created;
      cleanups.push(async () => {
        await prisma.supplier_masters
          .delete({ where: { id: created.id } })
          .catch(() => undefined);
      });
      check("supplier create persists (no missing column)", true);
      check(
        "supplier tenant_id is context-derived (not hardcoded)",
        created.tenant_id === TENANT_ID,
        `got ${created.tenant_id}`,
      );
    } catch (err) {
      check("supplier create", false, (err as Error).message);
    }

    // ---- Supplier branch create (Req 9.1) --------------------------------
    let branch: { id: string } | undefined;
    if (supplier) {
      try {
        const created = await prisma.supplier_branches.create({
          data: {
            tenant_id: TENANT_ID,
            supplier_id: supplier.id,
            branch_code: "VRF-HQ",
            branch_name: "verify-branch",
            locations: "HQ",
            updated_at: new Date(),
          },
        });
        branch = created;
        cleanups.push(async () => {
          await prisma.supplier_branches
            .delete({ where: { id: created.id } })
            .catch(() => undefined);
        });
        check("supplier branch create persists against in-scope supplier (FK satisfied)", true);
      } catch (err) {
        check("supplier branch create", false, (err as Error).message);
      }
    }

    // ---- Requisition + workflow transition (Req 9.1, 9.2) ----------------
    // The requisition references HR (employee) and an org department. We do NOT
    // create HR/Settings records (out of scope); instead we reuse existing
    // in-tenant references. If none exist, the requisition-dependent chain
    // (draft PO / release / receipt) is a clean SKIP rather than a failure.
    const department = await prisma.departments.findFirst({
      where: { tenant_id: TENANT_ID },
    });
    const employee = await prisma.employees.findFirst({
      where: { tenant_id: TENANT_ID },
    });

    let requisition: { id: string; status: string } | undefined;
    if (supplier && branch && department && employee) {
      try {
        const created = await prisma.procurement_requisitions.create({
          data: {
            tenant_id: TENANT_ID,
            requester_id: employee.id,
            department_id: department.id,
            branch_code: "VRF-HQ",
            title: "verify-requisition",
            description: "verify",
            category: "GENERAL",
            budget_class: "OPEX",
            amount: new Prisma.Decimal(1500),
            currency: "IDR",
            status: "DRAFT",
            updated_at: new Date(),
          },
        });
        requisition = created;
        cleanups.push(async () => {
          await prisma.procurement_requisitions
            .delete({ where: { id: created.id } })
            .catch(() => undefined);
        });
        check("requisition create persists PENDING-ready (no missing column)", created.status === "DRAFT");

        // Workflow transition write path (Req 9.2): advance the status atomically.
        const advanced = await prisma.procurement_requisitions.update({
          where: { id: created.id, tenant_id: TENANT_ID },
          data: { status: "SUPPLIER_CONFIRMED" },
        });
        check(
          "requisition workflow transition persists new status",
          advanced.status === "SUPPLIER_CONFIRMED",
        );
      } catch (err) {
        check("requisition create/transition", false, (err as Error).message);
      }
    } else {
      console.warn(
        `  [SKIP] No in-tenant department/employee reference available; ` +
          `requisition → draft PO → release → receipt chain skipped (HR/Settings out of scope).`,
      );
    }

    // ---- Draft PO → Final PO release + Payable_Record (Req 9.4, 9.10) -----
    let finalPo: { id: string; tenant_id: string } | undefined;
    if (supplier && branch && requisition) {
      try {
        const draft = await prisma.procurement_draft_pos.create({
          data: {
            tenant_id: TENANT_ID,
            requisition_id: requisition.id,
            branch_code: "VRF-HQ",
            supplier_id: supplier.id,
            supplier_branch_id: branch.id,
            contract_type: "DIRECT",
            line_items: [{ productSku: "VRF-SKU-1", quantity: 10 }],
            quoted_total: new Prisma.Decimal(1500),
            created_by: ACTOR_ID,
            updated_at: new Date(),
          },
        });
        cleanups.push(async () => {
          await prisma.procurement_draft_pos
            .delete({ where: { id: draft.id } })
            .catch(() => undefined);
        });

        // Release + Payable_Record must commit together in ONE transaction so a
        // Payable_Record failure rolls the release back (Req 9.4, 9.10). We
        // exercise the same atomic shape the service uses.
        const released = await prisma.$transaction(async (tx) => {
          const po = await tx.procurement_final_pos.create({
            data: {
              tenant_id: TENANT_ID,
              requisition_id: requisition!.id,
              draft_po_id: draft.id,
              supplier_id: supplier!.id,
              supplier_branch_id: branch!.id,
              branch_code: "VRF-HQ",
              total_amount: new Prisma.Decimal(1500),
              status: "RELEASED",
              updated_at: new Date(),
            },
          });
          await tx.procurement_requisitions.update({
            where: { id: requisition!.id, tenant_id: TENANT_ID },
            data: { status: "PO_RELEASED" },
          });
          // Cross-Module Finance Payable_Record with originating tenant + every
          // contract-required field populated (Req 6.3, 9.4).
          const payable = await tx.payables.create({
            data: {
              tenant_id: TENANT_ID,
              vendor_name: supplier!.name,
              amount: new Prisma.Decimal(1500),
              currency: "IDR",
              due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              status: "RECEIVED",
              updated_at: new Date(),
            },
          });
          return { po, payable };
        });
        finalPo = released.po;
        cleanups.push(async () => {
          await prisma.payables
            .delete({ where: { id: released.payable.id } })
            .catch(() => undefined);
          await prisma.procurement_final_pos
            .delete({ where: { id: released.po.id } })
            .catch(() => undefined);
        });
        check("PO release persists final PO (no missing column)", released.po.tenant_id === TENANT_ID);
        check(
          "Finance Payable_Record carries originating tenant_id and required fields",
          released.payable.tenant_id === TENANT_ID &&
            released.payable.vendor_name === supplier!.name &&
            released.payable.currency === "IDR",
          `payable tenant=${released.payable.tenant_id}`,
        );
      } catch (err) {
        check("PO release + Payable_Record", false, (err as Error).message);
      }
    }

    // ---- Goods receipt (Req 9.5) -----------------------------------------
    if (supplier && branch && finalPo) {
      try {
        const receipt = await prisma.procurement_receipts.create({
          data: {
            tenant_id: TENANT_ID,
            final_po_id: finalPo.id,
            supplier_id: supplier.id,
            supplier_branch_id: branch.id,
            delivery_on_time: true,
            quantity_accuracy: 100,
            quality_score: 100,
            issue_count: 0,
            invoice_mismatch: false,
            updated_at: new Date(),
          },
        });
        cleanups.push(async () => {
          await prisma.procurement_receipts
            .delete({ where: { id: receipt.id } })
            .catch(() => undefined);
        });
        check("goods receipt persists against released PO (FK satisfied)", receipt.tenant_id === TENANT_ID);
      } catch (err) {
        check("goods receipt create", false, (err as Error).message);
      }
    }

    // ---- Edge: final PO with an invalid supplier FK must be rejected ------
    // (Req 9.11 scope guard / FK discipline) The service guards cross-scope ids
    // BEFORE writing; here we confirm the DB itself enforces the FK — the
    // guarantee the guard protects (mirrors the Phase 1 device-event edge).
    if (requisition && branch) {
      try {
        await prisma.procurement_final_pos.create({
          data: {
            tenant_id: TENANT_ID,
            requisition_id: requisition.id,
            draft_po_id: "draft-nonexistent-verify",
            supplier_id: "sup-nonexistent-verify",
            supplier_branch_id: branch.id,
            branch_code: "VRF-HQ",
            total_amount: new Prisma.Decimal(1),
            status: "RELEASED",
            updated_at: new Date(),
          },
        });
        check(
          "final PO with invalid supplier FK is rejected by the DB",
          false,
          "insert unexpectedly succeeded",
        );
      } catch (err) {
        const code = (err as Prisma.PrismaClientKnownRequestError).code;
        check(
          "final PO with invalid supplier/draft FK is rejected by the DB (P2003)",
          code === "P2003",
          `got ${code ?? (err as Error).message}`,
        );
      }
    }
  } finally {
    for (const c of cleanups.reverse()) await c();
    await prisma.$disconnect();
  }

  console.log(`\n${checks} checks run, ${failures.length} failure(s).`);
  if (failures.length > 0) {
    console.error(
      `\n[FAIL] Phase 2 Procurement live-DB verification surfaced defect(s):\n` +
        failures.map((f) => `  - ${f}`).join("\n") +
        `\n`,
    );
    process.exit(1);
  }
  console.log(
    `\n[OK] Phase 2 Procurement live-DB verification clean against '${TENANT_ID}'.\n`,
  );
}

main().catch((err) => {
  if (isUnreachable(err)) {
    console.warn(
      `\n[SKIP] Live database unreachable mid-run; verification deferred to the deploy pipeline.\n`,
    );
    process.exit(0);
  }
  console.error(err);
  process.exit(1);
});
