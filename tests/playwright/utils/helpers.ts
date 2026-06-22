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

// ─── Route-render & console/network capture harness ────────────────────────────

/**
 * Console-error text fragments that signal a real runtime fault (vs. benign
 * application-level `console.error` logging). A console error fails a Page only
 * when its text contains one of these signatures. See design.md → "Console-error
 * / network-error capture strategy".
 */
export const RUNTIME_ERROR_SIGNATURES: readonly string[] = [
  "ReferenceError",
  "TypeError",
  "is not defined",
  "Cannot read properties",
  "Cannot read property",
];

/**
 * Explicitly maintained allowlist of known-benign third-party / browser noise.
 * Any captured pageerror or console error whose text contains one of these
 * phrases is excluded from the failure set. Keep this list small and justified —
 * every entry suppresses a real signal, so document why each one is safe.
 */
export const DEFAULT_IGNORE_PHRASES: readonly string[] = [
  // Benign layout-thrash warning emitted by the ResizeObserver polyfill / browser;
  // never indicates an application fault.
  "ResizeObserver loop limit exceeded",
  "ResizeObserver loop completed with undelivered notifications",
];

/**
 * DOM selector for the React error-boundary crash surface. Boundaries expose
 * `data-testid="error-boundary"`; the legacy ErrorBoundary renders an
 * `h2` with the exact text "Runtime Exception".
 */
export const ERROR_BOUNDARY_SELECTOR =
  "[data-testid='error-boundary'], h2:text-is('Runtime Exception')";

/** A single backend response observed while a Page loaded. */
export interface NetworkRecord {
  url: string;
  method: string;
  status: number;
  /** true for 2xx/3xx; false otherwise */
  ok: boolean;
}

export interface PageCaptureOptions {
  /** Substrings — captured errors containing any of these are excluded. */
  ignorePhrases?: readonly string[];
  /**
   * URL substrings whose 5xx responses are tolerated (an endpoint explicitly
   * allowed to be transiently unavailable). A 5xx on any other backend request
   * is treated as unexpected and fails the Page.
   */
  allow5xxFor?: readonly string[];
  /**
   * URL substrings that identify a backend data request. Only responses whose
   * URL contains one of these markers are evaluated for unexpected 5xx.
   * Defaults to `["/api"]`.
   */
  apiPathMarkers?: readonly string[];
}

/**
 * Live capture of everything that determines whether a Page rendered cleanly.
 * Obtain one via {@link installPageCapture} BEFORE navigating, then evaluate it
 * with {@link assertPageHealthy} / {@link evaluatePageHealth} after the Page settles.
 */
export interface PageCapture {
  /** Uncaught exceptions surfaced via `page.on("pageerror")`. */
  readonly pageErrors: string[];
  /** Console errors matching a runtime-error signature (after ignore filtering). */
  readonly consoleErrors: string[];
  /** Every backend response observed (filtered to `apiPathMarkers`). */
  readonly responses: NetworkRecord[];
  /** Network requests that failed at the transport layer (recorded, not asserted). */
  readonly requestFailures: string[];
  /** Backend 5xx responses that are not covered by the `allow5xxFor` allowlist. */
  unexpectedServerErrors(): NetworkRecord[];
  /** Remove all installed listeners. */
  dispose(): void;
}

function isIgnored(text: string, ignorePhrases: readonly string[]): boolean {
  return ignorePhrases.some((p) => text.includes(p));
}

function matchesRuntimeSignature(text: string): boolean {
  return RUNTIME_ERROR_SIGNATURES.some((sig) => text.includes(sig));
}

/**
 * Install `pageerror`, `console`, `response`, and `requestfailed` listeners on
 * `page`. MUST be called BEFORE navigation so no early errors or requests are
 * missed. Returns a live {@link PageCapture} that accumulates as the Page loads.
 */
export function installPageCapture(
  page: Page,
  options: PageCaptureOptions = {}
): PageCapture {
  const ignorePhrases = options.ignorePhrases ?? DEFAULT_IGNORE_PHRASES;
  const allow5xxFor = options.allow5xxFor ?? [];
  const apiPathMarkers = options.apiPathMarkers ?? ["/api"];

  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const responses: NetworkRecord[] = [];
  const requestFailures: string[] = [];

  const onConsole = (msg: import("@playwright/test").ConsoleMessage) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (matchesRuntimeSignature(text) && !isIgnored(text, ignorePhrases)) {
      consoleErrors.push(`[CONSOLE ERROR] ${text}`);
    }
  };

  const onPageError = (err: Error) => {
    if (!isIgnored(err.message, ignorePhrases)) {
      pageErrors.push(`[PAGE ERROR] ${err.message}`);
    }
  };

  const onResponse = (response: import("@playwright/test").Response) => {
    const url = response.url();
    if (!apiPathMarkers.some((m) => url.includes(m))) return;
    const status = response.status();
    responses.push({
      url,
      method: response.request().method(),
      status,
      ok: status >= 200 && status < 400,
    });
  };

  const onRequestFailed = (request: import("@playwright/test").Request) => {
    const url = request.url();
    if (!apiPathMarkers.some((m) => url.includes(m))) return;
    const failure = request.failure();
    requestFailures.push(
      `[REQUEST FAILED] ${request.method()} ${url} — ${failure?.errorText ?? "unknown"}`
    );
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("response", onResponse);
  page.on("requestfailed", onRequestFailed);

  return {
    pageErrors,
    consoleErrors,
    responses,
    requestFailures,
    unexpectedServerErrors() {
      return responses.filter(
        (r) => r.status >= 500 && !allow5xxFor.some((a) => r.url.includes(a))
      );
    },
    dispose() {
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
      page.off("response", onResponse);
      page.off("requestfailed", onRequestFailed);
    },
  };
}

export interface PageHealthResult {
  ok: boolean;
  /** Human-readable failure reasons; empty when the Page passed. */
  failures: string[];
}

/**
 * Compute (without asserting) whether the currently-loaded Page is healthy.
 * A Page is healthy ONLY when ALL of the following hold:
 *   - no `pageerror` (uncaught exception),
 *   - no console error matching a runtime-error signature,
 *   - no unexpected 5xx on a backend data request,
 *   - no error-boundary crash surface present in the DOM.
 */
export async function evaluatePageHealth(
  page: Page,
  capture: PageCapture,
  label: string
): Promise<PageHealthResult> {
  const failures: string[] = [];

  for (const e of capture.pageErrors) failures.push(`[${label}] ${e}`);
  for (const e of capture.consoleErrors) failures.push(`[${label}] ${e}`);

  for (const r of capture.unexpectedServerErrors()) {
    failures.push(
      `[${label}] [HTTP ${r.status}] unexpected server error on ${r.method} ${r.url}`
    );
  }

  const boundaryCount = await page
    .locator(ERROR_BOUNDARY_SELECTOR)
    .count()
    .catch(() => 0);
  if (boundaryCount > 0) {
    failures.push(`[${label}] error-boundary crash surface present in DOM`);
  }

  return { ok: failures.length === 0, failures };
}

/**
 * Assert the currently-loaded Page is healthy per {@link evaluatePageHealth}.
 * Fails with every collected reason when the Page is not healthy.
 */
export async function assertPageHealthy(
  page: Page,
  capture: PageCapture,
  label: string
): Promise<void> {
  const { ok, failures } = await evaluatePageHealth(page, capture, label);
  expect(
    ok,
    `[${label}] Page did not render cleanly:\n  ${failures.join("\n  ")}`
  ).toBe(true);
}

/**
 * End-to-end per-route harness: install the capture, navigate to `route`, let
 * the Page settle, and assert it rendered cleanly. Use this from the parameterized
 * route-render totality suite. Returns the capture for optional further inspection.
 */
export async function assertRouteRenders(
  page: Page,
  route: string,
  label: string,
  options: PageCaptureOptions & {
    waitMs?: number;
    waitStrategy?: "domcontentloaded" | "networkidle";
  } = {}
): Promise<PageCapture> {
  const { waitMs = 1500, waitStrategy = "domcontentloaded", ...captureOpts } = options;
  const capture = installPageCapture(page, captureOpts);
  try {
    await page.goto(route, { waitUntil: waitStrategy, timeout: 40000 });
    if (waitMs > 0) await page.waitForTimeout(waitMs);
    await assertPageHealthy(page, capture, label);
    return capture;
  } finally {
    capture.dispose();
  }
}

/**
 * Attach console + pageerror listeners (plus response/requestfailed recording),
 * navigate through `routes`, and return the collected JS error strings.
 *
 * Backward-compatible: returns only pageerror + matching console-error entries,
 * exactly as before. For the full pass criteria (including unexpected 5xx and the
 * error-boundary DOM surface) use {@link assertRouteRenders} / {@link assertPageHealthy}.
 *
 * @param ignorePhrases  Array of substrings — errors containing any of these are excluded
 */
export async function collectJSErrors(
  page: Page,
  routes: string[],
  waitMsPerRoute = 1500,
  ignorePhrases: string[] = []
): Promise<string[]> {
  const capture = installPageCapture(page, { ignorePhrases });
  try {
    for (const route of routes) {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 25000 });
      await page.waitForTimeout(waitMsPerRoute);
    }
    return [...capture.pageErrors, ...capture.consoleErrors];
  } finally {
    capture.dispose();
  }
}
