# Implementation Plan: Core Departments Stabilization

## Overview

This plan brings the five core operational departments — IT, Procurement, Sales, Marketing,
and Payment (NestJS/TypeScript under `backend/src/core/{it,procurement,sales,marketing,payment}`)
— to production-grade. It first introduces a small set of shared correctness primitives — a
TenantScope resolver, an Atomic_Operation helper, a typed error surface, field-mapping
discipline, an offline-context resolver (BUG-11), and async-rejection discipline (BUG-13) — then
applies them phase-by-phase across the five modules: **Phase 1 IT → Phase 2 Procurement →
Phase 3 Sales → Phase 4 Marketing → Phase 5 Payment**.

Each task builds on the previous ones and ends with the module wired end-to-end (controllers →
services → repositories → Prisma → live DB), including its cross-module boundaries (HR, Finance,
Settings, Integration_Log, Audit, Retail). Each phase is independently testable and deployable
against the live test tenant `tnt-3rlhko` without any later phase.

Property-based tests use `fast-check` with Jest, run a minimum of 100 generated cases, and are
each tagged `// Feature: core-departments-stabilization, Property {number}: {property_text}`.
Each of Properties 1–10 is implemented once and parameterized across the relevant phases/record
types; property sub-tasks are placed in the earliest phase where the property first applies to
catch errors early. Test sub-tasks marked with `*` are optional and may be skipped for a faster
MVP; live-DB verification sub-tasks gate each phase's completion.

## Tasks

- [x] 1. Establish shared correctness primitives
  - [x] 1.1 Implement the TenantScope resolver
    - Create a `TenantScope` value object (`{ tenant_id, company_id?, location_id?, branch_id? }`)
      and a `resolveScope(ctx, requested?)` helper shared across the five core modules
    - Always take `tenant_id` from `TenantContext`; ignore any client-supplied `tenant_id`; keep
      `company_id` and `tenant_id` distinct (never substitute one for the other)
    - Validate that any requested `company_id`/`location_id`/`branch_id` belongs to the caller's
      `tenant_id` before applying it; force non-privileged callers to context scope; allow
      SUPERADMIN/OWNER/ADMIN to widen scope where defined
    - Reject a contradictory or foreign scope id with `ForbiddenException`/`BadRequestException`
    - _Requirements: 2.1, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [x] 1.2 Implement the Atomic_Operation helper
    - Create a thin convention around `prisma.$transaction(async (tx) => …)` that threads `tx`
      through repository writes, the `Audit_Trail` entry, the `Integration_Log` outbox event
      (`sys_outbox_events`), and any cross-module record so all commit or roll back together
    - Make every repository write method accept an optional `tx?: Prisma.TransactionClient`
    - _Requirements: 4.1, 4.2, 4.4, 6.5, 6.6_

  - [x] 1.3 Implement the typed error surface and Prisma error mapping
    - Replace bare `throw new Error(...)` with NestJS HTTP exceptions (`BadRequestException`,
      `NotFoundException`, `ForbiddenException`, `ConflictException`)
    - Add a Prisma error-mapping layer translating `P2025` → 404, `P2002` → 409,
      `P2003`/`P2000` → 400, logging-then-500 only as a last resort
    - Map composite-key reads to `findFirst({ where: { id, tenant_id, … } })` so cross-tenant ids
      surface as 404, never leakage
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.5, 7.3_

  - [x] 1.4 Establish field-mapping discipline utilities
    - Add explicit, deterministic DTO-to-column mapping functions (no blind spread of
      mismatched-casing objects into Prisma); translate camelCase DTO fields to snake_case columns
      on write and back on read
    - Reject any request containing a field that resolves to no schema column, naming the
      unresolved field and persisting nothing; serialize dates as ISO 8601 and empty collections
      as `[]`
    - _Requirements: 1.5, 1.6, 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 1.5 Implement the offline-context resolver and shared offline matrix (BUG-11)
    - Replace the global `process.env.OFFLINE_MODE` flag with a resolver that derives the offline
      state of the specific payment context (device/branch connectivity) for the request
    - Define a single shared `Offline_Payment_Matrix`: `{ CASH, VOUCHER }` permitted offline;
      `{ CARD, QRIS, E_WALLET, and any other gateway-backed method }` blocked offline
    - _Requirements: 12.5, 12.6_

  - [x] 1.6 Implement the async-rejection discipline helper (BUG-13)
    - Provide a wrapper that attaches a rejection handler before any initiated promise (webhooks,
      OAuth callbacks, social sync, scheduled jobs) executes; capture uncaught rejections and
      record them in the Integration_Log/Audit_Trail with timestamp, operation id, and cause
      without terminating the process
    - Ensure failing endpoint async work resolves within 30s as a typed 4xx/5xx; background jobs
      log per-item failures and continue
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 1.7 Write property test for effective scope derivation
    - **Property 2: Effective scope derives from verified context, not client input**
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6, 2.10**

  - [x] 1.8 Write property test for multi-write atomicity
    - **Property 5: Multi-write operations are atomic**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.6, 4.7, 6.5, 6.6, 9.4, 9.5, 9.10, 10.3, 10.4, 11.5, 11.6, 11.7, 11.8, 12.11, 12.12**

- [x] 2. Phase 1 — IT module
  - [x] 2.1 Add RolesGuard and verified-context identity to the IT controller
    - Add `RolesGuard` to the IT guard chain and a `@Roles(...)` declaration to every mutating
      handler (device create/update, provisioning create/mark-provisioned, event ingest)
    - Replace any `x-actor-id`/`user_id || "system"` actor sourcing with
      `request.tenantContext.user_id`; pass a resolved `TenantScope` into the IT service
    - _Requirements: 2.10, 3.1, 3.2, 3.5, 3.6_

  - [x] 2.2 Implement scoped IT reads with composite-key lookups
    - Filter devices, device events, provisioning requests, system health, and monitoring reads by
      the resolved scope; use `findFirst({ where: { id, tenant_id } })`; return `[]` for empty
      matches and 404 for out-of-scope ids
    - _Requirements: 8.1, 8.2, 8.8_

  - [x] 2.3 Implement device and provisioning create/update with field mapping
    - Persist device create/update and provisioning-request create (status `PENDING`) via explicit
      DTO-to-column mapping within scope; return the persisted record and reflect values on read;
      reject invalid payloads with a client error persisting nothing
    - _Requirements: 8.3, 8.4, 8.6, 8.7_

  - [x] 2.4 Implement atomic provisioning transition and device-event ingest
    - Mark a `PENDING` provisioning request `PROVISIONED` within an Atomic_Operation, recording the
      actor from context; reject invalid transitions with a client error leaving status unchanged
    - Record device events/inbound webhooks against the device in its scope using the
      async-rejection helper; reject events referencing a device not in scope without recording
    - _Requirements: 8.5, 8.9, 8.12, 8.13_

  - [x] 2.5 Wire IT overview cross-module contributions and audit/integration logging
    - Return IT overview from persisted, tenant-scoped data with no placeholder/mock values;
      include POS device and ecommerce-connector stats only when Retail Module_Activation_State is
      active; record an Audit_Trail entry on privileged actions and an Integration_Log event before
      reporting success
    - _Requirements: 6.7, 6.8, 6.9, 6.10, 8.10, 8.11_

  - [x] 2.6 Write property test for tenant-scoped reads
    - **Property 1: Tenant-scoped reads never leak other tenants**
    - **Validates: Requirements 1.4, 1.6, 2.1, 2.7, 2.8, 2.9, 6.1, 6.2, 8.1, 8.2, 8.8, 9.8, 9.11, 10.7, 11.12, 12.13**

  - [x] 2.7 Write property test for round-trip persistence
    - **Property 4: Round-trip persistence of created and updated records**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 8.3, 8.6, 9.1, 10.1, 11.1, 12.1, 13.5, 13.6**

  - [x] 2.8 Write property test for Role_Gate and module activation enforcement
    - **Property 3: Mutating endpoints enforce their Role_Gate and module activation**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

  - [x] 2.9 Write property test for valid requests never producing server errors
    - **Property 9: Valid requests never produce server errors; failures resolve as typed responses**
    - **Validates: Requirements 1.1, 1.2, 1.3, 7.3, 8.7, 9.9, 12.2**

  - [x] 2.10 Write property test for asynchronous failure handling
    - **Property 10: Asynchronous failures are caught, logged, and non-fatal**
    - **Validates: Requirements 7.1, 7.2, 7.4, 7.5, 11.10**

  - [x] 2.11 Write property test for cross-module integration correctness
    - **Property 8: Cross-module integration produces correct, tenant-scoped, complete data**
    - **Validates: Requirements 6.3, 6.4, 6.7, 6.8, 6.9, 6.10, 8.10, 8.11, 8.12, 8.13, 9.4, 10.8, 10.9, 10.10, 11.9, 11.10, 11.11**

  - [x] 2.12 Write example/edge tests and live-DB verification for Phase 1
    - Device-event referencing a foreign-scope device → rejected without recording; invalid
      provisioning transition → 400; run IT write paths against `tnt-3rlhko` asserting no missing
      column, invalid FK, or hardcoded identifier
    - _Requirements: 8.9, 8.13, 13.1, 13.2, 13.3, 13.4_

- [x] 3. Checkpoint - Phase 1 (IT)
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Phase 2 — Procurement module
  - [x] 4.1 Migrate the Procurement controller to verified context, scope, and Role_Gates
    - Source actor identity from `request.tenantContext.user_id`; pass resolved `TenantScope` into
      the service; ensure `RolesGuard` plus `@Roles(...)` on every create/update/approve/release
      handler; apply composite-key reads
    - _Requirements: 2.1, 2.2, 2.10, 3.1, 3.2, 3.5_

  - [x] 4.2 Implement Procurement create/update and scoped reads with field mapping
    - Persist supplier, supplier branch, supplier product, category, requisition, draft PO,
      contract, risk signal, and portal message via explicit DTO-to-column mapping within scope;
      return persisted records; filter suppliers/requisitions/POs/contracts/risk/audit/spend reads
      by scope; reject invalid payloads with a client error
    - _Requirements: 9.1, 9.8, 9.9, 9.11_

  - [x] 4.3 Implement atomic Procurement_Workflow transitions
    - Persist each requisition→approval→draft PO→approval→quote→final PO transition within an
      Atomic_Operation; reject invalid transitions with a client error naming current and target
      state, leaving state unchanged
    - _Requirements: 4.6, 4.7, 9.2, 9.3_

  - [x] 4.4 Implement PO release with atomic Payable_Record to Finance
    - On release, create/synchronize the Finance Payable_Record with the originating `tenant_id`
      and every contract-required field in the same transaction; reject a release missing a
      contract-required field naming it; roll back the release if the Payable_Record fails
    - _Requirements: 6.3, 6.4, 9.4, 9.10_

  - [x] 4.5 Implement goods receipt and contract lifecycle atomically
    - Persist a goods receipt with inventory update and supplier rating within one
      Atomic_Operation; reject a receipt exceeding outstanding ordered quantity with 400 persisting
      nothing; persist contract sign/legal-approval transitions atomically
    - _Requirements: 9.5, 9.6, 9.7_

  - [x] 4.6 Write property test for lifecycle transitions from valid states
    - **Property 6: Lifecycle transitions succeed only from valid states**
    - **Validates: Requirements 8.5, 8.9, 9.2, 9.3, 9.6, 9.7, 10.5, 10.6, 11.3, 11.4, 12.3, 12.4, 12.7, 12.8, 12.9, 12.10**

  - [x] 4.7 Write example/edge tests and live-DB verification for Phase 2
    - Over-quantity goods receipt → 400; PO release with a Payable_Record missing a Finance-required
      field rolls back release + payable; run Procurement write paths against `tnt-3rlhko`
    - _Requirements: 9.4, 9.6, 9.10, 13.1, 13.2, 13.3, 13.4_

- [x] 5. Checkpoint - Phase 2 (Procurement)
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Phase 3 — Sales module
  - [x] 6.1 Migrate the Sales controller to verified context, scope, and Role_Gates
    - Source actor identity from `request.tenantContext.user_id`; pass resolved `TenantScope` into
      the service; ensure `RolesGuard` plus `@Roles(...)` on every mutating handler; apply
      composite-key reads
    - _Requirements: 2.1, 2.2, 2.10, 3.1, 3.2, 3.5_

  - [x] 6.2 Implement Sales create/update and scoped reads with field mapping
    - Persist lead, opportunity, quote, timeline event, and task via explicit DTO-to-column mapping
      within scope; return persisted records; filter leads/pipeline/opportunities/quotes/orders/
      tasks/alerts/forecast/analytics reads by scope; reject invalid payloads with a client error
    - _Requirements: 10.1, 10.2, 10.7_

  - [x] 6.3 Implement atomic lead conversion and pipeline/quote transitions
    - Convert a lead to an opportunity by creating the opportunity and updating the lead in one
      Atomic_Operation, rolling back both on failure; persist opportunity stage moves, closes,
      quote submissions, and quote decisions atomically; reject invalid transitions naming current
      and target state, leaving state unchanged
    - _Requirements: 10.3, 10.4, 10.5, 10.6_

  - [x] 6.4 Implement scoped SLA sweep and Retail dashboard contributions
    - Run SLA sweeps over only in-scope records, recording the actor from context for any change;
      include retail revenue and order contributions on the sales dashboard only when Retail
      Module_Activation_State is active, from persisted scoped data with no placeholder values
    - _Requirements: 10.8, 10.9, 10.10_

  - [x] 6.5 Write example/edge tests and live-DB verification for Phase 3
    - Lead-conversion failure leaves the lead unconverted; invalid pipeline/quote transition → 400;
      run Sales write paths against `tnt-3rlhko`
    - _Requirements: 10.4, 10.6, 13.1, 13.2, 13.3, 13.4_

- [x] 7. Checkpoint - Phase 3 (Sales)
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Phase 4 — Marketing module
  - [x] 8.1 Migrate the Marketing controller to verified context, scope, and Role_Gates
    - Source actor identity from `request.tenantContext.user_id`; pass resolved `TenantScope` into
      the service; ensure `RolesGuard` plus `@Roles(...)` on every mutating handler; apply
      composite-key reads
    - _Requirements: 2.1, 2.2, 2.10, 3.1, 3.2, 3.5_

  - [x] 8.2 Implement Marketing create/update and scoped reads with field mapping
    - Persist campaign, execution, lead, contact, workflow, connected account, funnel, and creative
      asset via explicit DTO-to-column mapping within scope; return persisted records; filter
      campaigns/executions/leads/contacts/workflows/accounts/attribution/alerts/funnels/assets/
      appointments/conversations reads by scope; reject invalid payloads with a client error
    - _Requirements: 11.1, 11.2, 11.12_

  - [x] 8.3 Implement atomic lifecycle transitions and Lead_Handoff
    - Persist campaign/workflow/account status transitions atomically leaving exactly one defined
      status; reject invalid transitions leaving status unchanged; perform Lead_Handoff (handoff
      record + lead consumability by Sales) in one Atomic_Operation; roll back a failed or
      not-handoff-ready handoff, leaving the lead consumable only by Marketing
    - _Requirements: 11.3, 11.4, 11.5, 11.6_

  - [x] 8.4 Implement atomic creative-asset upload and Customer 360
    - Store the asset blob and register its record in one Atomic_Operation so no orphaned blob or
      record remains on failure; assemble Customer 360 only from in-scope records
    - _Requirements: 11.7, 11.8, 11.9_

  - [x] 8.5 Make OAuth callback and social-sync rejection-safe with logged outcomes
    - Wrap OAuth callbacks and social sync with the async-rejection helper so failures never leave a
      partially connected account and never emit an unhandled rejection; record success and failure
      outcomes in the Integration_Log
    - _Requirements: 11.10, 11.11_

  - [x] 8.6 Write example/edge tests and live-DB verification for Phase 4
    - Creative-asset upload failure leaves no orphaned blob or record; failed Lead_Handoff leaves
      the lead Marketing-only; OAuth/social-sync failure records an Integration_Log outcome without
      crashing; run Marketing write paths against `tnt-3rlhko`
    - _Requirements: 11.6, 11.8, 11.10, 13.1, 13.2, 13.3, 13.4_

- [x] 9. Checkpoint - Phase 4 (Marketing)
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Phase 5 — Payment module
  - [x] 10.1 Add RolesGuard and verified-context identity to the Payment controller
    - Add `RolesGuard` to the Payment guard chain and `@Roles(...)` to every mutating handler;
      replace `actor_id()` header reads / `user_id || "system"` fallbacks with
      `request.tenantContext.user_id`; pass a resolved `TenantScope` into the service
    - _Requirements: 2.10, 3.1, 3.2, 3.5_

  - [x] 10.2 Implement payment-transaction create with offline-matrix enforcement (BUG-11)
    - Persist a valid transaction in the `REQUEST` state within scope; consult the single shared
      offline matrix using the resolved offline context: permit CASH/VOUCHER offline, reject
      CARD/QRIS/E_WALLET/other gateway-backed offline with a client error naming the method as
      unavailable and creating no transaction; reject invalid payloads persisting nothing
    - _Requirements: 12.1, 12.2, 12.5, 12.6_

  - [x] 10.3 Implement atomic payment, refund, and dispute lifecycle transitions
    - Persist payment transitions (request→approve/reject, approve→route, route→execute,
      execute→settle), refund transitions (create→approve, approve→execute), and dispute
      transitions (open→progress, progress→resolve) each within an Atomic_Operation with its
      transition record; reject invalid transitions naming current and target state, leaving state
      unchanged
    - _Requirements: 12.3, 12.4, 12.7, 12.8, 12.9, 12.10_

  - [x] 10.4 Implement atomic settlement with Finance settlement record
    - On settle, create the Finance settlement record and persist the settled state in the same
      Atomic_Operation; if the Finance record fails, roll back the whole operation leaving the
      transaction pre-settlement and return a server-error response
    - _Requirements: 11.11, 12.11, 12.12_

  - [x] 10.5 Implement scoped Payment reads and make reconciliation/expiry jobs rejection-safe
    - Filter transactions/providers/routing policies/devices/refunds/disputes/chargebacks/
      settlements/evidence-packs reads by scope; wrap expiry and reconciliation jobs with the
      async-rejection helper so per-item failures are logged and the run continues
    - _Requirements: 7.4, 12.13_

  - [x] 10.6 Write property test for the offline payment matrix
    - **Property 7: Offline payment matrix is enforced per context**
    - **Validates: Requirements 12.5, 12.6**

  - [x] 10.7 Write example/edge tests and live-DB verification for Phase 5
    - Offline CARD/QRIS/E_WALLET → 400 and offline CASH/VOUCHER succeeds (BUG-11 regression); actor
      identity comes from `TenantContext.user_id` not `x-actor-id` (regression); settled payment
      produces a Finance settlement record in the same transaction; run Payment write paths against
      `tnt-3rlhko`
    - _Requirements: 12.5, 12.6, 12.11, 12.12, 13.1, 13.2, 13.3, 13.4_

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP.
- Each task references specific requirements (granular sub-requirements) for traceability.
- Checkpoints ensure incremental validation at each phase boundary; the five phases are
  sequentially ordered, non-overlapping, and each is independently deployable against `tnt-3rlhko`
  without any later phase (Requirements 14.1–14.3).
- Property tests (Properties 1–10) validate universal correctness properties using `fast-check`
  with a minimum of 100 generated cases each and the required tagging comment.
- Per design and Requirement 13.3, each property is implemented once and parameterized across the
  relevant phases/record types; property sub-tasks are placed in the earliest phase where the
  property first applies (Properties 2 and 5 in the primitives phase; Properties 1, 3, 4, 8, 9,
  and 10 introduced in Phase 1 IT; Property 6 in Phase 2 Procurement; Property 7 in Phase 5
  Payment). Each phase's five mandated concerns — tenant isolation (P1), role gating (P3),
  atomicity (P5), cross-module integration (P8), and round-trip persistence (P4) — are exercised
  against `tnt-3rlhko` before the phase is complete.
- Unit and example tests validate concrete regressions and edge cases; live-DB verification runs
  against `tnt-3rlhko` gate each phase's completion (Requirements 13.1–13.6, 14.4).
- Scope is limited to the five core modules and their integration boundaries; HR and Finance
  internals are not modified (Requirements 14.6, 14.7).

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6"] },
    { "id": 1, "tasks": ["1.7", "1.8", "2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3"] },
    { "id": 3, "tasks": ["2.4", "2.5"] },
    { "id": 4, "tasks": ["2.6", "2.7", "2.8", "2.9", "2.10", "2.11", "2.12", "4.1"] },
    { "id": 5, "tasks": ["4.2", "4.3"] },
    { "id": 6, "tasks": ["4.4", "4.5"] },
    { "id": 7, "tasks": ["4.6", "4.7", "6.1"] },
    { "id": 8, "tasks": ["6.2", "6.3"] },
    { "id": 9, "tasks": ["6.4", "6.5", "8.1"] },
    { "id": 10, "tasks": ["8.2", "8.3"] },
    { "id": 11, "tasks": ["8.4", "8.5"] },
    { "id": 12, "tasks": ["8.6", "10.1"] },
    { "id": 13, "tasks": ["10.2", "10.3"] },
    { "id": 14, "tasks": ["10.4", "10.5"] },
    { "id": 15, "tasks": ["10.6", "10.7"] }
  ]
}
```
