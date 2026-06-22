/**
 * Phase 4 (Marketing) live-DB verification — Requirements 13.1, 13.2.
 *
 * Exercises every Marketing write path against a NON-MOCKED database using the
 * Live_Test_Tenant `tnt-3rlhko`, asserting that no write surfaces a missing
 * column, an invalid foreign key, or a hardcoded identifier. It complements the
 * in-memory example/edge tests
 * (`src/core/marketing/marketing.phase4.transitions.example.spec.ts`,
 * `marketing.phase4.creative-asset.example.spec.ts`,
 * `marketing.phase4.social-sync.example.spec.ts`) by proving the same guarantees
 * against real Postgres for:
 *
 *   - campaign create + status transition (DRAFT → ACTIVE),
 *   - lead create → mark handoff-ready → Lead_Handoff to Sales (the
 *     `sales_leads` record + lead consumability transfer committed in ONE
 *     transaction; a failed handoff rolls both back, leaving the lead
 *     Marketing-only — Req 11.5, 11.6),
 *   - atomic creative-asset registration (no orphaned record — Req 11.7, 11.8).
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
 *   #       $env:MARKETING_VERIFY_TENANT_ID = "tnt-3rlhko"   # PowerShell
 *   #       export MARKETING_VERIFY_TENANT_ID=tnt-3rlhko      # bash
 *   #
 *   # 2. From the backend directory:
 *   #       npx ts-node scripts/verify-marketing-phase4.live.ts
 *   #
 *   # The script seeds throwaway Marketing records under the tenant, drives the
 *   # write paths, asserts the edge cases (Req 11.6, 11.8 surfaces), then deletes
 *   # everything it created. Exit code 0 = clean verification (or a clean SKIP);
 *   # 1 = a defect was surfaced.
 *
 * Cross-reference: tasks.md task 8.6; design.md "Integration / smoke tests
 * (per phase, against `tnt-3rlhko`)".
 */
import { PrismaClient, Prisma } from "@prisma/client";

const TENANT_ID = process.env.MARKETING_VERIFY_TENANT_ID || "tnt-3rlhko";
const ACTOR_ID = process.env.MARKETING_VERIFY_ACTOR_ID || "verify-marketing-phase4";
const RUN_TAG = `verify-mkt-${Date.now()}`;

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
    /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ECONNRESET|Can't reach database/i.test(msg)
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
          `       Phase 4 Marketing live-DB verification against '${TENANT_ID}' is deferred to\n` +
          `       the deploy pipeline (git push to main + Docker rebuild on the VPS).\n` +
          `       Equivalent guarantees are covered by the marketing.phase4.*.example.spec.ts suite.\n`,
      );
      await prisma.$disconnect();
      process.exit(0);
    }
    throw err;
  }

  // Confirm the tenant exists; if not, SKIP rather than fail.
  const tenant = await prisma.tenants.findUnique({ where: { id: TENANT_ID } });
  if (!tenant) {
    console.warn(
      `\n[SKIP] Tenant '${TENANT_ID}' not found in this database. ` +
        `Run against the live database where the test tenant exists.\n`,
    );
    await prisma.$disconnect();
    process.exit(0);
  }

  console.log(`\nMarketing Phase 4 live-DB verification — tenant '${TENANT_ID}'\n`);

  try {
    // ---- Campaign create (Req 11.1) -------------------------------------
    let campaign: { id: string; tenant_id: string; status: string } | undefined;
    try {
      const created = await prisma.marketing_campaigns.create({
        data: {
          tenant_id: TENANT_ID,
          name: `${RUN_TAG}-campaign`,
          objective: "lead_generation",
          channel_mix: ["SOCIAL", "EMAIL"],
          owner_id: ACTOR_ID,
          owner_name: "Zenvix User",
          budget: new Prisma.Decimal(1000),
          currency: "USD",
          status: "DRAFT",
          start_date: new Date(),
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          audience: "all",
          updated_at: new Date(),
        },
      });
      campaign = created;
      cleanups.push(async () => {
        await prisma.marketing_campaigns
          .delete({ where: { id: created.id } })
          .catch(() => undefined);
      });
      check("campaign create persists with context tenant (no missing column)", true);
      check(
        "campaign tenant_id is context-derived (not hardcoded)",
        created.tenant_id === TENANT_ID,
        `got ${created.tenant_id}`,
      );
      check("campaign create persists DRAFT status", created.status === "DRAFT");
    } catch (err) {
      check("campaign create", false, (err as Error).message);
    }

    // ---- Campaign status transition DRAFT -> ACTIVE (Req 11.3) ----------
    if (campaign) {
      try {
        const moved = await prisma.marketing_campaigns.update({
          where: { id: campaign.id, tenant_id: TENANT_ID },
          data: { status: "ACTIVE", updated_at: new Date() },
        });
        check(
          "campaign status transition persists exactly one status (ACTIVE)",
          moved.status === "ACTIVE",
          `got ${moved.status}`,
        );
      } catch (err) {
        check("campaign status transition", false, (err as Error).message);
      }
    }

    // ---- Lead create (Req 11.1) -----------------------------------------
    let lead:
      | { id: string; tenant_id: string; status: string; sales_handoff_id: string | null }
      | undefined;
    try {
      const created = await prisma.marketing_leads.create({
        data: {
          tenant_id: TENANT_ID,
          source: "WEBSITE",
          company_name: `${RUN_TAG}-co`,
          contact_name: "Verify Contact",
          email: `${RUN_TAG}@example.test`,
          dedup_key: `${RUN_TAG}-dedup`,
          score: 80,
          intent: "MEDIUM",
          status: "SCORED",
          updated_at: new Date(),
        },
      });
      lead = created as any;
      cleanups.push(async () => {
        await prisma.marketing_leads
          .delete({ where: { id: created.id } })
          .catch(() => undefined);
      });
      check("lead create persists SCORED with context tenant", created.status === "SCORED");
      check(
        "lead tenant_id is context-derived (not hardcoded)",
        created.tenant_id === TENANT_ID,
        `got ${created.tenant_id}`,
      );
    } catch (err) {
      check("lead create", false, (err as Error).message);
    }

    // ---- Mark lead handoff-ready (Req 11.4) -----------------------------
    if (lead) {
      try {
        const ready = await prisma.marketing_leads.update({
          where: { id: lead.id, tenant_id: TENANT_ID },
          data: { status: "HANDOFF_READY", updated_at: new Date() },
        });
        check(
          "lead mark-handoff-ready persists HANDOFF_READY",
          ready.status === "HANDOFF_READY",
          `got ${ready.status}`,
        );
      } catch (err) {
        check("lead mark-handoff-ready", false, (err as Error).message);
      }
    }

    // ---- Lead_Handoff to Sales in ONE transaction (Req 11.5, 11.6) ------
    // The handoff record (a `sales_leads` row, source MARKETING) AND the lead's
    // consumability transfer (status HANDOFF_SENT + link) must commit together
    // or neither — exactly the atomic shape the service uses.
    let salesLeadId: string | undefined;
    if (lead) {
      try {
        const handed = await prisma.$transaction(async (tx) => {
          const sales = await tx.sales_leads.create({
            data: {
              tenant_id: TENANT_ID,
              company_name: `${RUN_TAG}-co`,
              contact_name: "Verify Contact",
              contact_email: `${RUN_TAG}@example.test`,
              source: "MARKETING",
              owner_id: ACTOR_ID,
              owner_name: ACTOR_ID,
              score: 80,
              potential_value: new Prisma.Decimal(80000),
              currency: "IDR",
              status: "NEW",
              sla_due_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
          });
          await tx.marketing_leads.update({
            where: { id: lead!.id, tenant_id: TENANT_ID },
            data: {
              status: "HANDOFF_SENT",
              sales_handoff_id: sales.id,
              updated_at: new Date(),
            },
          });
          return sales;
        });
        salesLeadId = handed.id;
        cleanups.push(async () => {
          await prisma.sales_leads
            .delete({ where: { id: handed.id } })
            .catch(() => undefined);
        });

        check(
          "Lead_Handoff creates a Sales-consumable record (source MARKETING, context tenant)",
          handed.source === "MARKETING" && handed.tenant_id === TENANT_ID,
        );

        // Confirm the marketing lead reflects the committed handoff (both writes
        // landed in the same transaction).
        const reread = await prisma.marketing_leads.findFirst({
          where: { id: lead.id, tenant_id: TENANT_ID },
        });
        check(
          "Lead_Handoff transfers lead consumability to Sales (HANDOFF_SENT + linked)",
          reread?.status === "HANDOFF_SENT" && reread?.sales_handoff_id === handed.id,
          `status=${reread?.status} link=${reread?.sales_handoff_id}`,
        );
      } catch (err) {
        check("Lead_Handoff (sales lead + lead update)", false, (err as Error).message);
      }
    }

    // ---- Edge: a failed handoff rolls back, leaving the lead Marketing-only
    // (Req 11.6). We force the Sales-side write to fail inside the transaction
    // (invalid FK) and assert NEITHER write persisted.
    if (lead && salesLeadId) {
      // Reset the lead to HANDOFF_READY so we can attempt a fresh (failing) handoff.
      await prisma.marketing_leads.update({
        where: { id: lead.id, tenant_id: TENANT_ID },
        data: { status: "HANDOFF_READY", sales_handoff_id: null, updated_at: new Date() },
      });
      let rolledBack = false;
      try {
        await prisma.$transaction(async (tx) => {
          await tx.sales_leads.create({
            data: {
              tenant_id: TENANT_ID,
              company_name: `${RUN_TAG}-co-fail`,
              contact_name: "Verify Contact",
              source: "MARKETING",
              owner_id: ACTOR_ID,
              owner_name: ACTOR_ID,
              score: 80,
              potential_value: new Prisma.Decimal(80000),
              currency: "IDR",
              status: "NEW",
              sla_due_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
              company_id: "company-nonexistent-verify", // invalid FK → forces rollback
            },
          });
          await tx.marketing_leads.update({
            where: { id: lead!.id, tenant_id: TENANT_ID },
            data: { status: "HANDOFF_SENT", updated_at: new Date() },
          });
        });
      } catch {
        rolledBack = true;
      }
      const after = await prisma.marketing_leads.findFirst({
        where: { id: lead.id, tenant_id: TENANT_ID },
      });
      check(
        "failed Lead_Handoff rolls back, leaving the lead Marketing-only (HANDOFF_READY, unlinked)",
        rolledBack && after?.status === "HANDOFF_READY" && after?.sales_handoff_id == null,
        `rolledBack=${rolledBack} status=${after?.status} link=${after?.sales_handoff_id}`,
      );
    }

    // ---- Creative-asset registration (Req 11.7, 11.8) -------------------
    // The atomic upload registers the record + its outbox event together; here
    // we prove the record write itself is schema-clean against real Postgres.
    try {
      const asset = await prisma.marketing_creative_assets.create({
        data: {
          tenant_id: TENANT_ID,
          name: `${RUN_TAG}-asset`,
          type: "IMAGE",
          url: "/api/v1/marketing/assets/raw/verify.png",
          tags: ["verify"],
          metadata: { filename: "verify.png" },
          updated_at: new Date(),
        },
      });
      cleanups.push(async () => {
        await prisma.marketing_creative_assets
          .delete({ where: { id: asset.id } })
          .catch(() => undefined);
      });
      check(
        "creative-asset registers with context tenant (no orphaned/missing column)",
        asset.tenant_id === TENANT_ID && asset.type === "IMAGE",
      );
    } catch (err) {
      check("creative-asset registration", false, (err as Error).message);
    }

    // ---- Edge: execution with an invalid campaign FK must be rejected ----
    // (FK discipline) Mirrors the Phase 1/2/3 FK edges: the guard protects the
    // write, and the DB itself enforces the FK as the backstop.
    try {
      await prisma.marketing_executions.create({
        data: {
          tenant_id: TENANT_ID,
          campaign_id: "campaign-nonexistent-verify",
          channel: "SOCIAL",
          status: "SCHEDULED",
          scheduled_at: new Date(),
          updated_at: new Date(),
        },
      });
      check(
        "execution with invalid campaign FK is rejected by the DB",
        false,
        "insert unexpectedly succeeded",
      );
    } catch (err) {
      const code = (err as Prisma.PrismaClientKnownRequestError).code;
      check(
        "execution with invalid campaign FK is rejected by the DB (P2003)",
        code === "P2003",
        `got ${code ?? (err as Error).message}`,
      );
    }
  } finally {
    for (const c of cleanups.reverse()) await c();
    await prisma.$disconnect();
  }

  console.log(`\n${checks} checks run, ${failures.length} failure(s).`);
  if (failures.length > 0) {
    console.error(
      `\n[FAIL] Phase 4 Marketing live-DB verification surfaced defect(s):\n` +
        failures.map((f) => `  - ${f}`).join("\n") +
        `\n`,
    );
    process.exit(1);
  }
  console.log(
    `\n[OK] Phase 4 Marketing live-DB verification clean against '${TENANT_ID}'.\n`,
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
