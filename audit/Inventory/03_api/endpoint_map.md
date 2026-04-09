# Endpoint Map - Inventory Department

## Dashboard & Analytics
| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/inventory/dashboard` | High-level summary (items, valuation, alerts) |
| `GET` | `/inventory/balances` | Stock levels per location/department |
| `GET` | `/inventory/movements` | Transaction history for SKU/Location |

## Item Master Management
| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/inventory/items` | List all active items |
| `POST` | `/inventory/items` | Create single item (Manual/System) |
| `DELETE` | `/inventory/items/:id` | Logical deletion of item |
| `PATCH` | `/inventory/items/:id/status` | Update lifecycle status (active, draft, etc) |
| `POST` | `/inventory/items/batch-delete` | Bulk cleanup |
| `GET` | `/inventory/items/sku-exists` | Validation for UI SKU collisions |

## Stock Operations
| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/inventory/intake` | Direct stock increase (Purchase/Gift) |
| `POST` | `/inventory/intake/batch` | Bulk processing of intake files |
| `POST` | `/inventory/transfer` | Internal movement between locations |
| `POST` | `/inventory/consumption` | Direct stock decrease (Usage/Waste) |

## Reservations (Financial Control)
| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/inventory/reservations` | Place soft lock on stock |
| `POST` | `/inventory/reservations/confirm` | Convert reservation to permanent move |
| `POST` | `/inventory/reservations/:id/cancel` | Release soft lock |

## Reconciliation & Compliance
| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/inventory/adjustments` | List requested reconciliations |
| `POST` | `/inventory/adjustments` | Request a stock adjustment |
| `POST` | `/inventory/adjustments/:id/approve` | Finalize adjustment (Update stock) |
| `GET` | `/inventory/audit-cycles` | Orchestrate physical stock takes |
