# Domain Invariants: Procurement

## 1. Budgetary Integrity
- **Invariant**: The `total_amount` in `procurement_final_pos` MUST be equal to or less than the `amount` in the associated `procurement_requisitions` (unless specifically approved by a budget adjustment).
- **Check**: The `CreateDraftPoDto` uses `quoted_total`. Most logic in the `ProcurementDbRepository` calculates `totalAmount` based on line items but does NOT perform an automated check against the PR's original limit. **VIOLATION RISK**.

## 2. Status Sequencing
- **Invariant**: A PR cannot reach `PO_RELEASED` status without first passing through `APPROVED_REQUESTER_HOD` and `FINAL_APPROVED`.
- **Enforcement**: Status fields in `ProcurementDbRepository` are updated sequentially. However, there is no state-machine guard at the database level (e.g., check `old_status == EXPECTED_STATUS`).

## 3. Financial Connectivity
- **Invariant**: Every Released PO (`RELEASED`) must have a corresponding `Payable` record in the Finance module.
- **Enforcement**: Performed in `releasePurchaseOrder` in `ProcurementDbRepository`. **RISK**: No distributed transaction or retry logic if Finance creation fails.

## 4. Multi-Tenant Isolation
- **Invariant**: Data from `Tenant A` must NEVER be visible to `Tenant B`.
- **Enforcement**: Every query in `ProcurementDbRepository` includes `where: { tenantId }`.

## 5. Supplier Ratings
- **Invariant**: `global_rating` must always be between `0` and `100`.
- **Enforcement**: `createReceipt` uses `Math.max(0, Math.min(100, qualityScore))`. **SECURE**.
- **Check**: `qualityScore` calculation includes `quantityAccuracy * 0.5`. If `quantityAccuracy` is not capped (e.g., > 200%), the score could exceed 100. (DTO should validate range 0-100).
