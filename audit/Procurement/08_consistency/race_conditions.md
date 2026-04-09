# Race Conditions: Procurement

## 1. Concurrent PR Creation (Double Click)
- **Problem**: User clicks "Submit PR" twice in rapid succession.
- **Race Condition**: `ProcurementService.createRequisition` creates two identical PR rows in the database.
- **Impact**: Double budget allocation, double approvals required.
- **Fix**: UI-level debouncing + backend idempotency key.

## 2. Shared Record Contention (Supplier Rating)
- **Problem**: Simultaneous receipts for the same supplier.
- **Race Condition**: `global_rating` is read concurrently, calculated separately, and saved sequentially.
- **Impact**: One rating update is lost.
- **Check**: `procurement_rating_logs` (Line 3261) could be used to reconstruct the rating, but it is currently not used for the master `global_rating` calculation in `createReceipt`.

## 3. Distributed Inconsistency (PO vs Payable)
- **Problem**: Releasing a PO.
- **Race Condition**: `procurement_final_pos` created, then `payables` created in a separate step.
- **Risk**: If the app crashes between the two database inserts, the transactional integrity of the purchase-to-pay workflow is broken.
- **Fix**: Prisma `$transaction` or Saga pattern for cross-module operations.
- **Verdict**: Currently handles sequentially. **HIGH RISK**.

## 4. Duplicate Event Publishing
- **Problem**: Retrying `processReceipt` due to timeout.
- **Race Condition**: First event published but response timed out; second event published.
- **Impact**: Inventory intake triggers twice for the same PO shipment.
- **Fix**: Payload should include `receipt_id` and the Inventory handler should check for uniqueness.
