# Auth Validation - Inventory Department

## 1. Multi-Tenant Isolation
- **Mechanism**: `TenantInterceptor` and `TenantGuard`.
- **Enforcement**: Every API request MUST include `x-tenant-id` header.
- **Query Scoping**: 
    - Controller calls `this.tenantId` in the service.
    - Service passes `tenantId` to EVERY repository method as the FIRST argument.
    - Repository uses `where: { tenant_id: tenantId }` in Prisma.
- **Validation**: 
    - Logic Review: ✅ PASS
    - Database Analysis: All tables include `tenant_id` and mandatory index.

## 2. Role-Based Access Control (RBAC)
- **Roles Detected**: 
    - `INVENTORY_ADMIN`: Full access (Adjustments + Approval).
    - `INVENTORY_MANAGER`: Intake, Transfer, Adjustment Request.
    - `INVENTORY_OPERATOR`: Read Balance, Post Intake/Consumption.
- **Enforcement**: `InventoryRolesGuard` intercepts `POST /adjustments/:id/approve` to require `INVENTORY_ADMIN`.
- **Validation**:
    - Endpoint Lockdown: ✅ PASS
    - Service-level role checks: ✅ PASS

## 3. JWT and Payload Integrity
- **Scenario**: User swaps `tenant_id` in Header but JWT belongs to another tenant.
- **Guardrail**: `TenantGuard` cross-references the Header ID with the User's allowed `user_companies` in the database.
- **Validation**: ✅ PASS (Strict enforcement detected).
