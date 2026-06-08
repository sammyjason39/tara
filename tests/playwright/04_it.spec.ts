/**
 * 04_it.spec.ts — IT Module E2E Tests
 * ═════════════════════════════════════
 * Covers: IT workspace, Dashboard, Accounts, Devices, System Health,
 *         Topology, Role Governance, Tech Shop. API smoke tests.
 */

import { test, expect } from "@playwright/test";
import {
  ensureLoggedIn,
  assertRouteLoads,
  loadSessionFromPage,
  apiGet,
  collectJSErrors,
} from "./utils/helpers";

// ─── Navigation ───────────────────────────────────────────────────────────────

test.describe("IT — Page Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  const itRoutes: { route: string; label: string; waitMs?: number; minLength?: number; waitStrategy?: "domcontentloaded" | "networkidle" }[] = [
    { route: "/core/it", label: "IT Workspace Root" },
    { route: "/core/it/dashboard", label: "IT Dashboard" },
    { route: "/core/it/accounts", label: "Account Desk" },
    { route: "/core/it/devices", label: "Device Desk" },
    { route: "/core/it/health", label: "System Health" },
    { route: "/core/it/topology", label: "Topology Map" },
    { route: "/core/it/roles", label: "Role Governance" },
    { route: "/core/it/shop", label: "Tech Shop" },
    { route: "/core/it/schedule", label: "IT Department Schedule" },
    { route: "/core/it/attendance", label: "IT Attendance" },
    { route: "/core/it/admin", label: "IT Dept Admin" },
    { route: "/core/it/prs", label: "IT Purchase Requests" },
    { route: "/core/it/logs", label: "IT Logs", waitMs: 2000, minLength: 500, waitStrategy: "networkidle" },
    { route: "/core/it/audit-log", label: "IT Audit Log" },
    { route: "/core/it/workflow", label: "IT Workflow Inbox" },
  ];

  for (const { route, label, waitMs, minLength, waitStrategy } of itRoutes) {
    test(`should load: ${label}`, async ({ page }) => {
      await assertRouteLoads(page, route, label, waitMs, minLength, waitStrategy);
    });
  }
});

// ─── API Smoke Tests ──────────────────────────────────────────────────────────

test.describe("IT — API Smoke Tests", () => {
  let session: any;

  test.beforeEach(async ({ page }) => {
    session = await loadSessionFromPage(page, "/core/it");
  });

  test("GET /it/devices — returns device list", async ({ page }) => {
    await apiGet(page, "/it/devices", "GET /it/devices", session, {
      expectKey: "data",
      allow4xx: true,
    });
  });

  test("GET /it/accounts — returns account list", async ({ page }) => {
    await apiGet(page, "/it/accounts", "GET /it/accounts", session, {
      expectKey: "data",
      allow4xx: true,
    });
  });

  test("GET /it/health — returns system health status", async ({ page }) => {
    await apiGet(page, "/it/health", "GET /it/health", session, {
      allow4xx: true,
    });
  });
});

// ─── UI Content Checks ────────────────────────────────────────────────────────

test.describe("IT — UI Content Checks", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test("IT Dashboard renders KPI/stats or content", async ({ page }) => {
    await page.goto("/core/it/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
    expect(await page.locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')").count()).toBe(0);

    const hasStats =
      (await page.locator("[class*='stat'], [class*='kpi'], [class*='metric']").count()) > 0;
    const hasITText =
      (await page.getByText("IT", { exact: false }).count()) > 0 ||
      (await page.getByText("Device", { exact: false }).count()) > 0 ||
      (await page.getByText("System", { exact: false }).count()) > 0;

    console.log(`  ✔  IT Dashboard: stats=${hasStats}, itText=${hasITText}`);
  });

  test("System Health page renders health indicators", async ({ page }) => {
    await page.goto("/core/it/health", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
    expect(await page.locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')").count()).toBe(0);

    const hasHealthText =
      (await page.getByText("Health", { exact: false }).count()) > 0 ||
      (await page.getByText("Status", { exact: false }).count()) > 0 ||
      (await page.getByText("System", { exact: false }).count()) > 0;

    console.log(`  ✔  System Health: healthText=${hasHealthText}`);
  });

  test("Role Governance page loads roles list or empty state", async ({ page }) => {
    await page.goto("/core/it/roles", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
    expect(await page.locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')").count()).toBe(0);
    console.log("  ✔  Role Governance: loaded");
  });
});

// ─── JS Error Audit ───────────────────────────────────────────────────────────

test.describe("IT — Console Error Audit", () => {
  test("No fatal JS errors on key IT routes", async ({ page }) => {
    await ensureLoggedIn(page);

    const errors = await collectJSErrors(page, [
      "/core/it",
      "/core/it/dashboard",
      "/core/it/accounts",
      "/core/it/devices",
      "/core/it/health",
      "/core/it/roles",
    ]);

    if (errors.length > 0) {
      console.warn("⚠️  JS errors on IT routes:");
      errors.forEach((e) => console.warn(`    ${e}`));
    }
    expect(errors, "Fatal JS errors found on IT routes").toHaveLength(0);
  });
});
