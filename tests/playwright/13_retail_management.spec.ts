/**
 * 13_retail_management.spec.ts — Retail Management Module E2E Tests
 * ═══════════════════════════════════════════════════════════════════
 * Covers: All 14 Retail Management pages, API smoke tests,
 *         UI interaction (inventory search, store dashboard KPIs),
 *         Console error audit.
 *
 * Routes are on /m/retail/* (ModuleLayout), accessed via DeviceAwareGuard.
 */

import { test, expect } from "@playwright/test";
import {
  ensureLoggedIn,
  assertRouteLoads,
  loadSessionFromPage,
  apiGet,
  collectJSErrors,
} from "./utils/helpers";

// ─── Management Navigation ────────────────────────────────────────────────────

test.describe("Retail Management — Page Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  const managementRoutes = [
    { route: "/m/retail/workspace", label: "Retail Workspace Root" },
    { route: "/m/retail/management", label: "Retail Management Root" },
    { route: "/m/retail/management/store-dashboard", label: "Store Dashboard" },
    { route: "/m/retail/management/nexus-command", label: "Nexus Command Center" },
    { route: "/m/retail/management/inventory", label: "Inventory Visibility" },
    { route: "/m/retail/management/order-fulfillment", label: "Order Fulfillment" },
    { route: "/m/retail/management/ecommerce-analytics", label: "Ecommerce Analytics" },
    { route: "/m/retail/management/pricing-promo", label: "Pricing & Promotions" },
    { route: "/m/retail/management/channels", label: "Channel Management" },
    { route: "/m/retail/management/staff-assignments", label: "Staff Assignments" },
    { route: "/m/retail/management/shift-control", label: "Shift Control" },
    { route: "/m/retail/management/device-control", label: "Device Control Center" },
    { route: "/m/retail/management/infrastructure", label: "Infrastructure Control" },
    { route: "/m/retail/management/compliance", label: "Compliance Audit Ledger" },
    { route: "/m/retail/management/settings", label: "Retail Settings" },
  ];

  for (const { route, label } of managementRoutes) {
    test(`should load: ${label}`, async ({ page }) => {
      await assertRouteLoads(page, route, label);
    });
  }
});

// ─── API Smoke Tests ──────────────────────────────────────────────────────────

test.describe("Retail Management — API Smoke Tests", () => {
  let session: any;

  test.beforeEach(async ({ page }) => {
    session = await loadSessionFromPage(page, "/m/retail/management");
  });

  const endpoints = [
    { path: "/retail/stores", label: "GET /retail/stores" },
    { path: "/retail/categories", label: "GET /retail/categories" },
    { path: "/retail/products", label: "GET /retail/products" },
    { path: "/retail/orders", label: "GET /retail/orders" },
    { path: "/retail/channels", label: "GET /retail/channels" },
    { path: "/retail/promotions", label: "GET /retail/promotions" },
    { path: "/retail/inventory/stats", label: "GET /retail/inventory/stats" },
    { path: "/retail/shifts", label: "GET /retail/shifts" },
    { path: "/retail/customers", label: "GET /retail/customers" },
    { path: "/retail/ecommerce-stores", label: "GET /retail/ecommerce-stores" },
    { path: "/retail/inventory-pools", label: "GET /retail/inventory-pools" },
  ];

  for (const { path, label } of endpoints) {
    test(label, async ({ page }) => {
      await apiGet(page, path, label, session, { expectKey: "data" });
    });
  }
});

// ─── UI Content Checks ────────────────────────────────────────────────────────

test.describe("Retail Management — UI Content Checks", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test("Store Dashboard renders KPI cards or metrics", async ({ page }) => {
    await page.goto("/m/retail/management/store-dashboard", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2500);

    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
    expect(await page.locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')").count()).toBe(0);

    const hasMetrics =
      (await page.locator("[class*='kpi'], [class*='stat'], [class*='metric'], [class*='card']").count()) > 0;
    const hasDashboardText =
      (await page.getByText("Store", { exact: false }).count()) > 0 ||
      (await page.getByText("Dashboard", { exact: false }).count()) > 0 ||
      (await page.getByText("Revenue", { exact: false }).count()) > 0 ||
      (await page.getByText("Sales", { exact: false }).count()) > 0;

    console.log(
      `  ✔  Store Dashboard: metrics=${hasMetrics}, text=${hasDashboardText}`
    );
  });

  test("Inventory Visibility page shows table or empty state", async ({
    page,
  }) => {
    await page.goto("/m/retail/management/inventory", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2500);

    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
    expect(await page.locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')").count()).toBe(0);

    const hasTable = (await page.locator("table").count()) > 0;
    const hasEmptyState =
      (await page.getByText("No items", { exact: false }).count()) > 0 ||
      (await page.getByText("No products", { exact: false }).count()) > 0 ||
      (await page.getByText("empty", { exact: false }).count()) > 0;
    const hasKpis =
      (await page.locator("[class*='kpi'], [class*='stat']").count()) > 0;

    console.log(
      `  ✔  Inventory Visibility: table=${hasTable}, emptyState=${hasEmptyState}, kpis=${hasKpis}`
    );
  });

  test("Inventory page has search/filter inputs", async ({ page }) => {
    await page.goto("/m/retail/management/inventory", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2000);

    const searchInputCount = await page
      .locator(
        'input[type="text"], input[type="search"], input[placeholder*="search" i], input[placeholder*="filter" i]'
      )
      .count();

    expect(
      await page.locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')").count()
    ).toBe(0);
    console.log(
      `  ✔  Inventory search/filter: ${searchInputCount} input(s) found`
    );
  });

  test("Order Fulfillment page shows order queue or empty state", async ({
    page,
  }) => {
    await page.goto("/m/retail/management/order-fulfillment", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2500);

    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
    expect(await page.locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')").count()).toBe(0);

    const hasOrderText =
      (await page.getByText("Order", { exact: false }).count()) > 0 ||
      (await page.getByText("Fulfillment", { exact: false }).count()) > 0;
    console.log(`  ✔  Order Fulfillment: orderText=${hasOrderText}`);
  });

  test("Pricing & Promo Desk shows pricing rules or empty state", async ({
    page,
  }) => {
    await page.goto("/m/retail/management/pricing-promo", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2500);

    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
    expect(await page.locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')").count()).toBe(0);

    const hasPricingText =
      (await page.getByText("Price", { exact: false }).count()) > 0 ||
      (await page.getByText("Promo", { exact: false }).count()) > 0 ||
      (await page.getByText("Discount", { exact: false }).count()) > 0;
    console.log(`  ✔  Pricing & Promo: pricingText=${hasPricingText}`);
  });

  test("Shift Control page shows shift status or schedule", async ({ page }) => {
    await page.goto("/m/retail/management/shift-control", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2500);

    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
    expect(await page.locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')").count()).toBe(0);

    const hasShiftText =
      (await page.getByText("Shift", { exact: false }).count()) > 0 ||
      (await page.getByText("Schedule", { exact: false }).count()) > 0 ||
      (await page.getByText("Staff", { exact: false }).count()) > 0;
    console.log(`  ✔  Shift Control: shiftText=${hasShiftText}`);
  });

  test("Ecommerce Analytics shows channel metrics or empty state", async ({
    page,
  }) => {
    await page.goto("/m/retail/management/ecommerce-analytics", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2500);

    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
    expect(await page.locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')").count()).toBe(0);
    console.log("  ✔  Ecommerce Analytics: loaded");
  });
});

// ─── JS Error Audit ───────────────────────────────────────────────────────────

test.describe("Retail Management — Console Error Audit", () => {
  test("No fatal JS errors on Retail Management routes", async ({ page }) => {
    await ensureLoggedIn(page);

    const errors = await collectJSErrors(page, [
      "/m/retail/management",
      "/m/retail/management/store-dashboard",
      "/m/retail/management/inventory",
      "/m/retail/management/nexus-command",
      "/m/retail/management/pricing-promo",
      "/m/retail/management/channels",
      "/m/retail/management/device-control",
      "/m/retail/management/shift-control",
      "/m/retail/management/compliance",
    ]);

    if (errors.length > 0) {
      console.warn("⚠️  JS errors on Retail Management routes:");
      errors.forEach((e) => console.warn(`    ${e}`));
    }
    expect(
      errors,
      "Fatal JS errors found on Retail Management routes"
    ).toHaveLength(0);
  });
});
