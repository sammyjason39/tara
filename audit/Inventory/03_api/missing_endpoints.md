# Missing Endpoints - Inventory Department

## Operations
- **Bulk Item Creation**: Currently only single item POST `/items`. Batching is manual at the client layer.
- **Auto-Restock Policies**: No API for configuring individual item's `min_buffer` or `max_capacity` without a standard `stock_level` record edit.
- **Consignment Items**: No specific endpoint for items where ownership remains with the supplier.

## Analytics
- **Historical Snapshots**: `GET /balances` is the current PIT (Point-In-Time). No API to retrieve stock at a specific date.
- **Stock Movement Reports**: No advanced filtering on `GET /movements` (e.g. by reference_type, date range, or performer).
- **Valuation Delta**: API to see how inventory value changed over a period (Net change).

## Security
- **Delegated Approvals**: No API for setting up temporary approval authority for adjustments when a manager is away.
