# Inconsistencies: Procurement

## 1. Status Naming Inconsistency
- **PR Entity**: `APPROVED_REQUESTER_HOD` -> `FINAL_APPROVED`.
- **Final PO Entity**: `RELEASED` (Upper case).
- **Draft PO Entity**: `SUPPLIER_CONFIRMED` (Upper case).
- **Finding**: Enum values are not standardized across the module. Some are `lowerCase` in response (`released`) and `UPPERCASE` in database. **DEBT**.

## 2. Calculation vs Metadata
- **`procurement_draft_pos`**: Stores `quoted_total` separately from the `line_items` array. No guarantee they match.
- **Audit**: `CreateDraftPoDto` calculates `totalAmount` if `quotedTotal` is missing. 
- **Risk**: A specialist could manually override `quoted_total` without changing the `line_items`, causing downstream accounting errors.

## 3. Mock vs DB Discrepancy
- **Mock Repository**: Returns `PO_RELEASED` status for PRs.
- **DB Repository**: Returns `FINAL_APPROVED` and potentially others.
- **Finding**: Integration tests will fail when switching between repositories because status strings are inconsistent. **CRITICAL INCONSISTENCY**.

## 4. Multi-Tenant context vs Header
- **Controller**: Uses `request.tenantContext.tenantId`.
- **Repository (Specific Methods)**: Some methods like `getSupplierProducts` (Line 121) use `@Headers('x-tenant-id') tenantId: string` directly.
- **Impact**: Inconsistent security enforcement. The headers bypass the `TenantInterceptor`'s normalization. **SECURITY SMELL**.
