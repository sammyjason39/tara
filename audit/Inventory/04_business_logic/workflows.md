# Workflows Audit - Inventory Department

## 1. Stock Intake (Purchasing/Manual)
- **Actor**: `ProcurementListener` or `InventoryController.postIntake`.
- **Logic**:
    1. Check for existing `stock_level` record for (Tenant, Item, Loc, Dept).
    2. Atomic Lock: `SELECT ... FOR UPDATE` via `getLock`.
    3. Update `stock_level`: Increment `on_hand` and `available`.
    4. Create `stock_movement`: Persistent record with `INTAKE` type.
    5. Audit Log: Register change in `audit_logs` table.
    6. Event Bus: Emit `STOCK_MOVEMENT_CREATED` for downstream financial reconciliation.

## 2. Stock Transfer (Internal)
- **Actor**: `InventoryController.postTransfer`.
- **Logic**:
    1. Transaction Start.
    2. Atomic Lock on **SOURCE** location.
    3. Decrease `on_hand` and `available` in SOURCE.
    4. Atomic Lock on **DESTINATION** location (Upsert if not exists).
    5. Increase `on_hand` and `available` in DESTINATION.
    6. Create TWO `stock_movement` records: `TRANSFER_OUT` (-) and `TRANSFER_IN` (+).
    7. Shared Group: Link both moves via `transfer_group_id` for reconciliation.

## 3. Stock Consumption (Usage/Sales)
- **Actor**: `RetailListener` or `InventoryController.postConsumption`.
- **Logic**:
    1. Atomic Lock.
    2. Check `available >= requested_qty`.
    3. Decrease `on_hand` and `available`.
    4. Create `stock_movement` record: `OUT` type.
    5. Risk Detection: Check if `available` falls below `min_buffer` and trigger `LOW_STOCK_ALERT`.

## 4. SKU Generation Engine
- **Service**: `SkuGeneratorService`.
- **Pattern**: `[DEP-CODE]-[CAT-SEQUENCE]-[CHECKSUM]`.
- **Constraint**: Must be unique per tenant. Handled by uniqueness check before DB commit.
