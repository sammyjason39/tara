# Vulnerabilities: Procurement

## 1. Privilege Escalation (Broken Function Level Authorization)
- **Problem**: `ProcurementController` methods (`/approve-requester-hod`, `/approve-final`, etc.) do not have explicit `@Roles` guards.
- **Finding**: Any authenticating user from the same tenant with even `PR_CREATOR` access could potentially approve their own PRs by knowing the UUID. **CRITICAL VULNERABILITY**.
- **Impact**: Financial fraud, unauthorized company spending.

## 2. Mass Assignment (Unsafe Data Handling)
- **Problem**: `upsertCategory` and `upsertSupplierProduct` use spread operators or broad DTOs without strict filtering.
- **Finding**: A user could potentially inject an `id` that belongs to another tenant or a forbidden entity. 
- **Mitigation**: `tenantId` is always enforced in the `where` clause, but the DTOs themselves could be hardened.

## 3. Lack of Rate Limiting
- **Problem**: No specific rate limiters on `POST /requisitions` or `POST /suppliers`.
- **Finding**: A malicious account could spam the system with thousands of shell suppliers or fake PRs, causing database bloat.
- **Impact**: Service degradation, denial of service (DoS) at the database layer.

## 4. IDOR (Insecure Direct Object Reference)
- **Problem**: PRs, POs, and Suppliers use UUIDs. While this is secure against guessing, the absolute trust in the `x-tenant-id` header means any vulnerability in the `TenantInterceptor` or `TenantGuard` would expose ALL data.
- **Finding**: No second layer of defense (e.g., matching the user's `employee_id` to the PR's `requester_id` for viewing).
