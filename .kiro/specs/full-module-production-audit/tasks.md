# Implementation Plan: Full Module Production Audit

## Overview

This implementation plan remediates all 8 core business modules to achieve 90%+ production-readiness scores. The work is organized into foundational infrastructure (shared components, backend pipes, cache), followed by module-by-module stub elimination, then API connectivity fixes, and finally E2E test coverage. Each task builds incrementally on prior work.

## Tasks

- [x] 1. Set up shared infrastructure and cross-cutting components
  - [x] 1.1 Create the shared Modal Form component pattern
    - Implement `ModuleModal` generic component using `react-hook-form` + `@hookform/resolvers/zod`
    - Create `ModalFormProps<T>` interface with schema, defaultValues, onSubmit, onCancel, title, isOpen
    - Include inline field-level error rendering, loading state on submit button, and cancel behavior (discard without persisting)
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1_

  - [x] 1.2 Create shared QueryStateWrapper and state components
    - Implement `QueryStateWrapper` with `LoadingSpinner` (renders within 100ms), `ErrorState` (with retry action and error message), and `EmptyState` (descriptive message)
    - Ensure loading indicator displays within 100ms of request start
    - _Requirements: 9.4, 9.5, 9.6, 9.7_

  - [x] 1.3 Create shared TanStack Query hook patterns (useModuleList, useModuleMutation)
    - Implement `useModuleList<T>` with paginated response typing, staleTime of 30s
    - Implement `useModuleMutation<TInput, TOutput>` with cache invalidation via `invalidateQueries`
    - Create `PaginatedResponse<T>` interface (data, totalCount, currentPage, pageSize, totalPages)
    - _Requirements: 9.1, 9.2, 9.3, 11.5_

  - [x] 1.4 Create the PaginationPipe (NestJS global pipe)
    - Implement `PaginationPipe` that parses `page` (default 1, min 1) and `pageSize` (default 50, min 1, max 200)
    - Throw `BadRequestException` for invalid parameters (page < 1, pageSize < 1, pageSize > 200, non-numeric)
    - Export `PaginationParams` interface
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 1.5 Create the GlobalValidationPipe (NestJS)
    - Implement validation pipe using `class-validator` that returns 400 with `{ message, errors: [{ field, message }] }` structure
    - Register as global pipe in the app module
    - Handle unexpected errors with 500 response (generic message, log stack trace server-side)
    - _Requirements: 16.2, 16.3, 16.4_

  - [x] 1.6 Configure CacheModule and cache interceptor setup
    - Register `CacheModule` with default TTL 30s and max 1000 entries
    - Create cache invalidation helper for write operations (`reset()` on POST/PUT/PATCH/DELETE)
    - Document TTL strategy: 30s for transactional data, 300s for reference/configuration data
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [x] 1.7 Create the Business Rule Engine utilities
    - Implement `validateTransition(currentState, targetState, stateMap)` function
    - Implement `validateStockAdjustment(currentBalance, delta)` function
    - Implement `isBalanced(journalEntry)` function for double-entry accounting
    - Implement `calculateLineTotal` and `calculateGrandTotal` for quotation/POS line items
    - Define state machine maps: `PO_STATES`, `TICKET_STATES`
    - _Requirements: 2.2, 3.4, 4.4, 7.4, 7.5, 8.2, 17.1, 17.2, 17.3, 17.6_

- [x] 2. Checkpoint — Shared infrastructure validation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Backend — Pagination guards and cache interceptors for all services
  - [x] 3.1 Add pagination guards to sync controller (8 unguarded findMany calls)
    - Apply `PaginationPipe` to all list endpoints in sync controller
    - Add `@UseInterceptors(CacheInterceptor)` and `@CacheTTL(30)` to sync GET endpoints
    - Return paginated response envelope with metadata
    - _Requirements: 11.6, 12.1_

  - [x] 3.2 Add pagination guards and cache to intelligence, workflow, and reporting services
    - Intelligence service: 3 unguarded `findMany()` calls
    - Workflow service: 1 unguarded `findMany()` call
    - Reporting repository: 2 unguarded `findMany()` calls
    - Apply cache interceptor to GET endpoints with appropriate TTLs
    - _Requirements: 11.7, 12.1_

  - [x] 3.3 Add pagination guards and cache to license, IoT, event-bus, comms, and audit services
    - License service: 1 call (TTL 300s — reference data)
    - IoT services: 2 calls (TTL 30s)
    - Event-bus service: 3 calls (TTL 30s)
    - Comms services: 4 calls (TTL 30s for messages, 300s for mail accounts)
    - Audit services: 5 calls (TTL 30s)
    - _Requirements: 11.7, 12.1_

  - [x] 3.4 Add pagination guards and cache to warehouse and inventory controllers
    - Apply `PaginationPipe` and `CacheInterceptor` to warehouse and inventory GET endpoints
    - TTL 30s for inventory data
    - Add cache invalidation on write operations
    - _Requirements: 12.2, 12.3_

  - [x] 3.5 Write property test for pagination offset correctness (Property 4)
    - **Property 4: Pagination Offset Correctness and Metadata Consistency**
    - Test: for any valid page ≥ 1 and 1 ≤ pageSize ≤ 200, offset = (page-1) × pageSize, result size ≤ pageSize, totalPages = ceil(totalCount/pageSize)
    - Test: invalid params (page < 1, pageSize < 1, pageSize > 200, non-numeric) → validation error
    - **Validates: Requirements 11.1, 11.3, 11.4, 11.5**

- [x] 4. Backend — Inventory disconnected endpoint resolution
  - [x] 4.1 Implement inventory movements and balances endpoints
    - Create `GET /inventory/movements` with `item_id` query filter and pagination (default 50)
    - Create `GET /inventory/balances` with `item_id` query filter and pagination (default 50)
    - Apply `CacheInterceptor` with TTL 30s
    - _Requirements: 10.1, 10.2_

  - [x] 4.2 Implement inventory item images endpoints
    - Create `GET /inventory/items/:id/images` returning image array (url, imageId, primary flag)
    - Create `PUT /inventory/items/:id/images/:imageId/primary` to set primary image
    - Create `POST /v1/inventory/items/:id/images` with file upload, 10MB max size validation
    - Resolve `/v1/` route prefix mismatch using NestJS versioning
    - _Requirements: 10.3, 10.4, 10.5, 10.10_

  - [x] 4.3 Implement inventory item PATCH, DELETE, and import job DELETE endpoints
    - Create `PATCH /inventory/items/:id` for partial updates
    - Create `DELETE /inventory/items/:id` as soft-delete (set `deleted_at` timestamp)
    - Create `DELETE /inventory/import/jobs/:id` that cancels PENDING/PROCESSING jobs
    - _Requirements: 10.6, 10.7, 10.8_

  - [x] 4.4 Create validation DTOs for all inventory endpoints
    - Create `UpdateItemDto`, `CreateMovementDto`, `StockAdjustmentDto` with class-validator decorators
    - Enforce SKU uniqueness validation, reason length (1-500 chars), non-zero delta
    - Implement item name max 200 chars, SKU max 50 chars constraints
    - _Requirements: 7.2, 7.3, 7.4, 10.9, 16.2_

  - [x] 4.5 Write property test for stock balance non-negativity (Property 5)
    - **Property 5: Stock Balance Non-Negativity Invariant**
    - Test: for any sequence of adjustments, currentBalance + delta ≥ 0 must hold; reject if negative
    - Vary: current balances, adjustment sequences, delta magnitudes
    - **Validates: Requirements 7.4, 7.5, 17.1**

  - [x] 4.6 Write property test for order fulfillment atomicity (Property 6)
    - **Property 6: Order Fulfillment Atomicity**
    - Test: if ANY line item has insufficient stock, reject entire fulfillment and leave ALL balances unchanged
    - Test: if ALL line items have sufficient stock, deduct all simultaneously
    - **Validates: Requirements 17.3, 17.4**

- [x] 5. Checkpoint — Backend infrastructure validation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Frontend — HR Module stub modal elimination (27 modals)
  - [x] 6.1 Implement HR module Zod schemas and modal forms
    - Create Zod schemas for all HR domain entities (employees, departments, leave, attendance, payroll)
    - Implement modal forms using shared `ModuleModal` component for all 27 stub modals
    - Wire forms to TanStack Query mutations calling corresponding backend endpoints
    - Include client-side validation with field-level error display
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 16.1_

  - [x] 6.2 Replace HR mock data with TanStack Query hooks
    - Replace mock data in Department Attendance Studio with real API calls
    - Implement `QueryStateWrapper` for loading, error, and empty states
    - _Requirements: 9.3, 9.4, 9.5, 9.6_

- [x] 7. Frontend — Finance Module stub modal elimination (42 modals, 11 stub elements)
  - [x] 7.1 Implement Finance module Zod schemas and modal forms
    - Create Zod schemas for all Finance domain entities (journal entries, assets, reconciliation, payments)
    - Implement double-entry accounting validation: submit disabled until debits = credits (±0.01) with ≥ 2 line items
    - Implement modal forms for all 42 stub modals with TanStack Query mutations
    - Add audit trail entry creation on each successful financial data submission
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 16.1_

  - [x] 7.2 Replace Finance stub elements and mock data with functional components
    - Replace 11 stub elements with data-driven components
    - Replace mock data in Assets, CFO Dashboard, Reconciliation Desk with TanStack Query hooks
    - Implement loading, error, and empty states on all Finance pages
    - _Requirements: 2.5, 9.1, 9.4, 9.5, 9.6_

  - [x] 7.3 Implement Payment Module "Create Payment" button and form
    - Add visible "Create Payment" button (keyboard-focusable, accessible label)
    - Implement payment form modal: payment method, amount (numeric > 0), recipient (non-empty), purpose, scheduled date
    - Wire to backend with cache invalidation, close modal on success, show new record within 3s
    - Handle validation errors and backend errors with data preservation
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [x] 7.4 Write property test for double-entry accounting balance (Property 1)
    - **Property 1: Double-Entry Accounting Balance Validation**
    - Test: allow submission iff |totalDebits - totalCredits| ≤ 0.01 AND lineItems.length ≥ 2
    - Vary: line item counts, debit/credit amounts, imbalance magnitudes
    - **Validates: Requirements 2.2, 2.4**

- [x] 8. Frontend — Procurement Module stub modal elimination (11 modals)
  - [x] 8.1 Implement Procurement module Zod schemas and modal forms
    - Create Zod schemas for PO, vendor, goods receipt entities
    - Validate: vendor selected, ≥ 1 line item, quantity > 0, unit price > 0
    - Implement modal forms for all 11 stub modals with TanStack Query mutations
    - Implement PO state transition handling (draft → pending_approval → approved → received → closed)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 16.1, 17.2_

  - [x] 8.2 Write property test for state machine transitions (Property 2)
    - **Property 2: State Machine Transition Enforcement**
    - Test: allow transition iff target is in adjacency map for current state; reject otherwise with error
    - Vary: current states, target states, entity types (PO, tickets)
    - **Validates: Requirements 3.4, 17.2, 17.6**

- [x] 9. Frontend — Sales Module stub modal elimination (8 modals, 1 stub element)
  - [x] 9.1 Implement Sales module Zod schemas and modal forms
    - Create Zod schemas for leads, opportunities, quotations, orders
    - Implement lead-to-opportunity conversion (carry over company, contact, potential value; set lead status "converted")
    - Implement quotation line total calculation: qty × unitPrice - discount
    - Replace 1 stub element with functional component
    - Wire all 8 modals to backend via TanStack Query mutations
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 16.1_

  - [x] 9.2 Write property test for quotation/POS line item arithmetic (Property 3)
    - **Property 3: Quotation and POS Line Item Arithmetic**
    - Test: lineTotal = qty × unitPrice × (1 - discountPercent/100) for percentage, or qty × unitPrice - fixedDiscount for fixed
    - Test: grandTotal = sum of all lineTotals
    - **Validates: Requirements 4.4, 8.2**

- [x] 10. Frontend — Marketing Module stub modal elimination (13 modals)
  - [x] 10.1 Implement Marketing module Zod schemas and modal forms
    - Create Zod schemas: campaign name 3-100 chars, start date required, end date ≥ start date, ≥ 1 audience segment
    - Implement modal forms for all 13 stub modals (campaign, lead, funnel, nurture workflow, execution, connected account)
    - Wire to backend with TanStack Query mutations
    - Implement campaign scheduling with calendar view persistence
    - Handle errors with toast notifications, data preservation, modal stays open
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 16.1_

- [x] 11. Frontend — IT Module stub modal elimination (7 modals)
  - [x] 11.1 Implement IT module Zod schemas and modal forms
    - Create Zod schemas for support tickets, SLA management, escalation
    - Implement priority assignment logic (Critical, High, Medium, Low based on category + impact)
    - Implement SLA breach detection: trigger escalation notification when response/resolution time exceeds threshold
    - Wire all 7 modals to backend with TanStack Query mutations (persist within 2s)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 16.1_

- [x] 12. Frontend — Inventory Module stub modal elimination (14 modals, 1 stub element)
  - [x] 12.1 Implement Inventory module Zod schemas and modal forms
    - Create Zod schemas: SKU unique (50 chars max), name (200 chars max), unit of measure, category required
    - Implement stock adjustment form: reason (1-500 chars), non-zero delta, enforce non-negative balance
    - Replace 1 stub element with functional component showing item name, SKU, stock quantity
    - Wire all 14 modals to backend with TanStack Query mutations
    - Connect to new disconnected endpoints (movements, balances, images, PATCH, DELETE)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 16.1_

- [x] 13. Frontend — Retail Module stub modal elimination (43 modals, 14 stub elements)
  - [x] 13.1 Implement Retail module Zod schemas and modal forms (POS, pricing, shifts)
    - Create Zod schemas for POS transactions, pricing, shift control, channel management
    - Implement POS transaction modal: item lookup by SKU/name, quantity 1-9999, discount (% or fixed), payment method selection
    - Wire all 43 modals to backend with TanStack Query mutations
    - _Requirements: 8.1, 8.2, 8.5, 8.6, 16.1_

  - [x] 13.2 Replace 14 Retail stub elements and mock data with functional components
    - Replace all 14 stub elements with components fetching from backend (loading indicator + error state)
    - Replace mock data in Sales History, Inventory Visibility, Pricing/Promo Desk, Shift Control
    - Replace mock data in 7 additional components (useGovernance, ItemDetailModal, TransferTrackingModal, etc.)
    - Implement Shift Control page: display open time, close time, counted cash, operator name
    - _Requirements: 8.3, 8.4, 9.2, 9.4, 9.5, 9.6_

  - [x] 13.3 Implement Retail Sales History page with real data
    - Fetch transaction records from backend, sorted by date descending
    - Display: date/time, item names, quantities, line totals, grand total, payment method, status, cashier
    - Implement pagination (50 per page) with next/previous controls and page indicator
    - Handle loading, error, and empty states
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

- [x] 14. Checkpoint — All module stub elimination validation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Security Module layout fix
  - [x] 15.1 Fix duplicate main element in Security Module
    - Replace `<main>` with `<section>` or `<div>` in SecurityPage component (CoreLayout already provides `<main>`)
    - Ensure exactly one `<main>` element in the DOM on `/core/security` route
    - Verify no duplicate landmark wrappers (header, nav, main) within Security page
    - Preserve existing visual layout, scroll behavior, and content structure
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

- [x] 16. Backend validation DTOs for all modules
  - [x] 16.1 Create validation DTOs for HR, Finance, Procurement, Sales, Marketing, IT, Retail modules
    - Create class-validator DTOs for all entity creation/update operations across all modules
    - Enforce all business constraints (double-entry balance, PO line items, campaign dates, ticket priority, SKU uniqueness)
    - Ensure 400 response with structured `errors` array on validation failure
    - _Requirements: 16.2, 16.3, 17.5, 17.7_

  - [x] 16.2 Write property test for backend validation error response structure (Property 7)
    - **Property 7: Backend Validation Error Response Structure**
    - Test: for any invalid payload, response is 400 with `message` string and `errors` array where each element has non-empty `field` and `message`
    - Vary: payload shapes, field types, nested objects, missing fields
    - **Validates: Requirements 16.2, 16.3**

- [x] 17. Checkpoint — Full backend validation and cache verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 18. E2E test suite — Playwright workflows
  - [x] 18.1 Configure Playwright test infrastructure for CI
    - Add reporter config (html + json output)
    - Configure screenshot/trace/video on failure
    - Create GitHub Actions workflow (`.github/workflows/e2e.yml`) for push to main and PRs
    - Set up backend + frontend service start in CI
    - _Requirements: 19.9, 19.10_

  - [x] 18.2 Implement HR E2E workflow test
    - Test: create employee → assign department → submit leave → approve leave → process payroll
    - Verify each step's state change before proceeding
    - _Requirements: 19.1_

  - [x] 18.3 Implement Finance E2E workflow test
    - Test: create journal entry → post to ledger → reconcile → generate report
    - Verify each step's state change before proceeding
    - _Requirements: 19.2_

  - [x] 18.4 Implement Procurement E2E workflow test
    - Test: create PO → approve → receive goods → verify inventory update → generate invoice
    - Verify each step's state change before proceeding
    - _Requirements: 19.3_

  - [x] 18.5 Implement Sales E2E workflow test
    - Test: create lead → convert to opportunity → create quotation → convert to order → fulfill
    - Verify each step's state change before proceeding
    - _Requirements: 19.4_

  - [x] 18.6 Implement Retail POS E2E workflow test
    - Test: open shift → scan items → apply discount → process payment → close shift → verify sales history
    - Verify each step's state change before proceeding
    - _Requirements: 19.5_

  - [x] 18.7 Implement Inventory E2E workflow test
    - Test: create item → set stock → transfer → adjust → run opname → verify counts
    - Verify each step's state change before proceeding
    - _Requirements: 19.6_

  - [x] 18.8 Implement Marketing E2E workflow test
    - Test: create campaign → define audience → schedule → execute → verify metrics
    - Verify each step's state change before proceeding
    - _Requirements: 19.7_

  - [x] 18.9 Implement IT E2E workflow test
    - Test: create ticket → assign priority → escalate on SLA breach → resolve → close
    - Verify each step's state change before proceeding
    - _Requirements: 19.8_

- [x] 19. Checkpoint — E2E test validation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 20. Production readiness audit verification
  - [x] 20.1 Run production audit and verify all modules score 90%+
    - Execute `npm run audit` and verify HR, Finance, Procurement, Sales, Marketing, IT, Inventory, Retail all score ≥ 90
    - Verify zero E2E workflow failures
    - Verify zero high-severity performance issues (critical/high)
    - Verify zero "no_cache" issues across all controllers
    - If any module is below 90%, identify and remediate the shortfall
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8, 18.9, 18.10, 18.11, 12.5_

- [x] 21. Final checkpoint — Production readiness confirmed
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at natural breakpoints
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The shared infrastructure (tasks 1.1–1.7) must be completed before module-specific work
- Backend pagination/cache (tasks 3.x, 4.x) should be done before frontend integration to ensure endpoints are ready
- All frontend modules use the same `ModuleModal`, `QueryStateWrapper`, and TanStack Query patterns for consistency

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7"] },
    { "id": 1, "tasks": ["3.1", "3.2", "3.3", "3.4"] },
    { "id": 2, "tasks": ["3.5", "4.1", "4.2", "4.3", "4.4"] },
    { "id": 3, "tasks": ["4.5", "4.6", "15.1", "16.1"] },
    { "id": 4, "tasks": ["6.1", "6.2", "7.1", "7.2", "8.1", "9.1", "10.1", "11.1", "12.1"] },
    { "id": 5, "tasks": ["7.3", "7.4", "8.2", "9.2", "13.1", "13.2"] },
    { "id": 6, "tasks": ["13.3", "16.2"] },
    { "id": 7, "tasks": ["18.1"] },
    { "id": 8, "tasks": ["18.2", "18.3", "18.4", "18.5", "18.6", "18.7", "18.8", "18.9"] },
    { "id": 9, "tasks": ["20.1"] }
  ]
}
```
