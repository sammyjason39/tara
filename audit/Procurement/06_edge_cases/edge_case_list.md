# Edge Case List: Procurement

## 1. Input Validation
- **Negative PR Amounts**: `amount: -100` in `CreateRequisitionDto`. Code uses standard `number` with no `@Min(0)` validation in the repository. **RISK**.
- **Extreme Strings**: `supplierName` or `title` with 10k characters (no `@Length` guards).
- **Unknown Category**: User submits `category: "Aliens"`. No validation against `ProcurementCategory` table.

## 2. Relational Gaps
- **Cross-Tenant Requisition**: Creating a PO for a Requisition ID belonging to another tenant. (Checked in `releasePurchaseOrder` via `tenantId` in `where` - **PASS**).
- **Deleted Supplier**: Attempting to create a draft PO for a supplier that has been soft-deleted (`deletedAt NOT NULL`). `ProcurementDbRepository` uses `{ tenantId }` but does NOT check `deletedAt`. **RISK**.
- **Missing Branch**: Requisition references a `supplierBranchId` that does not exist or belongs to another supplier.

## 3. Workflow Edge Cases
- **Simultaneous Approvals**: Two HODs approve the same PR at the exact same millisecond. (Prisma `update` handles this, but status might be overwritten depending on logic).
- **Double Release**: Releasing a PO for the same PR twice. `releasePurchaseOrder` does NOT check if the PR status is already `PO_RELEASED`. **CRITICAL RISK**. (Could lead to duplicate `Payables`).
- **Quote After Release**: Updating a Draft PO's quote after the Final PO has already been issued.

## 4. Multi-Currency
- **PR in IDR, PO in USD**: No built-in exchange rate engine. Total amount inconsistencies between modules.
