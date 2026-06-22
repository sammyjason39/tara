# Requirements Document

## Introduction

The Zenvix platform offers two Stock Opname (physical inventory count) surfaces:

- **Core_Opname** — `src/pages/core/inventory/InventoryStockOpname.tsx`, reached at
  `/core/inventory/opname`. It is company-wide: the auditor picks any location (core
  warehouses, retail stores, and e-commerce branches are merged into one location list),
  starts an audit cycle, scans items, and on commit reconciles counts. When unknown barcodes
  are scanned it surfaces an `UnresolvedBarcodesModal` that lets the auditor flag the barcodes
  as anomalies or register them as new items before finalizing.
- **Retail_Opname** — the operational scanner
  `src/pages/retail/operational/StockOpnameScanner.tsx` (`/m/retail/operational/opname`) and
  the management Opname tab in `src/pages/retail/management/InventoryVisibility.tsx`. Both are
  branch-scoped (they operate against the auditor's active store/branch). Today neither offers
  any handling for unregistered items — an unknown scan is simply rejected with an
  "Invalid SKU" / "Item Not Found" toast, so genuinely-present stock that is not yet in the
  master catalog cannot be counted at all.

This feature has three goals:

1. **Bring Retail_Opname to parity with Core_Opname** for unregistered-item handling, while
   preserving Retail_Opname's branch-scoped nature (a retail auditor only ever sees and counts
   their own branch, whereas Core_Opname spans all branches).
2. **Replace the blocking "fill every field" registration** with a non-blocking flow: an
   unregistered scanned item is registered immediately as an incomplete stub, the operator is
   told the item information is incomplete, the item is flagged as an anomaly and placed in a
   dedicated **Anomaly** category, and the count proceeds without interruption. The item can be
   completed (edited with full details) later and recategorized out of Anomaly when done.
3. **Fix the defects in the current unresolved-items flow**: closing the item-creation modal
   locks the page (controls stop responding, forcing a full-page refresh), and because the
   opname session is held only in memory, that refresh discards every scanned count.

This document defines WHAT correct behavior is. Implementation details (component structure,
exact endpoints, dialog refactors) are deferred to the design phase.

## Glossary

- **Opname_Session**: A single physical-count activity from start (audit cycle initiated) to
  commit or cancel, including the list of scanned counts and any unresolved barcodes.
- **Core_Opname**: The company-wide Stock Opname surface at `/core/inventory/opname`.
- **Retail_Opname**: The branch-scoped Stock Opname surfaces under the Retail module
  (operational scanner and management Opname tab).
- **Active_Branch**: The store/branch/location currently selected in the Retail context that
  scopes a Retail_Opname session.
- **Scanned_Count_Entry**: One row in the live audit stream representing a SKU/barcode and its
  accumulated physical count for the current Opname_Session.
- **Registered_Item**: An item that exists in the tenant's item master (catalog).
- **Unregistered_Item**: A scanned barcode/SKU with no matching Registered_Item in scope.
- **Incomplete_Item**: A Registered_Item created from an Unregistered_Item that is missing
  required descriptive details and is therefore marked as needing completion.
- **Anomaly_Category**: A reserved item category named "Anomaly" used to bucket
  Incomplete_Items so they can be found, completed, and recategorized later.
- **Anomaly_Flag**: A persisted field/status on an item indicating it was registered during
  opname as an anomaly and still requires review/completion. Because it is persisted (not
  inferred from category membership alone), items needing completion can be filtered reliably
  across the application.
- **Quick_Register**: The non-blocking action that creates Incomplete_Items from selected
  Unregistered_Items, flags them as anomalies, and assigns the Anomaly_Category, without
  requiring full data entry.
- **Unresolved_Barcode**: An Unregistered_Item barcode awaiting resolution (Quick_Register or
  explicit flag) before an Opname_Session can be committed.
- **Elevated_Role**: A role authorized to approve or void anomaly resolutions and abandoned
  audit cycles (for example Manager/HOD and above). Owner and Superadmin are Elevated_Roles
  whose actions take effect immediately without a separate approval step.
- **Approval_Request**: A record capturing a requested sensitive action (voiding an
  Incomplete_Item or an abandoned audit cycle), its reason, the requester, and its
  approve/reject outcome by an Elevated_Role.
- **Page_Lock**: A state in which the page becomes non-interactive (for example `document.body`
  left with `pointer-events: none`) such that controls no longer respond to input.
- **Feedback_Message**: A user-visible confirmation or error surfaced through the toast system
  or inline message after an action completes.

## Requirements

### Requirement 1: Non-blocking registration of unregistered items

**User Story:** As a stock auditor, I want to register unknown scanned items without filling in
every field, so that the physical count is never blocked by incomplete catalog data.

#### Acceptance Criteria

1. WHEN an auditor selects one or more Unresolved_Barcodes and triggers Quick_Register THEN the
   system SHALL create one Incomplete_Item per selected barcode without requiring the auditor to
   enter name, category, price, or other descriptive fields.
2. WHEN a Quick_Register creates Incomplete_Items THEN the system SHALL assign each created item
   the Anomaly_Category and apply the Anomaly_Flag.
3. WHEN Quick_Register completes successfully THEN the system SHALL display a Feedback_Message
   stating that the item information is incomplete and that the items were filed under the
   Anomaly_Category for later completion.
4. WHEN Quick_Register completes successfully THEN the system SHALL remove the affected barcodes
   from the Unresolved_Barcode list so they no longer block commit.
5. IF a Quick_Register request fails THEN the system SHALL display an error Feedback_Message and
   SHALL leave the affected barcodes in the Unresolved_Barcode list.
6. WHERE an auditor chooses to provide full details instead of Quick_Register, the system SHALL
   still offer a detailed registration path that captures complete item information.

### Requirement 2: Anomaly categorization and later completion

**User Story:** As an inventory manager, I want items registered during opname to be flagged and
grouped as anomalies, so that I can later add full information and move them to a proper category.

#### Acceptance Criteria

1. The system SHALL provide a reserved Anomaly_Category and SHALL create it on first use if it
   does not already exist for the tenant.
2. WHEN an Incomplete_Item is created via Quick_Register THEN the system SHALL set a persisted
   Anomaly_Flag on the item (a stored field/status, not merely category membership) so the
   incomplete state is reliably queryable across the application.
3. WHEN a user edits an Incomplete_Item and supplies the required descriptive details THEN the
   system SHALL allow the user to change the item's category away from the Anomaly_Category.
4. WHEN an Incomplete_Item's category is changed away from the Anomaly_Category and required
   fields are present THEN the system SHALL clear the persisted Anomaly_Flag.
5. The system SHALL allow a user to locate Incomplete_Items by filtering on the persisted
   Anomaly_Flag and/or the Anomaly_Category so they can be completed after the audit.

### Requirement 3: Reliable modal and session interaction (defect fix)

**User Story:** As a stock auditor, I want the unresolved-items and registration dialogs to open
and close cleanly, so that the application never becomes unresponsive during an opname.

#### Acceptance Criteria

1. WHEN the registration dialog is closed by any means (close button, overlay click, or escape)
   THEN the system SHALL return the auditor to a fully interactive page with no Page_Lock.
2. WHEN the unresolved-items dialog is closed THEN the system SHALL leave the page fully
   interactive and SHALL preserve the current Opname_Session's scanned counts.
3. The system SHALL NOT leave `document.body` (or any overlay) in a non-interactive state after
   any opname dialog transition.
4. WHEN the auditor switches between the unresolved-items view and the registration view THEN the
   system SHALL transition without producing a Page_Lock.

### Requirement 4: Opname session resilience against reload (defect fix)

**User Story:** As a stock auditor, I want my scanned counts to survive an accidental reload or
navigation, so that I never lose a long physical count.

#### Acceptance Criteria

1. WHILE an Opname_Session is active the system SHALL persist its scanned counts and unresolved
   barcodes such that they are not lost by a page reload.
2. WHEN an auditor reloads the page during an active Opname_Session THEN the system SHALL restore
   the in-progress scanned counts and unresolved barcodes.
3. WHEN an auditor explicitly cancels/aborts an Opname_Session THEN the system SHALL clear the
   persisted session data.
4. WHEN an Opname_Session is committed successfully THEN the system SHALL clear the persisted
   session data.
5. IF an audit cycle was initiated on the server but the auditor aborts the Opname_Session THEN
   the system SHALL flag the abandoned cycle for resolution rather than silently discarding it,
   and SHALL require an Elevated_Role to void or otherwise resolve it (see Requirement 8).

### Requirement 5: Opname completion is never blocked

**User Story:** As a stock auditor, I want to always be able to finalize my count, so that
unresolved items never trap me in an incomplete session.

#### Acceptance Criteria

1. WHEN every Unresolved_Barcode has been resolved (via Quick_Register or explicit flag) THEN the
   system SHALL allow the auditor to proceed to commit the Opname_Session.
2. WHEN the auditor commits an Opname_Session THEN the system SHALL include both Registered_Item
   counts and counts for items registered during the session.
3. The system SHALL provide a way to exit the unresolved-items step without losing the scanned
   counts of the current Opname_Session.

### Requirement 6: Retail opname parity for unregistered items

**User Story:** As a retail branch auditor, I want the same opname experience that core inventory
has, so that stock physically present at my branch but missing from the catalog can still be
counted.

#### Acceptance Criteria

1. The system SHALL present Retail_Opname using the same opname experience/component behavior as
   Core_Opname, differing only in that it is fixed to the Active_Branch rather than offering a
   cross-branch location selector.
2. WHEN a Retail_Opname scan does not match any Registered_Item in scope THEN the system SHALL
   add the scan to the count as an Unregistered_Item rather than rejecting it outright.
3. WHEN a Retail_Opname session has Unresolved_Barcodes at commit time THEN the system SHALL
   present the same resolution options available in Core_Opname (Quick_Register as anomaly, or
   explicit flag).
4. WHEN Retail_Opname registers Unregistered_Items THEN the system SHALL apply the same
   Anomaly_Category and Anomaly_Flag behavior defined in Requirements 1 and 2.
5. The system SHALL apply Requirements 3, 4, 5, and 8 (interaction reliability, session
   resilience, non-blocking completion, role-gated void/approval) to Retail_Opname as well as
   Core_Opname.

### Requirement 7: Branch scoping is preserved

**User Story:** As a retail branch auditor, I want my opname to be limited to my own branch,
while company auditors retain cross-branch visibility, so that counts are attributed correctly.

#### Acceptance Criteria

1. WHILE performing a Retail_Opname the system SHALL scope item lookups and counts to the
   Active_Branch and SHALL NOT require or present a cross-branch location selector.
2. WHEN a Retail_Opname registers an Unregistered_Item THEN the system SHALL associate the
   resulting count and any stock effect with the Active_Branch.
3. WHERE the surface is Core_Opname the system SHALL retain its existing ability to select and
   audit any location across branches.
4. WHEN no Active_Branch is established for a Retail_Opname THEN the system SHALL prevent starting
   the session and SHALL display a Feedback_Message explaining that a branch must be selected.

### Requirement 8: Role-gated resolution of anomalies and abandoned cycles

**User Story:** As an owner, I want sensitive cleanup actions (voiding anomaly items or abandoned
audit cycles) to require justification and senior approval, so that opname data cannot be erased
without accountability.

#### Acceptance Criteria

1. WHEN a user requests to void an Incomplete_Item or an abandoned audit cycle THEN the system
   SHALL require a reason to be supplied.
2. IF the requesting user is an Owner or Superadmin THEN the system SHALL apply the void
   immediately upon submission of a reason, without a separate approval step.
3. IF the requesting user is not an Owner or Superadmin THEN the system SHALL create an
   Approval_Request and SHALL withhold the void until an Elevated_Role approves it.
4. WHEN an Elevated_Role approves a void Approval_Request THEN the system SHALL apply the void and
   record the approver, requester, reason, and timestamp.
5. WHEN an Elevated_Role rejects a void Approval_Request THEN the system SHALL leave the
   Incomplete_Item or audit cycle unchanged and SHALL record the rejection with its reason.
6. The system SHALL record an audit trail entry for every void request, approval, and rejection.
7. WHILE a void Approval_Request is pending the system SHALL keep the affected Incomplete_Item in
   its anomaly state and SHALL NOT delete its data.
