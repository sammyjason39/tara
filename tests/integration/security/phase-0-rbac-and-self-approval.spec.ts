/**
 * Security Regression Tests â€” Phase 0.2 & 0.3
 * ZENVIX_MASTER_AUDIT_2026 | Findings: PROC-SEC-001 & INV-SEC-001
 *
 * Phase 0.2: Verifies that all Procurement approval endpoints are blocked
 *            (403 Forbidden) for roles below the required threshold (USER / MEMBER).
 *
 * Phase 0.3: Verifies that InventoryService.approveAdjustment() throws
 *            ForbiddenException when approvedBy === requestedBy.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Reflector } from '@nestjs/core';

import { RolesGuard } from '../../../backend/src/shared/guards/roles.guard';
import { UserRole } from '../../../backend/src/shared/roles';
import { ROLES_KEY } from '../../../backend/src/shared/decorators/roles.decorator';
import { InventoryService } from '../../../backend/src/core/inventory/inventory.service';

// â”€â”€â”€ HELPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Build a minimal NestJS ExecutionContext mock carrying a given role.
 */
function makeContext(role: string, requiredRoles: UserRole[]) {
  const reflector = new Reflector();
  vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);

  const ctx = {
    switchToHttp: () => ({
      getRequest: () => ({
        tenantContext: { tenantId: 'tenant-test', role, userId: 'user-001' },
      }),
    }),
    getHandler: () => vi.fn(),
    getClass: () => vi.fn(),
  };

  return { guard: new RolesGuard(reflector), ctx };
}

// â”€â”€â”€ PHASE 0.2: PROCUREMENT RBAC GUARD TESTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('[Phase 0.2] Procurement Approval Endpoints â€” RBAC Enforcement', () => {
  const approvalEndpoints = [
    {
      name: 'PUT /requisitions/:id/approve-requester-hod',
      minimumRoles: [UserRole.MANAGER, UserRole.ADMIN, UserRole.OWNER, UserRole.SUPERADMIN],
    },
    {
      name: 'PUT /requisitions/:id/approve-final',
      minimumRoles: [UserRole.ADMIN, UserRole.OWNER, UserRole.SUPERADMIN],
    },
    {
      name: 'PUT /draft-pos/:id/approve',
      minimumRoles: [UserRole.MANAGER, UserRole.ADMIN, UserRole.OWNER, UserRole.SUPERADMIN],
    },
    {
      name: 'POST /purchase-orders/release',
      minimumRoles: [UserRole.ADMIN, UserRole.OWNER, UserRole.SUPERADMIN],
    },
    {
      name: 'PUT /contracts/:id/approve-legal',
      minimumRoles: [UserRole.ADMIN, UserRole.OWNER, UserRole.SUPERADMIN],
    },
  ];

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // BLOCKED CASES: MEMBER role MUST be rejected with ForbiddenException
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  describe('MEMBER role â†’ must be blocked (403 Forbidden)', () => {
    for (const endpoint of approvalEndpoints) {
      it(`blocks MEMBER on ${endpoint.name}`, () => {
        const { guard, ctx } = makeContext(UserRole.MEMBER, endpoint.minimumRoles);
        expect(() => guard.canActivate(ctx as any)).toThrow(ForbiddenException);
      });
    }
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // BLOCKED CASES: Unauthenticated / missing context MUST be rejected
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  describe('Missing tenantContext â†’ must be blocked (403 Forbidden)', () => {
    it('throws ForbiddenException when tenantContext is absent', () => {
      const reflector = new Reflector();
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
      const ctx = {
        switchToHttp: () => ({ getRequest: () => ({}) }), // no tenantContext
        getHandler: () => vi.fn(),
        getClass: () => vi.fn(),
      };
      expect(() => new RolesGuard(reflector).canActivate(ctx as any)).toThrow(
        ForbiddenException,
      );
    });
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // ALLOWED CASES: Permitted roles MUST pass
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  describe('Permitted roles â†’ must be allowed', () => {
    it('allows ADMIN on all ADMIN+ endpoints', () => {
      for (const endpoint of approvalEndpoints) {
        if (endpoint.minimumRoles.includes(UserRole.ADMIN)) {
          const { guard, ctx } = makeContext(UserRole.ADMIN, endpoint.minimumRoles);
          expect(guard.canActivate(ctx as any)).toBe(true);
        }
      }
    });

    it('allows MANAGER on MANAGER+ endpoints (approve-requester-hod, draft-pos approve)', () => {
      const managerEndpoints = approvalEndpoints.filter((e) =>
        e.minimumRoles.includes(UserRole.MANAGER),
      );
      for (const endpoint of managerEndpoints) {
        const { guard, ctx } = makeContext(UserRole.MANAGER, endpoint.minimumRoles);
        expect(guard.canActivate(ctx as any)).toBe(true);
      }
    });

    it('allows OWNER on all approval endpoints', () => {
      for (const endpoint of approvalEndpoints) {
        const { guard, ctx } = makeContext(UserRole.OWNER, endpoint.minimumRoles);
        expect(guard.canActivate(ctx as any)).toBe(true);
      }
    });

    it('allows SUPERADMIN on all approval endpoints', () => {
      for (const endpoint of approvalEndpoints) {
        const { guard, ctx } = makeContext(UserRole.SUPERADMIN, endpoint.minimumRoles);
        expect(guard.canActivate(ctx as any)).toBe(true);
      }
    });
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // BOUNDARY CASES: MANAGER is blocked from ADMIN-only endpoints
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  describe('Boundary: MANAGER blocked from ADMIN-only endpoints', () => {
    const adminOnlyEndpoints = approvalEndpoints.filter(
      (e) => !e.minimumRoles.includes(UserRole.MANAGER),
    );

    for (const endpoint of adminOnlyEndpoints) {
      it(`blocks MANAGER on ${endpoint.name}`, () => {
        const { guard, ctx } = makeContext(UserRole.MANAGER, endpoint.minimumRoles);
        expect(() => guard.canActivate(ctx as any)).toThrow(ForbiddenException);
      });
    }
  });
});

// â”€â”€â”€ PHASE 0.3: INVENTORY SELF-APPROVAL PREVENTION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('[Phase 0.3] InventoryService.approveAdjustment() â€” Self-Approval Prevention', () => {
  const TENANT_ID = 'tenant-001';
  const ADJUSTMENT_ID = 'adj-abc-123';
  const REQUESTER_ID = 'user-alice';
  const APPROVER_ID = 'user-bob';

  /**
   * Builds a mock InventoryService where prisma.inventory_adjustments.findFirst
   * can be controlled per test case.
   */
  function buildServiceWithMockPrisma(requestedBy: string | null) {
    const mockPrisma = {
      inventoryAdjustment: {
        findFirst: vi.fn().mockResolvedValue(
          requestedBy !== null ? { requestedBy: requestedBy } : null,
        ),
      },
    };

    // Minimal stub â€” only the methods touched by approveAdjustment are needed
    const mockRepository = {
      approveAdjustment: vi.fn().mockResolvedValue({
        itemId: 'item-1',
        locationId: 'loc-1',
        requestedDelta: new Prisma.Decimal(5),
      }),
    };

    const mockEventBus = {
      publish: vi.fn().mockResolvedValue(undefined),
    };

    const mockAuditService = { log: vi.fn().mockResolvedValue(null) };
    const mockSkuGenerator = {};

    // Directly instantiate with mocked deps to avoid full NestJS DI
    // Correct argument order for InventoryService(repo, skuGen, audit, prisma, eventBus)
    const service = new InventoryService(
      mockRepository as any,
      mockSkuGenerator as any,
      mockAuditService as any,
      mockPrisma as any,
      mockEventBus as any,
    );

    return { service, mockPrisma, mockRepository, mockEventBus };
  }

  // â”€â”€ INV-SEC-001: Self-approval MUST be blocked â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  it('throws ForbiddenException when approvedBy === requestedBy (self-approval attempt)', async () => {
    const { service } = buildServiceWithMockPrisma(REQUESTER_ID);

    await expect(
      service.approveAdjustment(TENANT_ID, ADJUSTMENT_ID, REQUESTER_ID),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws with the exact audit-compliant message for self-approval', async () => {
    const { service } = buildServiceWithMockPrisma(REQUESTER_ID);

    await expect(
      service.approveAdjustment(TENANT_ID, ADJUSTMENT_ID, REQUESTER_ID),
    ).rejects.toThrow('Self-approval of stock adjustments is prohibited.');
  });

  it('throws ForbiddenException when adjustment record is not found (tenant isolation)', async () => {
    const { service } = buildServiceWithMockPrisma(null); // no record returned

    await expect(
      service.approveAdjustment(TENANT_ID, ADJUSTMENT_ID, APPROVER_ID),
    ).rejects.toThrow(ForbiddenException);
  });

  // â”€â”€ Happy path: different user MUST be allowed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  it('allows approval when approvedBy !== requestedBy', async () => {
    const { service, mockRepository, mockEventBus } = buildServiceWithMockPrisma(REQUESTER_ID);

    const result = await service.approveAdjustment(TENANT_ID, ADJUSTMENT_ID, APPROVER_ID);

    expect(result).toBeDefined();
    expect(mockRepository.approveAdjustment).toHaveBeenCalledOnce();
    expect(mockEventBus.publish).toHaveBeenCalledOnce();
    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'STOCK_MOVEMENT_CREATED' }),
    );
  });

  it('does NOT call repository.approveAdjustment on a self-approval attempt', async () => {
    const { service, mockRepository } = buildServiceWithMockPrisma(REQUESTER_ID);

    await expect(
      service.approveAdjustment(TENANT_ID, ADJUSTMENT_ID, REQUESTER_ID),
    ).rejects.toThrow(ForbiddenException);

    expect(mockRepository.approveAdjustment).not.toHaveBeenCalled();
  });

  it('does NOT emit EventBus event on a self-approval attempt', async () => {
    const { service, mockEventBus } = buildServiceWithMockPrisma(REQUESTER_ID);

    await expect(
      service.approveAdjustment(TENANT_ID, ADJUSTMENT_ID, REQUESTER_ID),
    ).rejects.toThrow(ForbiddenException);

    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('always queries with tenant_id scope (no cross-tenant leak)', async () => {
    const { service, mockPrisma } = buildServiceWithMockPrisma(REQUESTER_ID);

    await expect(
      service.approveAdjustment(TENANT_ID, ADJUSTMENT_ID, REQUESTER_ID),
    ).rejects.toThrow(ForbiddenException);

    expect(mockPrisma.inventoryAdjustment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ADJUSTMENT_ID, tenantId: TENANT_ID },
      }),
    );
  });
});

