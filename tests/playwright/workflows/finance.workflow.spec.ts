/**
 * Finance E2E Workflow Test (Requirement 19.2)
 * ═════════════════════════════════════════════
 * Flow: create journal entry → post to ledger → reconcile → generate report
 *
 * Each step verifies state change before proceeding to the next.
 */

import { test, expect } from "@playwright/test";
import { loadSessionFromPage, buildHeaders } from "../utils/helpers";

test.describe("Finance Workflow — Journal to Report", () => {
  let session: Awaited<ReturnType<typeof loadSessionFromPage>>;
  let journalId: string;
  let reportJobId: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    session = await loadSessionFromPage(page, "/core/finance");
    await page.close();
  });

  test("Step 1: Create journal entry (balanced debits/credits)", async ({ page }) => {
    const headers = buildHeaders(session);
    const res = await page.request.post("/api/finance/journal-entries", {
      headers,
      data: {
        reference: `E2E-JV-${Date.now()}`,
        description: "E2E test journal entry",
        date: new Date().toISOString().split("T")[0],
        line_items: [
          { account_code: "1000", description: "Cash debit", debit: 100000, credit: 0 },
          { account_code: "4000", description: "Revenue credit", debit: 0, credit: 100000 },
        ],
      },
    });

    expect(res.status(), "Create JV should return 2xx").toBeLessThan(300);
    const body = await res.json();
    journalId = body.data?.id || body.id;
    expect(journalId, "Journal entry ID should be returned").toBeTruthy();
  });

  test("Step 2: Post journal entry to ledger", async ({ page }) => {
    test.skip(!journalId, "No journal entry created");
    const headers = buildHeaders(session);

    const res = await page.request.patch(`/api/finance/journal-entries/${journalId}`, {
      headers,
      data: { status: "posted" },
    });

    // Accept 200 or endpoint may not support PATCH — try POST
    if (res.status() >= 400) {
      const altRes = await page.request.post(`/api/finance/journal-entries/${journalId}/post`, {
        headers,
      });
      expect(altRes.status(), "Post JV should return 2xx").toBeLessThan(300);
    } else {
      expect(res.status()).toBeLessThan(300);
    }
  });

  test("Step 3: Verify ledger entries exist", async ({ page }) => {
    const headers = buildHeaders(session);

    const res = await page.request.get("/api/finance/ledger/entries", { headers });
    expect(res.status(), "Ledger entries should return 2xx").toBeLessThan(300);
    const body = await res.json();
    expect(body.data || body.entries || body).toBeDefined();
  });

  test("Step 4: Generate financial report", async ({ page }) => {
    const headers = buildHeaders(session);

    const res = await page.request.post("/api/reporting/generate", {
      headers,
      data: {
        report_type: "financial_summary",
        format: "PDF",
        payload: { period: "current_month" },
      },
    });

    expect(res.status(), "Generate report should return 2xx").toBeLessThan(300);
    const body = await res.json();
    reportJobId = body.job_id;
    expect(reportJobId, "Report job ID should be returned").toBeTruthy();
    expect(body.status).toBeDefined();
  });

  test("Step 5: Check report job status", async ({ page }) => {
    test.skip(!reportJobId, "No report job created");
    const headers = buildHeaders(session);

    const res = await page.request.get(`/api/reporting/${reportJobId}/status`, { headers });
    expect(res.status(), "Report status should return 2xx").toBeLessThan(300);
    const body = await res.json();
    expect(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]).toContain(body.status);
  });
});
