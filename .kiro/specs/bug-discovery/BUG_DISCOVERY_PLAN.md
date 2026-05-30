# Bug Discovery & UI Validation Plan

**Created:** 2026-05-22  
**Purpose:** Systematic identification of all bugs and non-working UI elements  
**Status:** Planning Phase

---

## Objectives

1. **Identify all existing bugs** beyond the 11 already documented
2. **Find all non-working buttons** and UI elements
3. **Validate all critical user flows**
4. **Document all issues** with reproduction steps
5. **Prioritize fixes** based on severity and impact

---

## Discovery Strategy

### Phase 1: Automated Analysis (Week 1)

#### 1.1 Static Code Analysis
- [ ] Run TypeScript compiler in strict mode
- [ ] Run ESLint with all rules enabled
- [ ] Analyze console errors and warnings
- [ ] Check for unused imports and dead code
- [ ] Identify missing error handlers

#### 1.2 Build Analysis
- [ ] Frontend build errors/warnings
- [ ] Backend build errors/warnings
- [ ] Bundle size analysis
- [ ] Dependency vulnerabilities

#### 1.3 Database Analysis
- [ ] Check for orphaned records
- [ ] Validate foreign key constraints
- [ ] Identify missing indexes
- [ ] Check for data inconsistencies

---

### Phase 2: Backend API Testing (Week 1-2)

#### 2.1 Finance Module API
- [ ] Test all journal entry endpoints
- [ ] Test AR invoice lifecycle
- [ ] Test AP bill lifecycle
- [ ] Test fiscal period transitions
- [ ] Test journal reversal
- [ ] Test ledger integrity

#### 2.2 Inventory Module API
- [ ] Test stock transfer lifecycle (REQUESTED → RECEIVED)
- [ ] Test stock adjustments
- [ ] Test stock reservations
- [ ] Test item master CRUD
- [ ] Test location management
- [ ] Test image upload/retrieval

#### 2.3 HR Module API
- [ ] Test employee CRUD
- [ ] Test attendance tracking
- [ ] Test leave requests
- [ ] Test payroll processing
- [ ] Test recruitment workflow
- [ ] Test performance reviews

#### 2.4 Retail Module API
- [ ] Test POS order creation
- [ ] Test shift lifecycle (OPEN → CLOSED)
- [ ] Test cash drawer operations
- [ ] Test customer management
- [ ] Test channel sync
- [ ] Test offline mode

#### 2.5 Other Modules
- [ ] Procurement API endpoints
- [ ] Sales API endpoints
- [ ] Marketing API endpoints
- [ ] Payment API endpoints
- [ ] IT API endpoints

---

### Phase 3: Frontend UI Testing (Week 2-3)

#### 3.1 Core Pages - Finance
**Pages to Test:**
- [ ] `/core/finance/money-desk` - Money Desk
- [ ] `/core/finance/ledger` - General Ledger
- [ ] `/core/finance/ar-invoices` - AR Invoices
- [ ] `/core/finance/ap-bills` - AP Bills
- [ ] `/core/finance/treasury-map` - Treasury Map
- [ ] `/core/finance/fixed-assets` - Fixed Assets

**Test Cases:**
- [ ] All buttons clickable and functional
- [ ] Forms submit successfully
- [ ] Data loads correctly
- [ ] Filters work
- [ ] Export functions work
- [ ] Modals open/close properly
- [ ] Validation messages display
- [ ] Error handling works

#### 3.2 Core Pages - Inventory
**Pages to Test:**
- [ ] `/core/inventory/dashboard` - Stock Controller
- [ ] `/core/inventory/receiving` - Receiving Dock
- [ ] `/core/inventory/adjustments` - Adjustment Desk
- [ ] `/core/inventory/transfers` - Transfer Hub
- [ ] `/core/inventory/items` - Item Master

**Test Cases:**
- [ ] Stock transfer creation
- [ ] Stock transfer receive
- [ ] Adjustment creation
- [ ] Item creation/edit
- [ ] Image upload
- [ ] Barcode scanning
- [ ] Search functionality
- [ ] Filters work

#### 3.3 Core Pages - HR
**Pages to Test:**
- [ ] `/core/hr/employees` - Employee Directory
- [ ] `/core/hr/attendance` - Attendance Tracking
- [ ] `/core/hr/payroll` - Payroll Management
- [ ] `/core/hr/recruitment` - Recruitment Pipeline
- [ ] `/core/hr/performance` - Performance Reviews
- [ ] `/core/hr/leave` - Leave Management

**Test Cases:**
- [ ] Employee CRUD operations
- [ ] Attendance check-in/out
- [ ] Payroll run creation
- [ ] Leave request submission
- [ ] Performance review workflow
- [ ] Document upload

#### 3.4 Core Pages - Tools
**Pages to Test:**
- [ ] `/core/tools/explorer` - File Explorer (BUG-2 known)
- [ ] `/core/tools/workflows` - Workflow Management
- [ ] `/core/tools/audit` - Audit Trail
- [ ] `/core/tools/logs` - System Logs

**Test Cases:**
- [ ] File upload/download
- [ ] Folder creation
- [ ] File preview
- [ ] Workflow creation
- [ ] Audit log filtering
- [ ] Log search

#### 3.5 Retail Module Pages
**Pages to Test:**
- [ ] `/retail/pos` - Point of Sale
- [ ] `/retail/kiosk` - Self-Service Kiosk
- [ ] `/retail/shift-control` - Shift Management
- [ ] `/retail/dashboard` - Retail Dashboard
- [ ] `/retail/products` - Product Management
- [ ] `/retail/channels` - Channel Sync

**Test Cases:**
- [ ] Shift open/close
- [ ] Order creation
- [ ] Payment processing (online/offline)
- [ ] Barcode scanning
- [ ] Product search
- [ ] Channel sync triggers
- [ ] Cash drawer operations

#### 3.6 Other Module Pages
- [ ] Procurement pages
- [ ] Sales pages
- [ ] Marketing pages
- [ ] Payment pages
- [ ] IT pages
- [ ] Admin pages
- [ ] Settings pages

---

### Phase 4: Integration Flow Testing (Week 3-4)

#### 4.1 Finance Integration Flows
- [ ] **Inventory → Finance:** Stock movement creates journal entry
- [ ] **HR → Finance:** Payroll run creates journal entry
- [ ] **Retail → Finance:** Order creates AR invoice
- [ ] **Procurement → Finance:** Goods receipt creates AP bill

#### 4.2 Inventory Integration Flows
- [ ] **Retail → Inventory:** Order reserves stock
- [ ] **Procurement → Inventory:** Goods receipt increases stock
- [ ] **Finance → Inventory:** Valuation updates

#### 4.3 Cross-Module Workflows
- [ ] Purchase requisition → PO → Goods receipt → AP bill → Payment
- [ ] Sales lead → Opportunity → Quote → Order → Invoice → Payment
- [ ] Employee onboarding → Payroll setup → First payroll run
- [ ] Stock transfer → Receive → Valuation update

---

### Phase 5: Error Scenario Testing (Week 4)

#### 5.1 Validation Errors
- [ ] Test all form validations
- [ ] Test required field enforcement
- [ ] Test data type validations
- [ ] Test business rule validations

#### 5.2 Permission Errors
- [ ] Test role-based access control
- [ ] Test module licensing
- [ ] Test department-level access
- [ ] Test tenant isolation

#### 5.3 Data Integrity Errors
- [ ] Test duplicate prevention
- [ ] Test foreign key constraints
- [ ] Test transaction rollbacks
- [ ] Test idempotency

#### 5.4 Network Errors
- [ ] Test offline mode
- [ ] Test connection loss during operations
- [ ] Test sync after reconnection
- [ ] Test timeout handling

---

## Testing Tools & Methods

### Automated Testing

#### 1. Unit Tests
```bash
# Run existing unit tests
npm run test

# Run with coverage
npm run test:coverage
```

#### 2. Integration Tests
```bash
# Run integration tests
npm run test:integration

# Run specific module tests
npm run test:integration -- --grep "Finance"
```

#### 3. E2E Tests (Playwright)
```bash
# Run E2E tests
npm run test:e2e

# Run in headed mode
npm run test:e2e -- --headed

# Run specific test
npm run test:e2e -- tests/retail-pos.spec.ts
```

#### 4. API Testing (Postman/Thunder Client)
- Import API collection
- Run all endpoints
- Check response codes
- Validate response schemas

### Manual Testing

#### 1. Browser DevTools
- Check console for errors
- Monitor network requests
- Check for failed API calls
- Inspect element states

#### 2. Database Inspection
```sql
-- Check for orphaned records
-- Check for data inconsistencies
-- Validate relationships
```

#### 3. User Flow Testing
- Follow user manuals step-by-step
- Test all documented workflows
- Verify expected outcomes

---

## Bug Documentation Template

### Bug Report Format
```markdown
## BUG-XX: [Short Title]

**Severity:** CRITICAL | HIGH | MEDIUM | LOW
**Module:** Finance | Inventory | HR | Retail | etc.
**Component:** Backend | Frontend | Database
**Status:** NEW | CONFIRMED | IN_PROGRESS | FIXED

### Location
- **File:** path/to/file.ts
- **Line:** 123
- **Function:** functionName()

### Description
Clear description of the bug

### Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

### Expected Behavior
What should happen

### Actual Behavior
What actually happens

### Impact
Who is affected and how

### Root Cause
Technical explanation (if known)

### Proposed Fix
How to fix it

### Related Issues
- BUG-XX
- BUG-YY
```

---

## Discovery Checklist

### Backend Analysis
- [ ] Compile TypeScript with strict mode
- [ ] Run ESLint on all backend files
- [ ] Check all controller endpoints
- [ ] Check all service methods
- [ ] Check all repository queries
- [ ] Check all event listeners
- [ ] Check all guards and middleware
- [ ] Check all validation pipes
- [ ] Check error handling
- [ ] Check logging

### Frontend Analysis
- [ ] Compile TypeScript with strict mode
- [ ] Run ESLint on all frontend files
- [ ] Check all page components
- [ ] Check all form submissions
- [ ] Check all button click handlers
- [ ] Check all API calls
- [ ] Check all state management
- [ ] Check all routing
- [ ] Check error boundaries
- [ ] Check loading states

### Database Analysis
- [ ] Run Prisma validation
- [ ] Check for missing migrations
- [ ] Check for orphaned records
- [ ] Check for constraint violations
- [ ] Check for missing indexes
- [ ] Check for slow queries
- [ ] Check for data inconsistencies

### UI/UX Analysis
- [ ] Test all navigation links
- [ ] Test all buttons
- [ ] Test all forms
- [ ] Test all modals
- [ ] Test all dropdowns
- [ ] Test all search boxes
- [ ] Test all filters
- [ ] Test all exports
- [ ] Test all imports
- [ ] Test all file uploads

---

## Known Issues to Verify

### From Existing Documentation

#### Already Documented (11 bugs)
1. ✅ BUG-1: Inventory Stock Transfer Receive - FIXED
2. ⚠️ BUG-2: Explorer.tsx JSX Tag Mismatch - NEEDS VERIFICATION
3. ❌ BUG-3: Subledger-to-Ledger Desync - NOT FIXED
4. ✅ BUG-4: Double-Reversal - FIXED
5. ❌ BUG-5: Fiscal Period Hard-Lock Bypass - NOT FIXED
6. ⚠️ BUG-6: Ledger Hash Chain Contamination - NEEDS VERIFICATION
7. ✅ BUG-7: Journal Balance Tolerance - FIXED
8. ⚠️ BUG-8: Wildcard Route Deprecation - NEEDS VERIFICATION
9. ❌ BUG-9: Bundle Size - NOT FIXED
10. ❌ BUG-10: Shift Lifecycle Guard - NOT FIXED
11. ❌ BUG-11: Offline Payment Matrix - NOT FIXED

#### Potential Issues from Code Review
- [ ] Missing error handlers in async functions
- [ ] Unhandled promise rejections
- [ ] Race conditions in concurrent operations
- [ ] Memory leaks in subscriptions
- [ ] Infinite loops in useEffect
- [ ] Missing loading states
- [ ] Missing error states
- [ ] Broken navigation links
- [ ] Non-functional buttons
- [ ] Failed API calls
- [ ] Missing validations
- [ ] Incorrect permissions

---

## Priority Matrix

### Critical (P0) - Production Blockers
- Build failures
- Data corruption
- Security vulnerabilities
- Complete feature failures

### High (P1) - Major Functionality
- Core workflow failures
- Data integrity issues
- Performance problems
- User-facing errors

### Medium (P2) - Minor Functionality
- UI glitches
- Non-critical validations
- Cosmetic issues
- Edge cases

### Low (P3) - Nice to Have
- Code quality
- Documentation
- Optimization
- Refactoring

---

## Execution Plan

### Week 1: Automated Analysis + Backend Testing
**Days 1-2:** Static analysis and build validation
**Days 3-5:** Backend API testing (Finance, Inventory, HR)

### Week 2: Backend Testing + Frontend Testing Start
**Days 1-2:** Backend API testing (Retail, other modules)
**Days 3-5:** Frontend testing (Finance, Inventory pages)

### Week 3: Frontend Testing + Integration Testing
**Days 1-3:** Frontend testing (HR, Retail, Tools pages)
**Days 4-5:** Integration flow testing

### Week 4: Error Scenarios + Documentation
**Days 1-2:** Error scenario testing
**Days 3-4:** Bug documentation and prioritization
**Day 5:** Final report and recommendations

---

## Deliverables

### 1. Bug Registry
- Complete list of all bugs
- Severity and priority
- Reproduction steps
- Proposed fixes

### 2. UI Validation Report
- All non-working buttons
- All broken links
- All failed API calls
- All UI glitches

### 3. Test Coverage Report
- Unit test coverage
- Integration test coverage
- E2E test coverage
- Gaps in testing

### 4. Prioritized Fix Plan
- Critical bugs (immediate)
- High priority bugs (this sprint)
- Medium priority bugs (next sprint)
- Low priority bugs (backlog)

### 5. Regression Test Suite
- Automated tests for all bugs
- Manual test cases
- Smoke test checklist

---

## Success Criteria

- [ ] All pages tested manually
- [ ] All API endpoints tested
- [ ] All integration flows validated
- [ ] All bugs documented with reproduction steps
- [ ] All bugs prioritized
- [ ] Test coverage > 70%
- [ ] Zero critical bugs in production
- [ ] All non-working buttons identified
- [ ] Fix plan created and approved

---

## Team Assignments

### Backend Testing
- **Owner:** Backend Developer
- **Support:** QA Engineer

### Frontend Testing
- **Owner:** Frontend Developer
- **Support:** QA Engineer

### Integration Testing
- **Owner:** Full Stack Developer
- **Support:** QA Engineer

### Documentation
- **Owner:** Technical Writer
- **Support:** Development Team

---

## Risk Mitigation

### Risks
1. **Time Constraint:** 4 weeks may not be enough
   - **Mitigation:** Prioritize critical paths first

2. **Resource Constraint:** Limited team availability
   - **Mitigation:** Focus on automated testing

3. **Scope Creep:** New bugs discovered during testing
   - **Mitigation:** Strict prioritization and triage

4. **Production Impact:** Testing may affect live system
   - **Mitigation:** Use staging environment

---

## Next Steps

1. **Immediate (Today):**
   - [ ] Review and approve this plan
   - [ ] Set up testing environment
   - [ ] Prepare testing tools

2. **Week 1 Start:**
   - [ ] Begin static code analysis
   - [ ] Start backend API testing
   - [ ] Set up bug tracking system

3. **Ongoing:**
   - [ ] Daily standup to review progress
   - [ ] Document bugs as discovered
   - [ ] Update priority as needed

---

**Plan Owner:** Development Team  
**Review Date:** 2026-05-22  
**Approval Status:** Pending Review
