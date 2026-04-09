# Module Boundaries - Inventory Department

## Inbound (Consumer)
Inventory listens to events from other departments via Listeners:

- **RetailListener**:
    - Listens for `RETAIL_SALE_COMPLETED` → Decrements stock.
    - Listens for `RETAIL_RETURN_COMPLETED` → Increments stock.
- **ProcurementListener**:
    - Listens for `PO_RECEIVED` → Increments stock (Intake).
    - Listens for `PR_APPROVED` → Reserves stock (Wait for delivery).
- **ITDeviceListener**:
    - Logic for Hardware Asset Inventory (Provisioning).

## Outbound (Producer)
Inventory emits events to notify other modules:

- `STOCK_MOVEMENT_CREATED`: Financial Hub for Sub-ledger entries.
- `LOW_STOCK_ALERT`: Procurement to trigger auto-replenishment.
- `STOCK_RESERVED`: Sales to confirm availability for orders.
- `INVENTORY_STOCK_INITIALIZED`: Master Ledger for Initial Valuation.

## Shared Infrastructure
- **Persistence**: Prisma ORM with Multi-tenant RLS (simulated via `tenant_id` filters).
- **Audit**: All state-changing operations are logged to `audit_logs` before DB commit.
- **Resilience**: Transactional consistency (ACID) is prioritized over performance.
