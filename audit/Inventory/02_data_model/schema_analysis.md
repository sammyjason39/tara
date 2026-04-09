# Schema Analysis - Inventory Department

## Core Tables

### 1. item_masters
Central registry for all inventoried items/services.
- **PK**: `id` (String/UUID)
- **Tenant Scoping**: `tenant_id`
- **Identity**: `sku` (Unique), `barcode` (Unique)
- **Financials**: `base_price` (Decimal 15,2), `tax_rate` (Decimal 5,2)
- **Integration**: `module_tags` (String[]), `type` (Enum: ITEM, SERVICE, RAW_MATERIAL)

### 2. stock_levels
Current state of stock at a specific location/department.
- **PK**: `id`
- **Identity**: Unique constraint on `[location_id, product_id, department_id]`.
- **Quantities**: `on_hand`, `reserved`, `available`, `in_transit` (Stored as **Float**).
- **Triggers**: `min_buffer` for auto-replenishment.

### 3. stock_movements
Immutable ledger of all stock changes.
- **PK**: `id`
- **Types**: `INTAKE`, `OUT`, `TRANSFER_IN`, `TRANSFER_OUT`, `ADJUSTMENT_PLUS`, `ADJUSTMENT_MINUS`.
- **Traceability**: `reference_id`, `reference_type`, `performed_by`.
- **Grouping**: `transfer_group_id` for multi-step transfers.

### 4. stock_reservations
Soft-locking mechanism for committed but unconsumed stock.
- **PK**: `id`
- **Lifecycle**: `expires_at` determines when a reservation is automatically released.
- **Status**: `PENDING`, `CONFIRMED`, `CANCELLED`.

## Inventory Lifecycle Tables
- `inventory_adjustments`: Formal requests for stock reconciliation.
- `inventory_audit_cycles`: Cycle counting orchestration and variance tracking.
- `inventory_pools`: Virtual grouping of stock for omni-channel distribution.
- `cost_layers` & `cost_snapshots`: FIFO/LIFO/Weighted Average cost tracking.

## Observations
- **Multi-Tenancy**: Every table contains `tenant_id` and is indexed for horizontal scaling.
- **Data Types**: Inconsistency detected between `amount` (Decimal) and `quantity` (Float).
- **Audit Consistency**: `stock_movements` acts as the source of truth for the `stock_levels` cache.
