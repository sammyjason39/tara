# Constraints Validation - Inventory Department

## Relational Integrity

| Constraint Type | Table | Definition | Validation Outcome |
| --- | --- | --- | --- |
| **Primary Key** | All | `id` (String) | ✅ Enforced |
| **Foreign Key** | All | `tenant_id` → `companies(id)` | ✅ Enforced |
| **Foreign Key** | `stock_levels` | `product_id` → `item_masters(id)` | ✅ Enforced |
| **Foreign Key** | `stock_levels` | `location_id` → `locations(id)` | ✅ Enforced |
| **Foreign Key** | `inventory_adjustments` | `item_id` → `item_masters(id)` | ✅ Enforced |
| **Foreign Key** | `cost_layers` | `tenant_id` → `companies(id)` | ✅ Enforced |

## Unique Constraints (Tenant Scoped)

| Table | Constraint | Definition | Pass/Fail |
| --- | --- | --- | --- |
| `item_masters` | `@@unique([tenant_id, barcode])` | No duplicate barcodes per tenant | ✅ PASS |
| `item_masters` | `@@unique([tenant_id, sku])` | No duplicate SKUs per tenant | ✅ PASS |
| `stock_levels` | `@@unique([location_id, product_id, department_id])` | Prevent double entry per (loc, prod, dept) | ✅ PASS |
| `inventory_pools` | `@@unique([tenant_id, name])` (Missing?) | No duplicate pool names per tenant | ❌ FAIL (Not defined in schema) |

## Multi-Tenant Leakage Check
- **Risk**: Global Unique Constraints.
- **Analysis**: ALL core unique constraints (SKU, Barcode, etc.) are correctly prefixed with `tenant_id`. This prevents cross-tenant data collisions.
- **Missing**: `inventory_pools` and `product_categories` (Wait, `product_categories` HAS `@@unique([tenant_id, name])` at line 3363).
- **Corrective Action**: Add `@@unique([tenant_id, name])` to `inventory_pools`.
