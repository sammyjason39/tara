# Bugfix Requirements Document

## Introduction

This document captures the confirmed bugs and stabilization requirements for **Zenvix Business Flow Suite v2** — a production-bound, AI-native ERP system running on a VPS in `DB_PERSISTENCE` mode (PostgreSQL). The scope covers the **Core modules** (HR, Finance, Inventory, Procurement, Sales, Marketing, IT, Chat/Comms, Bulletins, Mail, Settings, Tools, Dashboard, Logs, Audit, License, Security/Auth) and the **Retail module** (POS, Kiosk, Opname, Shift Management, Pricing, Channel Sync, Retail Dashboard, Receiving, Shift Close/Reconciliation).

Eleven confirmed bugs have been identified from production VPS logs (`vps_backend_logs_v5.txt`), build error output (`build_error.txt`), and Finance audit files. They are grouped by severity: **CRITICAL** (production failures), **HIGH** (data integrity), and **MEDIUM** (operational/build quality).

**Stack:** React + Vite (frontend), NestJS + TypeScript (backend), PostgreSQL + Prisma ORM. Multi-tenant (`x-tenant-id` header), Repository Pattern, Event-Driven (EventBus), RFC 7807 errors.

---

## Bug Analysis

### Current Behavior (Defect)

**[BUG-1 — CRITICAL] Inventory Stock Transfer Receive**
Root cause: `transferIn()` checks `in_transit >= quantity` at `transitLocation.id`, but `shipTransfer()` increments `in_transit` at `transfer.to_location_id` (the destination). The SQL predicate finds zero rows and throws.

1.1 WHEN a stock transfer is in `SHIPPED` or `IN_TRANSIT` status AND `PUT /inventory/stock-transfers/:id/receive` is called THEN the system throws `SYSTEM_CRITICAL_FAILURE` with "Insufficient in-transit stock at destination {destination_location_id} for receipt"

1.2 WHEN `receiveTransfer()` calls `transferIn(ctx, item_id, transitLocation.id, transfer.to_location_id, ...)` THEN the system executes `UPDATE stock_levels … WHERE location_id = transitLocation.id AND in_transit >= quantity` which matches zero rows because `in_transit` was incremented at `to_location_id`, not at `transitLocation.id`

1.3 WHEN the zero-row update is detected inside the Prisma transaction THEN the system throws an unhandled error, rolls back the entire receive operation, and leaves the transfer permanently in `SHIPPED` status

**[BUG-2 — CRITICAL] Frontend Build Failure: Explorer.tsx JSX Tag Mismatch**
Root cause: A `</div>` closing tag at line 1391 of `Explorer.tsx` does not match the opening `<DepartmentWorkspaceLayout>` tag at line 524, causing esbuild to fail with two parse errors and producing no output bundle.

1.4 WHEN `vite build` is executed THEN the system fails with `[vite:esbuild] Transform failed with 2 errors` and exits with a non-zero code, producing no output bundle

1.5 WHEN esbuild processes `Explorer.tsx` at line 1391 THEN the system reports `ERROR: Unexpected closing "div" tag does not match opening "DepartmentWorkspaceLayout" tag`

1.6 WHEN esbuild processes `Explorer.tsx` at line 1392 THEN the system reports `ERROR: Expected ")" but found "open"` because `<Dialog open={...}>` is parsed in an invalid context after the mismatched close tag

**[BUG-3 — HIGH] Finance: Subledger-to-Ledger Desync**
Root cause: `issueInvoice()` atomically commits invoice status to `ISSUED` and enqueues a ledger posting. If the background `processEvent()` worker subsequently fails (missing rule, locked period), the invoice stays `ISSUED` with no `JournalEntry`, creating a permanent desync with no automated detection.

1.7 WHEN `issueInvoice()` commits (status = `ISSUED`, subledger = `VALIDATED`, posting = `PENDING`) AND the background `processEvent()` worker subsequently fails THEN the system leaves the invoice in `ISSUED` status with no corresponding `JournalEntry`, creating a subledger-to-ledger desync

1.8 WHEN a subledger entry is in `VALIDATED` status with no linked `JournalEntry` THEN the system has no automated reconciliation or alerting mechanism to detect or remediate the orphaned entry

**[BUG-4 — HIGH] Finance: Double-Reversal of Journal Entries**
Root cause: Under concurrent requests, two reversal calls for the same journal can both pass the `status === REVERSED` check before either transaction commits, resulting in two reversal journals for the same original.

1.9 WHEN two concurrent requests call `reverseJournal()` for the same `journalId` simultaneously THEN the system may allow both to pass the `status === REVERSED` guard before either transaction commits, resulting in two reversal journals being created for the same original journal

**[BUG-5 — HIGH] Finance: Fiscal Period Hard-Lock Bypass for Draft Journals**
Root cause: `validateTransition()` blocks the transition if drafts exist, but there is no eviction policy for `DRAFT` journals created after a period enters `SOFT_LOCK` or `CLOSING` state via a race condition.

1.10 WHEN a fiscal period transitions to `HARD_LOCK` status AND `DRAFT` journals exist in that period (created via race condition) THEN the system leaves those `DRAFT` journals as orphaned records with no automated eviction, voiding, or escalation

1.11 WHEN a `DRAFT` journal exists in a `HARD_LOCK` period THEN the system has no mechanism to prevent it from being posted, potentially writing entries into a locked period if the posting worker does not re-validate the period status

**[BUG-6 — HIGH] Finance: Ledger Hash Chain Contaminated by MOCK-HASH**
Root cause: Prior to the `HashingService` fix, `LedgerPostingService` wrote `'MOCK-HASH'` as `entryHash` and `previousHash` for all journal entries. Existing DB records with `'MOCK-HASH'` break the cryptographic chain for all subsequent entries.

1.12 WHEN `JournalEntry` records exist in the database with `entryHash = 'MOCK-HASH'` or `previousHash = 'MOCK-HASH'` THEN the system has a broken cryptographic hash chain, making the "Trustless Ledger" integrity verification non-functional for all entries after the first mock entry

1.13 WHEN `LedgerIntegrityService` attempts to verify the hash chain THEN the system cannot validate entries that reference a `'MOCK-HASH'` predecessor, producing false integrity failures or silently skipping verification

**[BUG-7 — HIGH] Finance: Journal Balance Tolerance Too Loose**
Root cause: `JournalValidationService` previously used `BALANCE_TOLERANCE = 0.001` instead of `0`, allowing fractional monetary imbalances to pass validation. Current code shows `0` but must be verified and protected from regression.

1.14 WHEN `JournalValidationService.check()` is called with a journal where `|totalDebit - totalCredit| > 0` but `<= 0.001` THEN the system previously accepted the unbalanced journal as valid, allowing fractional monetary discrepancies to accumulate in the ledger

**[BUG-8 — MEDIUM] Inventory: Wildcard Route Deprecation Warning**
Root cause: `@Get("images/*")` in `InventoryController` uses deprecated path-to-regexp wildcard syntax, causing a startup `WARN` and risking silent breakage in future NestJS/path-to-regexp versions.

1.15 WHEN the NestJS application starts THEN the system emits a `WARN` log for the route `GET /inventory/images/*` indicating deprecated path-to-regexp wildcard syntax

**[BUG-9 — MEDIUM] Frontend: Bundle Size Exceeds Threshold**
Root cause: No code-splitting or lazy loading is implemented. The entire application is bundled into a single ~5,697 kB JS chunk, far exceeding Vite's 500 kB warning threshold.

1.16 WHEN `vite build` completes THEN the system produces a single main JS chunk of ~5,697 kB (gzip: ~1,349 kB), triggering Vite's chunk size warning and causing slow initial load times in production

1.17 WHEN a user navigates to any page THEN the system forces the browser to download and parse the entire ~5.7 MB bundle before rendering, regardless of which module the user is accessing

**[BUG-10 — MEDIUM] Retail: Shift Lifecycle Guard Not Enforced at Backend**
Root cause: The shift guard is enforced in the frontend router but not verified at the backend API layer. Direct API calls to POS endpoints can bypass the shift lifecycle hard lock.

1.18 WHEN a POS transaction request is submitted to the backend WITHOUT an active open shift for the given `tenant_id + store_id` THEN the system may process the transaction without validating shift state, bypassing the shift lifecycle hard lock at the API layer

**[BUG-11 — MEDIUM] Retail: Offline Payment Matrix Not Enforced at Backend**
Root cause: The offline payment matrix (Card/QRIS/E-Wallet blocked offline) is enforced in the frontend UI but not at the backend payment processing layer, allowing direct API calls to bypass the restriction.

1.19 WHEN a payment request is submitted with `payment_type` in `[CARD, QRIS, E_WALLET, LOYALTY_POINTS]` AND the system is in offline mode THEN the system may attempt to process the payment or return an unstructured error instead of a clear offline-block rejection

---

### Expected Behavior (Correct)

**[BUG-1] Inventory Stock Transfer Receive**

2.1 WHEN a stock transfer is in `SHIPPED` or `IN_TRANSIT` status AND `PUT /inventory/stock-transfers/:id/receive` is called THEN the system SHALL successfully decrement `in_transit` at `transfer.to_location_id` (where it was incremented during ship) and increment `on_hand` and `available` at the destination location

2.2 WHEN `receiveTransfer()` calls `transferIn()` THEN the system SHALL pass `transfer.to_location_id` as `fromLocationId` so the SQL predicate `WHERE location_id = transfer.to_location_id AND in_transit >= quantity` matches the correct `stock_levels` row

2.3 WHEN the receive operation completes successfully THEN the system SHALL update the transfer status to `RECEIVED`, record an audit log entry with `action: 'TRANSFER_RECEIVED'`, and return HTTP 200 with the updated transfer record

**[BUG-2] Frontend Build Failure: Explorer.tsx JSX Tag Mismatch**

2.4 WHEN `vite build` is executed THEN the system SHALL complete the build successfully, producing a valid output bundle in the `dist/` directory with exit code 0

2.5 WHEN esbuild processes `Explorer.tsx` THEN the system SHALL parse the JSX tree without errors, with `</DepartmentWorkspaceLayout>` correctly closing the `<DepartmentWorkspaceLayout>` opened at line 524

**[BUG-3] Finance: Subledger-to-Ledger Desync**

2.6 WHEN `processEvent()` fails for a posting linked to an AR invoice THEN the system SHALL update the subledger entry status to `FAILED` and emit a structured `ERROR` log identifying the orphaned invoice ID and posting ID for operator remediation

2.7 WHEN a subledger entry has been in `VALIDATED` status for longer than a configurable threshold with no corresponding `JournalEntry` THEN the system SHALL flag it as a reconciliation discrepancy in the ledger integrity check

2.8 WHEN `issueInvoice()` is called and the fiscal period is already locked or no posting rule exists THEN the system SHALL reject the issuance with a `BadRequestException` before committing the transaction, preventing the desync from occurring

**[BUG-4] Finance: Double-Reversal of Journal Entries**

2.9 WHEN `reverseJournal()` is called for a `journalId` that already has a reversal record in `journal_reversals` THEN the system SHALL throw `BadRequestException` with message "Journal {journalId} has already been reversed" before creating any new journal entry

2.10 WHEN two concurrent reversal requests are made for the same journal THEN the system SHALL ensure only one succeeds by relying on a database-level unique constraint on `(original_journal_id)` in the `journal_reversals` table, causing the second to fail with a constraint violation caught and re-thrown as `BadRequestException`

**[BUG-5] Finance: Fiscal Period Hard-Lock Bypass for Draft Journals**

2.11 WHEN a fiscal period transitions to `HARD_LOCK` status THEN the system SHALL automatically void all remaining `DRAFT` journals in that period, setting their status to `VOID` with a system-generated reason of "Period hard-locked — auto-voided"

2.12 WHEN `LedgerPostingService.processEvent()` attempts to post a journal for a `HARD_LOCK` or `CLOSED` fiscal period THEN the system SHALL reject the posting with `FiscalPeriodLockedError` and set the posting status to `FAILED`

**[BUG-6] Finance: Ledger Hash Chain Contaminated by MOCK-HASH**

2.13 WHEN the system starts in `DB_PERSISTENCE` mode THEN the system SHALL log a `CRITICAL` warning if any `JournalEntry` records contain `entryHash = 'MOCK-HASH'` or `previousHash = 'MOCK-HASH'`, identifying the affected tenant, company, and journal IDs

2.14 WHEN `LedgerPostingService.processEvent()` creates a new `JournalEntry` THEN the system SHALL use `HashingService.generateJournalHash()` with real SHA-256, chaining from the previous entry's `entryHash` (or `'GENESIS'` for the first entry)

2.15 WHEN a data migration is run to remediate existing mock-hash entries THEN the system SHALL recompute and update `entryHash` values for all affected records in chronological order to restore a valid chain

**[BUG-7] Finance: Journal Balance Tolerance**

2.16 WHEN `JournalValidationService.check()` is called with any journal where `totalDebit ≠ totalCredit` (imbalance > 0) THEN the system SHALL reject the journal with `[UNBALANCED_JOURNAL]` error, regardless of the imbalance magnitude

2.17 WHEN `BALANCE_TOLERANCE` is defined in `JournalValidationService` THEN the system SHALL maintain it at exactly `new Prisma.Decimal(0)` with zero tolerance for any imbalance

**[BUG-8] Inventory: Wildcard Route Deprecation Warning**

2.18 WHEN the NestJS application starts THEN the system SHALL start without any path-to-regexp deprecation warnings for the `/inventory/images/` route

2.19 WHEN `GET /inventory/images/{filepath}` is called THEN the system SHALL correctly capture the full file path via the named wildcard parameter `*path` and serve the image file

**[BUG-9] Frontend: Bundle Size**

2.20 WHEN `vite build` completes THEN the system SHALL produce no individual JS chunk larger than 500 kB (uncompressed), achieved via route-based code splitting using `React.lazy()` and dynamic `import()` for each major module

2.21 WHEN a user navigates to a specific module page THEN the system SHALL only load the JS chunk(s) required for that module, deferring all other module code

2.22 WHEN `vite.config.ts` is updated THEN the system SHALL configure `build.rollupOptions.output.manualChunks` or equivalent to split vendor libraries (React, Radix UI, Recharts, etc.) into separate cacheable chunks

**[BUG-10] Retail: Shift Lifecycle Guard**

2.23 WHEN any POS transaction endpoint is called AND no active shift exists for the given `tenant_id + store_id` THEN the system SHALL reject the request with HTTP 422 and RFC 7807 error body `{ type: "shift/no-active-shift", title: "No Active Shift", detail: "A shift must be opened before POS operations can be performed." }`

2.24 WHEN a shift is opened via the Shift Control endpoint THEN the system SHALL create a shift record with status `OPEN` scoped to `tenant_id + store_id`, which is required for all subsequent POS and Kiosk operations

2.25 WHEN a shift is closed via the Shift Close endpoint THEN the system SHALL set the shift status to `CLOSED` and reject any further POS transactions referencing that `shift_id`

**[BUG-11] Retail: Offline Payment Matrix**

2.26 WHEN a payment request is submitted with `payment_type` in `[CARD, QRIS, E_WALLET, LOYALTY_POINTS]` AND the system detects offline mode THEN the system SHALL reject the request with HTTP 422 and RFC 7807 error body `{ type: "payment/offline-not-allowed", title: "Payment Method Unavailable Offline", detail: "Card, QRIS, E-Wallet, and Loyalty Points payments require network connectivity." }`

2.27 WHEN a payment request is submitted with `payment_type = CASH` or `payment_type = VOUCHER` AND the system is in offline mode THEN the system SHALL process the payment normally, as these are locally-settleable payment types

---

### Unchanged Behavior (Regression Prevention)

**[BUG-1] Inventory Stock Transfer Receive**

3.1 WHEN a stock transfer is created via `POST /inventory/stock-transfers` THEN the system SHALL CONTINUE TO create the transfer in `REQUESTED` status with correct `item_id`, `from_location_id`, `to_location_id`, and `quantity`

3.2 WHEN a stock transfer is picked via `PUT /inventory/stock-transfers/:id/pick` THEN the system SHALL CONTINUE TO reserve stock at the source location atomically

3.3 WHEN a stock transfer is shipped via `PUT /inventory/stock-transfers/:id/ship` THEN the system SHALL CONTINUE TO decrement `on_hand` and `available` at the source location and increment `in_transit` at the destination location

3.4 WHEN a stock transfer is already in `RECEIVED` status AND `PUT /inventory/stock-transfers/:id/receive` is called THEN the system SHALL CONTINUE TO return the existing transfer record without re-processing (idempotency guard)

3.5 WHEN any stock transfer operation is performed THEN the system SHALL CONTINUE TO enforce `tenant_id` isolation on all `stock_levels` and `stock_movements` queries

**[BUG-2] Frontend Build Failure: Explorer.tsx JSX Tag Mismatch**

3.6 WHEN the Explorer page is rendered in the browser THEN the system SHALL CONTINUE TO display the file explorer UI with all existing functionality (file listing, context menus, preview dialog, recycle bin view)

3.7 WHEN `vite build` is executed for all other pages THEN the system SHALL CONTINUE TO build without errors for all other `.tsx` files in the project

**[BUG-3] Finance: Subledger-to-Ledger Desync**

3.8 WHEN `issueInvoice()` is called under normal conditions (open fiscal period, valid posting rule) THEN the system SHALL CONTINUE TO atomically update invoice status to `ISSUED`, persist the subledger entry, and enqueue the ledger posting within a single transaction

3.9 WHEN `processEvent()` succeeds THEN the system SHALL CONTINUE TO create a `JournalEntry` with correct debit/credit lines, update account balances, and mark the posting as `COMPLETED`

3.10 WHEN `createInvoice()` is called with a duplicate `idempotency_key` THEN the system SHALL CONTINUE TO return the existing invoice without creating a duplicate

**[BUG-4] Finance: Double-Reversal**

3.11 WHEN `reverseJournal()` is called for a valid `POSTED` journal with no existing reversal THEN the system SHALL CONTINUE TO create a reversal journal with transposed debit/credit lines, update account balances, create a reversal trace record, and set the original journal status to `REVERSED`

3.12 WHEN `reverseJournal()` is called for a journal in a `HARD_LOCK` or `CLOSED` fiscal period THEN the system SHALL CONTINUE TO throw `BadRequestException` blocking the reversal

**[BUG-5] Finance: Fiscal Period Hard-Lock Bypass**

3.13 WHEN `validateTransition()` is called to move a period to `SOFT_LOCK` or `HARD_LOCK` AND `DRAFT` journals exist THEN the system SHALL CONTINUE TO throw `BadRequestException` blocking the transition

3.14 WHEN `processEvent()` processes a posting for an `OPEN` fiscal period THEN the system SHALL CONTINUE TO create the `JournalEntry` and update account balances without interruption

**[BUG-6] Finance: Ledger Hash Chain**

3.15 WHEN `LedgerPostingService.processEvent()` creates a new `JournalEntry` with no prior entries THEN the system SHALL CONTINUE TO use `'GENESIS'` as the `previousHash` seed

3.16 WHEN `HashingService.generateJournalHash()` is called THEN the system SHALL CONTINUE TO sort journal lines by `accountId` then `side` for determinism, and normalize timestamps to second precision to avoid DB round-trip drift

**[BUG-7] Finance: Journal Balance Tolerance**

3.17 WHEN `JournalValidationService.check()` is called with a perfectly balanced journal (`totalDebit === totalCredit`) THEN the system SHALL CONTINUE TO return `{ valid: true, errors: [] }`

3.18 WHEN `JournalValidationService.check()` is called with a journal with no lines THEN the system SHALL CONTINUE TO return `[EMPTY_JOURNAL]` error

**[BUG-8] Inventory: Wildcard Route**

3.19 WHEN `GET /inventory/images/{filepath}` is called with a valid image path THEN the system SHALL CONTINUE TO serve the image file with `Cache-Control: public, max-age=31536000, immutable` headers

3.20 WHEN `GET /inventory/images/{filepath}` is called with a nested path (e.g., `tenant-id/item-id/image.jpg`) THEN the system SHALL CONTINUE TO resolve the full path correctly

**[BUG-9] Frontend: Bundle Size**

3.21 WHEN a user navigates between modules THEN the system SHALL CONTINUE TO render all pages correctly with no functional regressions from the code-splitting refactor

3.22 WHEN a module chunk is loading THEN the system SHALL CONTINUE TO display a loading indicator (Suspense fallback) without a blank screen

**[BUG-10] Retail: Shift Lifecycle Guard**

3.23 WHEN a valid open shift exists for `tenant_id + store_id` THEN the system SHALL CONTINUE TO allow POS transactions to be processed normally

3.24 WHEN the shift guard rejects a request THEN the system SHALL CONTINUE TO return RFC 7807 compliant error responses

**[BUG-11] Retail: Offline Payment Matrix**

3.25 WHEN the system is online AND a payment request is submitted with any valid `payment_type` THEN the system SHALL CONTINUE TO process the payment through the normal payment lifecycle

3.26 WHEN a Cash or Voucher payment is processed offline THEN the system SHALL CONTINUE TO create a local payment record scoped to `tenant_id + store_id + shift_id` for reconciliation during shift close
