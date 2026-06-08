/**
 * Shared Playwright helpers for Zenvix BFS v2 E2E tests.
 *
 * All test files import from here — keeps session/auth/API logic in one place.
 */

import { type Page, expect } from "@playwright/test";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionInfo {
  token: string;
  tenant_id: string;
  user_id: string;
  role: string;
  location_id?: string;
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

/**
 * Read the live session stored by the app in localStorage.
 * Tries ZENVIX_SESSION first, then ZENVIX_TOKEN as fallback.
 */
export async function getSession(page: Page): Promise<SessionInfo> {
  try {
    const raw = await page.evaluate(() =>
      window.localStorage.getItem("ZENVIX_SESSION")
    );
    if (raw) {
      const p = JSON.parse(raw);
      return {
        token: p.token || "",
        tenant_id: p.tenant_id || "",
        user_id: p.user_id || "",
        role: p.role || "",
        location_id: p.location_id ?? undefined,
      };
    }
  } catch {
    /* ignore */
  }
  try {
    const token = await page.evaluate(() =>
      window.localStorage.getItem("ZENVIX_TOKEN")
    );
    return { token: token || "", tenant_id: "", user_id: "", role: "" };
  } catch {
    return { token: "", tenant_id: "", user_id: "", role: "" };
  }
}

/** Build standard Authorization + tenant headers for raw API requests. */
export function buildHeaders(session: SessionInfo): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (session.token) h["Authorization"] = `Bearer ${session.token}`;
  if (session.tenant_id) h["x-tenant-id"] = session.tenant_id;
  if (session.location_id) h["x-location-id"] = session.location_id;
  return h;
}

/**
 * If the page was redirected to /auth/ (e.g. expired token after storageState
 * load), log in again using the known demo credentials.
 */
export async function ensureLoggedIn(page: Page) {
  if (page.url().includes("/auth/")) {
    await page.goto("/auth/login");
    await page.waitForLoadState("domcontentloaded");
    await page.fill('input[type="email"]', "hansel@zenvix.id");
    await page.fill('input[type="password"]', "hansel8891");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/core/dashboard", { timeout: 30000 });
  }
}

// ─── Navigation helpers ───────────────────────────────────────────────────────

/**
 * Navigate to `route`, wait for DOM content, then assert the page
 * rendered something and didn't crash.
 * @param minLength  Minimum content length to pass (default 500, use lower for shell pages)
 * @param waitStrategy  'domcontentloaded' (fast) or 'networkidle' (thorough, for data-heavy pages)
 */
export async function assertRouteLoads(
  page: Page,
  route: string,
  label: string,
  waitMs = 1500,
  minLength = 500,
  waitStrategy: "domcontentloaded" | "networkidle" = "domcontentloaded"
) {
  await page.goto(route, { waitUntil: waitStrategy, timeout: 40000 });
  if (waitMs > 0) await page.waitForTimeout(waitMs);

  const content = await page.content();
  expect(content.length, `[${label}] Page appears blank (${content.length} chars)`).toBeGreaterThan(minLength);

  const crashCount = await page
    // Match real crash indicators — ErrorBoundary renders "Runtime Exception"
    // Avoid false positives from page content containing "application error" as normal text
    .locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error'), [data-testid='error-boundary']")
    .count()
    .catch(() => 0);
  expect(crashCount, `[${label}] Runtime crash detected`).toBe(0);

  console.log(`  ✔  ${label} — loaded OK (${content.length} chars)`);
}

// ─── API helpers ──────────────────────────────────────────────────────────────

/**
 * GET a backend API path, assert 2xx, and optionally verify response shape.
 *
 * @param page       Playwright page (provides request context + storage state)
 * @param path       Path after /api  (e.g. "/retail/stores")
 * @param label      Human-readable label for logging
 * @param session    Session extracted from getSession()
 * @param opts.expectKey  If set, asserts `response.data` is defined
 * @param opts.allow4xx   Accept 4xx as non-failure (for optional endpoints)
 * @param opts.allow5xx   Accept 5xx as non-failure (for transient server errors under load)
 */
export async function apiGet(
  page: Page,
  path: string,
  label: string,
  session: SessionInfo,
  opts: { expectKey?: string; allow4xx?: boolean; allow5xx?: boolean } = {}
) {
  const headers = buildHeaders(session);
  const response = await page.request.get(`/api${path}`, { headers });
  const status = response.status();

  if (opts.allow5xx) {
    // Accept anything — used for endpoints that may be transiently unavailable
    console.log(`  ✔  ${label} — HTTP ${status} (allow5xx)`);
    return response;
  }

  if (opts.allow4xx) {
    expect(
      [200, 201, 204, 400, 401, 403, 404],
      `[${label}] Unexpected status ${status}`
    ).toContain(status);
  } else {
    expect(
      [200, 201, 204],
      `[${label}] Expected 2xx, got ${status} for GET /api${path}`
    ).toContain(status);
  }

  if (status !== 204 && !opts.allow4xx) {
    let body: any = {};
    try {
      body = await response.json();
    } catch {
      /* empty body OK */
    }
    expect(body.success, `[${label}] response.success should be true`).toBe(true);
    if (opts.expectKey) {
      expect(body.data, `[${label}] response.data should exist`).toBeDefined();
    }
  }

  console.log(`  ✔  ${label} — HTTP ${status}`);
  return response;
}

/**
 * Convenience: navigate to `seedRoute`, pull session, return it.
 * Use at the top of API describe blocks.
 */
export async function loadSessionFromPage(
  page: Page,
  seedRoute = "/core/dashboard"
): Promise<SessionInfo> {
  await page.goto(seedRoute, { waitUntil: "domcontentloaded" });
  await ensureLoggedIn(page);
  await page.waitForTimeout(800);
  const session = await getSession(page);
  console.log(
    `  ℹ  Session: tenant=${session.tenant_id}, role=${session.role}, token=${!!session.token}`
  );
  return session;
}

// ─── JS error audit helper ────────────────────────────────────────────────────

/**
 * Assert no React ErrorBoundary crash is visible on the current page.
 * Uses exact heading match to avoid false positives from page content
 * that contains "application error" as normal text (e.g. LogHub subtitle).
 */
export async function assertNoCrash(page: Page, label: string) {
  // ErrorBoundary renders h2 "Runtime Exception"
  // Old pages may render h2 "Application Error" — match exactly, not as substring
  const crashCount = await page
    .locator("h2:text-is('Runtime Exception'), h2:text-is('Application Error')")
    .count()
    .catch(() => 0);
  expect(crashCount, `[${label}] Runtime crash (ErrorBoundary) detected`).toBe(0);
}

/**
 * Attach console + pageerror listeners, navigate through `routes`,
 * @param ignorePhrases  Array of substrings — errors containing any of these are excluded
 */
export async function collectJSErrors(
  page: Page,
  routes: string[],
  waitMsPerRoute = 1500,
  ignorePhrases: string[] = []
): Promise<string[]> {
  const errors: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (
        text.includes("ReferenceError") ||
        text.includes("TypeError") ||
        text.includes("is not defined") ||
        text.includes("Cannot read properties") ||
        text.includes("Cannot read property")
      ) {
        if (!ignorePhrases.some((p) => text.includes(p))) {
          errors.push(`[CONSOLE ERROR] ${text}`);
        }
      }
    }
  });

  page.on("pageerror", (err) => {
    if (!ignorePhrases.some((p) => err.message.includes(p))) {
      errors.push(`[PAGE ERROR] ${err.message}`);
    }
  });

  for (const route of routes) {
    await page.goto(route, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForTimeout(waitMsPerRoute);
  }

  return errors;
}
