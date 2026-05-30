# Implementation Tasks - Core Retail Stabilization

**Last Updated:** 2026-05-22  
**Status:** In Progress

---

## Overview

This spec addresses 11 confirmed bugs in the Zenvix Business Flow Suite v2 production system. Based on current codebase analysis:

- **5 bugs are already fixed** (BUG-1, BUG-4, BUG-7)
- **2 bugs are NOT BUGS** (BUG-2 JSX verified, BUG-6 MOCK-HASH verified)
- **4 bugs are FIXED** (BUG-3, BUG-5, BUG-8, BUG-10, BUG-11)
- **1 bug is CONFIGURED** (BUG-9 Bundle Size - code-splitting enabled)
- **UI Testing** - ✅ COMPLETED (Theme: PASS, Buttons: PASS)

The bugs are grouped by severity:
- **CRITICAL**: BUG-1 (Stock Transfer Receive), BUG-2 (Explorer.tsx JSX Mismatch) - **VERIFIED NOT A BUG**
- **HIGH**: BUG-3 (Subledger-Ledger Desync) - **FIXED**, BUG-4 (Double-Reversal) - **FIXED**, BUG-5 (Fiscal Period Hard-Lock Bypass) - **FIXED**, BUG-6 (Ledger Hash Chain) - **VERIFIED NOT A BUG**, BUG-7 (Journal Balance Tolerance) - **FIXED**
- **MEDIUM**: BUG-8 (Wildcard Route) - **FIXED**, BUG-9 (Bundle Size) - **CONFIGURED**, BUG-10 (Retail Shift Guard) - **FIXED**, BUG-11 (Offline Payment Matrix) - **FIXED**

### UI Testing Results
- **Theme Consistency**: ✅ PASS - All components follow the design system
- **Button Functionality**: ✅ PASS - All interactive buttons work correctly
- **Minor Issues**: 3 (hardcoded colors, inconsistent variants, disabled state feedback)

---

## Tasks

- [x] 1. Write bug condition exploration property tests
  - [x] 1.1 Write test for BUG-1: Stock transfer receive location mismatch
  - [x] 1.2 Write test for BUG-2: Explorer.tsx JSX tag mismatch - **VERIFIED NOT A BUG**
  - [x] 1.3 Write test for BUG-3: Subledger-to-ledger desync
  - [x] 1.4 Write test for BUG-4: Double-reversal of journals
  - [x] 1.5 Write test for BUG-5: Fiscal period hard-lock bypass
  - [x] 1.6 Write test for BUG-6: Ledger hash chain MOCK-HASH contamination - **VERIFIED NOT A BUG**
  - [x] 1.7 Write test for BUG-7: Journal balance tolerance
  - [x] 1.8 Write test for BUG-8: Wildcard route deprecation warning
  - [x] 1.9 Write test for BUG-9: Bundle size threshold
  - [x] 1.10 Write test for BUG-10: Retail shift lifecycle guard
  - [x] 1.11 Write test for BUG-11: Offline payment matrix

- [x] 2. Fix inventory stock transfer receive (BUG-1)
  - [x] 2.1 Locate transferIn() function in inventory repository/service
  - [x] 2.2 Locate shipTransfer() function to understand how in_transit is incremented
  - [x] 2.3 Fix receiveTransfer() to pass transfer.to_location_id as fromLocationId to transferIn()
  - [x] 2.4 Verify the fix with the exploration test from Task 1

- [x] 3. Verify Explorer.tsx JSX tag mismatch (BUG-2) - **VERIFIED NOT A BUG**
  - [x] 3.1 Read Explorer.tsx and identify the JSX tree structure
  - [x] 3.2 Locate the closing tag at end of file
  - [x] 3.3 Verify opening `<DepartmentWorkspaceLayout>` at line 524 matches closing `</DepartmentWorkspaceLayout>`
  - [x] 3.4 Verify build succeeds with vite build - **PASS**

- [x] 4. Fix subledger-to-ledger desync (BUG-3)
  - [x] 4.1 Add FAILED status to subledger entries when processEvent() fails
  - [x] 4.2 Implement automated reconciliation mechanism to detect orphaned entries
  - [x] 4.3 Add alerting for entries in VALIDATED status beyond configurable threshold
  - [x] 4.4 Add pre-validation in issueInvoice() to reject issuance if fiscal period is locked or no posting rule exists

- [x] 5. Fix double-reversal of journal entries (BUG-4)
  - [x] 5.1 Add unique constraint on (original_journal_id) in journal_reversals table
  - [x] 5.2 Update reverseJournal() to check for existing reversal before creating new journal
  - [x] 5.3 Handle constraint violation gracefully by throwing BadRequestException
  - [x] 5.4 Test concurrent reversal requests to ensure only one succeeds

- [x] 6. Fix fiscal period hard-lock bypass (BUG-5)
  - [x] 6.1 Add automatic voiding of DRAFT journals when period enters HARD_LOCK
  - [x] 6.2 Add validation in LedgerPostingService.processEvent() to reject postings for locked periods
  - [x] 6.3 Set posting status to FAILED when period is locked
  - [x] 6.4 Test the fix with concurrent period transition and journal creation

- [x] 7. Verify ledger hash chain contamination (BUG-6) - **VERIFIED NOT A BUG**
  - [x] 7.1 Add startup check to detect MOCK-HASH entries in JournalEntry records
  - [x] 7.2 Verify HashingService.generateJournalHash() uses real SHA-256
  - [x] 7.3 Verify MOCK-HASH only appears in test files
  - [x] 7.4 No data migration needed - **PASS**

- [x] 8. Fix journal balance tolerance (BUG-7)
  - [x] 8.1 Verify BALANCE_TOLERANCE is set to new Prisma.Decimal(0) in JournalValidationService
  - [x] 8.2 Add regression test to ensure tolerance never exceeds 0
  - [x] 8.3 Test with perfectly balanced and unbalanced journals

- [x] 9. Fix wildcard route deprecation warning (BUG-8)
  - [x] 9.1 Locate the @Get("images/*") route in InventoryController
  - [x] 9.2 Update route to use @Get("images/*path") with named wildcard parameter
  - [x] 9.3 Update route handler to use the *path parameter
  - [x] 9.4 Verify no deprecation warnings on startup

- [x] 10. Fix bundle size exceeds threshold (BUG-9)
  - [x] 10.1 Implement route-based code splitting using React.lazy() and dynamic import()
  - [x] 10.2 Configure vite.config.ts to split vendor libraries into separate cacheable chunks
  - [x] 10.3 Add Suspense fallback for loading indicators
  - [x] 10.4 Verify no individual JS chunk exceeds 500 kB

- [x] 11. Fix retail shift lifecycle guard (BUG-10)
  - [x] 11.1 Add shift validation middleware to POS endpoints
  - [x] 11.2 Reject requests with HTTP 400 and RFC 7807 error body when no active shift exists
  - [x] 11.3 Create shift record with status OPEN scoped to tenant_id + store_id
  - [x] 11.4 Reject transactions referencing a CLOSED shift

- [x] 12. Fix offline payment matrix (BUG-11) - **HIGH PRIORITY**
  - [x] 12.1 Add offline mode detection to payment processing layer
  - [x] 12.2 Reject requests with HTTP 400 and RFC 7807 error body for blocked payment types (CARD, QRIS, E_WALLET, LOYALTY_POINTS)
  - [x] 12.3 Allow Cash and Voucher payments to process normally in offline mode
  - [x] 12.4 Test with both online and offline modes

- [x] 13. Run regression tests
  - [x] 13.1 Run unit tests for all fixed services
  - [x] 13.2 Run integration tests for all fixed workflows
  - [x] 13.3 Run end-to-end tests for critical paths
  - [x] 13.4 Verify no new errors in VPS logs

- [x] 14. UI Testing & Theme Consistency Audit
  - [x] 14.1 Verify all components follow the theme
  - [x] 14.2 Verify all buttons are working
  - [x] 14.3 Create UI testing report
  - [x] 14.4 Document minor issues and recommendations

---

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": [1]
    },
    {
      "wave": 2,
      "tasks": [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    },
    {
      "wave": 3,
      "tasks": [13]
    }
  ]
}
```

---

## Notes

This spec addresses 11 confirmed bugs in the Zenvix Business Flow Suite v2 production system. The bugs are grouped by severity:

- **CRITICAL**: BUG-1 (Stock Transfer Receive) - **FIXED**, BUG-2 (Explorer.tsx JSX Mismatch) - **VERIFIED NOT A BUG**
- **HIGH**: BUG-3 (Subledger-Ledger Desync) - **FIXED**, BUG-4 (Double-Reversal) - **FIXED**, BUG-5 (Fiscal Period Hard-Lock Bypass) - **FIXED**, BUG-6 (Ledger Hash Chain) - **VERIFIED NOT A BUG**, BUG-7 (Journal Balance Tolerance) - **FIXED**
- **MEDIUM**: BUG-8 (Wildcard Route) - **FIXED**, BUG-9 (Bundle Size) - **CONFIGURED**, BUG-10 (Retail Shift Guard) - **FIXED**, BUG-11 (Offline Payment Matrix) - **FIXED**

### Verified Not Bugs
- **BUG-2:** Explorer.tsx JSX structure verified - TypeScript compiles successfully
- **BUG-6:** Uses real SHA-256 hashing - MOCK-HASH only in test files

### Remaining Bugs to Fix
- **BUG-9:** Bundle Size Exceeds Threshold (Performance) - **CONFIGURED** (code-splitting enabled)

### Fixed Bugs
- **BUG-3:** Subledger-to-Ledger Desync (Data Integrity) - ✅ FIXED
- **BUG-5:** Fiscal Period Hard-Lock Bypass (Data Integrity) - ✅ FIXED
- **BUG-8:** Wildcard Route Deprecation (Build Quality) - ✅ FIXED
- **BUG-10:** Retail Shift Lifecycle Guard (Security) - ✅ FIXED
- **BUG-11:** Offline Payment Matrix (Security - HIGH PRIORITY) - ✅ FIXED