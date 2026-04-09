# Recovery Plans - Inventory Department

## 1. Inventory Balancing Recovery
**Scenario**: Discrepancy between Movement records and Stock Level cache.
- **Action**: Run `ReconcileStockLevelJob(productId, locationId)`.
- **Logic**:
    1. Recalculate `on_hand = SUM(movements.quantity)`.
    2. Recalculate `reserved = SUM(reservations.quantity WHERE status = PENDING)`.
    3. Update `stock_level` record to the NEW ground-truth values.
    4. Flag the product for Manual Audit if the delta is significant (> 1%).

## 2. Failed Transfer Recovery
**Scenario**: Source stock moved out, but Destination stock not moved in (Atomic transaction somehow failed at the application level during parallel process).
- **Action**: Locate `transfer_group_id` for the problematic movement.
- **Logic**:
    1. If `TRANSFER_OUT` exists without matching `TRANSFER_IN`, create a `system_recovery` INTAKE in the Destination location.
    2. Reference the Original Move in the notes field.

## 3. SKU Collision Recovery
**Scenario**: Duplicate `SKU` attempt (Usually blocked at DB).
- **Action**: `SkuGenerator.suggestNew(baseSku)`.
- **Logic**: Suffix-incrementing (`ITEM-A-1`, `ITEM-A-2`) based on the existing pattern.

## 4. Lost Event Recovery (Financial)
**Scenario**: Stock move confirmed, but Finance didn't ledger it.
- **Action**: `SubledgerSyncJob(startDate, endDate)`.
- **Logic**: Re-emit all `STOCK_MOVEMENT_CREATED` events that are NOT matched by a `inventory_subledger_entries` record.
