/**
 * Playwright teardown project (Verification_Suite, Phase 16, task 16.2).
 *
 * Runs after the dependent spec projects finish (wired as the `setup` project's `teardown`). It
 * performs the documented isolation/cleanup for every Synthetic_Organization provisioned this run.
 *
 * Design references:
 *   .kiro/specs/frontend-stabilization/design.md → "Isolation & teardown"
 *   Requirement 11.8 (data isolated to the synthetic tenant; records identifiable/cleanable).
 *
 * Isolation: each run uses its OWN tenant, so synthetic data is isolated by construction and never
 * written into the legacy `Live_Test_Tenant`. This teardown therefore only ever acts on the
 * synthetic tenant recorded in the fixture, authenticated with that synthetic owner's own token
 * (which is scoped to its tenant) — it can never affect another tenant.
 *
 * Cleanup attempts, in the order the design specifies:
 *   (a) a documented best-effort deactivation/soft-delete call against the synthetic tenant; if no
 *       such path is available on the environment, the call fails harmlessly and we fall through;
 *   (b) the org is left inert but clearly labeled `synthtest-*`, and we log that a scheduled/manual
 *       reaper can later reap labeled tenants.
 *
 * SECRETS HANDLING: no credentials are embedded. The owner token comes from the fixture written by
 * the setup project (gitignored), the API URL is resolved by key name, and no secret value is
 * logged.
 */

import { test as teardown, request, type APIRequestContext } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const REPO_ROOT = path.resolve(__dirname, "../../..");
const AUTH_DIR = path.join("tests", "playwright", ".auth");

interface OrgRecord {
  runId: string;
  label: string;
  tenantId: string;
  companyId: string;
  owner: { email: string; password: string; userId: string; token: string };
  activatedModules: string[];
}

/** Read a single `KEY=value` from `vps_reference.md` without echoing the value. */
function readKeyFromReferenceFile(key: string): string | undefined {
  try {
    const refPath = path.join(REPO_ROOT, "vps_reference.md");
    if (!fs.existsSync(refPath)) return undefined;
    const content = fs.readFileSync(refPath, "utf8");
    const re = new RegExp(`^\\s*${key}\\s*=\\s*"?([^"\\n\\r]+)"?\\s*$`, "m");
    const m = content.match(re);
    return m ? m[1].trim() : undefined;
  } catch {
    return undefined;
  }
}

/** Resolve the Backend_API base URL by key name (env first, then reference file). */
function resolveApiBaseURL(): string | undefined {
  const url =
    process.env.VITE_API_URL ||
    process.env.VITE_API_BASE_URL ||
    readKeyFromReferenceFile("VITE_API_URL");
  return url ? url.replace(/\/$/, "") : undefined;
}

/** Find every SyntheticOrg fixture written this run. */
function findOrgRecords(): Array<{ file: string; org: OrgRecord }> {
  const dir = path.resolve(REPO_ROOT, AUTH_DIR);
  if (!fs.existsSync(dir)) return [];
  const out: Array<{ file: string; org: OrgRecord }> = [];
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith(".org.json")) continue;
    const file = path.join(dir, name);
    try {
      const org = JSON.parse(fs.readFileSync(file, "utf8")) as OrgRecord;
      if (org?.tenantId) out.push({ file, org });
    } catch {
      console.warn(`[cleanup.teardown] Skipping unreadable fixture ${name}.`);
    }
  }
  return out;
}

/**
 * Best-effort documented cleanup for one synthetic tenant. Tries the documented deactivation paths
 * in order; the first that responds 2xx wins. Authenticated as the synthetic owner, scoped to its
 * own tenant. Returns true if a cleanup call succeeded.
 */
async function deactivateTenant(api: APIRequestContext, org: OrgRecord): Promise<boolean> {
  // Documented candidate cleanup endpoints (owner-scoped). Each is logged exactly as performed
  // (Requirement 11.6 documentation discipline). All are tolerant of absence on the environment.
  const attempts: Array<{ desc: string; run: () => Promise<boolean> }> = [
    {
      desc: `POST /v1/admin/tenant/deactivate { tenant_id: <synthetic> }`,
      run: async () => {
        const res = await api.post(`/v1/admin/tenant/deactivate`, {
          data: { tenant_id: org.tenantId, reason: `synthetic teardown ${org.label}` },
        });
        return res.ok();
      },
    },
    {
      desc: `DELETE /v1/admin/tenant/<synthetic>`,
      run: async () => {
        const res = await api.delete(`/v1/admin/tenant/${encodeURIComponent(org.tenantId)}`);
        return res.ok();
      },
    },
  ];

  for (const attempt of attempts) {
    console.log(`[cleanup.teardown]   TEARDOWN STEP: ${attempt.desc} (tenant ${org.tenantId}).`);
    try {
      if (await attempt.run()) {
        console.log(`[cleanup.teardown]   ✔ cleanup succeeded for tenant ${org.tenantId}.`);
        return true;
      }
    } catch (e: any) {
      console.log(`[cleanup.teardown]   ⚠ step unavailable: ${e?.message ?? e}`);
    }
  }
  return false;
}

teardown("cleanup synthetic organizations", async () => {
  teardown.setTimeout(120_000);

  const records = findOrgRecords();
  if (records.length === 0) {
    console.log("[cleanup.teardown] No SyntheticOrg fixtures found; nothing to clean up.");
    return;
  }

  const apiBaseURL = resolveApiBaseURL();
  if (!apiBaseURL) {
    console.warn(
      "[cleanup.teardown] Backend_API URL not resolvable (VITE_API_URL / vps_reference.md). " +
        "Skipping active cleanup; synthetic tenants remain labeled `synthtest-*` for later reaping.",
    );
  }

  for (const { file, org } of records) {
    console.log(
      `[cleanup.teardown] Tenant ${org.tenantId} (label ${org.label}) — isolated synthetic tenant; ` +
        `legacy tenant is never touched.`,
    );

    let cleaned = false;
    if (apiBaseURL && org.owner?.token) {
      const api = await request.newContext({
        baseURL: apiBaseURL,
        extraHTTPHeaders: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${org.owner.token}`,
          "x-tenant-id": org.tenantId,
          ...(org.companyId ? { "x-company-id": org.companyId } : {}),
          ...(org.owner.userId ? { "x-actor-id": org.owner.userId } : {}),
        },
      });
      try {
        cleaned = await deactivateTenant(api, org);
      } finally {
        await api.dispose().catch(() => undefined);
      }
    }

    if (!cleaned) {
      // Documented fallback (design "Isolation & teardown" path b): leave the org inert but clearly
      // labeled so a scheduled/manual reaper can collect it. Isolation already holds by tenant.
      console.log(
        `[cleanup.teardown] No active cleanup path applied for tenant ${org.tenantId}. ` +
          `Record is left labeled "${org.label}" (synthtest-*) for a scheduled/manual reaper; ` +
          `data stays isolated to this synthetic tenant (Requirement 11.8).`,
      );
    }

    // Remove the local fixture (contains a live token) regardless of remote cleanup outcome.
    try {
      fs.rmSync(file, { force: true });
      console.log(`[cleanup.teardown] Removed local fixture ${path.basename(file)}.`);
    } catch (e: any) {
      console.warn(`[cleanup.teardown] Could not remove local fixture ${file}: ${e?.message ?? e}`);
    }
  }
});
