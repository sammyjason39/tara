# Broken Flows: Procurement

## 1. The PO-Payable Atomic Failure
- **Flow**: `releasePurchaseOrder`.
- **Breaking Condition**: Database transaction failure during `Payable.create` but SUCCESS during `FinalPO.create` and `Requisition.update`.
- **Impact**: Procurement module thinks the PO is released; Finance has no knowledge. Debt is unaccounted for. **CRITICAL BROKEN FLOW**.

## 2. Status Guard Skip
- **Flow**: `createDraftPurchaseOrder`.
- **Breaking Condition**: User drafts a PO for a PR that is NOT yet `FINAL_APPROVED`.
- **Impact**: Procurement team bypasses management/finance oversight by manually creating drafts for pending PRs. The system allows this because no status check is performed in the repository.

## 3. Simultaneous Reception Loss
- **Flow**: `createReceipt`.
- **Breaking Condition**: Two shipments arrive at the same time for the same supplier.
- **Impact**: Last-write-wins on the `global_rating` field. If `Rating_A` and `Rating_B` are calculated simultaneously, the first rating is lost. Inaccurate supplier performance data.

## 4. Requisition Deletion Paradox
- **Flow**: `deleteRequisition` (Conceptual, currently missing endpoint).
- **Breaking Condition**: A PR is deleted while a Draft PO or Contract exists for it.
- **Impact**: `procurement_draft_pos` and `procurement_contracts` become orphans with broken foreign key records (if not prevented by DB cascades).
