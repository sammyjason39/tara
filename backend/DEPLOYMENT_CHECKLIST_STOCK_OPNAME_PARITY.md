# Backend Deployment Checklist — Stock Opname Parity

## Overview

This document records all backend API changes added for the Stock Opname Parity feature.
All endpoints are implemented in `backend/src/core/inventory/inventory.controller.ts` under the
`@Controller('inventory')` route prefix.

## New Endpoints

### 1. Anomaly Category (Idempotent)

| Method | Route | Role Required | Purpose |
|--------|-------|---------------|---------|
| `POST` | `/inventory/items/anomaly-category` | MANAGER | Get or create the reserved "Anomaly" category for the tenant |

**Behavior:** Returns existing Anomaly category if one exists; creates it otherwise.
Returns `{ success, tenant_id, data: { id, name, is_anomaly_category } }`.

**Requirement:** 2.1

---

### 2. Batch Create Incomplete Items (Quick Register)

| Method | Route | Role Required | Purpose |
|--------|-------|---------------|---------|
| `POST` | `/inventory/items/batch-incomplete` | MANAGER | Create stub items from unregistered barcodes |

**Request Body:**
```json
{ "items": [{ "barcode": "string", "name": "string" }] }
```

**Behavior:** Creates items with `is_anomaly: true`, `status: "incomplete"`, and assigns
the Anomaly category. Handles partial failures gracefully.

**Requirements:** 1.1, 1.2

---

### 3. Mark Items as Anomalies

| Method | Route | Role Required | Purpose |
|--------|-------|---------------|---------|
| `POST` | `/inventory/items/mark-anomalies` | MANAGER | Flag existing items as anomalies |

**Request Body:**
```json
{ "item_ids": ["string"], "reason": "string" }
```

**Behavior:** Sets `is_anomaly: true` on specified items, logs audit trail.

**Requirement:** 2.2

---

### 4. Filter Items by Anomaly Flag

| Method | Route | Role Required | Purpose |
|--------|-------|---------------|---------|
| `GET` | `/inventory/items?is_anomaly=true` | CLERK+ | Filter items with anomaly flag |

**Behavior:** Existing item listing endpoint now accepts `is_anomaly` query param.

**Requirement:** 2.5

---

### 5. Complete Anomaly Item

| Method | Route | Role Required | Purpose |
|--------|-------|---------------|---------|
| `PATCH` | `/inventory/items/:id/complete` | MANAGER | Update incomplete item, clear anomaly flag on category change |

**Behavior:** When category changes away from "Anomaly", automatically clears `is_anomaly` flag.

**Requirements:** 2.3, 2.4

---

### 6. Void Request Workflow

| Method | Route | Role Required | Purpose |
|--------|-------|---------------|---------|
| `POST` | `/inventory/items/void-request` | Any authenticated | Submit a void request with reason |
| `GET` | `/inventory/void-requests` | MANAGER | List void requests (filterable by status, entity_type) |
| `GET` | `/inventory/void-requests/:id` | MANAGER | Get single void request |
| `POST` | `/inventory/void-requests/:id/approve` | MANAGER | Approve a pending void request |
| `POST` | `/inventory/void-requests/:id/reject` | MANAGER | Reject a pending void request |

**Behavior:**
- Owner/Superadmin: void applied immediately (no approval needed)
- Other roles: creates a pending approval request
- Approval applies the void and records audit trail
- Rejection preserves item state and records reason

**Requirements:** 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7

---

### 7. Abandoned Audit Cycle Resolution

| Method | Route | Role Required | Purpose |
|--------|-------|---------------|---------|
| `GET` | `/inventory/audit-cycles/abandoned` | MANAGER | List abandoned cycles (threshold_hours param, default 24) |
| `POST` | `/inventory/audit-cycles/:id/flag-abandoned` | MANAGER | Flag a cycle as abandoned |
| `POST` | `/inventory/audit-cycles/:id/void` | MANAGER | Void an abandoned cycle (requires reason) |

**Behavior:**
- Flag identifies stale open cycles for resolution
- Void uses the same approval workflow as item voids
- Owner/Superadmin voids immediately; others create pending approval

**Requirements:** 4.5, 8.7

---

## Test Coverage

| Test File | Tests | Status |
|-----------|-------|--------|
| `inventory.batch-incomplete.test.ts` | 5 | ✅ Passing |
| `inventory.void-request.test.ts` | 24 | ✅ Passing |
| `inventory.abandoned-cycle.test.ts` | 23 | ✅ Passing |
| `inventory.approval-workflow-integration.test.ts` | 20 | ✅ Passing |
| `repositories/inventory.db.repository.anomaly.test.ts` | 2 | ✅ Passing |
| **Total** | **74** | **✅ All Passing** |

## Pre-Deployment Verification

- [x] All endpoints implemented in `inventory.controller.ts`
- [x] Service layer methods implemented in `inventory.service.ts`
- [x] Repository layer handles DB operations
- [x] Role guards applied (MANAGER for sensitive operations)
- [x] Audit trail logging for void/approval actions
- [x] 74 unit tests passing
- [x] Idempotent category creation (safe to call multiple times)
- [x] Partial failure handling in batch operations

## Database Schema (Confirmed)

- ✅ `is_anomaly` Boolean field exists on products table (`@default(false)`)
- ✅ `void_requests` model exists with fields: `id`, `tenant_id`, `entity_type`, `entity_id`,
  `reason`, `requested_by`, `status` (PENDING/APPROVED/REJECTED), `approved_by`, `rejected_by`,
  `approved_at`, `rejected_at`, `metadata`, timestamps
- ✅ Proper indexes on `void_requests`: `[tenant_id]`, `[entity_type, entity_id]`, `[status]`
- ✅ Anomaly category is created on-demand (no migration needed for category itself)

## Rollout Notes

- Deploy backend first — frontend will call these endpoints once deployed
- All endpoints are backward-compatible (no breaking changes to existing routes)
- The `is_anomaly` filter on GET `/inventory/items` is additive (doesn't break existing queries)
