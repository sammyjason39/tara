# Schema Analysis: Procurement

## 1. Core Entities

### `procurement_requisitions`
Foundation of the workflow. Tracks intent to purchase.
- **Key Fields**: `requester_id`, `department_id`, `branch_code`, `amount` (Decimal 15,2), `status`, `approvals` (Json).
- **Status Lifecycle**: `DRAFT` -> `PENDING_REQUESTER_HOD` -> `APPROVED_REQUESTER_HOD` -> `FINAL_APPROVED` -> `PO_RELEASED`.

### `procurement_draft_pos`
Transition state between an approved PR and a binding PO.
- **Key Fields**: `line_items` (Json), `quoted_total`, `contract_type`.
- **Relationship**: Links 1:1 with `ProcurementRequisition`.

### `procurement_final_pos`
The legal commitment sent to the supplier.
- **Key Fields**: `total_amount`, `issued_at`, `expected_delivery_date`.
- **Integration**: Triggers `Payable` creation on release.

### `procurement_contracts`
Legal wrapper for high-value or long-term purchases.
- **Key Fields**: `signed_by_supplier`, `signed_by_proc_hod`, `signed_by_finance_hod`, `version`.

## 2. Supplier Ecosystem

### `supplier_masters`
Global supplier record.
- **Key Fields**: `compliance_status`, `global_rating`, `risk_tier`, `categories` (String[]).

### `supplier_branches`
Location-specific supplier entities.
- **Key Fields**: `lead_time_days`, `local_rating`, `risk_tier`.

### `supplier_products`
Catalog of items offered by suppliers.
- **Key Fields**: `sku`, `unit_price`, `quality_score`.

## 3. Feedback & Audit

### `procurement_receipts`
Goods receipt validation.
- **Key Fields**: `delivery_on_time`, `quantity_accuracy`, `quality_score`, `issue_count`.
- **Logic**: Updates `supplier_masters.global_rating` upon submission.

### `procurement_audit_events`
Immutable trail of all module actions.
- **Key Fields**: `actor_id`, `action`, `entity_type`, `entity_id`, `detail`.
