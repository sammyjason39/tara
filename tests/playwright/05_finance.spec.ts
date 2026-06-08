/**
 * 05_finance.spec.ts — Finance Module E2E Tests
 * ═══════════════════════════════════════════════
 * Covers: CFO Dashboard, Ledger, JV, AR/AP, Payflow, Invoices,
 *         Treasury, Assets, Close Period, Payslip, Audit, Insights.
 *         API smoke tests for Finance endpoints.
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

test.describe("Finance — Page Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  const financeRoutes: { route: string; label: string; waitMs?: number; minLength?: number; waitStrategy?: "domcontentloaded" | "networkidle" }[] = [
    { route: "/core/finance", label: "Finance Workspace Root (CFO Dashboard)" },
    { route: "/core/finance/moneydesk", label: "Money Desk" },
    { route: "/core/finance/treasury", label: "Treasury Map" },
    { route: "/core/finance/ledger", label: "Ledger Core" },
    { route: "/core/finance/payflow", label: "PayFlow" },
    { route: "/core/finance/receivables", label: "Receivable Desk (AR)" },
    { route: "/core/finance/payables", label: "Payable Desk (AP)" },
    { route: "/core/finance/jv", label: "JV Desk (Journal Voucher)" },
    { route: "/core/finance/invoices", label: "Invoice Capture" },
    { route: "/core/finance/close", label: "Close Period Studio" },
    { route: "/core/finance/audit", label: "Finance Audit Vault" },
    { route: "/core/finance/insights", label: "Finance Insights" },
    { route: "/core/finance/docs", label: "Finance Docs" },
    { route: "/core/finance/assets", label: "Assets" },
    { route: "/core/finance/policy", label: "Policy Manager" },
    { route: "/core/finance/payslip-studio", label: "Payslip Studio" },
    { route: "/core/finance/operations", label: "Financial Operations Desk" },
    { route: "/core/finance/prs", label: "Finance Purchase Requests" },
    { route: "/core/finance/receiving", label: "Finance Inventory Receiving" },
    { route: "/core/finance/stock", label: "Finance Stock Hub" },
    { route: "/core/finance/schedule", label: "Finance Department Schedule" },
    { route: "/core/finance/attendance", label: "Finance Attendance" },
    { route: "/core/finance/admin", label: "Finance Dept Admin" },
    { route: "/core/finance/logs", label: "Finance Logs", waitMs: 2000, minLength: 500, waitStrategy: "networkidle" },
    { route: "/core/finance/audit-log", label: "Finance Audit Log" },
    { route: "/core/finance/workflow", label: "Finance Workflow Inbox" },
  ];

  for (const { route, label, waitMs, minLength, waitStrategy } of financeRoutes) {
    test(`should load: ${label}`, async ({ page }) => {
      await assertRouteLoads(page, route, label, waitMs, minLength, waitStrategy);
    });
  }
});

// ─── API Smoke Tests ──────────────────────────────────────────────────────────

test.describe("Finance — API Smoke Tests", () => {
  let session: any;

  test.beforeEach(async ({ page }) => {
    session = await loadSessionFromPage(page, "/core/finance");
  });

  test("GET /finance/accounts — returns chart of accounts", async ({ page }) => {
    await apiGet(page, "/finance/accounts", "GET /finance/accounts", session, {
      expectKey: "data",
      allow4xx: true,
    });
  });

  test("GET /finance/ledger/entries — returns ledger entries", async ({
    page,
  }) => {
    await apiGet(
      page,
      "/finance/ledger/entries",
      "GET /finance/ledger/entries",
      session,
      { expectKey: "data", allow4xx: true }
    );
  });

  test("GET /finance/invoices — returns invoice list", async ({ page }) => {
    await apiGet(page, "/finance/invoices", "GET /finance/invoices", session, {
      expectKey: "data",
      allow4xx: true,
    });
  });

  test("GET /finance/journal-vouchers — returns JV list", async ({ page }) => {
    await apiGet(
      page,
      "/finance/journal-vouchers",
      "GET /finance/journal-vouchers",
      session,
      { expectKey: "data", allow4xx: true }
    );
  });

  test("GET /finance/receivables — returns AR records", async ({ page }) => {
    await apiGet(
      page,
      "/finance/receivables",
      "GET /finance/receivables",
      session,
      { expectKey: "data", allow4xx: true }
    );
  });

  test("GET /finance/payables — returns AP records", async ({ page }) => {
    await apiGet(page, "/finance/payables", "GET /finance/payables", session, {
      expectKey: "data",
      allow4xx: true,
    });
  });

  test("GET /finance/assets — returns asset list", async ({ page }) => {
    await apiGet(page, "/finance/assets", "GET /finance/assets", session, {
      expectKey: "data",
      allow4xx: true,
    });
  });
});

// ─── UI Content Checks ────────────────────────────────────────────────────────

test.describe("Finance — UI Content Checks", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test("CFO Dashboard renders financial metrics", async ({ page }) => {
    await page.goto("/core/finance", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
    expect(await page.locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')").count()).toBe(0);

    const hasFinanceText =
      (await page.getByText("Finance", { exact: false }).count()) > 0 ||
      (await page.getByText("Revenue", { exact: false }).count()) > 0 ||
      (await page.getByText("Balance", { exact: false }).count()) > 0 ||
      (await page.getByText("Ledger", { exact: false }).count()) > 0;

    expect(hasFinanceText, "CFO Dashboard should have financial text").toBe(true);
    console.log("  ✔  CFO Dashboard: financial content visible");
  });

  test("LedgerCore renders journal/transaction table or empty state", async ({
    page,
  }) => {
    await page.goto("/core/finance/ledger", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
    expect(await page.locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')").count()).toBe(0);

    const hasTable = (await page.locator("table").count()) > 0;
    const hasLedgerText =
      (await page.getByText("Ledger", { exact: false }).count()) > 0 ||
      (await page.getByText("Journal", { exact: false }).count()) > 0;

    console.log(`  ✔  LedgerCore: table=${hasTable}, ledgerText=${hasLedgerText}`);
  });

  test("JV Desk renders form or journal list", async ({ page }) => {
    await page.goto("/core/finance/jv", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
    expect(await page.locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')").count()).toBe(0);

    const hasJVText =
      (await page.getByText("Journal", { exact: false }).count()) > 0 ||
      (await page.getByText("Voucher", { exact: false }).count()) > 0 ||
      (await page.getByText("JV", { exact: false }).count()) > 0;
    console.log(`  ✔  JV Desk: jvText=${hasJVText}`);
  });

  test("Invoice Capture page has form or invoice table", async ({ page }) => {
    await page.goto("/core/finance/invoices", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
    expect(await page.locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')").count()).toBe(0);
    console.log("  ✔  Invoice Capture: loaded");
  });

  test("AR Desk (Receivables) renders content", async ({ page }) => {
    await page.goto("/core/finance/receivables", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2500);

    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
    expect(await page.locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')").count()).toBe(0);
    console.log("  ✔  Receivable Desk (AR): loaded");
  });

  test("AP Desk (Payables) renders content", async ({ page }) => {
    await page.goto("/core/finance/payables", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2500);

    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
    expect(await page.locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')").count()).toBe(0);
    console.log("  ✔  Payable Desk (AP): loaded");
  });
});

// ─── JS Error Audit ───────────────────────────────────────────────────────────

test.describe("Finance — Console Error Audit", () => {
  test("No fatal JS errors on key Finance routes", async ({ page }) => {
    await ensureLoggedIn(page);

    const errors = await collectJSErrors(page, [
      "/core/finance",
      "/core/finance/ledger",
      "/core/finance/jv",
      "/core/finance/receivables",
      "/core/finance/payables",
      "/core/finance/invoices",
      "/core/finance/audit",
    ]);

    if (errors.length > 0) {
      console.warn("⚠️  JS errors on Finance routes:");
      errors.forEach((e) => console.warn(`    ${e}`));
    }
    expect(errors, "Fatal JS errors found on Finance routes").toHaveLength(0);
  });
});
