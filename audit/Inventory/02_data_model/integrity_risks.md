# Integrity Risks - Inventory Department

## 1. Floating-Point Precision
- **Model**: `stock_levels`, `stock_movements`, `inventory_adjustments`.
- **Field**: `on_hand`, `reserved`, `available`, `quantity`.
- **Type**: `Float` (PostgreSQL `REAL` or `DOUBLE PRECISION`).
- **Risk**: Financial-grade inventory counts can experience precision loss during high-frequency additions/subtractions (e.g. `0.1 + 0.2 != 0.3`).
- **Recommendation**: Convert to `Decimal` for precision or `Int` if decimal quantities are not allowed.

## 2. Orphaned Records
- **Model**: `stock_levels` (Location or Product Deletion).
- **Analysis**: Prisma uses `ON DELETE RESTRICT` by default. Deleting a `product` that has `stock_levels` will FAIL.
- **Risk**: Logical Deletions (`status: "deleted"`) in `item_masters` can leave active `stock_levels`.
- **Recommendation**: Implement a trigger or check in `DeleteService` to ensure `stock_levels` are zeroed before product deactivation.

## 3. Atomic Updates
- **Analysis**: `InventoryDbRepository` uses `getLock` for critical updates.
- **Risk**: Concurrent transactions on the SAME row but in DIFFERENT Postgres session/worker nodes.
- **Mitigation**: `SELECT ... FOR UPDATE` row-level locking detected in `inventory.db.repository.ts`.
- **Pass/Fail**: ✅ PASS (Atomic locking is correctly implemented).

## 4. Subledger Consistency
- **Model**: `inventory_subledger_entries`.
- **Risk**: Discrepancy between `stock_movements` (quantity) and `subledger_entries` (value).
- **Recommendation**: Asynchronous job to reconcile Ledger with Stock Movements nightly.
