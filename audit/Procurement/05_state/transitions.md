# Transitions: Procurement

## 1. Purchase Requisition (PR) Triggers
PR transitions are triggered by both explicit API calls and implicit side-effects from related entities.

| From Status | To Status | Action | Actor |
| ---- | ---- | ---- | ---- |
| `DRAFT` | `PENDING_REQUESTER_HOD` | `POST /requisitions` | Staff |
| `PENDING_REQUESTER_HOD` | `APPROVED_REQUESTER_HOD` | `PUT /.../approve-requester-hod` | Dept HOD |
| `APPROVED_REQUESTER_HOD` | `FINAL_APPROVED` | `PUT /.../approve-final` | Finance HOD |
| `FINAL_APPROVED` | `DRAFT_PO_PREPARED` | `POST /draft-pos` | Procurement Specialist |
| `DRAFT_PO_PREPARED` | `DRAFT_PO_APPROVED` | `PUT /draft-pos/:id/approve` | Procurement HOD |
| `DRAFT_PO_APPROVED` | `SUPPLIER_CONFIRMED` | `PUT /draft-pos/:id/confirm-quote` | Procurement Specialist |
| `SUPPLIER_CONFIRMED` | `PO_RELEASED` | `POST /purchase-orders/release` | Procurement Specialist |

## 2. Transition Guard Failures
- **Guard**: Only `FINAL_APPROVED` PRs should be allowed for `createDraftPurchaseOrder`.
- **Finding**: `ProcurementDbRepository.createDraftPurchaseOrder` retrieves the requisition but **NOT** its status. It allows drafting for *any* existing PR. **CRITICAL VIOLATION**.

## 3. Transition Side-Effects
- **Final Approval**: Triggers `requisition.final_approved.[approver]` audit entry.
- **PO Release**:
  - Updates PR status to `PO_RELEASED`.
  - Creates `procurement_final_pos` record.
  - Creates `Payable` in Finance module.
- **Receipt recorded**:
  - Updates PO status from `RELEASED` to `RECEIVED`.
  - Recalculates supplier global rating.
  - Emits `PO_RECEIVED` for Inventory.
