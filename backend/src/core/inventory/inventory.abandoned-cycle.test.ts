import { describe, expect, it, beforeEach, vi } from "vitest";
import { InventoryService } from "./inventory.service";
import { InventoryMockRepository } from "./repositories/inventory.mock.repository";

/**
 * Unit tests for Abandoned Audit Cycle Resolution (Task 7.3)
 *
 * Requirements: 4.5, 8.7
 * - When session exists but audit cycle was not committed, flag as abandoned
 * - Require Elevated_Role (Manager/HOD+) to void
 * - Apply same approval workflow as item voids
 */

const mockAuditService = {
  log: vi.fn(),
};

describe("InventoryService - Abandoned Audit Cycle Resolution", () => {
  let service: InventoryService;
  let repository: InventoryMockRepository;

  beforeEach(() => {
    vi.clearAllMocks();

    repository = new InventoryMockRepository();
    service = new InventoryService(
      repository,
      { generateSku: vi.fn(() => "SKU-GEN-001") } as any,
      mockAuditService as any,
      { $transaction: vi.fn(), void_requests: { findFirst: vi.fn(), update: vi.fn() } } as any,
      { emit: vi.fn(), on: vi.fn(), once: vi.fn() } as any,
      { requestProcurement: vi.fn() } as any,
      { uploadImage: vi.fn(), deleteImage: vi.fn(), setPrimaryImage: vi.fn(), listImages: vi.fn(), getImagePath: vi.fn() } as any,
      { generateExcel: vi.fn() } as any,
      { find: vi.fn() } as any,
    );
  });

  describe("getAbandonedAuditCycles", () => {
    it("should return cycles that are OPEN and past the threshold", async () => {
      const ctx = { tenant_id: "test-tenant" };
      const pastDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(); // 25 hours ago

      vi.spyOn(repository, "getAuditCycles").mockResolvedValue([
        { id: "cycle-1", status: "OPEN", created_at: pastDate, updated_at: pastDate },
        { id: "cycle-2", status: "COMPLETED", created_at: pastDate, updated_at: pastDate },
        { id: "cycle-3", status: "OPEN", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ]);

      const result = await service.getAbandonedAuditCycles(ctx as any, 24);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("cycle-1");
    });

    it("should return empty array when no cycles are abandoned", async () => {
      const ctx = { tenant_id: "test-tenant" };

      vi.spyOn(repository, "getAuditCycles").mockResolvedValue([
        { id: "cycle-1", status: "COMPLETED", created_at: new Date().toISOString() },
        { id: "cycle-2", status: "OPEN", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ]);

      const result = await service.getAbandonedAuditCycles(ctx as any, 24);

      expect(result).toHaveLength(0);
    });

    it("should use default threshold of 24 hours when not specified", async () => {
      const ctx = { tenant_id: "test-tenant" };
      const pastDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();

      vi.spyOn(repository, "getAuditCycles").mockResolvedValue([
        { id: "cycle-old", status: "OPEN", created_at: pastDate, updated_at: pastDate },
      ]);

      const result = await service.getAbandonedAuditCycles(ctx as any);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("cycle-old");
    });

    it("should use updated_at for threshold comparison when available", async () => {
      const ctx = { tenant_id: "test-tenant" };
      const oldCreatedAt = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const recentUpdatedAt = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(); // 1 hour ago

      vi.spyOn(repository, "getAuditCycles").mockResolvedValue([
        { id: "cycle-recent-activity", status: "OPEN", created_at: oldCreatedAt, updated_at: recentUpdatedAt },
      ]);

      const result = await service.getAbandonedAuditCycles(ctx as any, 24);

      // Should NOT be abandoned because updated_at is recent
      expect(result).toHaveLength(0);
    });
  });

  describe("flagAbandonedCycle", () => {
    it("should update cycle status to ABANDONED", async () => {
      const ctx = { tenant_id: "test-tenant", user_id: "test-user" };
      const cycleId = "cycle-to-abandon";

      vi.spyOn(repository, "updateAuditCycle").mockResolvedValue({
        id: cycleId,
        status: "ABANDONED",
      });

      const result = await service.flagAbandonedCycle(ctx as any, cycleId, "test-user");

      expect(result.status).toBe("ABANDONED");
      expect(repository.updateAuditCycle).toHaveBeenCalledWith(
        ctx,
        cycleId,
        { status: "ABANDONED" }
      );
    });

    it("should log audit trail when flagging a cycle as abandoned", async () => {
      const ctx = { tenant_id: "test-tenant", user_id: "manager-user" };
      const cycleId = "cycle-flag-123";

      vi.spyOn(repository, "updateAuditCycle").mockResolvedValue({
        id: cycleId,
        status: "ABANDONED",
      });

      await service.flagAbandonedCycle(ctx as any, cycleId, "manager-user");

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: "test-tenant",
          user_id: "manager-user",
          module: "inventory",
          action: "AUDIT_CYCLE_FLAGGED_ABANDONED",
          entity_type: "AUDIT_CYCLE",
          entity_id: cycleId,
          metadata: expect.objectContaining({
            flagged_by: "manager-user",
            previous_status: "OPEN",
          }),
        })
      );
    });
  });

  describe("voidAbandonedCycle", () => {
    it("should throw error if cycle not found", async () => {
      const ctx = {
        tenant_id: "test-tenant",
        user_id: "manager-user",
        role: "MANAGER",
      };

      vi.spyOn(repository, "getAuditCycles").mockResolvedValue([]);

      await expect(
        service.voidAbandonedCycle(ctx as any, "non-existent-cycle", "Cycle abandoned", "manager-user")
      ).rejects.toThrow("Audit cycle not found");
    });

    it("should throw error if cycle is already COMPLETED", async () => {
      const ctx = {
        tenant_id: "test-tenant",
        user_id: "manager-user",
        role: "MANAGER",
      };

      vi.spyOn(repository, "getAuditCycles").mockResolvedValue([
        { id: "cycle-completed", status: "COMPLETED" },
      ]);

      await expect(
        service.voidAbandonedCycle(ctx as any, "cycle-completed", "Trying to void", "manager-user")
      ).rejects.toThrow("Audit cycle cannot be voided: current status is COMPLETED");
    });

    it("should throw error if user does not have Elevated_Role", async () => {
      const ctx = {
        tenant_id: "test-tenant",
        user_id: "regular-user",
        role: "MEMBER",
      };

      vi.spyOn(repository, "getAuditCycles").mockResolvedValue([
        { id: "cycle-abandoned", status: "ABANDONED" },
      ]);

      await expect(
        service.voidAbandonedCycle(ctx as any, "cycle-abandoned", "Want to void", "regular-user")
      ).rejects.toThrow("Insufficient permissions: Elevated_Role (Manager/HOD+) required to void abandoned cycles");
    });

    it("should throw error if CLERK tries to void", async () => {
      const ctx = {
        tenant_id: "test-tenant",
        user_id: "clerk-user",
        role: "CLERK",
      };

      vi.spyOn(repository, "getAuditCycles").mockResolvedValue([
        { id: "cycle-abandoned", status: "ABANDONED" },
      ]);

      await expect(
        service.voidAbandonedCycle(ctx as any, "cycle-abandoned", "Trying to void", "clerk-user")
      ).rejects.toThrow("Insufficient permissions");
    });

    it("should apply void immediately for OWNER role", async () => {
      const ctx = {
        tenant_id: "test-tenant",
        user_id: "owner-user",
        company_id: "test-company",
        role: "OWNER",
      };

      vi.spyOn(repository, "getAuditCycles").mockResolvedValue([
        { id: "cycle-abandoned", status: "ABANDONED" },
      ]);

      vi.spyOn(repository, "updateAuditCycle").mockResolvedValue({
        id: "cycle-abandoned",
        status: "VOIDED",
        closed_by: "owner-user",
      });

      const result = await service.voidAbandonedCycle(
        ctx as any,
        "cycle-abandoned",
        "Owner voiding abandoned cycle",
        "owner-user"
      );

      expect(result.status).toBe("APPROVED");
    });

    it("should apply void immediately for SUPERADMIN role", async () => {
      const ctx = {
        tenant_id: "test-tenant",
        user_id: "superadmin-user",
        company_id: "test-company",
        role: "SUPERADMIN",
      };

      vi.spyOn(repository, "getAuditCycles").mockResolvedValue([
        { id: "cycle-abandoned", status: "ABANDONED" },
      ]);

      vi.spyOn(repository, "updateAuditCycle").mockResolvedValue({
        id: "cycle-abandoned",
        status: "VOIDED",
        closed_by: "superadmin-user",
      });

      const result = await service.voidAbandonedCycle(
        ctx as any,
        "cycle-abandoned",
        "Superadmin voiding abandoned cycle",
        "superadmin-user"
      );

      expect(result.status).toBe("APPROVED");
    });

    it("should create PENDING approval request for MANAGER role", async () => {
      const ctx = {
        tenant_id: "test-tenant",
        user_id: "manager-user",
        company_id: "test-company",
        role: "MANAGER",
      };

      vi.spyOn(repository, "getAuditCycles").mockResolvedValue([
        { id: "cycle-abandoned", status: "ABANDONED" },
      ]);

      const result = await service.voidAbandonedCycle(
        ctx as any,
        "cycle-abandoned",
        "Manager requesting void",
        "manager-user"
      );

      expect(result.status).toBe("PENDING");
      expect(result.entity_type).toBe("abandoned_cycle");
      expect(result.entity_id).toBe("cycle-abandoned");
    });

    it("should create PENDING approval request for HOD role", async () => {
      const ctx = {
        tenant_id: "test-tenant",
        user_id: "hod-user",
        company_id: "test-company",
        role: "HOD",
      };

      vi.spyOn(repository, "getAuditCycles").mockResolvedValue([
        { id: "cycle-abandoned", status: "ABANDONED" },
      ]);

      const result = await service.voidAbandonedCycle(
        ctx as any,
        "cycle-abandoned",
        "HOD requesting void",
        "hod-user"
      );

      expect(result.status).toBe("PENDING");
      expect(result.entity_type).toBe("abandoned_cycle");
    });

    it("should allow voiding cycles with OPEN status (not yet flagged)", async () => {
      const ctx = {
        tenant_id: "test-tenant",
        user_id: "owner-user",
        company_id: "test-company",
        role: "OWNER",
      };

      vi.spyOn(repository, "getAuditCycles").mockResolvedValue([
        { id: "cycle-open", status: "OPEN" },
      ]);

      vi.spyOn(repository, "updateAuditCycle").mockResolvedValue({
        id: "cycle-open",
        status: "VOIDED",
        closed_by: "owner-user",
      });

      const result = await service.voidAbandonedCycle(
        ctx as any,
        "cycle-open",
        "Owner voiding open cycle",
        "owner-user"
      );

      expect(result.status).toBe("APPROVED");
    });

    it("should log audit trail for void request creation", async () => {
      const ctx = {
        tenant_id: "test-tenant",
        user_id: "manager-user",
        company_id: "test-company",
        role: "MANAGER",
      };

      vi.spyOn(repository, "getAuditCycles").mockResolvedValue([
        { id: "cycle-audit-trail", status: "ABANDONED" },
      ]);

      await service.voidAbandonedCycle(
        ctx as any,
        "cycle-audit-trail",
        "Manager needs to void",
        "manager-user"
      );

      expect(mockAuditService.log).toHaveBeenCalled();
      const auditLog = mockAuditService.log.mock.calls[0][0];
      expect(auditLog.module).toBe("inventory");
      expect(auditLog.action).toBe("VOID_REQUEST_CREATED");
      expect(auditLog.metadata.entity_type).toBe("abandoned_cycle");
      expect(auditLog.metadata.entity_id).toBe("cycle-audit-trail");
    });

    it("should log VOID_APPLIED_IMMEDIATELY for Owner", async () => {
      const ctx = {
        tenant_id: "test-tenant",
        user_id: "owner-user",
        company_id: "test-company",
        role: "OWNER",
      };

      vi.spyOn(repository, "getAuditCycles").mockResolvedValue([
        { id: "cycle-owner-void", status: "ABANDONED" },
      ]);

      vi.spyOn(repository, "updateAuditCycle").mockResolvedValue({
        id: "cycle-owner-void",
        status: "VOIDED",
      });

      await service.voidAbandonedCycle(
        ctx as any,
        "cycle-owner-void",
        "Owner immediate void",
        "owner-user"
      );

      // First audit log should be VOID_APPLIED_IMMEDIATELY
      const firstAuditLog = mockAuditService.log.mock.calls[0][0];
      expect(firstAuditLog.action).toBe("VOID_APPLIED_IMMEDIATELY");
      expect(firstAuditLog.metadata.is_elevated_role).toBe(true);
      expect(firstAuditLog.metadata.auto_approved).toBe(true);
    });
  });

  describe("applyAbandonedCycleVoid", () => {
    it("should set cycle status to VOIDED", async () => {
      const ctx = { tenant_id: "test-tenant" };
      const cycleId = "cycle-to-void";

      vi.spyOn(repository, "updateAuditCycle").mockResolvedValue({
        id: cycleId,
        status: "VOIDED",
        closed_by: "approver-user",
      });

      const result = await service.applyAbandonedCycleVoid(
        ctx as any,
        cycleId,
        "approver-user"
      );

      expect(result.status).toBe("VOIDED");
      expect(repository.updateAuditCycle).toHaveBeenCalledWith(
        ctx,
        cycleId,
        { status: "VOIDED", closed_by: "approver-user" }
      );
    });

    it("should log audit trail for void application", async () => {
      const ctx = { tenant_id: "test-tenant" };
      const cycleId = "cycle-void-audit";

      vi.spyOn(repository, "updateAuditCycle").mockResolvedValue({
        id: cycleId,
        status: "VOIDED",
      });

      await service.applyAbandonedCycleVoid(ctx as any, cycleId, "approver-user");

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: "test-tenant",
          user_id: "approver-user",
          module: "inventory",
          action: "AUDIT_CYCLE_VOIDED",
          entity_type: "AUDIT_CYCLE",
          entity_id: cycleId,
          metadata: expect.objectContaining({
            voided_by: "approver-user",
            previous_status: "ABANDONED",
          }),
        })
      );
    });
  });

  describe("Integration with approval workflow (same as item voids)", () => {
    it("should approve void request and apply cycle void", async () => {
      const ctx = { tenant_id: "test-tenant" };
      const voidRequestId = "vr-cycle-123";

      const pendingRequest = {
        id: voidRequestId,
        tenant_id: "test-tenant",
        entity_type: "abandoned_cycle",
        entity_id: "cycle-to-approve",
        reason: "Cycle was abandoned",
        requested_by: "manager-user",
        status: "PENDING",
      };

      vi.spyOn(repository, "getVoidRequestById").mockResolvedValue(pendingRequest);
      vi.spyOn(repository, "approveVoidRequest").mockResolvedValue({
        ...pendingRequest,
        status: "APPROVED",
        approved_by: "owner-user",
        approved_at: new Date(),
      });
      vi.spyOn(repository, "updateAuditCycle").mockResolvedValue({
        id: "cycle-to-approve",
        status: "VOIDED",
        closed_by: "owner-user",
      });

      const result = await service.approveVoidRequest(
        ctx as any,
        voidRequestId,
        "owner-user"
      );

      expect(result.status).toBe("APPROVED");
      expect(repository.updateAuditCycle).toHaveBeenCalledWith(
        ctx,
        "cycle-to-approve",
        { status: "VOIDED", closed_by: "owner-user" }
      );
    });

    it("should reject void request and leave cycle unchanged", async () => {
      const ctx = { tenant_id: "test-tenant" };
      const voidRequestId = "vr-cycle-456";

      const pendingRequest = {
        id: voidRequestId,
        tenant_id: "test-tenant",
        entity_type: "abandoned_cycle",
        entity_id: "cycle-to-reject",
        status: "PENDING",
      };

      vi.spyOn(repository, "getVoidRequestById").mockResolvedValue(pendingRequest);
      vi.spyOn(repository, "rejectVoidRequest").mockResolvedValue({
        ...pendingRequest,
        status: "REJECTED",
        rejected_by: "owner-user",
        rejected_at: new Date(),
      });

      const updateCycleSpy = vi.spyOn(repository, "updateAuditCycle");

      const result = await service.rejectVoidRequest(
        ctx as any,
        voidRequestId,
        "owner-user",
        "Not a valid reason to void"
      );

      expect(result.status).toBe("REJECTED");
      // Cycle should NOT be updated when rejected
      expect(updateCycleSpy).not.toHaveBeenCalled();
    });

    it("should keep cycle in abandoned state while void request is pending", async () => {
      const ctx = {
        tenant_id: "test-tenant",
        user_id: "manager-user",
        company_id: "test-company",
        role: "MANAGER",
      };

      vi.spyOn(repository, "getAuditCycles").mockResolvedValue([
        { id: "cycle-pending", status: "ABANDONED" },
      ]);

      const result = await service.voidAbandonedCycle(
        ctx as any,
        "cycle-pending",
        "Want to void abandoned cycle",
        "manager-user"
      );

      // MANAGER creates a PENDING request
      expect(result.status).toBe("PENDING");

      // Cycle should NOT be voided yet (updateAuditCycle should not be called)
      const updateCycleSpy = vi.spyOn(repository, "updateAuditCycle");
      expect(updateCycleSpy).not.toHaveBeenCalled();
    });

    it("should record audit trail for every void action on abandoned cycles", async () => {
      const ctx = {
        tenant_id: "test-tenant",
        user_id: "owner-user",
        company_id: "test-company",
        role: "OWNER",
      };

      vi.spyOn(repository, "getAuditCycles").mockResolvedValue([
        { id: "cycle-full-audit", status: "ABANDONED" },
      ]);

      vi.spyOn(repository, "updateAuditCycle").mockResolvedValue({
        id: "cycle-full-audit",
        status: "VOIDED",
      });

      await service.voidAbandonedCycle(
        ctx as any,
        "cycle-full-audit",
        "Full audit trail test",
        "owner-user"
      );

      // Should have multiple audit logs:
      // 1. VOID_APPLIED_IMMEDIATELY (from createVoidRequest)
      // 2. AUDIT_CYCLE_VOIDED (from applyAbandonedCycleVoid)
      expect(mockAuditService.log).toHaveBeenCalledTimes(2);

      const firstLog = mockAuditService.log.mock.calls[0][0];
      expect(firstLog.action).toBe("VOID_APPLIED_IMMEDIATELY");

      const secondLog = mockAuditService.log.mock.calls[1][0];
      expect(secondLog.action).toBe("AUDIT_CYCLE_VOIDED");
      expect(secondLog.entity_type).toBe("AUDIT_CYCLE");
    });
  });
});
