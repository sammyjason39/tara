# Concurrency Risks - Inventory Department

## 1. Transaction Atomic Mode
- **Pattern**: `this.prisma.$transaction(async (tx) => { ... })`.
- **Finding**: Detected in `InventoryDbRepository.intakeStock`, `consumeStock`, `transferStock`.
- **Validation**:
    - Complete Rollback on failure: ✅ PASS
    - Partial Data prevention: ✅ PASS

## 2. Row Locking Strategy
- **Pattern**: `SELECT ... FOR UPDATE` via `getLock` method.
- **Context**: 
    1. Lock `stock_level` (Item, Location).
    2. Read `available`.
    3. Update `available`.
    4. Release lock (Commit).
- **Risk**: Blocking other transactions for the SAME Item at the SAME location.
- **Mitigation**: Inventory operations are localized. A high-volume warehouse might see contention, but for ERP/Standard use, this is highly stable.
- **Validation**: ✅ PASS (No race conditions possible on stock updates).

## 3. Stock Double-Spend
- **Scenario**: User makes two sales at once; only enough stock for one.
- **Result**: First transaction locks row, second waits. First updates and commits. Second wakes up, reads NEW `available`, finds `available < requested`, and THROWS error.
- **Validation**: ✅ PASS (Atomic check-then-set logic).
