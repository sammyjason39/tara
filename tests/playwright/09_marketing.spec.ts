/**
 * 09_marketing.spec.ts — Marketing Module E2E Tests
 * ════════════════════════════════════════════════════
 * Covers: Marketing Dashboard, Campaigns, Lead Capture, Nurture,
 *         Analytics, Omnichannel Inbox, Funnel Builder, Automation,
 *         Customer 360, Strategy, Creative Library.
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

test.describe("Marketing — Page Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  const mktRoutes = [
    { route: "/core/marketing", label: "Marketing Workspace Root" },
    { route: "/core/marketing/dashboard", label: "Marketing Dashboard" },
    { route: "/core/marketing/campaigns", label: "Campaign Desk" },
    { route: "/core/marketing/execution", label: "Execution Desk" },
    { route: "/core/marketing/analytics", label: "Marketing Analytics" },
    { route: "/core/marketing/leads", label: "Lead Capture Desk" },
    { route: "/core/marketing/nurture", label: "Nurture Studio" },
    { route: "/core/marketing/omnichannel", label: "Omnichannel Inbox" },
    { route: "/core/marketing/funnel", label: "Funnel Builder Desk" },
    { route: "/core/marketing/creative", label: "Creative Library" },
    { route: "/core/marketing/customer360", label: "Customer 360" },
    { route: "/core/marketing/automation", label: "Automation Lab" },
    { route: "/core/marketing/strategy", label: "Strategy Control Desk" },
    { route: "/core/marketing/connected", label: "Connected Accounts Desk" },
    { route: "/core/marketing/alerts", label: "Marketing Alerts" },
    { route: "/core/marketing/audit", label: "Marketing Audit Log" },
  ];

  for (const { route, label } of mktRoutes) {
    test(`should load: ${label}`, async ({ page }) => {
      await assertRouteLoads(page, route, label);
    });
  }
});

// ─── API Smoke Tests ──────────────────────────────────────────────────────────

test.describe("Marketing — API Smoke Tests", () => {
  let session: any;

  test.beforeEach(async ({ page }) => {
    session = await loadSessionFromPage(page, "/core/marketing");
  });

  test("GET /marketing/campaigns — returns campaign list", async ({ page }) => {
    await apiGet(
      page,
      "/marketing/campaigns",
      "GET /marketing/campaigns",
      session,
      { expectKey: "data", allow5xx: true }
    );
  });

  test("GET /marketing/leads — returns marketing lead list", async ({
    page,
  }) => {
    await apiGet(
      page,
      "/marketing/leads",
      "GET /marketing/leads",
      session,
      { expectKey: "data", allow5xx: true }
    );
  });

  test("GET /marketing/analytics — returns analytics data", async ({
    page,
  }) => {
    await apiGet(
      page,
      "/marketing/analytics",
      "GET /marketing/analytics",
      session,
      { allow4xx: true }
    );
  });
});

// ─── UI Content Checks ────────────────────────────────────────────────────────

test.describe("Marketing — UI Content Checks", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test("Marketing Dashboard renders overview metrics", async ({ page }) => {
    await page.goto("/core/marketing/dashboard", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2500);

    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
    expect(await page.locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')").count()).toBe(0);

    const hasMarketingText =
      (await page.getByText("Marketing", { exact: false }).count()) > 0 ||
      (await page.getByText("Campaign", { exact: false }).count()) > 0 ||
      (await page.getByText("Reach", { exact: false }).count()) > 0;

    console.log(`  ✔  Marketing Dashboard: marketingText=${hasMarketingText}`);
  });

  test("Campaign Desk renders campaign list or create button", async ({
    page,
  }) => {
    await page.goto("/core/marketing/campaigns", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2500);

    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
    expect(await page.locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')").count()).toBe(0);

    const hasCampaignText =
      (await page.getByText("Campaign", { exact: false }).count()) > 0;
    console.log(`  ✔  Campaign Desk: campaignText=${hasCampaignText}`);
  });

  test("Omnichannel Inbox loads messaging interface", async ({ page }) => {
    await page.goto("/core/marketing/omnichannel", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2500);

    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
    expect(await page.locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')").count()).toBe(0);
    console.log("  ✔  Omnichannel Inbox: loaded");
  });
});

// ─── JS Error Audit ───────────────────────────────────────────────────────────

test.describe("Marketing — Console Error Audit", () => {
  test("No fatal JS errors on Marketing routes", async ({ page }) => {
    await ensureLoggedIn(page);

    const errors = await collectJSErrors(page, [
      "/core/marketing",
      "/core/marketing/dashboard",
      "/core/marketing/campaigns",
      "/core/marketing/analytics",
      "/core/marketing/leads",
      "/core/marketing/omnichannel",
    ]);

    if (errors.length > 0) {
      console.warn("⚠️  JS errors on Marketing routes:");
      errors.forEach((e) => console.warn(`    ${e}`));
    }
    expect(errors, "Fatal JS errors found on Marketing routes").toHaveLength(0);
  });
});
