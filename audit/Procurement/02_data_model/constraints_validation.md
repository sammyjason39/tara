# Constraints Validation: Procurement

## 1. Relational Integrity (Foreign Keys)
Validates that all major entity links are properly enforced by the database.

| Entity | Field | Reference | Constraint |
| ---- | ---- | ---- | ---- |
| `procurement_requisitions` | `tenant_id` | `companies(id)` | Strong |
| `procurement_requisitions` | `department_id` | `departments(id)` | Strong |
| `procurement_requisitions` | `requester_id` | `employees(id)` | Strong |
| `procurement_draft_pos` | `requisition_id` | `procurement_requisitions(id)` | Strong |
| `procurement_final_pos` | `draft_po_id` | `procurement_draft_pos(id)` | Strong |
| `procurement_contracts` | `requisition_id` | `procurement_requisitions(id)` | Strong |
| `supplier_branches` | `supplier_id` | `supplier_masters(id)` | Strong |
| `supplier_products` | `branch_id` | `supplier_branches(id)` | Strong |

## 2. Unique Constraints
Prevents duplicate master data or workflow clashes.

- **`procurement_categories`**: `UNIQUE(tenant_id, name)`. This ensures consistent categorization per tenant.
- **`supplier_branches`**: `UNIQUE(tenant_id, supplier_id, branch_code)` (Implied by logic, but missing from Prisma schema? Checking...). 
  - *Audit Note*: Only `supplier_branches.id` is PK. No `@unique` for `branch_code` per tenant/supplier. **RISK IDENTIFIED**.

## 3. NULL vs REQUIRED
| Field | Model | Correctness |
| ---- | ---- | ---- |
| `supplier_id` | `procurement_requisitions` | Nullable. (Correct - supplier is selected late in the PR process). |
| `line_items` | `procurement_draft_pos` | Required (Json). (Correct). |
| `amount` | `procurement_requisitions` | Required (Decimal). (Correct). |

## 4. Multi-Tenant Enforcement
All models include `tenant_id` and have a direct relation to the `companies` table. This ensures strict isolation when queried with `(tenant_id = ?)`.
