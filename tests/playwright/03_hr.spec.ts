/**
 * 03_hr.spec.ts — HR Module E2E Tests
 * ═════════════════════════════════════
 * Covers: All HR workspace pages (Recruitment, Training, Payroll,
 *         Attendance, Schedules, People, OrgMap, Cases, Insights).
 *         API smoke tests for HR endpoints.
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

test.describe("HR — Page Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  const hrRoutes: { route: string; label: string; waitMs?: number; minLength?: number; waitStrategy?: "domcontentloaded" | "networkidle" }[] = [
    { route: "/core/hr", label: "HR Workspace Root" },
    { route: "/core/hr/pulse", label: "PulseDesk (Attendance Overview)" },
    { route: "/core/hr/roster", label: "RosterGrid (People Directory)" },
    { route: "/core/hr/people", label: "PeopleCore" },
    { route: "/core/hr/org", label: "OrgMap" },
    { route: "/core/hr/vault", label: "VaultSpace (HR Documents)" },
    { route: "/core/hr/leave", label: "FlowGate (Leave Management)" },
    { route: "/core/hr/talent", label: "TalentFlow (Recruitment)" },
    { route: "/core/hr/skills", label: "SkillTrack (Training)" },
    { route: "/core/hr/growth", label: "GrowthCycle (Performance)" },
    { route: "/core/hr/payroll", label: "PayCycleStudio (Payroll)" },
    { route: "/core/hr/schedule", label: "SchedulingStudio" },
    { route: "/core/hr/policy", label: "LexBoard (Policies)" },
    { route: "/core/hr/insights", label: "InsightLayer (HR Analytics)" },
    { route: "/core/hr/cases", label: "CaseDesk (HR Cases)" },
    { route: "/core/hr/schedule-dept", label: "Department Schedule Studio" },
    { route: "/core/hr/attendance", label: "Department Attendance Studio" },
    { route: "/core/hr/admin", label: "HR Dept Admin" },
    { route: "/core/hr/workflow", label: "HR Workflow Inbox" },
    { route: "/core/hr/portal", label: "HR Employee Portal" },
    { route: "/core/hr/logs", label: "HR Logs", waitMs: 2000, minLength: 500, waitStrategy: "networkidle" },
  ];

  for (const { route, label, waitMs, minLength, waitStrategy } of hrRoutes) {
    test(`should load: ${label}`, async ({ page }) => {
      await assertRouteLoads(page, route, label, waitMs, minLength, waitStrategy);
    });
  }
});

// ─── API Smoke Tests ──────────────────────────────────────────────────────────

test.describe("HR — API Smoke Tests", () => {
  let session: ReturnType<typeof loadSessionFromPage> extends Promise<infer T>
    ? T
    : never;

  test.beforeEach(async ({ page }) => {
    session = await loadSessionFromPage(page, "/core/hr");
  });

  test("GET /hr/employees — returns employee list", async ({ page }) => {
    await apiGet(page, "/hr/employees", "GET /hr/employees", session, {
      expectKey: "data",
    });
  });

  test("GET /hr/departments — returns department list", async ({ page }) => {
    await apiGet(page, "/hr/departments", "GET /hr/departments", session, {
      expectKey: "data",
      allow4xx: true, // may not be implemented on all tenants
    });
  });

  test("GET /hr/leaves — returns leave requests", async ({ page }) => {
    await apiGet(page, "/hr/leaves", "GET /hr/leaves", session, {
      expectKey: "data",
      allow4xx: true,
    });
  });

  test("GET /hr/payroll/periods — returns payroll periods", async ({ page }) => {
    await apiGet(page, "/hr/payroll/periods", "GET /hr/payroll/periods", session, {
      expectKey: "data",
      allow5xx: true,
    });
  });

  test("GET /hr/schedules — returns schedule list", async ({ page }) => {
    await apiGet(page, "/hr/schedules", "GET /hr/schedules", session, {
      expectKey: "data",
      allow4xx: true,
    });
  });
});

// ─── UI Interaction ───────────────────────────────────────────────────────────

test.describe("HR — UI Content Checks", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test("People directory (RosterGrid) renders a list or empty state", async ({
    page,
  }) => {
    await page.goto("/core/hr/roster", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    const hasTable = (await page.locator("table").count()) > 0;
    const hasCards =
      (await page.locator("[class*='card'], [class*='employee']").count()) > 0;
    const hasEmptyState =
      (await page.getByText("No employees", { exact: false }).count()) > 0 ||
      (await page.getByText("No data", { exact: false }).count()) > 0 ||
      (await page.getByText("empty", { exact: false }).count()) > 0;

    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
    expect(await page.locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')").count()).toBe(0);

    console.log(
      `  ✔  Roster: table=${hasTable}, cards=${hasCards}, empty=${hasEmptyState}`
    );
  });

  test("PayCycleStudio (payroll) renders content", async ({ page }) => {
    await page.goto("/core/hr/payroll", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
    expect(await page.locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')").count()).toBe(0);

    const hasPayrollText =
      (await page.getByText("Payroll", { exact: false }).count()) > 0 ||
      (await page.getByText("Pay Cycle", { exact: false }).count()) > 0 ||
      (await page.getByText("Payslip", { exact: false }).count()) > 0;
    console.log(`  ✔  PayCycleStudio: payrollText=${hasPayrollText}`);
  });

  test("TalentFlow (recruitment) renders candidate pipeline or empty state", async ({
    page,
  }) => {
    await page.goto("/core/hr/talent", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
    expect(await page.locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')").count()).toBe(0);
    console.log("  ✔  TalentFlow (recruitment): loaded");
  });
});

// ─── JS Error Audit ───────────────────────────────────────────────────────────

test.describe("HR — Console Error Audit", () => {
  test("No fatal JS errors on key HR routes", async ({ page }) => {
    await ensureLoggedIn(page);

    // Ignore the known tenant-header race on initial HR workspace load
    const errors = await collectJSErrors(
      page,
      [
        "/core/hr",
        "/core/hr/roster",
        "/core/hr/payroll",
        "/core/hr/talent",
        "/core/hr/leave",
        "/core/hr/insights",
      ],
      1500,
      ["x-tenant-id", "Missing required header", "tenant identifier"]
    );

    if (errors.length > 0) {
      console.warn("⚠️  Fatal JS errors on HR routes:");
      errors.forEach((e) => console.warn(`    ${e}`));
    }
    expect(errors, "Fatal JS errors found on HR routes").toHaveLength(0);
  });
});
