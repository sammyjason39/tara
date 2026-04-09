# State Transitions - Inventory Department

## 1. Inventory Adjustment Transition
- **Trigger**: `postAdjustmentApproval`
- **Logic**:
    1. Check `adjustment.status == PENDING_APPROVAL`.
    2. Atomic Lock for `stock_level`.
    3. Operation: Update `stock_level` by `delta`.
    4. Create `stock_movement` with reference to `adjustment_id`.
    5. Set `adjustment.status = APPROVED`.
- **Validation**: Transition is one-way. APPROVED cannot be reverted.

## 2. Stock Reservation Transition (Confirmation)
- **Trigger**: `postReservationConfirm`
- **Logic**:
    1. Check `reservation.status == PENDING`.
    2. Decrement `reserved` stock.
    3. Decrement `on_hand` stock.
    4. Create `stock_movement` (Consumption/Sale).
    5. Set `reservation.status = CONFIRMED`.
- **Validation**: Decrementing `reserved` MUST be accompanied by decrementing `on_hand`.

## 3. Stock Reservation Transition (Expiration/Cancellation)
- **Trigger**: `postReservationCancel` or `cronCleanup`
- **Logic**:
    1. Check `reservation.status == PENDING`.
    2. Decrement `reserved` stock (Releases the soft lock).
    3. Increment `available` stock (Calculated field in some queries).
    4. Set `reservation.status = CANCELLED` or `EXPIRED`.
- **Validation**: `on_hand` is NOT changed during cancellation.
