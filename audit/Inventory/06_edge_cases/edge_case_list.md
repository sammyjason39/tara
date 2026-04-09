# Edge Case List - Inventory Department

## Stock Operations
- **Negative Consumptions**: Requested qty > Available qty (Resolved: Throws error).
- **Infinite Transfers**: Transferring Stock A from Loc 1 to Loc 1 (Resolved: Validated at Service).
- **Concurrent Intake**: Multiple workers posting intake for same SKU at same time (Resolved: Row-level lock used).
- **Zero Quantity Transaction**: Intake/Transfer of 0.0 units (Resolved: DTO @Min(0.0001) validation).

## Unit of Measure (UOM)
- **Conversion Drift**: Moving 1 Case (12 items) out, but only 10 items recorded at destination (Resolved: UOM consistency not fully enforced at DB layer; risk identified).
- **Decimal Rounding**: Total stock 1.00000001 due to precision loss (Resolved: Recommended conversion to Decimal).

## Lifecycle
- **Orphaned Moves**: Movement record exists, but item master is physically deleted (Resolved: FK constraint prevents deletion).
- **Stale Reservations**: Reservation expires while a physical warehouse move is in progress (Resolved: System allows "Override" if reference_id matches).
- **Closed Audit**: Posting movements to a location that is currently under `inventory_audit_cycle` (Resolved: Lock in adjustment service detects status != OPEN).
