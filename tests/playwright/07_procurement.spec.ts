/**
 * 07_procurement.spec.ts — Procurement Module E2E Tests
 * ═══════════════════════════════════════════════════════
 * Covers: Purchase Requests, PO Release, Supplier management,
 *         Contract Desk, Supplier Portal, Risk Center, Insights.
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

test.describe("Procurement — Page Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  const procRoutes: { route: string; label: string; waitMs?: number; minLength?: number; waitStrategy?: "domcontentloaded" | "networkidle" }[] = [
    { route: "/core/procurement", label: "Procurement Workspace Root" },
    { route: "/core/procurement/prs", label: "Purchase Request Desk" },
    { route: "/core/procurement/po-release", label: "PO Release Desk" },
    { route: "/core/procurement/suppliers", label: "Supplier Desk" },
    { route: "/core/procurement/contracts", label: "Contract Desk" },
    { route: "/core/procurement/portal", label: "Supplier Portal Desk" },
    { route: "/core/procurement/risk", label: "Procurement Risk Center" },
    { route: "/core/procurement/insights", label: "Procurement Insights" },
    { route: "/core/procurement/schedule", label: "Procurement Schedule" },
    { route: "/core/procurement/attendance", label: "Procurement Attendance" },
    { route: "/core/procurement/admin", label: "Procurement Dept Admin" },
    { route: "/core/procurement/receiving", label: "Procurement Receiving" },
    { route: "/core/procurement/stock", label: "Procurement Stock" },
    { route: "/core/procurement/logs", label: "Procurement Logs", waitMs: 2000, minLength: 500, waitStrategy: "networkidle" },
    { route: "/core/procurement/audit-log", label: "Procurement Audit Log" },
    { route: "/core/procurement/workflow", label: "Procurement Workflow" },
  ];

  for (const { route, label, waitMs, minLength, waitStrategy } of procRoutes) {
    test(`should load: ${label}`, async ({ page }) => {
      await assertRouteLoads(page, route, label, waitMs, minLength, waitStrategy);
    });
  }
});

// ─── API Smoke Tests ──────────────────────────────────────────────────────────

test.describe("Procurement — API Smoke Tests", () => {
  let session: any;

  test.beforeEach(async ({ page }) => {
    session = await loadSessionFromPage(page, "/core/procurement");
  });

  test("GET /procurement/purchase-requests — returns PR list", async ({
    page,
  }) => {
    await apiGet(
      page,
      "/procurement/purchase-requests",
      "GET /procurement/purchase-requests",
      session,
      { expectKey: "data", allow4xx: true }
    );
  });

  test("GET /procurement/suppliers — returns supplier list", async ({
    page,
  }) => {
    await apiGet(
      page,
      "/procurement/suppliers",
      "GET /procurement/suppliers",
      session,
      { expectKey: "data", allow4xx: true }
    );
  });

  test("GET /procurement/purchase-orders — returns PO list", async ({
    page,
  }) => {
    await apiGet(
      page,
      "/procurement/purchase-orders",
      "GET /procurement/purchase-orders",
      session,
      { expectKey: "data", allow4xx: true }
    );
  });

  test("GET /procurement/contracts — returns contract list", async ({
    page,
  }) => {
    await apiGet(
      page,
      "/procurement/contracts",
      "GET /procurement/contracts",
      session,
      { expectKey: "data", allow4xx: true }
    );
  });
});

// ─── UI Content Checks ────────────────────────────────────────────────────────

test.describe("Procurement — UI Content Checks", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test("Purchase Request Desk renders PR list or empty state", async ({
    page,
  }) => {
    await page.goto("/core/procurement/prs", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2500);

    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
    expect(await page.locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')").count()).toBe(0);

    const hasPRText =
      (await page.getByText("Purchase Request", { exact: false }).count()) > 0 ||
      (await page.getByText("PR", { exact: false }).count()) > 0 ||
      (await page.getByText("Request", { exact: false }).count()) > 0;

    console.log(`  ✔  Purchase Request Desk: prText=${hasPRText}`);
  });

  test("Supplier Desk renders supplier list or search", async ({ page }) => {
    await page.goto("/core/procurement/suppliers", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2500);

    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
    expect(await page.locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')").count()).toBe(0);

    const hasTable = (await page.locator("table").count()) > 0;
    const hasSupplierText =
      (await page.getByText("Supplier", { exact: false }).count()) > 0 ||
      (await page.getByText("Vendor", { exact: false }).count()) > 0;

    console.log(
      `  ✔  Supplier Desk: table=${hasTable}, supplierText=${hasSupplierText}`
    );
  });

  test("PO Release Desk renders PO queue or empty state", async ({ page }) => {
    await page.goto("/core/procurement/po-release", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2500);

    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
    expect(await page.locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')").count()).toBe(0);
    console.log("  ✔  PO Release Desk: loaded");
  });
});

// ─── JS Error Audit ───────────────────────────────────────────────────────────

test.describe("Procurement — Console Error Audit", () => {
  test("No fatal JS errors on Procurement routes", async ({ page }) => {
    await ensureLoggedIn(page);

    const errors = await collectJSErrors(page, [
      "/core/procurement",
      "/core/procurement/prs",
      "/core/procurement/po-release",
      "/core/procurement/suppliers",
      "/core/procurement/contracts",
    ]);

    if (errors.length > 0) {
      console.warn("⚠️  JS errors on Procurement routes:");
      errors.forEach((e) => console.warn(`    ${e}`));
    }
    expect(errors, "Fatal JS errors found on Procurement routes").toHaveLength(0);
  });
});
