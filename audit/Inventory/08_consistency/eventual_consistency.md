# Eventual Consistency - Inventory Department

## 1. Outbox Event Distribution
- **Logic**: Emit `STOCK_MOVEMENT_CREATED` for downstream (Finance, Procurement).
- **Finding**: Async `EventBus` detected.
- **Risk**: De-sync if the event listener process (Finance) crashes.
- **Mitigation**: `inventory_subledger_entries` records the synchronization state.
- **Validation**: ⚠️ PARTIAL PASS (Requires periodic reconciliation job to verify no missed events).

## 2. Inventory Pool Sync
- **Logic**: Shared stock levels across ecommerce channels (Shopify, Amazon).
- **Finding**: Detected `inventory_pool_stock` updates.
- **Delay**: E-commerce API latency may result in "over-selling" if stock is low.
- **Mitigation**: `reserved` qty provides a buffer for orders-in-flight.
- **Validation**: ✅ PASS (Buffer logic exists).

## 3. Stock History Reconstruction
- **Scenario**: Audit requires confirming the balance at a point in past.
- **Implementation**: SQL Query over `stock_movements` sorted by `created_at`.
- **Validation**: ✅ PASS (Historical state is verifiable).
