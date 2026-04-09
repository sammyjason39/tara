# Invalid States: Procurement

## 1. Unreachable States (Reachable via Gaps)
- **Released PO without a Budget PR**: Since the status checks are not enforced in `releasePurchaseOrder` in `ProcurementDbRepository`, it's possible to release a PO for a PR that is still in `PENDING_REQUESTER_HOD` status.
- **Contract Signature Disconnect**: A contract can be `SIGNED` before the legal review is `LEGAL_APPROVED`. No code-level enforcement on signature sequence.

## 2. Orphaned States
- **Dangling Draft PO**: A Draft PO can exist for a PR that was later `REJECTED` or `DELETED`. No link and effect from the PR's rejection to its draft POs.
- **Dangling Requisition**: A PR that is `FINAL_APPROVED` but does not have a single `DraftPO` or `FinalPO`. Could be a lost opportunity.

## 3. Contradictory States
- `procurement_requisitions.status = PO_RELEASED` but no record in `procurement_final_pos` for that `requisitionId`.
- `procurement_final_pos.status = RECEIVED` but `supplier_masters.global_rating` was not updated (due to receipt creation failure).

## 4. Multi-Tenant Contamination
- **Tenant A**'s PR associated with **Tenant B**'s Supplier.
- **Check**: `ProcurementDbRepository.createDraftPurchaseOrder` retrieves the PR and then uses the provided `supplierId`. It does NOT verify the supplier belongs to the same tenant as the PR. **CRITICAL RISK**.
