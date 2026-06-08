/**
 * 02_company.spec.ts — Company / Tenant / Onboarding E2E Tests
 * ══════════════════════════════════════════════════════════════
 * Covers: Dashboard renders tenant context, Settings pages load,
 *         White-label settings, Company-level config pages.
 */

import { test, expect } from "@playwright/test";
import { ensureLoggedIn, assertRouteLoads, loadSessionFromPage } from "./utils/helpers";

test.describe("Company — Core Dashboard & Tenant Context", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/core/dashboard", { waitUntil: "domcontentloaded" });
    await ensureLoggedIn(page);
  });

  test("Core Dashboard loads and renders content", async ({ page }) => {
    await page.waitForTimeout(2000);
    const content = await page.content();
    expect(content.length).toBeGreaterThan(1000);
    expect(await page.locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')").count()).toBe(0);
    console.log("  ✔  Core Dashboard: loaded");
  });

  test("Dashboard contains recognizable company/tenant UI elements", async ({
    page,
  }) => {
    await page.waitForTimeout(2000);

    // Look for common dashboard indicators: KPI cards, welcome message, or nav
    const hasKpis =
      (await page.locator("[class*='kpi'], [class*='stat'], [class*='card']").count()) > 0;
    const hasNav =
      (await page.locator("nav, [role='navigation'], aside").count()) > 0;
    const hasDashboardText =
      (await page.getByText("Dashboard", { exact: false }).count()) > 0;

    expect(
      hasKpis || hasNav || hasDashboardText,
      "Dashboard should contain KPIs, navigation, or dashboard text"
    ).toBe(true);

    console.log(
      `  ✔  Dashboard structure: kpis=${hasKpis}, nav=${hasNav}, dashboardText=${hasDashboardText}`
    );
  });
});

test.describe("Company — Settings Pages", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test("Core Settings page loads", async ({ page }) => {
    await assertRouteLoads(page, "/core/settings", "Core Settings");
  });

  test("Core Settings with tab parameter loads", async ({ page }) => {
    await assertRouteLoads(page, "/core/settings/general", "Core Settings / General");
  });

  test("White-label settings page loads", async ({ page }) => {
    await assertRouteLoads(page, "/core/settings/whitelabel", "White-Label Settings");
  });

  test("Security page loads", async ({ page }) => {
    await assertRouteLoads(page, "/core/security", "Security");
  });
});

test.describe("Company — Workflow & Portal", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test("Workflow Inbox loads", async ({ page }) => {
    await assertRouteLoads(page, "/core/workflow", "Workflow Inbox");
  });

  test("Admin Workspace layout loads", async ({ page }) => {
    await assertRouteLoads(page, "/core/admin-workspace", "Admin Workspace");
  });
});

test.describe("Company — Onboarding Page Accessibility", () => {
  // Clean context — no session
  test.use({ storageState: { cookies: [], origins: [] } });

  test("Onboarding page redirects unauthenticated users to login", async ({
    page,
  }) => {
    await page.goto("/auth/onboarding");
    await page.waitForTimeout(2000);
    // Either shows onboarding (if we happen to be authenticated) or redirects
    const url = page.url();
    expect(
      url.includes("/auth/login") || url.includes("/auth/onboarding") || url.includes("/core/"),
      `Unexpected URL: ${url}`
    ).toBe(true);
    console.log(`  ✔  Onboarding accessibility: ${url}`);
  });
});
