# Data Access - Inventory Department

## 1. Location-Based Scoping
- **Context**: A operator in `Location A` should NOT be able to post consumption for `Location B`.
- **Finding**: Some endpoints (e.g., `POST /intake`) allow specifying `locationId` in the body.
- **Risk**: If the user's `employee.location_id` is NOT checked against the request's `locationId`, a cross-location stock move could be forced.
- **Recommendation**: Add `LocationGuard` to ensure the `locationId` in the request payload matches the user's permitted locations.

## 2. PII Exposure
- **Context**: Data like `supplier_masters` or `employee_names` in `performed_by`.
- **Finding**: Inventory Movement API returns `performed_by` as a string (User ID or generic "system").
- **Constraint**: `InventoryService.getHistory` performs a join with `employees` to return names.
- **Validation**: Names are shown to all `INVENTORY_OPERATOR` roles. No sensitive salary or HR data is leaked.

## 3. Adjustment Logic Tampering
- **Scenario**: User submits an adjustment for `100` units, then tries to Approve it themselves.
- **Guardrail**: `adjustments` table tracks `requested_by` and `approved_by`.
- **Invariant**: `approved_by != requested_by`.
- **Validation**: Not explicitly enforced in `InventoryService.approveAdjustment`.
- **Recommendation**: Enforce `adjustment.requested_by !== current_user_id` at the service layer for approval actions.
