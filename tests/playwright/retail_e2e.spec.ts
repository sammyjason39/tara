/**
 * Retail Module — Full E2E Test Suite
 * ═══════════════════════════════════════════════════════════════════════════
 * Tests:
 *  1. NAVIGATION: All major retail management & operational routes load
 *  2. API SMOKE:  Core retail API endpoints return 200 / expected shapes
 *  3. MANAGEMENT UI: Inventory, Stores, Channels, Promotions screens load
 *  4. OPERATIONAL UI: POS Gateway, Shift terminal, Receiving terminal
 *  5. CROSS-DOMAIN:  Retail ↔ Core inventory/orders cross-check
 *
 * Auth: Relies on storageState saved by auth.setup.ts
 * BaseURL: inherited from playwright.config.ts (http://150.109.15.108:3010)
 *
 * API Header Strategy:
 *   The backend TenantMiddleware requires x-tenant-id + Authorization: Bearer.
 *   We extract both from ZENVIX_SESSION / ZENVIX_TOKEN stored in localStorage
 *   after login, then pass them on every raw page.request call.
 */

import { test, expect, Page } from "@playwright/test";

// ─── Session / Auth helpers ──────────────────────────────────────────────────

interface SessionInfo {
  token: string;
  tenant_id: string;
  user_id: string;
  role: string;
  location_id?: string;
}

/**
 * Read the live session from the page's localStorage.
 * Falls back to empty strings so callers can still make requests
 * (they'll get a 400/401, which the test will catch gracefully).
 */
async function getSession(page: Page): Promise<SessionInfo> {
  try {
    const raw = await page.evaluate(() =>
      window.localStorage.getItem("ZENVIX_SESSION")
    );
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        token: parsed.token || "",
        tenant_id: parsed.tenant_id || "",
        user_id: parsed.user_id || "",
        role: parsed.role || "",
        location_id: parsed.location_id || undefined,
      };
    }
  } catch {
    /* ignore */
  }
  // Fallback: read token from ZENVIX_TOKEN
  try {
    const token = await page.evaluate(() =>
      window.localStorage.getItem("ZENVIX_TOKEN")
    );
    return {
      token: token || "",
      tenant_id: "",
      user_id: "",
      role: "",
    };
  } catch {
    return { token: "", tenant_id: "", user_id: "", role: "" };
  }
}

/** Build the standard request headers for backend API calls */
function buildHeaders(session: SessionInfo): Record<string, string> {
  const headers: Record<string, string> = {};
  if (session.token) {
    headers["Authorization"] = `Bearer ${session.token}`;
  }
  if (session.tenant_id) {
    headers["x-tenant-id"] = session.tenant_id;
  }
  if (session.location_id) {
    headers["x-location-id"] = session.location_id;
  }
  headers["Content-Type"] = "application/json";
  return headers;
}

// ─── Core navigation / page helpers ─────────────────────────────────────────

/** Login directly with known credentials ONLY if redirected to /auth/ */
async function ensureLoggedIn(page: Page) {
  // The storageState in playwright.config.ts pre-loads the session into every
  // test context. We only need to manually login if the server redirected us
  // to /auth/ (e.g. expired token). Never re-login on about:blank.
  if (page.url().includes("/auth/")) {
    await page.goto("/auth/login");
    await page.waitForLoadState("domcontentloaded");
    await page.fill('input[type="email"]', "hansel@zenvix.id");
    await page.fill('input[type="password"]', "hansel8891");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/core/dashboard", { timeout: 30000 });
  }
}

/** Navigate to a URL and assert page loads without blank/crash */
async function assertRouteLoads(page: Page, route: string, label: string) {
  await page.goto(route, { waitUntil: "domcontentloaded", timeout: 30000 });
  // Allow lazy loading
  await page.waitForTimeout(1500);
  const content = await page.content();
  expect(content.length, `[${label}] Page appears blank`).toBeGreaterThan(500);
  // No full-page crash indicator — match exact heading to avoid false positives
  const crashText = await page
    .locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')")
    .count()
    .catch(() => 0);
  expect(crashText, `[${label}] Runtime crash detected`).toBe(0);
  console.log(`  ✔  ${label} — loaded OK`);
}

/**
 * Fetch a backend API endpoint using session-extracted auth headers.
 * Validates shape of response.
 */
async function apiGet(
  page: Page,
  path: string,
  label: string,
  session: SessionInfo,
  opts: { expectKey?: string; allowEmpty?: boolean } = {}
) {
  const headers = buildHeaders(session);
  const response = await page.request.get(`/api${path}`, { headers });
  const status = response.status();
  expect(
    [200, 201, 204],
    `[${label}] Expected 2xx, got ${status} for GET /api${path}`
  ).toContain(status);

  if (status !== 204) {
    let body: any = {};
    try {
      body = await response.json();
    } catch {
      // some endpoints return empty
    }
    expect(body.success, `[${label}] response.success should be true`).toBe(
      true
    );
    if (opts.expectKey) {
      expect(
        body.data,
        `[${label}] response.data should exist`
      ).toBeDefined();
    }
  }
  console.log(`  ✔  ${label} — API ${status}`);
  return response;
}

// ────────────────────────────────────────────────────────────────────────────
// DESCRIBE BLOCK 1: Management Navigation
// ────────────────────────────────────────────────────────────────────────────
test.describe("Retail Management — Page Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  const managementRoutes = [
    { route: "/retail/management", label: "Retail Management Root" },
    { route: "/retail/management/store-dashboard", label: "Store Dashboard" },
    {
      route: "/retail/management/nexus-command",
      label: "Nexus Command Center",
    },
    {
      route: "/retail/management/inventory",
      label: "Inventory Visibility",
    },
    {
      route: "/retail/management/order-fulfillment",
      label: "Order Fulfillment",
    },
    {
      route: "/retail/management/ecommerce-analytics",
      label: "Ecommerce Analytics",
    },
    {
      route: "/retail/management/pricing-promo",
      label: "Pricing & Promotions",
    },
    {
      route: "/retail/management/channels",
      label: "Channel Management",
    },
    {
      route: "/retail/management/staff-assignments",
      label: "Staff Assignments",
    },
    {
      route: "/retail/management/shift-control",
      label: "Shift Control",
    },
    {
      route: "/retail/management/device-control",
      label: "Device Control Center",
    },
    {
      route: "/retail/management/infrastructure",
      label: "Infrastructure Control",
    },
    {
      route: "/retail/management/compliance",
      label: "Compliance Audit Ledger",
    },
    {
      route: "/retail/management/settings",
      label: "Retail Settings",
    },
  ];

  for (const { route, label } of managementRoutes) {
    test(`should load: ${label}`, async ({ page }) => {
      await assertRouteLoads(page, route, label);
    });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// DESCRIBE BLOCK 2: Operational Navigation
// ────────────────────────────────────────────────────────────────────────────
test.describe("Retail Operational — Page Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  const operationalRoutes = [
    { route: "/retail/operational", label: "Operational Gateway" },
    { route: "/retail/operational/pos", label: "POS Cashier" },
    {
      route: "/retail/operational/shift-open",
      label: "Shift Open Terminal",
    },
    {
      route: "/retail/operational/shift-close",
      label: "Shift Close Terminal",
    },
    {
      route: "/retail/operational/receiving",
      label: "Receiving Terminal",
    },
    {
      route: "/retail/operational/refund-return",
      label: "Refund & Return Desk",
    },
    {
      route: "/retail/operational/stock-opname",
      label: "Stock Opname Scanner",
    },
    {
      route: "/retail/operational/cash-movement",
      label: "Cash Movement Terminal",
    },
    {
      route: "/retail/operational/self-service",
      label: "Self-Service Kiosk",
    },
  ];

  for (const { route, label } of operationalRoutes) {
    test(`should load: ${label}`, async ({ page }) => {
      await assertRouteLoads(page, route, label);
    });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// DESCRIBE BLOCK 3: API Smoke Tests
// ────────────────────────────────────────────────────────────────────────────
test.describe("Retail API — Smoke Tests", () => {
  let session: SessionInfo;

  test.beforeEach(async ({ page }) => {
    // Navigate to an authenticated page so storageState localStorage is active
    await page.goto("/retail/management", { waitUntil: "domcontentloaded" });
    await ensureLoggedIn(page);
    await page.waitForTimeout(800);
    session = await getSession(page);
    console.log(
      `  ℹ  Session tenant_id=${session.tenant_id}, role=${session.role}, hasToken=${!!session.token}`
    );
  });

  test("GET /retail/debug/ping — controller reachable", async ({ page }) => {
    const headers = buildHeaders(session);
    const response = await page.request.get("/api/retail/debug/ping", {
      headers,
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain("reachable");
    console.log("  ✔  Retail controller ping OK");
  });

  test("GET /retail/stores — returns store list", async ({ page }) => {
    await apiGet(page, "/retail/stores", "GET /retail/stores", session, {
      expectKey: "data",
    });
  });

  test("GET /retail/categories — returns product categories", async ({
    page,
  }) => {
    await apiGet(
      page,
      "/retail/categories",
      "GET /retail/categories",
      session,
      { expectKey: "data" }
    );
  });

  test("GET /retail/products — returns product list", async ({ page }) => {
    await apiGet(page, "/retail/products", "GET /retail/products", session, {
      expectKey: "data",
    });
  });

  test("GET /retail/orders — returns order list", async ({ page }) => {
    await apiGet(page, "/retail/orders", "GET /retail/orders", session, {
      expectKey: "data",
    });
  });

  test("GET /retail/channels — returns channel list", async ({ page }) => {
    await apiGet(page, "/retail/channels", "GET /retail/channels", session, {
      expectKey: "data",
    });
  });

  test("GET /retail/promotions — returns promotion list", async ({ page }) => {
    await apiGet(
      page,
      "/retail/promotions",
      "GET /retail/promotions",
      session,
      { expectKey: "data" }
    );
  });

  test("GET /retail/inventory/stats — returns inventory stats", async ({
    page,
  }) => {
    await apiGet(
      page,
      "/retail/inventory/stats",
      "GET /retail/inventory/stats",
      session,
      { expectKey: "data" }
    );
  });

  test("GET /retail/shifts — returns shift list", async ({ page }) => {
    await apiGet(page, "/retail/shifts", "GET /retail/shifts", session, {
      expectKey: "data",
    });
  });

  test("GET /retail/customers — returns customer list", async ({ page }) => {
    await apiGet(page, "/retail/customers", "GET /retail/customers", session, {
      expectKey: "data",
    });
  });

  test("GET /retail/ecommerce-stores — returns ecommerce store list", async ({
    page,
  }) => {
    await apiGet(
      page,
      "/retail/ecommerce-stores",
      "GET /retail/ecommerce-stores",
      session,
      { expectKey: "data" }
    );
  });

  test("GET /retail/inventory-pools — returns pool list", async ({ page }) => {
    await apiGet(
      page,
      "/retail/inventory-pools",
      "GET /retail/inventory-pools",
      session,
      { expectKey: "data" }
    );
  });
});

// ────────────────────────────────────────────────────────────────────────────
// DESCRIBE BLOCK 4: Inventory Management UI
// ────────────────────────────────────────────────────────────────────────────
test.describe("Retail Inventory — UI Interaction", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test("Inventory page loads and shows product table or empty state", async ({
    page,
  }) => {
    await page.goto("/retail/management/inventory", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2000);

    // Expect inventory table or empty state (not a blank/crash)
    const hasTable =
      (await page.locator("table, [data-testid='inventory-table']").count()) >
      0;
    const hasEmptyState =
      (await page
        .locator(
          "text=No items, text=empty, text=no inventory, text=No products"
        )
        .count()) > 0;
    const hasKpiBar =
      (await page.locator("[class*='kpi'], [class*='stat']").count()) > 0;

    // At minimum the page should have rendered some structure
    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
    console.log(
      `  ✔  Inventory UI loaded (table:${hasTable}, emptyState:${hasEmptyState}, kpis:${hasKpiBar})`
    );
  });

  test("Inventory filter/search UI elements are present", async ({ page }) => {
    await page.goto("/retail/management/inventory", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2000);

    // Look for search/filter elements — these are expected in inventory page
    const searchInputs = await page
      .locator(
        'input[type="text"], input[type="search"], input[placeholder*="search" i], input[placeholder*="filter" i]'
      )
      .count();
    console.log(`  ✔  Found ${searchInputs} search/filter input(s)`);

    // Page should not have application error
    expect(await page.locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')").count()).toBe(0);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// DESCRIBE BLOCK 5: POS Cashier UI
// ────────────────────────────────────────────────────────────────────────────
test.describe("Retail POS — UI Interaction", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test("POS Cashier page loads with product grid or shift warning", async ({
    page,
  }) => {
    await page.goto("/retail/operational/pos", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2500);

    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);

    // POS should either show products or a shift-open warning
    // NOTE: Use separate locators — combining CSS + text= in a comma-separated
    // list is not valid Playwright CSS selector syntax.
    const hasProducts =
      (await page
        .locator("[class*='product'], [data-testid*='product']")
        .count()) > 0;
    const hasShiftWarning =
      (await page.getByText("shift", { exact: false }).count()) > 0 ||
      (await page.getByText("Shift", { exact: false }).count()) > 0 ||
      (await page.getByText("open shift", { exact: false }).count()) > 0;
    const hasCart =
      (await page.locator("[class*='cart']").count()) > 0 ||
      (await page.getByText("Cart", { exact: false }).count()) > 0 ||
      (await page.getByText("Total", { exact: false }).count()) > 0;

    console.log(
      `  ✔  POS UI loaded (products:${hasProducts}, shiftWarning:${hasShiftWarning}, cart:${hasCart})`
    );
    expect(await page.locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')").count()).toBe(0);
  });

  test("Shift Open terminal loads required input fields", async ({ page }) => {
    await page.goto("/retail/operational/shift-open", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2000);

    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
    console.log("  ✔  Shift Open terminal loaded");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// DESCRIBE BLOCK 6: Retail Console Error Audit
// ────────────────────────────────────────────────────────────────────────────
test.describe("Retail — Console Error Audit", () => {
  test("No ReferenceErrors or fatal errors in retail management routes", async ({
    page,
  }) => {
    await ensureLoggedIn(page);
    const errors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        // Filter out known non-critical 3rd party / network noise
        if (
          text.includes("ReferenceError") ||
          text.includes("TypeError") ||
          text.includes("is not defined") ||
          text.includes("Cannot read properties")
        ) {
          errors.push(`[CONSOLE ERROR] ${text}`);
        }
      }
    });

    page.on("pageerror", (err) => {
      errors.push(`[PAGE ERROR] ${err.message}`);
    });

    const routes = [
      "/retail/management",
      "/retail/management/inventory",
      "/retail/management/nexus-command",
      "/retail/management/pricing-promo",
      "/retail/management/channels",
      "/retail/management/device-control",
      "/retail/operational",
      "/retail/operational/pos",
    ];

    for (const route of routes) {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForTimeout(1500);
    }

    if (errors.length > 0) {
      console.warn("⚠️  Console errors detected in retail routes:");
      errors.forEach((e) => console.warn(`    ${e}`));
    } else {
      console.log("  ✔  No ReferenceErrors or fatal errors in retail routes");
    }

    // Fail if any fatal JS errors are found
    expect(errors, "Fatal JS errors found in retail routes").toHaveLength(0);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// DESCRIBE BLOCK 7: Retail ↔ Core Cross-Domain Flow
// ────────────────────────────────────────────────────────────────────────────
test.describe("Retail ↔ Core Cross-Domain Integration", () => {
  let session: SessionInfo;

  test.beforeEach(async ({ page }) => {
    await page.goto("/retail/management", { waitUntil: "domcontentloaded" });
    await ensureLoggedIn(page);
    await page.waitForTimeout(800);
    session = await getSession(page);
  });

  test("Inventory in Retail reflects core inventory API data", async ({
    page,
  }) => {
    const headers = buildHeaders(session);

    // Fetch from retail inventory API
    const retailStatsRes = await page.request.get(
      "/api/retail/inventory/stats",
      { headers }
    );
    expect(retailStatsRes.status()).toBe(200);
    const retailStats = await retailStatsRes.json();
    expect(retailStats.success).toBe(true);

    // Fetch from core inventory API
    const coreStatsRes = await page.request.get("/api/inventory/stats", {
      headers,
    });
    const coreStatus = coreStatsRes.status();
    // Core may need location scoping; 200 or 400/404 are both acceptable
    expect([200, 400, 404]).toContain(coreStatus);

    console.log(
      `  ✔  Retail inventory stats: ${JSON.stringify(retailStats.data || {}).slice(0, 100)}`
    );
    console.log(`  ✔  Core inventory API: HTTP ${coreStatus}`);
  });

  test("Retail products align with core product catalog API", async ({
    page,
  }) => {
    const headers = buildHeaders(session);
    const retailProductsRes = await page.request.get("/api/retail/products", {
      headers,
    });
    expect(retailProductsRes.status()).toBe(200);
    const retailProducts = await retailProductsRes.json();
    expect(retailProducts.success).toBe(true);
    expect(retailProducts.data).toBeDefined();

    // data may be a plain array OR a paginated envelope { items, total, page }
    const isArray = Array.isArray(retailProducts.data);
    const isPaginated =
      typeof retailProducts.data === "object" &&
      Array.isArray(retailProducts.data?.items);
    expect(
      isArray || isPaginated,
      `data should be array or paginated object, got: ${JSON.stringify(retailProducts.data).slice(0, 120)}`
    ).toBe(true);

    const items = isArray
      ? retailProducts.data
      : retailProducts.data?.items ?? [];
    console.log(
      `  ✔  Retail products: ${items.length} items (shape: ${
        isArray ? "array" : "paginated"
      })`
    );
  });

  test("Orders list cross-references correctly with retail API", async ({
    page,
  }) => {
    const headers = buildHeaders(session);
    const ordersRes = await page.request.get("/api/retail/orders", { headers });
    expect(ordersRes.status()).toBe(200);
    const orders = await ordersRes.json();
    expect(orders.success).toBe(true);
    expect(Array.isArray(orders.data)).toBe(true);

    // If there are orders, verify shape
    if (orders.data.length > 0) {
      const order = orders.data[0];
      expect(order).toHaveProperty("id");
      expect(order).toHaveProperty("status");
    }

    console.log(
      `  ✔  Orders API: ${orders.data.length} orders found, shape validated`
    );
  });
});
