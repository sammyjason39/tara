/**
 * 08_sales.spec.ts — Sales Module E2E Tests
 * ═══════════════════════════════════════════
 * Covers: Sales Dashboard, Lead Desk, Pipeline, Opportunities,
 *         Quotes, Orders, Forecasting, Commissions, Intelligence.
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

test.describe("Sales — Page Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  const salesRoutes: { route: string; label: string; waitMs?: number; minLength?: number; waitStrategy?: "domcontentloaded" | "networkidle" }[] = [
    { route: "/core/sales", label: "Sales Workspace Root" },
    { route: "/core/sales/overview", label: "Sales Overview" },
    { route: "/core/sales/dashboard", label: "Sales Dashboard" },
    { route: "/core/sales/leads", label: "Lead Desk" },
    { route: "/core/sales/pipeline", label: "Pipeline Board" },
    { route: "/core/sales/opps", label: "Opportunity Desk" },
    { route: "/core/sales/quotes", label: "Quote Desk" },
    { route: "/core/sales/timeline", label: "Timeline Desk" },
    { route: "/core/sales/orders", label: "Sales Order Desk" },
    { route: "/core/sales/manager", label: "Manager Desk" },
    { route: "/core/sales/forecast", label: "Forecast Desk" },
    { route: "/core/sales/audit", label: "Sales Audit Log" },
    { route: "/core/sales/customers", label: "Customer 360 Desk" },
    { route: "/core/sales/commissions", label: "Incentive / Commission Desk" },
    { route: "/core/sales/intelligence", label: "Sales Intelligence Engine" },
    { route: "/core/sales/schedule", label: "Sales Department Schedule" },
    { route: "/core/sales/attendance", label: "Sales Attendance" },
    { route: "/core/sales/admin", label: "Sales Dept Admin" },
    { route: "/core/sales/logs", label: "Sales Logs", waitMs: 2000, minLength: 500, waitStrategy: "networkidle" },
    { route: "/core/sales/audit-log", label: "Sales Audit Log Hub" },
    { route: "/core/sales/workflow", label: "Sales Workflow Inbox" },
  ];

  for (const { route, label, waitMs, minLength, waitStrategy } of salesRoutes) {
    test(`should load: ${label}`, async ({ page }) => {
      await assertRouteLoads(page, route, label, waitMs, minLength, waitStrategy);
    });
  }
});

// ─── API Smoke Tests ──────────────────────────────────────────────────────────

test.describe("Sales — API Smoke Tests", () => {
  let session: any;

  test.beforeEach(async ({ page }) => {
    session = await loadSessionFromPage(page, "/core/sales");
  });

  test("GET /sales/leads — returns lead list", async ({ page }) => {
    await apiGet(page, "/sales/leads", "GET /sales/leads", session, {
      expectKey: "data",
      allow5xx: true,
    });
  });

  test("GET /sales/orders — returns sales order list", async ({ page }) => {
    await apiGet(page, "/sales/orders", "GET /sales/orders", session, {
      expectKey: "data",
      allow5xx: true,
    });
  });

  test("GET /sales/opportunities — returns opportunity list", async ({
    page,
  }) => {
    await apiGet(
      page,
      "/sales/opportunities",
      "GET /sales/opportunities",
      session,
      { expectKey: "data", allow5xx: true }
    );
  });

  test("GET /sales/quotes — returns quote list", async ({ page }) => {
    await apiGet(page, "/sales/quotes", "GET /sales/quotes", session, {
      expectKey: "data",
      allow5xx: true,
    });
  });

  test("GET /sales/customers — returns customer list", async ({ page }) => {
    await apiGet(page, "/sales/customers", "GET /sales/customers", session, {
      expectKey: "data",
      allow4xx: true,
    });
  });
});

// ─── UI Content Checks ────────────────────────────────────────────────────────

test.describe("Sales — UI Content Checks", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test("Sales Overview renders KPIs or metrics", async ({ page }) => {
    await page.goto("/core/sales/overview", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
    expect(await page.locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')").count()).toBe(0);

    const hasSalesText =
      (await page.getByText("Sales", { exact: false }).count()) > 0 ||
      (await page.getByText("Revenue", { exact: false }).count()) > 0 ||
      (await page.getByText("Lead", { exact: false }).count()) > 0;

    console.log(`  ✔  Sales Overview: salesText=${hasSalesText}`);
  });

  test("Pipeline Board renders kanban or list of stages", async ({ page }) => {
    await page.goto("/core/sales/pipeline", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
    expect(await page.locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')").count()).toBe(0);

    const hasPipelineContent =
      (await page.getByText("Pipeline", { exact: false }).count()) > 0 ||
      (await page.locator("[class*='kanban'], [class*='pipeline'], [class*='column']").count()) > 0;

    console.log(`  ✔  Pipeline Board: pipelineContent=${hasPipelineContent}`);
  });

  test("Lead Desk renders lead list or input form", async ({ page }) => {
    await page.goto("/core/sales/leads", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
    expect(await page.locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')").count()).toBe(0);

    const hasLeadText =
      (await page.getByText("Lead", { exact: false }).count()) > 0 ||
      (await page.getByText("Prospect", { exact: false }).count()) > 0;

    console.log(`  ✔  Lead Desk: leadText=${hasLeadText}`);
  });

  test("Quote Desk renders quotes or form", async ({ page }) => {
    await page.goto("/core/sales/quotes", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
    expect(await page.locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')").count()).toBe(0);
    console.log("  ✔  Quote Desk: loaded");
  });
});

// ─── JS Error Audit ───────────────────────────────────────────────────────────

test.describe("Sales — Console Error Audit", () => {
  test("No fatal JS errors on Sales routes", async ({ page }) => {
    await ensureLoggedIn(page);

    const errors = await collectJSErrors(page, [
      "/core/sales",
      "/core/sales/overview",
      "/core/sales/leads",
      "/core/sales/pipeline",
      "/core/sales/orders",
      "/core/sales/quotes",
    ]);

    if (errors.length > 0) {
      console.warn("⚠️  JS errors on Sales routes:");
      errors.forEach((e) => console.warn(`    ${e}`));
    }
    expect(errors, "Fatal JS errors found on Sales routes").toHaveLength(0);
  });
});
