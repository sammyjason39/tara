# Failure Modes - Inventory Department

## Transactional Integrity Analysis

### 1. Mid-Intake Failure
- **Scenario**: `stock_level` incremented, but `stock_movement` creation FAILED due to network error.
- **Result**: `Prisma.$transaction` (detectable in `InventoryDbRepository`) results in full ROLLBACK. Stock remains at previous state.
- **Recovery**: Automatic. No partial data.

### 2. Multi-Step Transfer Interruption
- **Scenario**: Transfer starts (Source decrement), worker process CRASHES before Destination increment.
- **Result**: Source and Destination decrements/increments are wrapped in a SINGLE database transaction.
- **Finding**: ✅ SAFE (All-or-nothing atomicity enforced).

### 3. Inventory-Finance De-Sync
- **Scenario**: Stock operation SUCCEEDED, but the Event Bus failed to deliver `STOCK_MOVEMENT_CREATED` to Finance.
- **Risk**: Inventory shows 10 units, but Finance Ledger shows 0 (Missing asset).
- **Failure Mode**: The movement record exists for future reconciliation, but the real-time balance is incorrect.
- **Recommendation**: Implement `Outbox Pattern` for all stock moves (already partially implemented in platform).

### 4. Deadlock Detection
- **Scenario**: Worker 1 locks SKU A then SKU B. Worker 2 locks SKU B then SKU A.
- **Result**: PostgreSQL deadlock error.
- **Finding**: Inventory operations typically lock one SKU/Location at a time. Multi-item transfers are ordered by SKU to prevent deadlocks (Need to verify Sorter logic in backend).
