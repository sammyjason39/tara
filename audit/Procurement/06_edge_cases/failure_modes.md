# Failure Modes: Procurement

## 1. Partial Persistence (Monolith Fallacy)
- **Problem**: `releasePurchaseOrder` in `ProcurementDbRepository` creates a `FinalPO` and a `Payable`.
- **Failure**: If the `FinalPO` is created but the `Payable` creation fails (e.g., Finance DB down or validation error), the PR status is updated to `PO_RELEASED`.
- **Impact**: Inconsistent financial records. Procurement thinks the order is issued, but Finance has no record of the obligation. **CRITICAL FAILURE**.

## 2. Event Loss
- **Problem**: `processReceipt` in `ProcurementService` emits `PO_RECEIVED`.
- **Failure**: This is an async action using `EventBusService`. If the bus is down or the receiver (Inventory) crashes before processing, the reception is "recorded" but the stock is never increased.
- **Impact**: Physical inventory exceeds logical inventory. Operations are blocked.

## 3. Database Deadlocks
- **Problem**: Multiple users updating the same `procurement_requisitions` or `supplier_masters` (e.g., bulk PR approvals).
- **Failure**: Prisma `update` without explicit transaction isolation could lead to deadlocks or stale updates.
- **Impact**: 500 errors during high-load periods (e.g., end-of-quarter ordering).

## 4. Tenant Hijacking
- **Problem**: Passing a valid `requisitionId` but an incorrectly associated `tenantId`.
- **Mitigation**: Every PR selection in `ProcurementDbRepository` uses `{ id: requisitionId, tenantId }`. This correctly prevents data leakage but might "Silently Fail" by throwing a `NotFoundException` instead of a security violation.
