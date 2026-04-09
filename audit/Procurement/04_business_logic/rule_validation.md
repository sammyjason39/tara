# Rule Validation: Procurement

## 1. Multi-Step Approvals
- **Rule**: PR requires HOD and Finance HOD approval.
- **Audit**: `procurement_requisitions.status` correctly advances from `PENDING_REQUESTER_HOD` -> `APPROVED_REQUESTER_HOD` -> `FINAL_APPROVED`.
- **Finding**: No "Auto-approval" threshold. Even a $1 purchase requires two HODs. Inefficient for high-volume tenants. **GAP IDENTIFIED**.

## 2. Supplier Compliance
- **Rule**: Only `VERIFIED` suppliers can receive POs.
- **Audit**: `ProcurementDbRepository.releasePurchaseOrder` retrieves the `supplier_masters` but DOES NOT check `compliance_status` before creating the PO. **CRITICAL VIOLATION**.

## 3. Rating Feedback Loop
- **Rule**: Each reception updates the global supplier rating.
- **Audit**: `createReceipt` performs calculation and updates `supplierMaster.globalRating`.
- **Finding**: Calculation is hardcoded: `(data.deliveryOnTime ? 25 : 0) + (data.quantityAccuracy * 0.5) + (data.qualityScore * 0.25) - (data.issueCount * 5) - (data.invoiceMismatch ? 10 : 0)`.
- **Refinement**: No weight for the value of the order. A $1 order and a $1M order impact rating equally.

## 4. Contract Enforcement
- **Rule**: High-value items require a signed contract before PO release.
- **Audit**: `ProcurementDbRepository.createContract` sets `status = LEGAL_REVIEW`.
- **Finding**: There is no check in `releasePurchaseOrder` to ensure a `procurement_contracts` EXISTS and is `SIGNED` for the associated PR. **CRITICAL VIOLATION**.
