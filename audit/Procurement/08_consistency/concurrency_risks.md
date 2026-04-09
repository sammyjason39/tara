# Concurrency Risks: Procurement

## 1. Concurrent Status Updates
- **Scenario**: Two HODs (Requester HOD and Finance HOD) approve the same PR simultaneously.
- **Finding**: `ProcurementDbRepository.approveFinal` first finds the PR and then updates it.
- **Risk**: If the status was updated by another process between `findUnique` and `update`, the logic might correctly advance, but the `newStatus` calculation (`FINANCE_HOD` -> `FINAL_APPROVED`) could be overwritten by a stale status from the first `findUnique`.

## 2. Shared Record Contention
- **Model**: `supplier_masters.global_rating`.
- **Scenario**: Multiple receipts for the same supplier arriving simultaneously.
- **Risk**: Each `createReceipt` call reads the current rating, calculates a new one, and updates the record.
- **Race Condition**: `Rating_A` is read, `Rating_B` is read, `Update_A` is saved, then `Update_B` (calculated from original `Rating_A`) is saved. **Update_A is lost**.
- **Fix**: Ratings should be updated using a database-level increment/decrement or a "Rating History" table that is aggregated.

## 3. Distributed Transactions (Lack Of)
- **Operation**: `releasePurchaseOrder`.
- **Finding**: No cross-model transaction support. If `FinalPO` persists but the `Payable` creation is delayed or fails due to database locking on the `payables` table, the system enters an inconsistent state.
- **Impact**: Financial discrepancy.

## 4. Double Event Publishing
- **Scenario**: Retrying a failed receiving API call.
- **Risk**: Event bus receives duplicate `PO_RECEIVED` events if the previous publication timed out but actually succeeded.
- **Fix**: Idempotent message handling in Inventory.
- **Finding**: `ProcurementService` does NOT generate a UUID for the event; it uses the `finalPoId`. If the `finalPoId` is reused, it's not and-to-end idempotent.
