# Implementation Plan: Frontend Stabilization

## Overview

This plan implements the frontend stabilization design for the Zenvix Web_App (Vite + React 18 +
TypeScript, shadcn/ui, Tailwind). Work begins with the shared cross-cutting primitives (Phase 0:
error boundaries, `QueryBoundary` async-state, formatting layer, contract enum/label/gating layer,
theme-token enforcement, and component standardization), then applies those primitives across the
six Page_Groups (Phases 1–6), and finally wires the live-environment Verification_Suite
(Synthetic_Organization provisioning + per-phase Playwright projects). Each step builds on the
previous and ends with integration so no code is left orphaned.

Property-based tests (fast-check + Vitest, ≥100 iterations) cover the six pure/total primitives
defined in the design's Correctness Properties section. They are placed next to the implementation
of the function they validate. Tasks marked with `*` are optional test sub-tasks.

## Tasks

- [x] 1. Establish Phase 0 groundwork: tooling and contract enum layer
  - [x] 1.1 Add fast-check and confirm Vitest/Playwright config
    - Add `fast-check` as a dev dependency for property-based tests
    - Confirm `vitest.config.ts` (jsdom, Testing Library) and `playwright.config.ts` (Live_Environment base URL, setup project) are usable as-is
    - Add a test-utils helper that wires `fast-check` with Vitest assertions (min 100 runs)
    - _Requirements: 11.1, 11.2_

  - [x] 1.2 Implement payment create-lifecycle contract enum module
    - Create `src/lib/contract/paymentStatus.ts` exporting `PAYMENT_CREATE_STATE` (`REQUEST_CREATED`, `APPROVED`, `PROVIDER_SELECTED`, `EXECUTING`, `SETTLEMENT_PENDING`, `SETTLED`, `REJECTED`)
    - Define the `PaymentCreateState` type tracking the current Backend_Contract
    - _Requirements: 6.2, 6.5_

  - [x] 1.3 Implement total status-label and contract-gating functions
    - Create `src/lib/contract/statusLabel.ts` with `statusLabel(value, family)` returning a defined non-empty label for known values and a defined fallback (e.g. "Unknown") for any other input including `null`/`undefined`
    - Implement `canApprovePayment(status)` returning true only when `status === PAYMENT_CREATE_STATE.REQUEST_CREATED`
    - Add `StatusDescriptor` mapping (value/label/known/badge) routing badge styling through existing token-based `getStatusBadgeClasses`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6_

  - [x] 1.4 Write property test for contract gating correctness
    - **Property 4: Contract gating correctness**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.6, 13.3**
    - Generate arbitrary status strings (incl. `APPROVAL_PENDING`, other states, unknown, null/undefined); assert `canApprovePayment` is true iff `REQUEST_CREATED`

  - [x] 1.5 Write property test for status-label totality
    - **Property 5: Status-label mapping is total**
    - **Validates: Requirements 6.4, 6.6**
    - Generate arbitrary strings incl. null/undefined; assert `statusLabel` always returns a defined non-empty label and never the raw/undefined/null value

- [x] 2. Implement the canonical formatting and safe-value layer
  - [x] 2.1 Create `src/lib/format.ts` canonical formatters
    - Implement `formatCurrency`, `formatNumber`, `formatDate`, `formatDateTime`, `safeText` using `Intl` APIs
    - Currency renders with symbol/code and digit grouping; numbers use digit grouping and consistent precision; dates use one consistent locale-appropriate pattern
    - `safeText` and the formatters return the defined fallback `"—"` for `null`/`undefined`/`NaN`/`""`
    - _Requirements: 5.4, 5.5_

  - [x] 2.2 Write property test for safe-value formatting totality
    - **Property 2: Safe-value formatting never leaks empty/invalid text**
    - **Validates: Requirements 5.4**
    - Generate arbitrary values (null/undefined/NaN/empty/number/string/date); assert output is non-empty and never the literal `"undefined"`, `"null"`, `"NaN"`, or `""`

  - [x] 2.3 Write property test for formatting output invariants
    - **Property 3: Formatting output invariants**
    - **Validates: Requirements 5.5**
    - Generate finite numbers and valid dates; assert currency contains a symbol/code with digit grouping, numbers use digit grouping with consistent precision, and dates use one consistent pattern

  - [x] 2.4 Migrate formatter imports off mock-data and currency utils
    - Re-export legacy `@/lib/mock-data` and `@/lib/utils/currency` formatters as thin wrappers around `@/lib/format` during migration
    - Repoint all production imports to `@/lib/format`
    - _Requirements: 5.1, 5.2_

- [ ] 3. Implement async-state and error-boundary primitives
  - [x] 3.1 Implement async-state presentational components
    - Create `LoadingSkeleton` (token-based, Glass_Card-consistent), `EmptyState` (explanatory text, no retry), `ErrorState` (explanatory text + retry control)
    - _Requirements: 4.1, 4.3, 4.4, 4.5_

  - [x] 3.2 Implement `QueryBoundary` async-state component
    - Create `src/components/shared/QueryBoundary.tsx` mapping a `react-query` result to exactly one of loading / empty / error / populated
    - Default `isEmpty` (array length 0 / null / undefined); wire `ErrorState` retry to `refetch`; add a 30s watchdog flipping a still-pending query to the Error_State
    - _Requirements: 1.2, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 3.9_

  - [x] 3.3 Write property test for async-state mapping totality
    - **Property 1: Async-state mapping is total and exclusive**
    - **Validates: Requirements 1.2, 4.2, 4.3, 4.4, 4.5**
    - Generate result combinations (loading/error/data-present/data-empty); assert exactly one presentation renders, never blank, Error_State has retry, Empty_State does not

  - [ ] 3.4 Implement `PageErrorBoundary` and `RootErrorBoundary`
    - Create `src/components/shared/PageErrorBoundary.tsx` wrapping the existing `ErrorBoundary`, identifying the failed Page via `routeLabel`, offering soft retry (reset boundary + `react-query` reset) and a return-to-safe-route control
    - Expose `data-testid="error-boundary"` and keep the `Runtime Exception` heading for deterministic crash detection
    - _Requirements: 1.3_

  - [ ] 3.4a Write unit tests for QueryBoundary and PageErrorBoundary
    - Test loading → populated → empty → error transitions and that Error_State retry re-invokes `refetch`
    - Test that a thrown child renders the boundary surface with retry while leaving surrounding markup operable
    - _Requirements: 1.3, 4.1, 4.4, 4.7_

- [x] 4. Implement theme enforcement and component standardization primitives
  - [x] 4.1 Add theme-token lint guard and extend codemod
    - Add an ESLint guard (custom rule or `no-restricted-syntax`) flagging Hardcoded_Color usage (hex/rgb/hsl literals and fixed Tailwind palette classes), building on `isHardcodedColor()`/`convertToThemeColor()`
    - Extend `scripts/fix-theme-colors.cjs` and add an ESLint guard that production Pages do not import `@/lib/mock-data`
    - _Requirements: 7.1, 8.4, 5.2, 1.7_

  - [x] 4.2 Standardize GlassCard surface component
    - Create a single `GlassCard` component wrapping existing `glass-card`/`glass-morphism` classes for uniform card surfaces
    - _Requirements: 7.2_

- [x] 5. Wire Phase 0 primitives into the app shell
  - [x] 5.1 Mount error boundaries in the route tree
    - Mount `RootErrorBoundary` inside `BrowserRouter` in `App.tsx`
    - Wrap each Layout `Outlet` (CoreLayout, ModuleLayout, RetailRootLayout shells) with a route-keyed `PageErrorBoundary`
    - Confirm the catch-all `NotFound` route provides a recovery control to the landing/login Route
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6_

  - [x] 5.2 Apply the payment contract-gating fix
    - In `src/pages/core/payment/PaymentExecutionHub.tsx`, replace `disabled={item.status !== "APPROVAL_PENDING"}` with `disabled={!canApprovePayment(item.status)}`
    - Remove the obsolete `APPROVAL_PENDING` references from the codebase; route displayed statuses through `statusLabel`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 13.3_

- [x] 6. Checkpoint - Phase 0 groundwork
  - Ensure the build, type-check, lint, and all Phase 0 tests pass, ask the user if questions arise.

- [x] 7. Stabilize Phase 1 — Auth & Onboarding Page_Group
  - [x] 7.1 Apply primitives to Auth pages
    - Apply `QueryBoundary`, formatting/safe-value layer, GlassCard, theme tokens, and Button_Variant standardization to `Login`, `Register`, `Onboarding`, `ForgotPasswordModal`, `Index`, `NotFound`
    - Ensure forms use react-hook-form + zod validation with per-field messages, focus-first-invalid, and disable-while-pending behavior; Feedback_Message on submit outcome
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.6, 12.7, 3.2, 3.3, 3.4, 3.5, 3.7, 3.8, 10.1, 10.5_

  - [x] 7.2 Write component tests for Auth pages
    - Test login/registration validation, forgot-password Dialog focus in/out, and submit feedback (success/failure preserves input)
    - _Requirements: 3.4, 3.6, 3.8, 10.4, 12.3, 12.4_

- [x] 8. Stabilize Phase 2 — Core Page_Group (CoreLayout)
  - [x] 8.1 Apply primitives to Core dashboard, settings, and backbone pages
    - Apply `QueryBoundary`, formatting/safe-value layer, GlassCard, theme tokens, Button_Variant/icon standardization to top-level Core pages (`Dashboard`, `Reports`, `Security`, `Settings`, `ModuleHub`, `WorkflowInbox`, `Unauthorized`, `Admin`, `Operations`, tools/audit/log/mail/chat backbone)
    - Bind Real_Data within tenant scope; replace any Placeholder_Data; render Empty_State for zero records
    - _Requirements: 13.1, 13.2, 13.4, 13.5, 1.2, 4.2, 4.3, 5.1, 5.2, 7.1, 7.2, 7.3_

  - [x] 8.2 Apply primitives to Finance and Payment workspaces
    - Apply primitives across the Finance workspace pages and the Payment workspace pages
    - Confirm `PaymentExecutionHub` enables Approve only for `REQUEST_CREATED`; route all statuses through `statusLabel`
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 6.1, 6.2, 6.4, 6.6_

  - [x] 8.3 Apply primitives to Procurement, Inventory, Warehouse, and IT workspaces
    - Apply primitives, Real_Data binding, Empty/Error_State handling across these Core workspace pages
    - _Requirements: 13.1, 13.2, 13.4, 13.5, 4.3, 4.4, 5.1_

  - [x] 8.4 Apply primitives to Sales, Marketing, and HR workspaces
    - Apply primitives, Real_Data binding, Empty/Error_State handling, and table-control/filter feedback across these Core workspace pages
    - _Requirements: 13.1, 13.2, 13.4, 13.5, 3.9, 4.3, 5.1_

  - [x] 8.5 Write component tests for representative Core pages
    - Test async-state rendering + retry, contract gating on PaymentExecutionHub, control disable-while-pending and feedback, and Empty_State on zero records
    - _Requirements: 4.1, 4.3, 4.7, 6.1, 13.3, 3.2, 3.3, 3.5_

- [x] 9. Checkpoint - Phases 1 and 2
  - Ensure the build, type-check, lint, and all component tests pass, ask the user if questions arise.

- [x] 10. Stabilize Phase 3 — Retail Page_Group (RetailRootLayout)
  - [x] 10.1 Apply primitives to Retail management-plane pages
    - Apply primitives, Real_Data binding, Empty/Error_State handling to `RetailWorkspace`, `StoreDashboard`, `StoreProfile`, `StaffAssignments`, `ShiftControl`, `EcommerceConnector`, `InfrastructureControl`, `OrderFulfillment`, `PricingPromoDesk`, `InventoryVisibility`, `DeviceControlCenter`, `ComplianceAuditLedger`, `InfrastructureMap`, `NexusCommand`, `WorkforceComplianceHub`, and governance wrappers
    - Remove `@/lib/mock-data` imports (`Product`, `generateId`, sample arrays); repoint formatting to `@/lib/format`
    - _Requirements: 14.1, 14.3, 14.4, 14.5, 5.1, 5.2, 4.3, 4.4_

  - [x] 10.2 Apply primitives to Retail operational-plane / POS pages
    - Apply primitives to `OperationalGateway`, `CashMovementTerminal`, `CashierPOS`, `RefundReturnDesk`, `StockOpnameScanner`, `ReceivingTerminal`, `SelfServiceKiosk`, `ShiftOpenTerminal`, `ShiftCloseTerminal`
    - Ensure POS actions present a Loading_Indicator in flight and a Feedback_Message on completion; unify `CashierPOS` currency formatting onto `@/lib/format`
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 3.2, 3.3, 3.4, 3.5_

  - [x] 10.3 Write component tests for Retail POS controls
    - Test POS action loading/feedback, error retry, and Real_Data binding (no mock-data) on representative Retail pages
    - _Requirements: 14.2, 14.3, 14.4, 3.5_

- [x] 11. Stabilize Phase 4 — F&B Page_Group (ModuleLayout)
  - [x] 11.1 Apply primitives to F&B pages
    - Apply primitives, Real_Data binding, Empty_State handling, and action feedback to `Cashier`, `Tables`, `Kitchen` (KDS-gated), `Inventory`, `Settings`
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 3.3, 4.3, 5.1, 5.2_

  - [x] 11.2 Write component tests for F&B controls
    - Test cashier/kitchen/table action feedback and Empty_State on zero records
    - _Requirements: 15.2, 15.4_

- [x] 12. Stabilize Phase 5 — Industry Page_Group (ModuleLayout)
  - [x] 12.1 Apply primitives to Industry pages and module-inactive handling
    - Apply primitives, Real_Data binding, and action feedback to `ClinicDesk` and `FarmDesk`
    - When the module is inactive for the tenant, convey the unavailable state rather than rendering a broken Page
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 2.5_

  - [x] 12.2 Write component tests for Industry pages
    - Test action feedback and inactive-module unavailable presentation
    - _Requirements: 16.3, 16.4_

- [x] 13. Stabilize Phase 6 — Portal Page_Group
  - [x] 13.1 Apply primitives to Portal pages
    - Apply primitives, Real_Data binding, Error_State + retry, and action feedback to `MyPulse` across `/core/portal` and each module `portal` route (`noShell` wrapper)
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 4.4, 5.1_

  - [x] 13.2 Write component tests for Portal pages
    - Test Real_Data binding, Error_State retry, and portal action loading/feedback
    - _Requirements: 17.2, 17.3, 17.4_

- [x] 14. Checkpoint - Phases 3 through 6
  - Ensure the build, type-check, lint, and all component tests pass, ask the user if questions arise.

- [ ] 15. Implement responsive and accessibility passes across Page_Groups
  - [ ] 15.1 Apply responsive layout corrections
    - Audit and fix overflow/overlap/clipping at `lg`, `md`, and below `md`; ensure Layout navigation collapses to an openable/closable form below `md`
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
    - **Note:** Most components already use Tailwind responsive utilities (`lg:`, `md:`, `sm:`). Audit focuses on edge cases in modal dialogs and complex dashboards.

  - [ ] 15.2 Apply accessibility corrections
    - Ensure every Interactive_Control has an Accessible_Name, logical focus order with a visible focus indicator, keyboard activation parity, Dialog focus trap/return, and label association for form inputs
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
    - **Note:** The shadcn/ui components already implement many accessibility features. Audit focuses on custom modal/dialog interactions and form label associations.

  - [ ] 15.3 Write accessibility component tests
    - Add `axe-core` scans and Testing Library focus/keyboard assertions for representative pages per Page_Group
    - _Requirements: 10.1, 10.2, 10.4, 10.5_

- [x] 16. Implement the Synthetic_Organization provisioning harness
  - [x] 16.1 Implement `provisionSyntheticOrg`
    - Create `tests/playwright/setup/provisionSyntheticOrg.ts` generating a namespaced `runId`, driving the real self-service sign-up + onboarding flow, activating phase modules, creating any extra role users, and persisting per-run storage state
    - Read live URL/credentials from `vps_reference.md`/`vps_credentials.txt` or env vars by key name (never embed values); log any documented privileged bootstrap step
    - _Requirements: 11.4, 11.5, 11.6, 11.8, 12.5, 12.6_

  - [x] 16.2 Replace the Playwright setup project
    - Replace the hardcoded-demo-credentials `auth.setup.ts` with a setup project that runs `provisionSyntheticOrg` for the phase under test and writes per-run storage state
    - Add teardown that cleans up or clearly labels synthetic records and keeps data isolated to the synthetic tenant
    - _Requirements: 11.4, 11.8_

- [ ] 17. Implement per-phase Playwright e2e projects
  - [x] 17.1 Implement the route-render and console/network capture harness
    - Extend `collectJSErrors` to install `pageerror`, `console` error, `response`/`requestfailed` listeners and a DOM error-boundary check with a maintained `ignorePhrases` allowlist
    - A Page passes only with no `pageerror`, no matching console error, no unexpected 5xx, and no error-boundary surface
    - _Requirements: 11.7, 1.1_

  - [ ] 17.2 Write route-render totality e2e suite (parameterized)
    - **Property 6: Every defined Route renders without an uncaught runtime error**
    - **Validates: Requirements 1.1, 13.1, 14.1, 15.1, 16.1, 17.1**
    - Parameterize over the enumerated route inventory per phase; assert each Route reaches a visible interactive state with no uncaught runtime error

  - [ ] 17.3 Write per-phase interaction and presentation e2e specs
    - For each phase (`phase1-auth` … `phase6-portal`): exercise representative Dialog focus, Form submit, table sort/filter, and primary action; assert Loading_Indicator + Feedback_Message; assert a defined Async_State (never blank); assert navigation reachability/active state/SPA navigation, responsive behavior at multiple viewports, and theme toggle without reload with body-text contrast
    - _Requirements: 11.7, 2.1, 2.2, 2.3, 2.4, 3.6, 3.9, 8.1, 8.2, 8.3, 8.5, 9.1, 9.2_

- [ ] 18. Wire static checks and backend regression into the Verification_Suite
  - [ ] 18.1 Wire build, type-check, and lint gates
    - Ensure `vite build`, `tsc --noEmit`, and ESLint (incl. the theme-token rule and mock-data import guard) complete with zero errors; keep the audit pipeline and `architecture-guard.ts` running
    - _Requirements: 1.7, 5.2, 7.1, 11.1_

  - [ ] 18.2 Wire backend regression checks
    - Add/confirm Backend_API regression checks authenticating with the `Live_Test_Tenant` `tnt-3rlhko`
    - _Requirements: 11.9_

- [ ] 19. Final checkpoint - Verification_Suite
  - Ensure all checks (build, type-check, lint, component tests, property tests, e2e) pass per phase, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP.
- Each task references specific requirements clauses for traceability.
- Property-based tests use `fast-check` + Vitest (≥100 iterations) and each references its design
  Property number; Property 6 is implemented as a parameterized Playwright suite.
- Checkpoints provide incremental validation between phases.
- A phase is incomplete until every check in its Verification_Suite passes (Requirement 11.10).

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "2.1", "3.1", "4.1", "4.2"] },
    { "id": 1, "tasks": ["1.3", "2.2", "2.3", "3.2", "3.4"] },
    { "id": 2, "tasks": ["1.4", "1.5", "2.4", "3.3", "3.4a"] },
    { "id": 3, "tasks": ["5.1", "5.2", "16.1", "17.1"] },
    { "id": 4, "tasks": ["7.1", "8.1", "8.2", "8.3", "8.4", "16.2"] },
    { "id": 5, "tasks": ["7.2", "8.5", "10.1", "10.2", "11.1", "12.1", "13.1"] },
    { "id": 6, "tasks": ["10.3", "11.2", "12.2", "13.2", "15.1", "15.2", "18.1", "18.2"] },
    { "id": 7, "tasks": ["15.3", "17.2", "17.3"] }
  ]
}
```
