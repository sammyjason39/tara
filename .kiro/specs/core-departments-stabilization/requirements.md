# Requirements Document

## Introduction

The Zenvix platform's five core operational departments — IT, Procurement, Sales, Marketing,
and Payment — sit at the center of the business-flow-suite and intertwine heavily with the
rest of the system. They depend on and feed HR (workforce and approvers), Finance (payables,
ledger, settlements), Settings (module activation, tenant configuration), the Integration
Log (ILogs), and the Audit trail, and they enrich industry modules such as Retail (POS
devices, ecommerce connectors, store revenue, loyalty, store transfers). Each module exposes
a broad surface of HTTP endpoints and multi-step state machines (requisition → PO → receipt,
lead → opportunity → quote → order, payment request → route → execute → settle, etc.), and
the team suspects many of these flows carry bugs that have never been exercised against the
live database.

This feature brings these five departments to production-grade by systematically testing
every flow, fixing all bugs, and proving correctness against the live environment. The work
is organized into independently testable and deployable **phases**, one phase per module:
Phase 1 IT, Phase 2 Procurement, Phase 3 Sales, Phase 4 Marketing, Phase 5 Payment. Each
phase satisfies the cross-cutting requirements (endpoint reliability, tenant isolation,
role-based access control, transactional integrity, field-naming consistency, cross-module
integration correctness, and asynchronous error handling) for the endpoints in that module.

The system is a live production deployment on a VPS; changes deploy via git push to `main`
followed by a Docker rebuild, and are validated live against the production environment using
`tnt-3rlhko` as the live test tenant (the same convention used by the HR stabilization spec).

HR and Finance are being stabilized in a separate parallel session. This spec treats HR and
Finance as **integration dependencies and consumers**, not as modules it re-fixes: it
verifies that the five core departments produce correct data at the HR and Finance
boundaries, but defects internal to HR or Finance are out of scope and are coordinated with
the parallel effort.

A prior bug-discovery effort flagged relevant defects, notably BUG-11 (the Offline Payment
Matrix is not reliably enforced at the backend in the Payment service) and BUG-13 (promises
without rejection handlers across modules). These are incorporated as concrete requirements.

This document defines WHAT correct, stabilized behavior is for each module and its
integrations. Implementation details (specific files, functions, query rewrites) are deferred
to the design phase.

## Glossary

- **Core_Module**: Any one of the five backend department modules in scope — IT, Procurement,
  Sales, Marketing, or Payment — comprising its controllers, services, repositories,
  entities, and DTOs.
- **IT_System**: The backend IT module exposed under the `/it` route namespace
  (`it.controller.ts`, `it.service.ts`, `webhook.service.ts`, `it-event.handler.ts`),
  covering devices, device events, provisioning, system health, and monitoring.
- **Procurement_System**: The backend Procurement module exposed under the `/procurement`
  route namespace, covering suppliers, supplier branches, supplier products, categories,
  requisitions, draft and final purchase orders, receipts, contracts, risk signals, portal
  messages, audit events, and spend insights.
- **Sales_System**: The backend Sales module exposed under the `/sales` route namespace,
  covering leads, pipeline, opportunities, quotes, timeline, tasks, orders, alerts,
  forecasting, and analytics.
- **Marketing_System**: The backend Marketing module exposed under the `/marketing` route
  namespace, covering campaigns, executions, leads, contacts, workflows, connected accounts,
  attribution, alerts, Customer 360, appointments, omnichannel messaging, funnels, and
  creative assets.
- **Payment_System**: The backend Payment module exposed under the `/payment` route namespace,
  covering payment transactions, providers, routing policies, devices, refunds, disputes,
  chargebacks, settlements, evidence packs, cash/EDC/gateway processing, reconciliation, and
  payment settings.
- **Core_Endpoint**: Any HTTP endpoint served by a Core_Module controller.
- **Tenant_Context**: The verified request identity derived from the authenticated JWT and the
  tenant interceptor, exposing `tenant_id`, `company_id`, `location_id`, `branch_id`,
  `user_id`, and `role`. It is the authoritative source of caller identity.
- **Tenant_Scope**: The set of `tenant_id`, and where applicable `company_id`, `location_id`,
  and `branch_id`, used to filter every data-access query so that a caller only reads or
  writes records belonging to their own tenant and permitted scope.
- **Live_Test_Tenant**: The tenant `tnt-3rlhko` used to validate behavior against the live
  production database.
- **Role_Gate**: The role-based access control applied to a Core_Endpoint via the roles guard
  and role decorators.
- **Atomic_Operation**: A multi-write operation executed inside a single database transaction
  so that either all writes commit or none do.
- **HR_Module**: The external HR module (workforce, approvers, employee identity) that the
  Core_Modules consume; stabilized in a separate parallel effort.
- **Finance_Module**: The external Finance module (payables, ledger, settlements, journals)
  that the Core_Modules feed; stabilized in a separate parallel effort.
- **Settings_Module**: The configuration module that governs per-tenant module activation and
  tenant settings consumed by the Core_Modules.
- **Integration_Log**: The integration logging facility (ILogs), including the durable event
  outbox (`sys_outbox_events`) and domain-event delivery records, used to record cross-module
  events and their delivery outcomes.
- **Audit_Trail**: The audit-event records produced by Core_Modules to capture who performed
  which privileged action and when.
- **Retail_Module**: The Retail industry module that consumes Core_Module data (POS devices,
  ecommerce connectors, store revenue, loyalty, store transfers) when Retail is active for a
  tenant.
- **Module_Activation_State**: The per-tenant flag, owned by the Settings_Module, indicating
  whether a given module is active for a tenant; it gates module-aware behavior such as Retail
  contributions on Core_Module overview and dashboard endpoints.
- **Procurement_Workflow**: The multi-step requisition-to-receipt state machine: requisition →
  requester-HOD approval → final approval → draft PO → procurement-HOD approval → quote
  confirmation → final PO → release → goods receipt.
- **Sales_Pipeline**: The multi-step revenue state machine: lead → lead conversion →
  opportunity → stage progression → quote → quote decision → order, including SLA sweeps.
- **Lead_Handoff**: The transfer of a marketing-qualified lead from the Marketing_System to the
  Sales_System.
- **Payment_Lifecycle**: The payment transaction state machine: request → approve/reject →
  route → execute → settle, including refunds and disputes.
- **Offline_Payment_Matrix**: The policy defining which payment methods are permitted while a
  payment context is offline; cash and voucher methods are permitted offline, while card,
  QRIS, e-wallet, and other gateway-backed methods are blocked offline.
- **Payable_Record**: A Finance accounts-payable record created or synchronized by the
  Procurement_System when a purchase order is released.

## Requirements

### Requirement 1: Core Endpoint Reliability

**User Story:** As an operator of the platform, I want every IT, Procurement, Sales,
Marketing, and Payment endpoint to return correct data without server errors, so that the
department screens and dependent modules display real, accurate information.

#### Acceptance Criteria

1. WHEN a valid request is made to a Core_Endpoint, THE Core_Module SHALL return a successful
   response with a status code between 200 and 299 inclusive.
2. WHEN a Core_Endpoint reads or writes data against the live database, THE Core_Module SHALL
   complete the operation without referencing nonexistent columns, invalid foreign keys, or
   hardcoded identifiers, and SHALL NOT return any status code between 500 and 599 inclusive.
3. IF a Core_Endpoint receives input that fails validation, THEN THE Core_Module SHALL return a
   client-error response with a status code between 400 and 422 inclusive, an error message
   that names each rejected field and the reason for its rejection, and SHALL leave all
   persisted data unchanged.
4. IF a requested resource does not exist within the caller's Tenant_Scope, THEN THE
   Core_Module SHALL return a not-found response with an error message that identifies the
   resource type and the requested identifier only, and SHALL NOT include field values of any
   resource outside the caller's Tenant_Scope.
5. WHEN a Core_Endpoint serializes a date or datetime value in a response, THE Core_Module
   SHALL render the value as an ISO 8601 formatted string.
6. WHEN a Core_Endpoint returns a collection, THE Core_Module SHALL return the collection as an
   array in which every element contains all fields defined by the contract consumed by the
   calling client, and SHALL return an empty array rather than null when the collection
   contains no elements.

### Requirement 2: Tenant Isolation

**User Story:** As a tenant administrator, I want my department data isolated from other
tenants, so that no caller can read or modify records outside their own tenant and permitted
scope.

#### Acceptance Criteria

1. WHEN a Core_Endpoint reads data, THE Core_Module SHALL filter the query by the `tenant_id`
   from the verified Tenant_Context, returning only records whose `tenant_id` equals that
   value and ignoring any client-supplied `tenant_id`.
2. WHEN a Core_Endpoint writes data, THE Core_Module SHALL persist the record with the
   `tenant_id` from the verified Tenant_Context, ignoring any client-supplied `tenant_id`.
3. IF a request reaches a Core_Endpoint without a verified Tenant_Context (the JWT identity is
   missing, expired, or unverified), THEN THE Core_Module SHALL reject the request without
   reading or persisting any data.
4. IF a request supplies a `tenant_id`, `company_id`, `location_id`, or `branch_id` in its body
   or headers that differs from the corresponding value in the verified Tenant_Context, THEN
   THE Core_Module SHALL reject the request and SHALL NOT persist any data.
5. THE Core_Module SHALL derive `tenant_id`, `company_id`, `location_id`, and `branch_id` for
   scoping from the verified Tenant_Context rather than from client-supplied request headers or
   request body fields.
6. THE Core_Module SHALL treat `tenant_id` and `company_id` as distinct identifiers and SHALL
   NOT substitute one for the other when constructing a Tenant_Scope.
7. WHERE a Core_Endpoint applies a location, company, or branch filter, THE Core_Module SHALL
   include in the Tenant_Scope only `location_id`, `company_id`, and `branch_id` values that
   belong to the caller's `tenant_id`.
8. IF a caller whose Tenant_Context `role` does not grant cross-Tenant_Scope access requests
   records outside the caller's Tenant_Scope, THEN THE Core_Module SHALL restrict the result to
   records within the caller's Tenant_Scope.
9. IF a caller attempts to modify or delete a record outside the caller's Tenant_Scope, THEN
   THE Core_Module SHALL reject the request and SHALL leave the targeted record unchanged.
10. WHEN a Core_Endpoint derives an actor identity for an audit or write operation, THE
    Core_Module SHALL use the `user_id` from the Tenant_Context rather than an unauthenticated
    request header.

### Requirement 3: Role-Based Access Control

**User Story:** As a security administrator, I want department actions gated by role, so that
only authorized users can perform privileged operations.

#### Acceptance Criteria

1. WHEN a caller invokes a Core_Endpoint that requires a specific role, THE Core_Module SHALL
   verify the caller's role from the Tenant_Context against the endpoint's Role_Gate before
   executing the endpoint's operation.
2. IF the caller's role is not among the roles permitted by the endpoint's Role_Gate, THEN THE
   Core_Module SHALL reject the request with a forbidden response (HTTP 403), perform no create,
   update, delete, approve, or release operation, and leave department data unchanged.
3. IF a caller invokes a Role_Gate-guarded Core_Endpoint and no role is present in the
   Tenant_Context, THEN THE Core_Module SHALL reject the request with a forbidden response
   (HTTP 403) and perform no operation on department data.
4. WHERE a caller holds a privileged role (SUPERADMIN, OWNER, or ADMIN), THE Core_Module SHALL
   permit the cross-location and cross-company visibility defined for that role.
5. THE Core_Module SHALL apply a Role_Gate to every Core_Endpoint that creates, updates,
   deletes, approves, or releases department data.
6. IF a caller invokes a Core_Endpoint that requires the module to be active and the
   Module_Activation_State for that module is inactive, THEN THE Core_Module SHALL reject the
   request with an error response indicating the module is inactive and perform no operation on
   department data.

### Requirement 4: Transactional Integrity of Multi-Write Operations

**User Story:** As a data steward, I want multi-step department operations to be atomic, so
that a partial failure never leaves data in an inconsistent state.

#### Acceptance Criteria

1. WHEN a Core_Module operation performs more than one database write, THE Core_Module SHALL
   execute all writes within a single Atomic_Operation (one database transaction).
2. IF any write within an Atomic_Operation fails, THEN THE Core_Module SHALL roll back all
   writes performed within that Atomic_Operation such that zero writes from that operation are
   persisted.
3. IF any write within an Atomic_Operation fails, THEN THE Core_Module SHALL return an error
   response to the caller indicating that the operation did not complete, and SHALL leave all
   affected records in the state they held before the Atomic_Operation began.
4. WHEN a Core_Module operation emits an Audit_Trail entry, an Integration_Log event, or a
   cross-module record alongside a data write, THE Core_Module SHALL include the entry, event,
   or record within the same Atomic_Operation as the write, so that a rollback discards the
   Audit_Trail entry, Integration_Log event, or cross-module record together with the write.
5. WHEN a Core_Module operation reads a record by a composite key, THE Core_Module SHALL use a
   query form that resolves all fields of the composite key rather than a unique-by-single-key
   lookup.
6. WHEN a state-machine transition is requested on a Procurement_Workflow, Sales_Pipeline, or
   Payment_Lifecycle entity, THE Core_Module SHALL persist the transition and all of its side
   effects within a single Atomic_Operation.
7. IF persisting a Procurement_Workflow, Sales_Pipeline, or Payment_Lifecycle transition or any
   of its side effects fails, THEN THE Core_Module SHALL roll back the transition and its side
   effects so the entity remains in its pre-transition state, and SHALL return an error response
   indicating the transition did not complete.

### Requirement 5: Field Naming Consistency

**User Story:** As a developer integrating with the departments, I want field names consistent
between the database schema, DTOs, and code, so that reads and writes do not silently drop or
misplace data.

#### Acceptance Criteria

1. WHEN a Core_Endpoint maps a DTO to a database record during a create or update operation,
   THE Core_Module SHALL bind each DTO field value to the single database column whose
   schema-defined name corresponds to that field, such that no value is written to a column
   other than its corresponding column.
2. IF an inbound DTO field name differs from its corresponding database column name only by
   casing convention (for example, DTO camelCase versus database snake_case), THEN THE
   Core_Module SHALL deterministically translate the field name to the schema-defined column
   name before persisting, producing the same column resolution for the same input field on
   every request.
3. WHEN a create or update request is valid, THE Core_Module SHALL persist every supplied field
   value to its corresponding database column, such that the count of persisted values equals
   the count of supplied mappable values and no value is dropped due to a name or casing
   mismatch.
4. IF a create or update request contains a field that resolves to no schema-defined database
   column, THEN THE Core_Module SHALL reject the request with an error response identifying the
   unresolved field and SHALL persist none of the request's values, leaving existing stored data
   unchanged.
5. WHEN a Core_Endpoint maps a database record to a DTO during a read operation, THE Core_Module
   SHALL translate each column's schema-defined name back to its corresponding DTO field name
   and populate every mapped field, such that no stored value is omitted from the DTO due to a
   name or casing mismatch.

### Requirement 6: Cross-Module Integration Correctness

**User Story:** As an integration owner, I want the five departments to exchange correct,
tenant-scoped data with HR, Finance, Settings, the Integration Log, Audit, and Retail, so that
end-to-end business flows reconcile across module boundaries.

#### Acceptance Criteria

1. WHEN a Core_Module reads data from the HR_Module or Finance_Module, THE Core_Module SHALL
   query that data within the caller's Tenant_Scope and SHALL exclude any record whose
   `tenant_id` differs from the caller's `tenant_id`.
2. IF the HR_Module or Finance_Module returns data that is unavailable, malformed, or empty,
   THEN THE Core_Module SHALL return an error or empty result to its caller and SHALL NOT return
   records belonging to another tenant.
3. WHEN a Core_Module writes a record destined for the Finance_Module, THE Core_Module SHALL
   produce the record with the originating `tenant_id` and every field defined by the
   Finance_Module's expected contract populated.
4. IF a record destined for the Finance_Module is missing a contract-required field, THEN THE
   Core_Module SHALL reject the originating operation with an error identifying the missing
   field and SHALL NOT perform a partial write.
5. WHEN a Core_Module emits a cross-module domain event, THE Core_Module SHALL record the event
   in the Integration_Log with the originating Tenant_Scope before reporting the originating
   operation as successful.
6. IF recording a cross-module domain event in the Integration_Log fails, THEN THE Core_Module
   SHALL roll back the originating operation and return an error response.
7. WHEN a Core_Module performs a privileged create, update, delete, approve, or release action,
   THE Core_Module SHALL record an Audit_Trail entry capturing the actor `user_id`, the action,
   the affected resource identifier, and the caller's Tenant_Scope.
8. WHERE the Module_Activation_State for the Retail_Module is active for a tenant, THE
   Core_Module SHALL include Retail contributions in its overview or dashboard response using
   data scoped to the caller's Tenant_Scope.
9. WHERE the Module_Activation_State for the Retail_Module is inactive for a tenant, THE
   Core_Module SHALL return its overview or dashboard response without Retail contributions,
   with a successful response and without error.
10. WHEN a Core_Module exposes data consumed by another module, THE Core_Module SHALL populate
    every field required by the consuming module's contract with persisted data scoped to the
    caller's Tenant_Scope, and SHALL NOT return placeholder, mock, or hardcoded values.

### Requirement 7: Asynchronous Error Handling

**User Story:** As a reliability engineer, I want every asynchronous operation in the
departments to handle failure explicitly, so that a rejected promise never crashes the process
or silently drops work.

#### Acceptance Criteria

1. WHEN a Core_Module initiates an asynchronous operation, THE Core_Module SHALL attach a
   rejection handler before the operation begins execution so that any failure is caught and no
   unhandled promise rejection is emitted at the process level.
2. IF an asynchronous operation produces a rejection that is not caught by a local rejection
   handler, THEN THE Core_Module SHALL capture the rejection, record it in the Integration_Log
   or Audit_Trail, and continue running without terminating the process.
3. IF an asynchronous operation within a Core_Endpoint fails, THEN THE Core_Module SHALL resolve
   the request within 30 seconds by returning a response with a 4xx status code for
   client-caused failures or a 5xx status code for server-caused failures, rather than leaving
   the request unresolved.
4. IF a background or scheduled Core_Module job fails, THEN THE Core_Module SHALL record the
   failure in the Integration_Log or Audit_Trail and continue processing the remaining work
   items without aborting the job run.
5. WHEN a Core_Module records an asynchronous failure in the Integration_Log or Audit_Trail, THE
   Core_Module SHALL include the failure timestamp, the identifier of the failed operation, and
   an error description indicating the cause of the failure.

### Requirement 8: IT Module Stabilization (Phase 1)

**User Story:** As an IT administrator, I want the IT module's devices, provisioning, health,
and monitoring flows to work end-to-end and feed Retail device views, so that IT operations
reflect real data.

#### Acceptance Criteria

1. WHEN a caller requests devices, device events, provisioning requests, system health, or
   monitoring data within a Tenant_Scope, THE IT_System SHALL return only the records matching
   that Tenant_Scope and SHALL exclude records belonging to other tenants.
2. WHEN a caller requests a collection of IT records and no records match the Tenant_Scope, THE
   IT_System SHALL return an empty array with a successful response rather than an error.
3. WHEN a caller creates or updates a device with a payload in which all required fields are
   present and conform to their type and bounds, THE IT_System SHALL persist every supplied
   field within the caller's Tenant_Scope, return the persisted record, and reflect the
   persisted values on a subsequent read.
4. WHEN a caller creates a provisioning request with a valid payload, THE IT_System SHALL
   persist the request within the caller's Tenant_Scope with a pending status and return it.
5. WHEN a caller marks a provisioning request whose current status is pending as provisioned,
   THE IT_System SHALL transition the request to provisioned, record the actor `user_id` from
   the Tenant_Context, and persist the transition within an Atomic_Operation.
6. WHEN a caller updates or deletes a provisioning request that exists within the caller's
   Tenant_Scope, THE IT_System SHALL apply the change, return a success response, and reflect
   the change on a subsequent read.
7. IF a caller creates or updates a device or provisioning request with a payload that fails
   validation, THEN THE IT_System SHALL reject the request with a client-error response and
   SHALL NOT persist any record.
8. IF a caller requests or attempts to mutate an IT resource that belongs to another tenant,
   THEN THE IT_System SHALL return a not-found response and SHALL leave the resource unchanged.
9. IF a caller requests to transition a provisioning request from a status that does not permit
   the transition, THEN THE IT_System SHALL reject the request with a client-error response and
   SHALL leave the request's status unchanged.
10. WHERE the Module_Activation_State for the Retail_Module is active for a tenant, THE
    IT_System SHALL report POS device and ecommerce-connector statistics on the IT overview
    using data scoped to the caller's Tenant_Scope.
11. WHERE the Module_Activation_State for the Retail_Module is inactive for a tenant, THE
    IT_System SHALL return the IT overview without POS device and ecommerce-connector
    contributions and without error.
12. WHEN the IT_System ingests a device event or inbound webhook for a device within a
    Tenant_Scope, THE IT_System SHALL record the event against the corresponding device within
    that device's Tenant_Scope and reflect the event on a subsequent read.
13. IF the IT_System ingests a device event or inbound webhook that references a device that does
    not exist within the resolved Tenant_Scope, THEN THE IT_System SHALL reject the event
    without recording it against any device.

### Requirement 9: Procurement Module Stabilization (Phase 2)

**User Story:** As a procurement manager, I want the requisition-to-receipt workflow, supplier
management, contracts, and risk flows to work end-to-end and synchronize with Finance and
Inventory, so that purchasing reconciles across the platform.

#### Acceptance Criteria

1. WHEN a caller creates or updates a supplier, supplier branch, supplier product, category,
   requisition, draft PO, contract, risk signal, or portal message with a payload whose required
   fields are present and conform to their type constraints, THE Procurement_System SHALL persist
   the record within the caller's Tenant_Scope and return the persisted record.
2. WHEN a caller advances a requisition through requester-HOD approval and final approval along
   the valid Procurement_Workflow sequence (requisition → requester-HOD approval → final
   approval → draft PO → procurement-HOD approval → quote confirmation → final PO → release →
   goods receipt), THE Procurement_System SHALL persist each transition within an
   Atomic_Operation and return the entity's resulting state.
3. IF a caller requests a Procurement_Workflow transition that is not valid from the entity's
   current state, THEN THE Procurement_System SHALL reject the request with a client-error
   response that identifies the current state and the rejected target state, and SHALL leave the
   entity's current state unchanged.
4. WHEN a caller releases a purchase order, THE Procurement_System SHALL create or synchronize the
   corresponding Payable_Record for the Finance_Module within the same Atomic_Operation as the
   release, such that the release and the Payable_Record commit together or neither is persisted.
5. WHEN a caller records a goods receipt for a released purchase order, THE Procurement_System
   SHALL persist the receipt and update the associated inventory and supplier rating within a
   single Atomic_Operation, such that all three updates commit together or none are persisted.
6. IF a caller records a goods receipt with quantities that exceed the outstanding ordered
   quantity, THEN THE Procurement_System SHALL reject the request with a client-error response and
   SHALL NOT persist the receipt.
7. WHEN a caller signs or records legal approval on a contract along a valid contract lifecycle
   transition, THE Procurement_System SHALL persist the transition within an Atomic_Operation and
   return the contract's resulting state.
8. WHEN a caller requests suppliers, requisitions, purchase orders, contracts, risk signals,
   audit events, or spend insights within a Tenant_Scope, THE Procurement_System SHALL return only
   the records matching that Tenant_Scope.
9. IF a caller creates or updates a Procurement record with a payload that fails validation, THEN
   THE Procurement_System SHALL reject the request with a client-error response identifying the
   invalid fields and SHALL NOT persist any record.
10. IF synchronizing the Payable_Record to the Finance_Module fails during a purchase-order
    release, THEN THE Procurement_System SHALL roll back the release so the purchase order remains
    in its pre-release state and SHALL return an error response indicating the release did not
    complete.
11. IF a caller requests or attempts to mutate a Procurement resource that belongs to another
    tenant, THEN THE Procurement_System SHALL return a not-found response and SHALL leave the
    resource unchanged.

### Requirement 10: Sales Module Stabilization (Phase 3)

**User Story:** As a sales manager, I want the lead-to-order pipeline, quotes, tasks, and
analytics to work end-to-end and integrate with Marketing and Retail, so that revenue operations
reflect real data.

#### Acceptance Criteria

1. WHEN a caller creates or updates a lead, opportunity, quote, timeline event, or task with a
   payload whose required fields are present and conform to their type constraints, THE
   Sales_System SHALL persist the record within the caller's Tenant_Scope and return the persisted
   record.
2. IF a caller creates or updates a Sales record with a payload that fails validation, THEN THE
   Sales_System SHALL reject the request with a client-error response identifying the invalid
   fields and SHALL NOT persist any record.
3. WHEN a caller converts a lead to an opportunity, THE Sales_System SHALL create the opportunity
   and update the lead within a single Atomic_Operation, such that both commit together or neither
   is persisted.
4. IF converting a lead to an opportunity fails after either write begins, THEN THE Sales_System
   SHALL roll back both writes so the lead remains unconverted and return an error response.
5. WHEN a caller moves an opportunity stage, closes an opportunity, submits a quote, or records a
   quote decision along a valid Sales_Pipeline transition, THE Sales_System SHALL persist the
   transition within an Atomic_Operation and return the entity's resulting state.
6. IF a caller requests a Sales_Pipeline or quote transition that is not valid from the entity's
   current state, THEN THE Sales_System SHALL reject the request with a client-error response that
   identifies the current state and the rejected target state, and SHALL leave the entity's current
   state unchanged.
7. WHEN a caller requests leads, pipeline, opportunities, quotes, orders, tasks, alerts, forecast,
   or analytics within a Tenant_Scope, THE Sales_System SHALL return only the records matching that
   Tenant_Scope and SHALL exclude records belonging to other tenants.
8. WHEN the Sales_System runs an SLA sweep, THE Sales_System SHALL evaluate only records within the
   swept Tenant_Scope, exclude records of other tenants, and record the actor `user_id` from the
   Tenant_Context for any resulting change.
9. WHERE the Module_Activation_State for the Retail_Module is active for a tenant, THE Sales_System
   SHALL report retail revenue and order contributions on the sales dashboard using data scoped to
   the caller's Tenant_Scope.
10. WHERE the Module_Activation_State for the Retail_Module is inactive for a tenant, THE
    Sales_System SHALL return the sales dashboard without retail revenue and order contributions
    and without error.

### Requirement 11: Marketing Module Stabilization (Phase 4)

**User Story:** As a marketing manager, I want campaigns, executions, leads, accounts, workflows,
and the growth-engine flows to work end-to-end and hand off leads to Sales, so that marketing
operations reflect real data.

#### Acceptance Criteria

1. WHEN a caller creates or updates a campaign, execution, lead, contact, workflow, connected
   account, funnel, or creative asset with a payload whose required fields are present and conform
   to their type constraints, THE Marketing_System SHALL persist the record within the caller's
   Tenant_Scope and return the persisted record.
2. IF a caller creates or updates a Marketing record with a payload that fails validation, THEN
   THE Marketing_System SHALL reject the request with a client-error response identifying the
   invalid fields and SHALL NOT persist any record.
3. WHEN a caller transitions a campaign status, workflow status, or account status along a valid
   lifecycle transition, THE Marketing_System SHALL persist the transition within a single
   Atomic_Operation, leaving the entity in exactly one defined status with no intermediate state
   observable.
4. IF a caller requests a campaign, workflow, or account status transition that is not valid from
   the entity's current status, THEN THE Marketing_System SHALL reject the request with a
   client-error response and SHALL leave the entity's current status unchanged.
5. WHEN a caller marks a handoff-ready lead and hands it off to Sales, THE Marketing_System SHALL
   perform the Lead_Handoff within a single Atomic_Operation, such that the handoff record and the
   lead's consumability by the Sales_System within the same Tenant_Scope commit together or
   neither is persisted.
6. IF a Lead_Handoff fails or the lead is not handoff-ready, THEN THE Marketing_System SHALL roll
   back the handoff, leave the lead consumable only by Marketing, and return an error response.
7. WHEN a caller uploads a creative asset, THE Marketing_System SHALL store the asset and register
   the corresponding asset record within the caller's Tenant_Scope in a single Atomic_Operation so
   that no orphaned asset or record remains on failure.
8. IF a creative-asset upload fails, THEN THE Marketing_System SHALL return an error response and
   SHALL NOT leave a stored asset without a registered record or a registered record without a
   stored asset.
9. WHEN a caller requests a Customer 360 profile, THE Marketing_System SHALL return a unified
   profile assembled only from records within the caller's Tenant_Scope.
10. IF a Marketing_System OAuth callback or social-sync operation fails, THEN THE Marketing_System
    SHALL handle the failure without an unhandled rejection, SHALL NOT leave a partially connected
    account, and SHALL record the failure outcome in the Integration_Log.
11. WHEN a Marketing_System OAuth callback or social-sync operation succeeds, THE Marketing_System
    SHALL record the success outcome in the Integration_Log.
12. WHEN a caller requests campaigns, executions, leads, contacts, workflows, accounts,
    attribution, alerts, funnels, assets, appointments, or conversations within a Tenant_Scope, THE
    Marketing_System SHALL return only the records matching that Tenant_Scope and SHALL exclude
    records belonging to other tenants.

### Requirement 12: Payment Module Stabilization (Phase 5)

**User Story:** As a payment operations manager, I want the payment lifecycle, refunds, disputes,
settlements, and the offline payment matrix to work correctly and feed Finance, so that money
movement is accurate and policy-compliant.

#### Acceptance Criteria

1. WHEN a caller creates a payment transaction with a payload that passes validation, THE
   Payment_System SHALL persist the transaction in the request state within the caller's
   Tenant_Scope and return the persisted transaction.
2. IF a caller creates a payment transaction with a payload that fails validation, THEN THE
   Payment_System SHALL reject the request with a client-error response that identifies the invalid
   fields, SHALL NOT persist any transaction, and SHALL leave existing data unchanged.
3. WHEN a caller advances a payment transaction along a Payment_Lifecycle transition that is valid
   from the transaction's current state (request to approve or reject, approve to route, route to
   execute, execute to settle), THE Payment_System SHALL persist the resulting state and the
   transition record within a single Atomic_Operation.
4. IF a caller requests a Payment_Lifecycle transition that is not defined as valid from the
   transaction's current state, THEN THE Payment_System SHALL reject the request with a client-error
   response that identifies the current state and the rejected target state, and SHALL leave the
   transaction's current state unchanged.
5. WHILE a payment context is offline, WHEN a caller initiates a payment using the cash or voucher
   method class, THE Payment_System SHALL permit the payment and process it through the
   Payment_Lifecycle.
6. WHILE a payment context is offline, IF a caller initiates a payment using the card, QRIS,
   e-wallet, or any other gateway-backed method class, THEN THE Payment_System SHALL reject the
   request with a client-error response that identifies the method class as unavailable offline, and
   SHALL NOT create a payment transaction for that request.
7. WHEN a caller advances a refund along a refund lifecycle transition that is valid from the
   refund's current state (create to approve, approve to execute), THE Payment_System SHALL persist
   the resulting state and the transition record within a single Atomic_Operation.
8. IF a caller requests a refund lifecycle transition that is not defined as valid from the refund's
   current state, THEN THE Payment_System SHALL reject the request with a client-error response that
   identifies the current state and the rejected target state, and SHALL leave the refund's current
   state unchanged.
9. WHEN a caller advances a dispute along a dispute lifecycle transition that is valid from the
   dispute's current state (open to progress, progress to resolve), THE Payment_System SHALL persist
   the resulting state and the transition record within a single Atomic_Operation.
10. IF a caller requests a dispute lifecycle transition that is not defined as valid from the
    dispute's current state, THEN THE Payment_System SHALL reject the request with a client-error
    response that identifies the current state and the rejected target state, and SHALL leave the
    dispute's current state unchanged.
11. WHEN a payment transaction reaches the settle state, THE Payment_System SHALL create the
    corresponding Finance_Module settlement record and persist the settled transaction state within
    the same single Atomic_Operation, such that either both the settlement record and the settled
    state are persisted together or neither is persisted.
12. IF creation of the Finance_Module settlement record fails during settlement, THEN THE
    Payment_System SHALL roll back the entire Atomic_Operation, SHALL leave the transaction in its
    pre-settlement state, and SHALL return a server-error response indicating the settlement could
    not be completed.
13. WHEN a caller requests transactions, providers, routing policies, devices, refunds, disputes,
    chargebacks, settlements, or evidence packs within a Tenant_Scope, THE Payment_System SHALL
    return only the matching records belonging to that Tenant_Scope.

### Requirement 13: Live Database Verification

**User Story:** As a release manager, I want every department write path validated against a real
database, so that endpoints that were never exercised against live data are proven correct before
release.

#### Acceptance Criteria

1. WHEN a Core_Module write path is delivered in a phase, THE Core_Module SHALL have that write
   path executed at least once against a non-mocked database instance using the Live_Test_Tenant
   (`tnt-3rlhko`).
2. IF a verification run against the real database surfaces a missing column, invalid foreign key,
   or hardcoded identifier, THEN the defect SHALL be corrected and a subsequent verification run
   SHALL complete with zero such defects before the phase is considered complete.
3. THE Core_Module SHALL provide, for each phase, automated-test-checkable correctness properties
   covering exactly the following five concerns: tenant isolation, role gating, atomicity,
   cross-module integration correctness, and round-trip persistence of created and updated records.
4. WHILE any of the five correctness properties for a phase has not passed against the
   Live_Test_Tenant, THE phase SHALL NOT be considered complete.
5. WHEN a created or updated Core_Module record is read back within the same Tenant_Scope, THE
   Core_Module SHALL return a record in which every caller-supplied field value is identical to the
   value supplied on creation or update, excluding only system-generated fields (round-trip
   property).
6. IF a round-trip verification detects a field whose read-back value differs from the value
   supplied on creation or update, THEN the verification SHALL report which field or fields
   mismatched and the phase SHALL NOT be considered complete until corrected.

### Requirement 14: Phased Delivery

**User Story:** As a reviewer, I want the stabilization delivered in reviewable phases by module,
so that each phase is independently testable and deployable without conflicting with the parallel
HR and Finance effort.

#### Acceptance Criteria

1. THE implementation plan SHALL group work into exactly five sequentially ordered, non-overlapping
   phases — Phase 1 IT, Phase 2 Procurement, Phase 3 Sales, Phase 4 Marketing, Phase 5 Payment —
   with each Core_Module assigned to exactly one phase.
2. THE implementation plan SHALL define each phase such that every endpoint in that phase's module
   can be tested against the Live_Test_Tenant without the delivery or deployment of any later phase.
3. THE implementation plan SHALL define each phase such that it is independently deployable via the
   git-push-to-main and Docker-rebuild process without requiring any later phase.
4. WHEN a phase is completed, THE phase SHALL have every endpoint in that phase's module pass
   verification against the Live_Test_Tenant and satisfy Requirements 1 through 7 (endpoint
   reliability, tenant isolation, role gating, transactional integrity, field-naming consistency,
   cross-module integration correctness, and asynchronous error handling).
5. IF a phase deployment breaks an endpoint of a previously completed phase, THEN that breakage
   SHALL be corrected before the new phase is considered complete.
6. THE implementation plan SHALL scope changes to the five Core_Modules and their integration
   boundaries, and SHALL NOT modify HR_Module or Finance_Module internals that are owned by the
   parallel stabilization effort.
7. IF a defect can only be corrected by modifying HR_Module or Finance_Module internals, THEN THE
   implementation plan SHALL keep that change out of scope and record it for the parallel HR and
   Finance stabilization effort.
