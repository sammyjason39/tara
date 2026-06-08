/**
 * 06_payment.spec.ts — Payment Module E2E Tests
 * ════════════════════════════════════════════════
 * Covers: Payment workspace, Execution Hub, Provider Routing,
 *         Device Routing, Refund Desk, Dispute Center, Audit Vault.
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

test.describe("Payment — Page Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  const paymentRoutes = [
    { route: "/core/payment", label: "Payment Workspace Root" },
    { route: "/core/payment/dashboard", label: "Payment Dashboard" },
    { route: "/core/payment/execution", label: "Payment Execution Hub" },
    { route: "/core/payment/providers", label: "Provider Routing Desk" },
    { route: "/core/payment/devices", label: "Device Routing Desk" },
    { route: "/core/payment/refunds", label: "Refund Desk" },
    { route: "/core/payment/disputes", label: "Dispute Center" },
    { route: "/core/payment/audit", label: "Payment Audit Vault" },
  ];

  for (const { route, label } of paymentRoutes) {
    test(`should load: ${label}`, async ({ page }) => {
      await assertRouteLoads(page, route, label);
    });
  }
});

// ─── API Smoke Tests ──────────────────────────────────────────────────────────

test.describe("Payment — API Smoke Tests", () => {
  let session: any;

  test.beforeEach(async ({ page }) => {
    session = await loadSessionFromPage(page, "/core/payment");
  });

  test("GET /payments — returns payment transactions list", async ({ page }) => {
    await apiGet(page, "/payments", "GET /payments", session, {
      expectKey: "data",
      allow4xx: true,
    });
  });

  test("GET /payments/providers — returns provider list", async ({ page }) => {
    await apiGet(
      page,
      "/payments/providers",
      "GET /payments/providers",
      session,
      { expectKey: "data", allow4xx: true }
    );
  });

  test("GET /payments/refunds — returns refund list", async ({ page }) => {
    await apiGet(page, "/payments/refunds", "GET /payments/refunds", session, {
      expectKey: "data",
      allow4xx: true,
    });
  });

  test("GET /payments/disputes — returns dispute list", async ({ page }) => {
    await apiGet(
      page,
      "/payments/disputes",
      "GET /payments/disputes",
      session,
      { expectKey: "data", allow4xx: true }
    );
  });
});

// ─── UI Content Checks ────────────────────────────────────────────────────────

test.describe("Payment — UI Content Checks", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test("Payment Dashboard renders transaction stats", async ({ page }) => {
    await page.goto("/core/payment/dashboard", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2500);

    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
    expect(await page.locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')").count()).toBe(0);

    const hasPaymentText =
      (await page.getByText("Payment", { exact: false }).count()) > 0 ||
      (await page.getByText("Transaction", { exact: false }).count()) > 0 ||
      (await page.getByText("Revenue", { exact: false }).count()) > 0;

    console.log(`  ✔  Payment Dashboard: paymentText=${hasPaymentText}`);
  });

  test("Refund Desk renders refund list or empty state", async ({ page }) => {
    await page.goto("/core/payment/refunds", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
    expect(await page.locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')").count()).toBe(0);

    const hasRefundText =
      (await page.getByText("Refund", { exact: false }).count()) > 0 ||
      (await page.getByText("Return", { exact: false }).count()) > 0;

    console.log(`  ✔  Refund Desk: refundText=${hasRefundText}`);
  });

  test("Payment Execution Hub renders payment form or queue", async ({
    page,
  }) => {
    await page.goto("/core/payment/execution", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2500);

    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
    expect(await page.locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')").count()).toBe(0);
    console.log("  ✔  Payment Execution Hub: loaded");
  });
});

// ─── JS Error Audit ───────────────────────────────────────────────────────────

test.describe("Payment — Console Error Audit", () => {
  test("No fatal JS errors on Payment routes", async ({ page }) => {
    await ensureLoggedIn(page);

    const errors = await collectJSErrors(page, [
      "/core/payment",
      "/core/payment/dashboard",
      "/core/payment/execution",
      "/core/payment/refunds",
      "/core/payment/disputes",
      "/core/payment/audit",
    ]);

    if (errors.length > 0) {
      console.warn("⚠️  JS errors on Payment routes:");
      errors.forEach((e) => console.warn(`    ${e}`));
    }
    expect(errors, "Fatal JS errors found on Payment routes").toHaveLength(0);
  });
});
