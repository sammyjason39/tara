# Core Retail Stabilization - Context Document

**Last Updated:** 2026-05-22  
**Spec Version:** 1.0  
**Status:** In Progress

---

## Purpose

This document provides complete context for the core-retail-stabilization spec, including:
- Current codebase state
- Bug locations and status
- Implementation priorities
- Related documentation

---

## Quick Links

### Primary Documentation
- **[Master Spec](../../../docs/SPEC.md)** - Complete platform specification
- **[Codebase Map](../../../docs/CODEBASE_MAP.md)** - File locations and structure
- **[Bug Requirements](./bugfix.md)** - Detailed bug specifications
- **[Implementation Tasks](./tasks.md)** - Task breakdown
- **[Implementation Status](./IMPLEMENTATION_STATUS.md)** - Current progress

### Module Mappings
- **[Finance Mapping](../../../mappings/Finance.json)** - Finance module structure
- **[Inventory Mapping](../../../mappings/Inventory.json)** - Inventory module structure
- **[Retail Mapping](../../../mappings/Retail.json)** - Retail module structure
- **[Payment Mapping](../../../mappings/Payment.json)** - Payment module structure

---

## Bug Summary

### Status Overview
- **Total Bugs:** 11
- **Fixed:** 4 (BUG-1, BUG-4, BUG-7, and partial BUG-1)
- **Needs Verification:** 3 (BUG-2, BUG-6, BUG-8)
- **Not Fixed:** 4 (BUG-3, BUG-5, BUG-9, BUG-10, BUG-11)

### Critical Bugs (Must Fix)

#### BUG-1: Inventory Stock Transfer Receive ✅ FIXED
- **Severity:** CRITICAL
- **File:** `backend/src/core/inventory/inventory.service.ts`
- **Line:** 435
- **Status:** Fixed - `receiveTransfer()` now uses `transfer.to_location_id` as fromLocationId
- **Verification:** Confirmed in code review

#### BUG-2: Explorer.tsx JSX Tag Mismatch ⚠️ NEEDS VERIFICATION
- **Severity:** CRITICAL (Build Blocker)
- **File:** `src/pages/core/tools/Explorer.tsx`
- **Line:** 1391
- **Issue:** `</div>` doesn't match `<DepartmentWorkspaceLayout>` at line 524
- **Impact:** Prevents frontend build
- **Action Required:** Manual JSX tree inspection

---

### High Priority Bugs

#### BUG-3: Subledger-to-Ledger Desync ❌ NOT FIXED
- **Severity:** HIGH (Data Integrity)
- **File:** `backend/src/core/finance/services/ar-bill.service.ts`
- **Issue:** No automated detection for orphaned subledger entries
- **Impact:** Invoice can be ISSUED without corresponding JournalEntry
- **Required Fix:**
  1. Add FAILED status to subledger entries when processEvent() fails
  2. Implement automated reconciliation mechanism
  3. Add alerting for entries in VALIDATED status beyond threshold
  4. Add pre-validation in issueInvoice() to reject if fiscal period is locked

#### BUG-4: Double-Reversal of Journal Entries ✅ FIXED
- **Severity:** HIGH (Data Integrity)
- **File:** `backend/src/core/finance/services/journal-reversal.service.ts`
- **Line:** 45
- **Status:** Fixed - checks for existing reversal before creating new one
- **Verification:** Confirmed in code review

#### BUG-5: Fiscal Period Hard-Lock Bypass ❌ NOT FIXED
- **Severity:** HIGH (Data Integrity)
- **File:** `backend/src/core/finance/services/fiscal-period.service.ts`
- **Issue:** No automatic voiding of DRAFT journals when period enters HARD_LOCK
- **Impact:** DRAFT journals can remain in locked periods
- **Required Fix:**
  1. Add automatic voiding of DRAFT journals when period enters HARD_LOCK
  2. Add validation in LedgerPostingService.processEvent() to reject postings for locked periods
  3. Set posting status to FAILED when period is locked

#### BUG-6: Ledger Hash Chain Contamination ⚠️ NEEDS VERIFICATION
- **Severity:** HIGH (Data Integrity)
- **File:** `backend/src/core/finance/utils/hashing.service.ts`
- **Issue:** Need to verify no MOCK-HASH entries exist in database
- **Impact:** Broken cryptographic hash chain
- **Action Required:**
  1. Verify no MOCK-HASH entries exist in database
  2. Add startup check to detect MOCK-HASH entries
  3. Implement data migration to recompute entryHash values for affected records

#### BUG-7: Journal Balance Tolerance ✅ FIXED
- **Severity:** HIGH (Data Integrity)
- **File:** `backend/src/core/finance/services/journal-validation.service.ts`
- **Line:** 9
- **Status:** Fixed - BALANCE_TOLERANCE = 0 (zero tolerance)
- **Verification:** Confirmed in code review

---

### Medium Priority Bugs

#### BUG-8: Wildcard Route Deprecation ⚠️ NEEDS VERIFICATION
- **Severity:** MEDIUM (Build Quality)
- **File:** `backend/src/core/inventory/inventory.controller.ts`
- **Issue:** Check for @Get("images/*") deprecated syntax
- **Impact:** Startup warning, potential future breakage
- **Action Required:** Locate route and verify syntax

#### BUG-9: Bundle Size Exceeds Threshold ❌ NOT FIXED
- **Severity:** MEDIUM (Performance)
- **File:** `vite.config.ts`
- **Issue:** No code-splitting implemented
- **Impact:** Single ~5,697 kB JS chunk, slow initial load
- **Required Fix:**
  1. Implement route-based code splitting using React.lazy() and dynamic import()
  2. Configure vite.config.ts to split vendor libraries into separate cacheable chunks
  3. Add Suspense fallback for loading indicators

#### BUG-10: Retail Shift Lifecycle Guard ❌ NOT FIXED
- **Severity:** MEDIUM (Security)
- **File:** `backend/src/modules/retail/retail.controller.ts`
- **Issue:** No shift validation at backend API layer
- **Impact:** Direct API calls can bypass shift lifecycle hard lock
- **Required Fix:**
  1. Add shift validation middleware to POS endpoints
  2. Reject requests with HTTP 422 and RFC 7807 error body when no active shift exists
  3. Create shift record with status OPEN scoped to tenant_id + store_id

#### BUG-11: Offline Payment Matrix ❌ NOT FIXED
- **Severity:** MEDIUM (Security)
- **File:** `backend/src/core/payment/payment.service.ts`
- **Issue:** No offline payment matrix enforcement at backend
- **Impact:** Direct API calls can bypass offline restrictions
- **Required Fix:**
  1. Add offline mode detection to payment processing layer
  2. Reject requests with HTTP 422 and RFC 7807 error body for blocked payment types
  3. Allow Cash and Voucher payments to process normally in offline mode

---

## Implementation Priority

### Phase 1: Critical (Immediate)
1. **BUG-2** - Explorer.tsx JSX Tag Mismatch (build blocker)
2. **BUG-6** - Verify and remediate MOCK-HASH entries (data integrity)

### Phase 2: High Priority (This Sprint)
1. **BUG-3** - Subledger-to-Ledger Desync (data integrity)
2. **BUG-5** - Fiscal Period Hard-Lock Bypass (data integrity)
3. **BUG-10** - Retail Shift Lifecycle Guard (security)
4. **BUG-11** - Offline Payment Matrix (security)

### Phase 3: Medium Priority (Next Sprint)
1. **BUG-8** - Wildcard Route Deprecation (build quality)
2. **BUG-9** - Bundle Size (performance)

---

## Key File Locations

### Finance Module
```
backend/src/core/finance/
├── finance.service.ts                          # Main service
├── services/
│   ├── ledger-posting.service.ts              # Journal posting
│   ├── journal-reversal.service.ts            # Reversal logic (BUG-4 fix)
│   ├── fiscal-period.service.ts               # Period management (BUG-5)
│   ├── ar-bill.service.ts                     # AR management (BUG-3)
│   └── journal-validation.service.ts          # Validation (BUG-7 fix)
└── utils/
    └── hashing.service.ts                     # Hash chain (BUG-6)
```

### Inventory Module
```
backend/src/core/inventory/
├── inventory.service.ts                        # Main service (BUG-1 fix at line 435)
├── inventory.controller.ts                     # API (BUG-8)
└── repositories/
    ├── stock-level.repository.ts
    └── stock-movement.repository.ts
```

### Retail Module
```
backend/src/modules/retail/
├── retail.service.ts                           # Main service
├── retail.controller.ts                        # API (BUG-10)
└── retail-gateway.service.ts                   # Multi-channel sync
```

### Payment Module
```
backend/src/core/payment/
├── payment.service.ts                          # Main service (BUG-11)
└── payment.controller.ts                       # API
```

### Frontend
```
src/
├── pages/core/tools/
│   └── Explorer.tsx                            # File explorer (BUG-2 at line 1391)
└── vite.config.ts                              # Build config (BUG-9)
```

---

## Database Tables Affected

### Finance
- `finance_journal_entries` - Journal entries (BUG-3, BUG-4, BUG-6, BUG-7)
- `finance_journal_lines` - Journal line items
- `finance_journal_reversals` - Reversal tracking (BUG-4)
- `finance_fiscal_periods` - Fiscal periods (BUG-5)
- `finance_ar_invoices` - AR invoices (BUG-3)

### Inventory
- `stock_levels` - Stock levels (BUG-1)
- `stock_movements` - Movement history (BUG-1)
- `inventory_transfers` - Transfer records (BUG-1)

### Retail
- `retail_shifts` - Shift records (BUG-10)
- `retail_orders` - Order records (BUG-10)

### Payment
- `payment_transactions` - Payment records (BUG-11)

---

## Testing Strategy

### Unit Tests
- Finance: `backend/src/core/finance/__test__/`
- Inventory: `backend/src/core/inventory/__test__/`
- Retail: `backend/src/modules/retail/__test__/`

### Integration Tests
- `tests/integration/core-bugfix-exploration.spec.ts` - Bug exploration tests
- `tests/integration/` - API integration tests

### E2E Tests
- `tests/playwright/` - Playwright E2E tests

### Regression Tests
- Required for each bug fix
- Must cover all scenarios in bugfix.md

---

## Development Workflow

### For Each Bug Fix

1. **Read Requirements**
   - Review bugfix.md for detailed requirements
   - Check IMPLEMENTATION_STATUS.md for current state
   - Review CODEBASE_MAP.md for file locations

2. **Implement Fix**
   - Follow expected behavior in bugfix.md
   - Maintain unchanged behavior (regression prevention)
   - Add comments referencing bug number

3. **Write Tests**
   - Unit tests for service logic
   - Integration tests for API endpoints
   - Regression tests for all scenarios

4. **Verify Fix**
   - Run all tests
   - Manual testing of affected flows
   - Check for side effects

5. **Update Documentation**
   - Update IMPLEMENTATION_STATUS.md
   - Update CODEBASE_MAP.md if needed
   - Update module mapping JSON if needed
   - Add comments in code

6. **Code Review**
   - Submit PR with bug number in title
   - Include test results
   - Reference bugfix.md requirements

---

## Related Documentation

### Architecture
- [Core Architecture](../../../PLATFORM_DOCS/CORE_ARCHITECTURE.md)
- [Backend Build](../../../PLATFORM_DOCS/BACKEND_BUILD.md)
- [Frontend Build](../../../PLATFORM_DOCS/FRONTEND_BUILD.md)
- [Multi-Tenancy](../../../PLATFORM_DOCS/MULTI_TENANCY.md)

### Module Documentation
- [Finance Module](../../../user-manuals/01_FINANCE.md)
- [Inventory Module](../../../user-manuals/04_INVENTORY.md)
- [Retail Module](../../../readme/RETAIL_MODULE.md)

### Development Guides
- [Quick Start](../../../QUICK_START.md)
- [Database Setup](../../../DATABASE_SETUP.md)
- [VPS Deployment](../../../VPS_AUTOMATION.md)

---

## Contact & Support

- **Technical Lead:** Development Team
- **Spec Owner:** Development Team
- **Review Cycle:** Daily during active development

---

## Change Log

### 2026-05-22
- Created CONTEXT.md
- Updated graphify mappings (Finance, Inventory)
- Created centralized docs/ directory
- Created SPEC.md and CODEBASE_MAP.md
- Verified bug status and locations

---

**This context document is maintained alongside the core-retail-stabilization spec.**  
**Update this document whenever bug status changes or new information is discovered.**
