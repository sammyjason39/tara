# Data Access: Procurement

## 1. Multi-Tenant Partitioning
The Zenvix system follows the "Shared Schema, Separate Records" pattern for multi-tenancy.
- **Enforcement Layer**: `ProcurementDbRepository`.
- **Query Structure**: `this.prisma.model.findMany({ where: { tenantId } })`.
- **Audit**: All 27 repository methods across Suppliers, PRs, POs, and Risk Signals have `tenantId` in the `where` clause. **PASS**.

## 2. Row-Level Security (RLS)
The database (PostgreSQL) has RLS enabled (as per `context.md`), but the NestJS application currently manages tenant isolation at the application level.
- **Risk**: A developer error in a new service could accidentally omit `tenantId`, leading to cross-tenant data leakage.
- **Mitigation**: Standardizing on the repository pattern mitigates this, provided all database access is funneled through `procurement.db.repository.ts`.

## 3. Data Sensitivity Map
- **Financial Data**: `procurement_requisitions.amount`, `procurement_final_pos.total_amount`.
- **Supplier Master**: `tax_id`, `contact_email`, `contact_phone`.
- **Contract Legal**: `procurement_contracts.notes`, `attachment_ids`.
- **Ratings**: `supplier_masters.global_rating` (highly sensitive as it impacts selection).

## 4. Logical Deletion
- **Suppliers**: `supplier_masters` uses `deleted_at`.
- **Checking**: Repository `getSuppliers` filters by `deletedAt: null`. **PASS**.
- **Checking**: Repository `getSupplierBranches` filters by `deletedAt: null`. **PASS**.
- **Categories**: Uses an `active` boolean instead of `deleted_at`. **PASS**.
