# Requirements Document

## Introduction

This specification defines the production-readiness audit and remediation requirements for all 8 core business modules (HR, Finance, Procurement, Sales, Marketing, IT, Inventory, and Retail) in the Zenvix Business Flow Suite. The current system-wide readiness score is 65.7% with all modules at "no-go" status. This specification aims to bring every module to 90%+ production-readiness by eliminating stub implementations, connecting all APIs to real backend services, resolving performance issues, and ensuring end-to-end workflow integrity.

## Glossary

- **Module_System**: The Zenvix Business Flow Suite application comprising frontend (React/Vite/TypeScript) and backend (NestJS/Prisma/PostgreSQL) layers
- **Stub_Modal**: A dialog/modal component in the frontend that renders placeholder content ("Coming Soon", empty form, or non-functional UI) instead of a working implementation
- **Mock_API**: A frontend API call that returns hardcoded/static data instead of fetching from the backend service
- **Disconnected_API**: A frontend API call targeting an endpoint that does not exist in the backend controller routing
- **Pagination_Guard**: A Prisma `findMany()` query that includes `take` and `skip` (or `cursor`) arguments to limit result set size
- **Cache_Interceptor**: A NestJS `@UseInterceptors(CacheInterceptor)` decorator applied to GET endpoints to prevent redundant database queries
- **E2E_Workflow**: A Playwright end-to-end test that validates a complete business process from start to finish
- **Readiness_Score**: A numeric percentage (0-100) indicating a module's production-readiness based on functional elements, API connectivity, modal completeness, workflow success, and performance issue count
- **HR_Module**: Human Resources module covering employees, departments, leave, attendance, and payroll
- **Finance_Module**: Finance module covering ledger, assets, reconciliation, CFO dashboard, and financial reporting
- **Procurement_Module**: Procurement module covering purchase orders, approvals, goods receipt, and vendor management
- **Sales_Module**: Sales module covering leads, opportunities, quotations, orders, and pipeline metrics
- **Marketing_Module**: Marketing module covering campaigns, audience targeting, scheduling, and campaign metrics
- **IT_Module**: IT Service module covering support tickets, SLA management, escalation, and resolution
- **Inventory_Module**: Inventory module covering items, stock levels, movements, adjustments, transfers, and import jobs
- **Retail_Module**: Retail module covering POS, sales history, inventory visibility, pricing, shift control, and channel management
- **Business_Rule**: A domain-specific constraint or validation that ensures data integrity and correct business process flow
- **Input_Validator**: A Zod schema or class-validator decorator that validates request payloads before processing

## Requirements

### Requirement 1: Stub Modal Elimination — HR Module

**User Story:** As an HR manager, I want all HR module dialogs to be fully functional, so that I can perform employee management tasks without encountering placeholder screens.

#### Acceptance Criteria

1. WHEN a user opens any of the 27 stub modals in the HR_Module, THE Module_System SHALL render within 2 seconds a form containing labeled input fields for each required attribute of the modal's domain entity (employees, departments, leave, attendance, or payroll), client-side validation rules for required fields and format constraints, and an enabled submit action
2. WHEN a user submits data through an HR modal form, THE Module_System SHALL send the data to the corresponding backend endpoint, persist it in the database, close the modal, and display a success confirmation message within the parent view
3. IF a modal form submission fails due to validation errors, THEN THE Module_System SHALL display field-level error messages adjacent to each invalid field without clearing or losing user-entered input in other fields
4. IF a modal form submission fails due to a server error or network failure, THEN THE Module_System SHALL display an error message indicating the failure reason, retain all user-entered data in the form, and keep the modal open so the user can retry
5. WHEN a user cancels or closes a modal, THE Module_System SHALL discard unsaved changes and return to the previous view state without persisting any data to the backend

### Requirement 2: Stub Modal Elimination — Finance Module

**User Story:** As a finance controller, I want all Finance module dialogs to be fully functional, so that I can manage financial records, create journal entries, and process transactions.

#### Acceptance Criteria

1. WHEN a user opens any of the 42 stub modals in the Finance_Module, THE Module_System SHALL render a fully functional form that includes at least one input field, one submit action, and client-side validation that prevents submission of empty required fields
2. WHEN a user creates a journal entry through the Ledger Core modal, THE Module_System SHALL enforce double-entry accounting rules by disabling the submit action until total debits equal total credits (within a tolerance of 0.01) and the entry contains at least 2 line items
3. WHEN a user submits financial data through any Finance modal, THE Module_System SHALL record an audit trail entry capturing the user ID, ISO-8601 timestamp, action description, and the entity identifier of the changed record
4. IF a financial transaction violates Business_Rules (journal entry where total debits do not equal total credits, empty required account code fields, or payment amount of zero or below), THEN THE Module_System SHALL reject the submission, keep the modal open with user-entered data preserved, and display an inline error message indicating the specific constraint that was violated
5. THE Module_System SHALL replace all 11 stub elements in the Finance_Module with functional components that retrieve and display data from the backend API within 3 seconds of the component mounting
6. WHEN a user opens a Finance modal and the backend API request fails, THE Module_System SHALL display an error state within the modal indicating the data could not be loaded and provide a retry action

### Requirement 3: Stub Modal Elimination — Procurement Module

**User Story:** As a procurement officer, I want all Procurement module dialogs to be fully functional, so that I can create purchase orders, manage vendors, and process goods receipts.

#### Acceptance Criteria

1. WHEN a user opens any of the 11 stub modals in the Procurement_Module, THE Module_System SHALL render the modal with all input fields enabled, a functional submit handler that persists data to the backend, and a cancel action that closes the modal without side effects
2. WHEN a user submits a purchase order modal, THE Module_System SHALL validate that a vendor is selected, at least 1 line item is present, each line item has a quantity greater than 0, and each line item has a unit price greater than 0, before sending the request to the backend
3. IF any required field fails validation on a Procurement_Module modal submission, THEN THE Module_System SHALL prevent the submission, display an inline error message indicating which field is invalid, and preserve all user-entered data in the form
4. WHEN a purchase order is approved, THE Module_System SHALL transition the order status to the next workflow state and display a success confirmation message to the user within the same view
5. WHEN a user submits any Procurement_Module modal and the backend returns an error, THE Module_System SHALL display an error message indicating the failure reason and retain the modal in its open state with all previously entered data intact

### Requirement 4: Stub Modal Elimination — Sales Module

**User Story:** As a sales representative, I want all Sales module dialogs to be fully functional, so that I can manage leads, create quotations, and process orders.

#### Acceptance Criteria

1. WHEN a user opens any of the 8 stub modals in the Sales_Module, THE Module_System SHALL render a fully functional form with labeled input fields corresponding to the entity being created or edited, client-side validation on required fields, and a submit action that persists data to the backend
2. WHEN a user converts a lead to an opportunity through a modal, THE Module_System SHALL create the opportunity record with the lead's company name, contact, and potential value carried over, and update the lead status to "converted"
3. IF a modal form submission fails due to validation errors or a backend error, THEN THE Module_System SHALL display an error indication identifying the failure reason without losing the user's entered data
4. WHEN a user creates a quotation, THE Module_System SHALL calculate each line item total as quantity multiplied by unit price, subtract any per-line discount amount or percentage, and compute the grand total as the sum of all line item totals
5. WHEN a user opens the Sales_Module, THE Module_System SHALL replace the 1 stub element with a functional component that retrieves and displays data from the backend

### Requirement 5: Stub Modal Elimination — Marketing Module

**User Story:** As a marketing manager, I want all Marketing module dialogs to be fully functional, so that I can create campaigns, define audiences, and track metrics.

#### Acceptance Criteria

1. WHEN a user opens any of the 13 stub modals in the Marketing_Module, THE Module_System SHALL render a form containing all input fields relevant to that modal's domain entity (campaign, lead, funnel, nurture workflow, execution, or connected account), with each required field marked and enforcing validation on submission
2. WHEN a user submits a campaign creation form, THE Module_System SHALL validate that the campaign name is between 3 and 100 characters, a start date is provided, the end date is equal to or later than the start date, and at least one audience segment is specified before allowing submission
3. IF campaign creation form validation fails, THEN THE Module_System SHALL display an inline error message adjacent to each invalid field and prevent form submission until all validation errors are resolved
4. WHEN a user schedules a campaign, THE Module_System SHALL persist the schedule to the backend and display the campaign in the calendar view with the start and end dates matching the values entered in the form
5. IF a modal form submission fails due to a backend error, THEN THE Module_System SHALL display a toast notification indicating the operation failed, retain the user's entered data in the form, and keep the modal open

### Requirement 6: Stub Modal Elimination — IT Module

**User Story:** As an IT administrator, I want all IT module dialogs to be fully functional, so that I can manage support tickets, assign resources, and track SLA compliance.

#### Acceptance Criteria

1. WHEN a user opens any of the 7 stub modals in the IT_Module, THE Module_System SHALL render a fully functional form with IT service management fields, input validation enforced before submission, and a submit action that persists data to the corresponding backend endpoint
2. WHEN a user submits data through an IT modal form, THE Module_System SHALL send the data to the corresponding backend endpoint and persist it in the database within 2 seconds
3. IF a modal form submission fails due to validation errors, THEN THE Module_System SHALL display field-level error messages indicating each invalid field without losing user-entered data
4. WHEN a user creates a support ticket, THE Module_System SHALL assign a priority level (Critical, High, Medium, or Low) based on the selected category and impact assessment before persisting the ticket
5. IF a ticket SLA breach is detected (response time or resolution time exceeds the threshold defined for the ticket's priority level), THEN THE Module_System SHALL trigger an escalation notification to the designated manager and update the ticket status to indicate the breach
6. WHEN a user cancels or closes a modal, THE Module_System SHALL discard unsaved changes and return to the previous view state

### Requirement 7: Stub Modal Elimination — Inventory Module

**User Story:** As an inventory manager, I want all Inventory module dialogs to be fully functional, so that I can manage items, track stock movements, and perform adjustments.

#### Acceptance Criteria

1. WHEN a user opens any of the 14 stub modals in the Inventory_Module, THE Module_System SHALL render a fully functional form that includes at minimum: labeled input fields relevant to the modal's domain operation, client-side validation on required fields, a submit action that calls the corresponding backend endpoint, and a cancel action that discards unsaved input
2. WHEN a user creates an inventory item, THE Module_System SHALL validate that the SKU is unique within the tenant, that required fields (name, unit of measure, category) are non-empty with name limited to 200 characters and SKU limited to 50 characters, and persist the item to the database upon successful validation
3. IF a user submits an inventory item with a SKU that already exists or with missing required fields, THEN THE Module_System SHALL reject the submission, display field-level error messages indicating the specific validation failure, and preserve all entered form data
4. WHEN a user performs a stock adjustment, THE Module_System SHALL require an adjustment reason (minimum 1 character, maximum 500 characters) and a non-zero quantity delta, record both values along with the user identity and timestamp, and update the current stock balance to reflect the delta
5. IF a stock adjustment would result in a negative stock balance, THEN THE Module_System SHALL reject the adjustment and display an error message indicating insufficient stock quantity
6. THE Module_System SHALL replace the 1 stub element in the Inventory_Module with a functional component that fetches and displays current inventory data from the backend, showing at minimum the item name, SKU, and stock quantity
7. IF a modal form submission fails due to a network or server error, THEN THE Module_System SHALL display an error message indicating the failure occurred, preserve all user-entered form data, and allow the user to retry the submission

### Requirement 8: Stub Modal Elimination — Retail Module

**User Story:** As a retail store manager, I want all Retail module dialogs to be fully functional, so that I can manage POS operations, pricing, shifts, and inventory visibility.

#### Acceptance Criteria

1. WHEN a user opens any of the 43 stub modals in the Retail_Module, THE Module_System SHALL render a form containing input fields relevant to the modal's domain context, a submit action that sends data to the corresponding backend endpoint, and client-side validation using Zod schemas that prevents submission of invalid data
2. WHEN a user opens a POS transaction modal, THE Module_System SHALL provide item lookup by SKU or name, quantity adjustment between 1 and 9999 units per line item, percentage or fixed-amount discount entry (0% to 100% or up to the line item total), and a payment method selection (cash or electronic) that initiates payment processing
3. THE Module_System SHALL replace all 14 stub elements in the Retail_Module with components that fetch and display data from backend API endpoints, showing a loading indicator during data retrieval and an error state if the request fails
4. WHEN a user accesses the Shift Control page, THE Module_System SHALL fetch and display shift records from the backend including open time, close time, counted cash total, and assigned operator name for each shift entry
5. IF a Retail modal form submission fails due to validation errors or a backend rejection, THEN THE Module_System SHALL display field-level or summary error messages indicating the reason for failure without clearing the user's entered data
6. WHEN a user cancels or closes a Retail modal without submitting, THE Module_System SHALL discard unsaved input and return the UI to its previous state without persisting changes

### Requirement 9: API Connectivity — Mock Data Elimination

**User Story:** As a system administrator, I want all frontend pages to display real data from the backend, so that users see actual business information instead of hardcoded placeholders.

#### Acceptance Criteria

1. THE Module_System SHALL replace mock data in the Finance_Module pages (Assets, CFO Dashboard, Reconciliation Desk) with TanStack Query hooks fetching from real backend endpoints
2. THE Module_System SHALL replace mock data in the Retail_Module pages (Sales History, Inventory Visibility, Pricing/Promo Desk, Shift Control) and 7 additional mock-data components (useGovernance hook, ItemDetailModal, TransferTrackingModal, Inventory page, inventory.types, WebhookBridgeSettingsPanel, CCTVViewerModal) with TanStack Query hooks fetching from real backend endpoints
3. THE Module_System SHALL replace mock data in the HR_Module page (Department Attendance Studio) with TanStack Query hooks fetching from real backend endpoints
4. WHEN a page initiates a data fetch from a backend endpoint, THE Module_System SHALL display a visible loading indicator within 100 milliseconds of the request starting and SHALL continue displaying it until the response is received or a timeout of 30 seconds is reached
5. IF a backend request fails due to a network error, HTTP 4xx, or HTTP 5xx response, THEN THE Module_System SHALL display an error state indicating the failure reason and providing a retry action that re-executes the failed query
6. WHEN the backend returns a successful response containing an empty dataset (zero records), THE Module_System SHALL display a descriptive empty-state message indicating no records are available, and SHALL NOT display any hardcoded placeholder data
7. IF a backend request exceeds 30 seconds without a response, THEN THE Module_System SHALL abort the request, display a timeout error state, and provide a retry action

### Requirement 10: API Connectivity — Disconnected Endpoint Resolution (Inventory)

**User Story:** As an inventory manager, I want all inventory operations to save and retrieve data from the backend, so that stock movements, balances, and images are accurately tracked.

#### Acceptance Criteria

1. WHEN the frontend requests `GET /inventory/movements` with an `item_id` query parameter, THE Module_System SHALL route the request to the backend movements endpoint and return a paginated response containing movement records filtered by that item_id, with a default page size of 50 records
2. WHEN the frontend requests `GET /inventory/balances` with an `item_id` query parameter, THE Module_System SHALL route the request to the backend balances endpoint and return current stock level records filtered by that item_id, with a default page size of 50 records
3. WHEN the frontend requests `GET /inventory/items/{id}/images`, THE Module_System SHALL route the request to the backend images endpoint and return an array of image objects including URL, image ID, and primary flag for the specified inventory item
4. WHEN the frontend requests `PUT /inventory/items/{id}/images/{imageId}/primary`, THE Module_System SHALL set the specified image as the primary image for the item, returning a success confirmation within 3 seconds
5. WHEN the frontend uploads an image via `POST /v1/inventory/items/{id}/images`, THE Module_System SHALL resolve the `/v1/` route prefix mismatch so the request reaches the backend handler, persists the uploaded file, and returns the new image metadata including URL and image ID
6. WHEN the frontend requests `PATCH /inventory/items/{id}` with updated field values, THE Module_System SHALL persist the changes and return the updated item record
7. WHEN the frontend requests `DELETE /inventory/items/{id}`, THE Module_System SHALL perform a soft-delete (setting a deleted_at timestamp without removing the database row) and return a success confirmation
8. WHEN the frontend requests `DELETE /inventory/import/jobs/{id}`, THE Module_System SHALL cancel the import job if it is in PENDING or PROCESSING status, and return a success confirmation
9. IF a disconnected endpoint request fails because the backend returns a 404 or connection error, THEN THE Module_System SHALL display a user-facing error message indicating the operation could not be completed and retain any unsaved user input
10. IF the frontend image upload request exceeds 10 MB per file, THEN THE Module_System SHALL reject the upload before transmission and display an error message indicating the maximum allowed file size

### Requirement 11: Backend Performance — Pagination Guards

**User Story:** As a system operator, I want all database queries to use pagination, so that the system remains responsive under production data volumes.

#### Acceptance Criteria

1. THE Module_System SHALL add Pagination_Guards to all Prisma `findMany()` calls across the backend, using a default page size of 50 records and a maximum allowed page size of 200 records
2. WHEN a list endpoint is called without explicit pagination parameters, THE Module_System SHALL apply the default page size of 50 and return the first page (page 1)
3. WHEN a list endpoint is called with `page` and `pageSize` query parameters, THE Module_System SHALL return the requested page using offset calculation `skip = (page - 1) * pageSize` and limit the results to the requested `pageSize`
4. IF a list endpoint receives an invalid pagination parameter (page less than 1, pageSize less than 1, pageSize greater than 200, or non-numeric values), THEN THE Module_System SHALL reject the request with a validation error indicating the accepted parameter ranges
5. THE Module_System SHALL include pagination metadata (totalCount, currentPage, pageSize, totalPages) in all paginated response payloads
6. THE Module_System SHALL add Pagination_Guards to all 8 unguarded `findMany()` calls in the sync controller, applying either take/skip or cursor-based pagination to prevent unbounded result sets
7. THE Module_System SHALL add Pagination_Guards to all unguarded `findMany()` calls in the intelligence service (3 calls), workflow service (1 call), reporting repository (2 calls), license service (1 call), IoT services (2 calls), event-bus service (3 calls), comms services (4 calls), and audit services (5 calls)

### Requirement 12: Backend Performance — Cache Interceptor Coverage

**User Story:** As a system operator, I want all GET endpoints to use response caching, so that repeated identical requests do not generate unnecessary database load.

#### Acceptance Criteria

1. THE Module_System SHALL apply Cache_Interceptor to all GET endpoints across shared controllers (sync, intelligence, workflow, reporting, logger, license, comms, audit) with a TTL of 30 seconds for endpoints returning transactional or frequently mutated data (sync delta, workflow inbox, notifications, chat messages, audit logs) and a TTL of 300 seconds for endpoints returning reference or configuration data (license modules, bulletin categories, mail accounts, public anchors)
2. THE Module_System SHALL apply Cache_Interceptor to GET endpoints in module-specific controllers (warehouse, inventory) with a TTL of 30 seconds
3. WHEN underlying data changes via a POST, PUT, PATCH, or DELETE operation on a given controller, THE Module_System SHALL invalidate all cache entries for GET endpoints within that same controller before returning the write response to the caller
4. IF a cached GET endpoint is called with identical request parameters (URL path, query string, and tenant header) within the TTL window and no invalidation has occurred, THEN THE Module_System SHALL return the cached response without executing a database query
5. WHEN the production audit performance analyzer is re-run, THE Module_System SHALL report zero "no_cache" severity issues across all scanned controllers

### Requirement 13: E2E Workflow — Retail POS Sales History

**User Story:** As a retail cashier, I want the sales history page to display real transaction data, so that I can review past sales and handle returns.

#### Acceptance Criteria

1. WHEN a user navigates to the Retail Sales History page, THE Module_System SHALL fetch transaction records from the backend API and display them sorted by transaction date in descending order (most recent first)
2. WHILE the Retail Sales History page is fetching data from the backend, THE Module_System SHALL display a loading indicator
3. WHEN a POS transaction is completed, THE Module_System SHALL persist the transaction to the backend and the sales history page SHALL reflect the new entry within 5 seconds of a page refresh
4. WHEN transaction records are displayed, THE Module_System SHALL show for each record: transaction date and time, item names, item quantities, line item totals, transaction grand total, payment method (cash, card, or mobile), transaction status, and cashier name
5. WHEN the sales history contains more than 50 records, THE Module_System SHALL paginate results displaying 50 records per page with next-page and previous-page navigation controls and a current page indicator
6. IF the backend request for sales history fails or the backend is unreachable, THEN THE Module_System SHALL display an error notification indicating the failure without losing the current filter selections
7. WHEN the sales history contains zero records matching the current filters, THE Module_System SHALL display an empty-state message indicating no transactions were found

### Requirement 14: E2E Workflow — Payment Module Create Button

**User Story:** As a finance officer, I want a functional "Create Payment" button on the payment page, so that I can initiate new payment records.

#### Acceptance Criteria

1. THE Module_System SHALL render a visible "Create Payment" button on the payment module page that is keyboard-focusable and has an accessible label
2. WHEN a user clicks the Create Payment button, THE Module_System SHALL open a form modal containing input fields for payment method, amount (numeric), recipient/beneficiary, purpose, and scheduled date
3. WHEN a user submits the payment form with valid data (recipient is non-empty, amount is greater than zero, and a payment method is selected), THE Module_System SHALL persist the payment record to the backend, close the modal, reset the form fields to their default values, and display the new payment record in the payment list within 3 seconds
4. IF the payment form submission fails due to a backend error, THEN THE Module_System SHALL display an error message indicating the failure reason and retain all entered form data so the user can correct and resubmit without re-entering values
5. IF the user submits the payment form with invalid data (empty recipient, amount of zero or less, or no payment method selected), THEN THE Module_System SHALL prevent submission and display a validation indicator on each invalid field without closing the modal

### Requirement 15: E2E Workflow — Security Module Layout Fix

**User Story:** As a security administrator, I want the security module to have a single main content area, so that E2E tests and accessibility tools can reliably identify the page structure.

#### Acceptance Criteria

1. WHEN the Security module page is rendered within the CoreLayout, THE Module_System SHALL produce exactly one `<main>` element (or element with `role="main"`) in the entire document DOM, by ensuring that nested layout components do not introduce an additional `<main>` element when already wrapped by a parent `<main>`
2. WHEN the Security module loads, THE Module_System SHALL ensure that the DOM contains zero duplicate landmark wrappers of the same type (no more than one `<main>`, one `<header>` per logical section, and one `<nav>` per navigation region) within the Security page route
3. THE Module_System SHALL pass the Playwright strict-mode locator resolution for `main, [role="main"]` on the `/core/security` route without throwing a multiple-elements violation, confirming that `page.locator('main, [role="main"]')` resolves to exactly one element
4. IF the Security module layout is refactored to remove a duplicate `<main>` element, THEN THE Module_System SHALL preserve the existing visual layout, scroll behavior, and content structure of the Security page without regression

### Requirement 16: Input Validation and Error Handling

**User Story:** As a business user, I want all forms to validate my input before submission, so that I receive immediate feedback on errors and do not corrupt business data.

#### Acceptance Criteria

1. THE Module_System SHALL validate all form inputs on the frontend using Zod schemas before sending requests to the backend, preventing form submission if any field fails validation
2. THE Module_System SHALL validate all incoming request payloads on the backend using class-validator decorators or Zod schemas, rejecting invalid payloads before executing business logic
3. IF a request payload fails backend validation, THEN THE Module_System SHALL return a 400 status code with a JSON response body containing a `errors` array where each entry includes the field name and the validation message
4. IF an unexpected server error occurs, THEN THE Module_System SHALL return a 500 status code with a JSON response containing a generic message (not exposing stack traces or internal details) and log the full error details (stack trace, request context) to the server-side logging system
5. IF a frontend network request receives no response within 30 seconds or the backend is unreachable, THEN THE Module_System SHALL display a user-friendly connectivity error message and provide a retry button that re-executes the failed request
6. WHEN frontend validation fails, THE Module_System SHALL display inline error messages adjacent to each invalid field and preserve all user-entered data without clearing the form

### Requirement 17: Data Integrity and Business Rule Enforcement

**User Story:** As a business owner, I want the system to enforce business rules at the data layer, so that invalid state transitions and data corruption are impossible.

#### Acceptance Criteria

1. THE Module_System SHALL enforce that inventory stock quantities never become negative, rejecting any operation that would reduce a stock balance below zero
2. WHEN a procurement purchase order entity transitions status, THE Module_System SHALL enforce valid state transitions only according to the defined adjacency map (draft → pending_approval → approved → received → closed) and reject any transition not in the adjacency map
3. WHEN a sales order fulfillment is requested, THE Module_System SHALL verify that available inventory meets or exceeds the ordered quantity for every line item before deducting stock
4. IF a sales order fulfillment is requested and available inventory is insufficient for any line item, THEN THE Module_System SHALL reject the fulfillment, leave all stock balances unchanged, and return an error indicating which items have insufficient stock
5. THE Module_System SHALL enforce referential integrity across all module relationships (employee-department, order-items, transaction-accounts) by rejecting any delete or update operation that would create orphaned records
6. IF a user attempts an invalid state transition, THEN THE Module_System SHALL reject the operation, leave the entity in its current state with no persisted changes, and return an error indicating the current state and the attempted target state
7. WHEN a state transition is rejected or a business rule violation occurs, THE Module_System SHALL complete the rejection within 2 seconds and return a structured error response with a 400 status code

### Requirement 18: Production Readiness Score Achievement

**User Story:** As a project stakeholder, I want all 8 core business modules to achieve 90%+ readiness scores, so that the system can be deployed for real business usage.

#### Acceptance Criteria

1. WHEN the production audit is re-run after all remediation tasks for HR_Module are marked complete, THE HR_Module SHALL achieve a readiness score of 90 or higher out of 100 (current: 65%)
2. WHEN the production audit is re-run after all remediation tasks for Finance_Module are marked complete, THE Finance_Module SHALL achieve a readiness score of 90 or higher out of 100 (current: 64.3%)
3. WHEN the production audit is re-run after all remediation tasks for Procurement_Module are marked complete, THE Procurement_Module SHALL achieve a readiness score of 90 or higher out of 100 (current: 75%)
4. WHEN the production audit is re-run after all remediation tasks for Sales_Module are marked complete, THE Sales_Module SHALL achieve a readiness score of 90 or higher out of 100 (current: 74.8%)
5. WHEN the production audit is re-run after all remediation tasks for Marketing_Module are marked complete, THE Marketing_Module SHALL achieve a readiness score of 90 or higher out of 100 (current: 75%)
6. WHEN the production audit is re-run after all remediation tasks for IT_Module are marked complete, THE IT_Module SHALL achieve a readiness score of 90 or higher out of 100 (current: 75%)
7. WHEN the production audit is re-run after all remediation tasks for Inventory_Module are marked complete, THE Inventory_Module SHALL achieve a readiness score of 90 or higher out of 100 (current: 72.6%)
8. WHEN the production audit is re-run after all remediation tasks for Retail_Module are marked complete, THE Retail_Module SHALL achieve a readiness score of 90 or higher out of 100 (current: 29.6%)
9. WHEN the production audit is re-run, THE Module_System SHALL report zero E2E workflow failures across the 8 core business modules, where a workflow failure is any workflow step with status "fail" in the audit workflow results
10. WHEN the production audit is re-run, THE Module_System SHALL report zero high-severity performance issues across the 8 core business modules, where high-severity is defined as issues classified "critical" or "high" by the audit performance scanner
11. IF any of the 8 core business modules scores below 90 after re-audit, THEN THE Module_System SHALL report the failing module name, its current score, and the score breakdown by category (elements, modals, API connectivity, workflows, performance issues)

### Requirement 19: Comprehensive E2E Test Coverage

**User Story:** As a QA engineer, I want end-to-end tests covering all critical business workflows, so that regressions are caught before deployment.

#### Acceptance Criteria

1. THE Module_System SHALL have passing E2E tests for the complete HR workflow (create employee → assign department → submit leave → approve leave → process payroll), where each step verifies the expected state change before proceeding to the next
2. THE Module_System SHALL have passing E2E tests for the complete Finance workflow (create journal entry → post to ledger → reconcile → generate report), where each step verifies the expected state change before proceeding to the next
3. THE Module_System SHALL have passing E2E tests for the complete Procurement workflow (create PO → approve → receive goods → verify inventory update → generate invoice), where each step verifies the expected state change before proceeding to the next
4. THE Module_System SHALL have passing E2E tests for the complete Sales workflow (create lead → convert to opportunity → create quotation → convert to order → fulfill), where each step verifies the expected state change before proceeding to the next
5. THE Module_System SHALL have passing E2E tests for the complete Retail POS workflow (open shift → scan items → apply discount → process payment → close shift → verify sales history), where each step verifies the expected state change before proceeding to the next
6. THE Module_System SHALL have passing E2E tests for the complete Inventory workflow (create item → set stock → transfer → adjust → run opname → verify counts), where each step verifies the expected state change before proceeding to the next
7. THE Module_System SHALL have passing E2E tests for the complete Marketing workflow (create campaign → define audience → schedule → execute → verify metrics), where each step verifies the expected state change before proceeding to the next
8. THE Module_System SHALL have passing E2E tests for the complete IT workflow (create ticket → assign priority → escalate on SLA breach → resolve → close), where each step verifies the expected state change before proceeding to the next
9. WHEN any E2E test fails in CI, THE Module_System SHALL produce a failure report including a screenshot of the page at the time of failure, captured network request/response logs, and the specific assertion message that failed
10. THE Module_System SHALL configure all E2E tests to run in the GitHub Actions CI pipeline on every push to main and on every pull request targeting main
