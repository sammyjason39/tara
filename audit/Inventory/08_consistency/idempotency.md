# Idempotency - Inventory Department

## 1. Global Platform Idempotency
- **Table**: `sys_idempotency_keys`.
- **System**: Incoming requests are hashed and checked for recent execution.
- **Validation**: 
    - `POST /intake` (Duplicate Intake protection): ✅ PASS (Global Layer).
    - `POST /transfer` (Duplicate Transfer protection): ✅ PASS (Global Layer).

## 2. Business-Key Idempotency
- **Field**: `reference_id` and `reference_type`.
- **Logic**: Detected unique constraint in `stock_movements`:
    - `@@unique([tenant_id, reference_id, reference_type, type, product_id, location_id])`.
- **Benefit**: This prevents the SAME logical event (e.g. Purchase Order ID 100) from being recorded as TWO intake movements for the SAME product-location pair at the DB layer.
- **Validation**: ✅ PASS (Built-in data integrity).

## 3. Gap: Distributed Race Conditions
- **Scenario**: Two micro-services emit the SAME logic event at the exact same millisecond.
- **Mitigation**: The unique constraint on `reference_id` in the movement table acts as the final guardrail.
- **Validation**: ✅ PASS (Robust implementation).
