# Remediation Steps - Inventory Department (Priority Ordered)

## 1. CRITICAL: Self-Approval Prevention
- **Issue**: Users can currently request and approve their own stock adjustments.
- **Action**: Add `if (adj.requested_by === user.id) throw new ForbiddenException()` in `InventoryService.approveAdjustment`.
- **Timeline**: IMMEDIATE.

## 2. HIGH: Data Type Precision
- **Issue**: `stock_levels` uses `Float` for quantities.
- **Action**: Migrate quantity fields to `Decimal(15, 4)` in `schema.prisma`.
- **Timeline**: Next Sprint (Requires DB migration).

## 3. MEDIUM: Location Enforcement
- **Issue**: `InventoryController` lacks `LocationGuard` on mutation endpoints.
- **Action**: Implement `LocationGuard` to verify `locationId` in request body belongs to the user's tenant/assigned warehouse.
- **Timeline**: 2 Weeks.

## 4. LOW: SKU Suggestion Polish
- **Issue**: `SkuGeneratorService` could return collisions in very high-concurrency item creation.
- **Action**: Switch to a Redis-backed atomic sequence for the `SEQ` part of the SKU.
- **Timeline**: 1 Month.

## 5. DOCUMENTATION: API Idempotency
- **Issue**: Global idempotency is active, but not documented for mobile API developers.
- **Action**: Update `/docs/inventory-api.md` with `x-idempotency-key` requirements.
- **Timeline**: 1 Week.
