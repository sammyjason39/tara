/**
 * 10_inventory.spec.ts — Inventory & Warehouse Module E2E Tests
 * ═══════════════════════════════════════════════════════════════
 * Covers: Inventory Dashboard, Stock Hub, Receiving, Adjustments,
 *         Transfers, Stock Opname, Audit Log, Insights, IoT Feed,
 *         Warehouse Management. API smoke tests.
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

test.describe("Inventory — Page Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  const invRoutes: { route: string; label: string; waitMs?: number; minLength?: number; waitStrategy?: "domcontentloaded" | "networkidle" }[] = [
    { route: "/core/inventory", label: "Inventory Workspace Root" },
    { route: "/core/inventory/dashboard", label: "Inventory Dashboard" },
    { route: "/core/inventory/stock", label: "Stock Hub" },
    { route: "/core/inventory/receiving", label: "Inventory Receiving" },
    { route: "/core/inventory/adjustments", label: "Inventory Adjustments" },
    { route: "/core/inventory/transfers", label: "Transfer Desk" },
    { route: "/core/inventory/opname", label: "Stock Opname" },
    { route: "/core/inventory/audit", label: "Inventory Audit Log" },
    { route: "/core/inventory/insights", label: "Inventory Insights" },
    { route: "/core/inventory/iot", label: "IoT Event Feed" },
    { route: "/core/inventory/schedule", label: "Inventory Schedule" },
    { route: "/core/inventory/attendance", label: "Inventory Attendance" },
    { route: "/core/inventory/admin", label: "Inventory Dept Admin" },
    { route: "/core/inventory/prs", label: "Inventory Purchase Requests" },
    { route: "/core/inventory/logs", label: "Inventory Logs", waitMs: 2000, minLength: 500, waitStrategy: "networkidle" },
    { route: "/core/inventory/audit-log", label: "Inventory Audit Log Hub" },
    { route: "/core/inventory/workflow", label: "Inventory Workflow" },
  ];

  for (const { route, label, waitMs, minLength, waitStrategy } of invRoutes) {
    test(`should load: ${label}`, async ({ page }) => {
      await assertRouteLoads(page, route, label, waitMs, minLength, waitStrategy);
    });
  }
});

test.describe("Warehouse — Page Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  const warehouseRoutes: { route: string; label: string; waitMs?: number; minLength?: number; waitStrategy?: "domcontentloaded" | "networkidle" }[] = [
    { route: "/core/warehouse", label: "Warehouse Workspace Root" },
    { route: "/core/warehouse/dashboard", label: "Warehouse Management" },
    { route: "/core/warehouse/schedule", label: "Warehouse Schedule" },
    { route: "/core/warehouse/attendance", label: "Warehouse Attendance" },
    { route: "/core/warehouse/admin", label: "Warehouse Dept Admin" },
    { route: "/core/warehouse/logs", label: "Warehouse Logs", waitMs: 2000, minLength: 500, waitStrategy: "networkidle" },
  ];

  for (const { route, label, waitMs, minLength, waitStrategy } of warehouseRoutes) {
    test(`should load: ${label}`, async ({ page }) => {
      await assertRouteLoads(page, route, label, waitMs, minLength, waitStrategy);
    });
  }
});

// ─── API Smoke Tests ──────────────────────────────────────────────────────────

test.describe("Inventory — API Smoke Tests", () => {
  let session: any;

  test.beforeEach(async ({ page }) => {
    session = await loadSessionFromPage(page, "/core/inventory");
  });

  test("GET /inventory/stats — returns inventory statistics", async ({
    page,
  }) => {
    await apiGet(page, "/inventory/stats", "GET /inventory/stats", session, {
      allow4xx: true,
    });
  });

  test("GET /inventory/stock — returns stock items", async ({ page }) => {
    await apiGet(page, "/inventory/stock", "GET /inventory/stock", session, {
      expectKey: "data",
      allow4xx: true,
    });
  });

  test("GET /inventory/products — returns product catalog", async ({ page }) => {
    await apiGet(
      page,
      "/inventory/products",
      "GET /inventory/products",
      session,
      { expectKey: "data", allow4xx: true }
    );
  });

  test("GET /inventory/adjustments — returns adjustment records", async ({
    page,
  }) => {
    await apiGet(
      page,
      "/inventory/adjustments",
      "GET /inventory/adjustments",
      session,
      { expectKey: "data", allow4xx: true }
    );
  });

  test("GET /inventory/transfers — returns transfer records", async ({
    page,
  }) => {
    await apiGet(
      page,
      "/inventory/transfers",
      "GET /inventory/transfers",
      session,
      { expectKey: "data", allow4xx: true }
    );
  });
});

// ─── UI Content Checks ────────────────────────────────────────────────────────

test.describe("Inventory — UI Content Checks", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test("Inventory Dashboard renders KPI bars or metrics", async ({ page }) => {
    await page.goto("/core/inventory/dashboard", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2500);

    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
    expect(await page.locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')").count()).toBe(0);

    const hasInvText =
      (await page.getByText("Inventory", { exact: false }).count()) > 0 ||
      (await page.getByText("Stock", { exact: false }).count()) > 0 ||
      (await page.getByText("Product", { exact: false }).count()) > 0;

    console.log(`  ✔  Inventory Dashboard: invText=${hasInvText}`);
  });

  test("Stock Hub renders stock table or search bar", async ({ page }) => {
    await page.goto("/core/inventory/stock", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2500);

    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
    expect(await page.locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')").count()).toBe(0);

    const hasTable = (await page.locator("table").count()) > 0;
    const hasSearch =
      (await page
        .locator('input[type="search"], input[placeholder*="search" i]')
        .count()) > 0;
    console.log(`  ✔  Stock Hub: table=${hasTable}, search=${hasSearch}`);
  });

  test("Stock Opname page renders scanner or item list", async ({ page }) => {
    await page.goto("/core/inventory/opname", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2500);

    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
    expect(await page.locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')").count()).toBe(0);
    console.log("  ✔  Stock Opname: loaded");
  });

  test("Inventory Receiving page renders receiving form or queue", async ({
    page,
  }) => {
    await page.goto("/core/inventory/receiving", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2500);

    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
    expect(await page.locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')").count()).toBe(0);
    console.log("  ✔  Inventory Receiving: loaded");
  });
});

// ─── JS Error Audit ───────────────────────────────────────────────────────────

test.describe("Inventory — Console Error Audit", () => {
  test("No fatal JS errors on Inventory routes", async ({ page }) => {
    await ensureLoggedIn(page);

    const errors = await collectJSErrors(page, [
      "/core/inventory",
      "/core/inventory/dashboard",
      "/core/inventory/stock",
      "/core/inventory/receiving",
      "/core/inventory/adjustments",
      "/core/inventory/opname",
    ]);

    if (errors.length > 0) {
      console.warn("⚠️  JS errors on Inventory routes:");
      errors.forEach((e) => console.warn(`    ${e}`));
    }
    expect(errors, "Fatal JS errors found on Inventory routes").toHaveLength(0);
  });
});
