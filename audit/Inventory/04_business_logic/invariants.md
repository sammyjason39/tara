# Business Invariants - Inventory Department

## Core Invariants

### 1. Stock Identity
`available = on_hand - reserved + in_transit`
- **Validation**: This must be true after EVERY single transaction.
- **Fail Scenario**: If `on_hand - reserved < 0`, a Stock Over-Reservation has occurred.

### 2. No Negative Stock
`on_hand >= 0`
- **Exception**: "Backlog" or "Allow Negative" mode (NOT detected in current implementation).
- **Validation**: The DB repository `consumeStock` method throws an error if `available < requested_qty`.

### 3. SKU Uniqueness
`count(SKU) == 1` per `tenant_id`.
- **Validation**: Enforced at the Database Layer (`@@unique([tenant_id, sku])`).

### 4. Movement Record Totality
`sum(movements.quantity) == stock_levels.on_hand`
- **Validation**: This is a reconciliation rule. Any drift between the sum of movements and the current balance is a High-Priority Audit Failure.

## Valuation Invariants
`total_valuation == sum(cost_layers.remaining_qty * cost_layers.unit_cost)`
- **Rule**: Cost layers must be fully consumed in order (FIFO).
- **Validation**: Handled in `InventoryDbRepository.consumeStock` when `cost_layers` are active.
