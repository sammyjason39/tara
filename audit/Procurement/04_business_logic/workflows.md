# Workflows: Procurement

## 1. Supplier Onboarding Lifecycle
1. **Entry**: `POST /suppliers`. Actor: Procurement Team.
2. **Review**: `ProcurementDbRepository.createSupplier` sets `compliance_status = PENDING`.
3. **Audit**: Logs `supplier.created` in `ProcurementAuditEvent`.
4. **Verification**: External verification (Legal/Audit) updates status to `VERIFIED`.

## 2. Requisition (PR) Lifecycle
1. **Entry**: `POST /requisitions`. Actor: Staff member.
2. **Status**: Initial status `PENDING_REQUESTER_HOD`.
3. **Approval 1**: `PUT /requisitions/:id/approve-requester-hod`. Actor: Dept HOD.
   - Status: `APPROVED_REQUESTER_HOD`.
4. **Approval 2**: `PUT /requisitions/:id/approve-final`. Actor: Finance HOD.
   - Status: `FINAL_APPROVED`.
5. **Drafting**: `POST /draft-pos`. Actor: Procurement Specialist.
   - PR Status: `DRAFT_PO_PREPARED`.
6. **Confirmation**: `PUT /draft-pos/:id/confirm-quote`. Actor: Supplier/Specialist.
   - PR Status: `SUPPLIER_CONFIRMED`.
7. **Issuance**: `POST /purchase-orders/release`. Actor: Procurement/Finance.
   - PR Status: `PO_RELEASED`.
   - Final PO Status: `RELEASED`.

## 3. Goods Receipt Workflow
1. **Reception**: `POST /receipts` or `/purchase-orders/:id/process-receipt`.
2. **Calculations**: `ProcurementDbRepository.createReceipt` calculates custom rating based on:
   - On-time delivery (25 pts)
   - Quality accuracy (50 pts)
   - Quality score (25 pts)
   - Deductions for issues.
3. **Feedback**: Updates `supplier_masters.global_rating` immediately.
4. **Integration**: Emits `PO_RECEIVED` to trigger Inventory Intake.
