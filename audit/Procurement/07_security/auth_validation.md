# Auth Validation: Procurement

## 1. Controller-Level Protection
All endpoints in `ProcurementController` are protected by:
- `ModuleStateGuard`: Checks if the "procurement" module is active for the tenant.
- `BranchGatingGuard`: Ensures the user has permissions for the requested branch/location.
- `TenantGuard`: Enforces the presence of a valid `x-tenant-id` header.
- `RequiredModule("procurement")`: Decorator used by guards for role discovery.

## 2. Multi-Tenancy Enforcement
- **Interceptor**: `TenantInterceptor` populates `request.tenantContext` from headers.
- **Repository**: EVERY method in `ProcurementDbRepository` uses the `tenantId` in the `where` clause.
- **Header Hijack Test**: Passing a `requisitionId` that belongs to Tenant B while providing the header for Tenant A.
  - Result: Prisma `findUnique` will return `null` -> `NotFoundException`.
  - Verdict: **SECURE** at the data level.

## 3. RBAC (Role-Based Access Control)
- **HOD Approval**: `approveRequesterHod` should only be called by a user with the `HOD` role.
- **Current Finding**: Roles are not explicitly checked *per-method* in the controller. Only `ModuleStateGuard` is applied. 
- **Risk**: Any user with basic "procurement" access could potentially call `/approve-requester-hod` or `/approve-final` if they know the UUIDs. **CRITICAL SECURITY GAP**.

## 4. Sensitive Data Exposure
- **PII**: Supplier contact person, email, and phone are stored. These are visible to all users with `procurement` access.
- **Financials**: `amount` and `quoted_total` are visible. RBAC should hide target amounts from junior staff.
