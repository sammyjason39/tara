import { describe, expect, it, beforeEach, vi } from "vitest";
import { InventoryService } from "./inventory.service";
import { InventoryMockRepository } from "./repositories/inventory.mock.repository";
import { AuditService } from "../../shared/audit/audit.service";
import { PrismaService } from "../../persistence/prisma.service";
import { SkuGeneratorService } from "./sku-generator.service";

// Mock implementations for testing
const mockAuditService = {
  log: vi.fn(),
};

describe("InventoryService - Void Request & Approval Workflow", () => {
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

  describe("createVoidRequest", () => {
    it("should create a void request for an incomplete item", async () => {
      const ctx = { 
        tenant_id: "test-tenant", 
        user_id: "test-user",
        company_id: "test-company"
      };
      const item_id = "test-item-123";
      const reason = "Item was incorrectly registered during stock opname";
      const requested_by = "test-user";

      const result = await service.createVoidRequest(
        ctx,
        "incomplete_item",
        item_id,
        reason,
        requested_by
      );

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.status).toBe("PENDING");
      expect(result.entity_type).toBe("incomplete_item");
      expect(result.entity_id).toBe(item_id);
      expect(result.reason).toBe(reason);
      expect(result.requested_by).toBe(requested_by);
    });

    it("should log audit trail for void request creation", async () => {
      const ctx = { 
        tenant_id: "test-tenant", 
        user_id: "test-user"
      };
      const item_id = "test-item-456";
      const reason = "Test void request";
      const requested_by = "test-user";

      await service.createVoidRequest(
        ctx,
        "incomplete_item",
        item_id,
        reason,
        requested_by
      );

      expect(mockAuditService.log).toHaveBeenCalled();
      const auditLog = mockAuditService.log.mock.calls[0][0];
      expect(auditLog.module).toBe("inventory");
      expect(auditLog.action).toBe("VOID_REQUEST_CREATED");
      expect(auditLog.entity_type).toBe("VOID_REQUEST");
      expect(auditLog.metadata.entity_type).toBe("incomplete_item");
      expect(auditLog.metadata.entity_id).toBe(item_id);
    });

    it("should apply void immediately for OWNER role", async () => {
      const ctx = { 
        tenant_id: "test-tenant", 
        user_id: "test-user",
        company_id: "test-company",
        role: "OWNER"
      };
      const item_id = "test-item-789";
      const reason = "Owner voiding item immediately";
      const requested_by = "test-user";

      const result = await service.createVoidRequest(
        ctx,
        "incomplete_item",
        item_id,
        reason,
        requested_by
      );

      expect(result.status).toBe("APPROVED");
      expect(result.approved_by).toBe(requested_by);
      expect(result.approved_at).toBeDefined();
      
      // Verify audit trail shows immediate void action
      const auditLog = mockAuditService.log.mock.calls[0][0];
      expect(auditLog.action).toBe("VOID_APPLIED_IMMEDIATELY");
      expect(auditLog.metadata.is_elevated_role).toBe(true);
      expect(auditLog.metadata.auto_approved).toBe(true);
    });

    it("should apply void immediately for SUPERADMIN role", async () => {
      const ctx = { 
        tenant_id: "test-tenant", 
        user_id: "test-user",
        company_id: "test-company",
        role: "SUPERADMIN"
      };
      const item_id = "test-item-999";
      const reason = "Superadmin voiding item immediately";
      const requested_by = "test-user";

      const result = await service.createVoidRequest(
        ctx,
        "incomplete_item",
        item_id,
        reason,
        requested_by
      );

      expect(result.status).toBe("APPROVED");
      expect(result.approved_by).toBe(requested_by);
      expect(result.approved_at).toBeDefined();
      
      // Verify audit trail shows immediate void action
      const auditLog = mockAuditService.log.mock.calls[0][0];
      expect(auditLog.action).toBe("VOID_APPLIED_IMMEDIATELY");
      expect(auditLog.metadata.is_elevated_role).toBe(true);
      expect(auditLog.metadata.auto_approved).toBe(true);
    });
  });

  describe("approveVoidRequest", () => {
    it("should approve a pending void request", async () => {
      // Mock repository method to return pending request
      const pendingRequest = {
        id: "vr-123",
        tenant_id: "test-tenant",
        entity_type: "incomplete_item",
        entity_id: "test-item-123",
        reason: "Test void",
        requested_by: "test-user",
        status: "PENDING",
        created_at: new Date(),
        updated_at: new Date(),
      };
      vi.spyOn(repository, "getVoidRequestById").mockResolvedValue(pendingRequest);
      vi.spyOn(repository, "approveVoidRequest").mockResolvedValue({
        ...pendingRequest,
        status: "APPROVED",
        approved_by: "approver-user",
        approved_at: new Date(),
        last_action: "APPROVED",
      });

      const result = await service.approveVoidRequest(
        { tenant_id: "test-tenant" } as any,
        "vr-123",
        "approver-user"
      );

      expect(result.status).toBe("APPROVED");
      expect(result.approved_by).toBe("approver-user");
    });

    it("should throw error if void request is not found", async () => {
      vi.spyOn(repository, "getVoidRequestById").mockResolvedValue(null);

      await expect(
        service.approveVoidRequest(
          { tenant_id: "test-tenant" } as any,
          "non-existent-id",
          "approver-user"
        )
      ).rejects.toThrow("Void request not found");
    });

    it("should throw error if void request is not in PENDING status", async () => {
      const nonPendingRequest = {
        id: "vr-456",
        status: "APPROVED",
        approved_by: "approver-user",
      };
      vi.spyOn(repository, "getVoidRequestById").mockResolvedValue(nonPendingRequest);

      await expect(
        service.approveVoidRequest(
          { tenant_id: "test-tenant" } as any,
          "vr-456",
          "approver-user"
        )
      ).rejects.toThrow("Void request is already APPROVED");
    });

    it("should log audit trail for void request approval", async () => {
      const pendingRequest = {
        id: "vr-789",
        tenant_id: "test-tenant",
        entity_type: "incomplete_item",
        entity_id: "test-item-789",
        status: "PENDING",
      };
      vi.spyOn(repository, "getVoidRequestById").mockResolvedValue(pendingRequest);
      vi.spyOn(repository, "approveVoidRequest").mockResolvedValue({
        ...pendingRequest,
        status: "APPROVED",
      });

      await service.approveVoidRequest(
        { tenant_id: "test-tenant" } as any,
        "vr-789",
        "approver-user"
      );

      expect(mockAuditService.log).toHaveBeenCalled();
      const auditLog = mockAuditService.log.mock.calls[0][0];
      expect(auditLog.module).toBe("inventory");
      expect(auditLog.action).toBe("VOID_REQUEST_APPROVED");
    });

    it("should apply void (delete item) when approving an incomplete_item void request", async () => {
      const pendingRequest = {
        id: "vr-apply-void",
        tenant_id: "test-tenant",
        entity_type: "incomplete_item",
        entity_id: "test-item-to-delete",
        status: "PENDING",
      };
      vi.spyOn(repository, "getVoidRequestById").mockResolvedValue(pendingRequest);
      vi.spyOn(repository, "approveVoidRequest").mockResolvedValue({
        ...pendingRequest,
        status: "APPROVED",
        approved_by: "approver-user",
        approved_at: new Date(),
      });
      const deleteItemSpy = vi.spyOn(repository, "deleteItem").mockResolvedValue(undefined);

      await service.approveVoidRequest(
        { tenant_id: "test-tenant" } as any,
        "vr-apply-void",
        "approver-user"
      );

      expect(deleteItemSpy).toHaveBeenCalledWith(
        { tenant_id: "test-tenant" },
        "test-item-to-delete"
      );
    });

    it("should record void_applied in audit metadata on approval", async () => {
      const pendingRequest = {
        id: "vr-audit-meta",
        tenant_id: "test-tenant",
        entity_type: "incomplete_item",
        entity_id: "test-item-meta",
        status: "PENDING",
      };
      vi.spyOn(repository, "getVoidRequestById").mockResolvedValue(pendingRequest);
      vi.spyOn(repository, "approveVoidRequest").mockResolvedValue({
        ...pendingRequest,
        status: "APPROVED",
      });
      vi.spyOn(repository, "deleteItem").mockResolvedValue(undefined);

      await service.approveVoidRequest(
        { tenant_id: "test-tenant" } as any,
        "vr-audit-meta",
        "approver-user"
      );

      const auditLog = mockAuditService.log.mock.calls[0][0];
      expect(auditLog.metadata.void_applied).toBe(true);
      expect(auditLog.metadata.approved_by).toBe("approver-user");
    });
  });

  describe("rejectVoidRequest", () => {
    it("should reject a pending void request", async () => {
      const pendingRequest = {
        id: "vr-reject-123",
        tenant_id: "test-tenant",
        entity_type: "incomplete_item",
        entity_id: "test-item-123",
        reason: "Test void",
        requested_by: "test-user",
        status: "PENDING",
      };
      vi.spyOn(repository, "getVoidRequestById").mockResolvedValue(pendingRequest);
      vi.spyOn(repository, "rejectVoidRequest").mockResolvedValue({
        ...pendingRequest,
        status: "REJECTED",
        rejected_by: "rejector-user",
        rejected_at: new Date(),
        last_action: "REJECTED",
      });

      const result = await service.rejectVoidRequest(
        { tenant_id: "test-tenant" } as any,
        "vr-reject-123",
        "rejector-user"
      );

      expect(result.status).toBe("REJECTED");
      expect(result.rejected_by).toBe("rejector-user");
    });

    it("should throw error if void request is not found", async () => {
      vi.spyOn(repository, "getVoidRequestById").mockResolvedValue(null);

      await expect(
        service.rejectVoidRequest(
          { tenant_id: "test-tenant" } as any,
          "non-existent-id",
          "rejector-user"
        )
      ).rejects.toThrow("Void request not found");
    });

    it("should throw error if void request is not in PENDING status", async () => {
      const nonPendingRequest = {
        id: "vr-999",
        status: "REJECTED",
        rejected_by: "rejector-user",
      };
      vi.spyOn(repository, "getVoidRequestById").mockResolvedValue(nonPendingRequest);

      await expect(
        service.rejectVoidRequest(
          { tenant_id: "test-tenant" } as any,
          "vr-999",
          "rejector-user"
        )
      ).rejects.toThrow("Void request is already REJECTED");
    });

    it("should log audit trail for void request rejection", async () => {
      const pendingRequest = {
        id: "vr-reject-456",
        tenant_id: "test-tenant",
        entity_type: "incomplete_item",
        entity_id: "test-item-456",
        status: "PENDING",
      };
      vi.spyOn(repository, "getVoidRequestById").mockResolvedValue(pendingRequest);
      vi.spyOn(repository, "rejectVoidRequest").mockResolvedValue({
        ...pendingRequest,
        status: "REJECTED",
      });

      await service.rejectVoidRequest(
        { tenant_id: "test-tenant" } as any,
        "vr-reject-456",
        "rejector-user"
      );

      expect(mockAuditService.log).toHaveBeenCalled();
      const auditLog = mockAuditService.log.mock.calls[0][0];
      expect(auditLog.module).toBe("inventory");
      expect(auditLog.action).toBe("VOID_REQUEST_REJECTED");
    });

    it("should include rejection reason in audit trail when provided", async () => {
      const pendingRequest = {
        id: "vr-reject-reason",
        tenant_id: "test-tenant",
        entity_type: "incomplete_item",
        entity_id: "test-item-reason",
        status: "PENDING",
      };
      vi.spyOn(repository, "getVoidRequestById").mockResolvedValue(pendingRequest);
      vi.spyOn(repository, "rejectVoidRequest").mockResolvedValue({
        ...pendingRequest,
        status: "REJECTED",
        rejected_by: "rejector-user",
        rejected_at: new Date(),
      });

      await service.rejectVoidRequest(
        { tenant_id: "test-tenant" } as any,
        "vr-reject-reason",
        "rejector-user",
        "Not a valid item to void"
      );

      expect(mockAuditService.log).toHaveBeenCalled();
      const auditLog = mockAuditService.log.mock.calls[0][0];
      expect(auditLog.action).toBe("VOID_REQUEST_REJECTED");
      expect(auditLog.metadata.rejection_reason).toBe("Not a valid item to void");
    });
  });

  describe("getVoidRequestById", () => {
    it("should retrieve a void request by ID", async () => {
      const voidRequest = {
        id: "vr-get-123",
        tenant_id: "test-tenant",
        entity_type: "incomplete_item",
        entity_id: "test-item-123",
        status: "PENDING",
      };
      vi.spyOn(repository, "getVoidRequestById").mockResolvedValue(voidRequest);

      const result = await service.getVoidRequestById(
        { tenant_id: "test-tenant" } as any,
        "vr-get-123"
      );

      expect(result).toBe(voidRequest);
    });

    it("should return null if void request not found", async () => {
      vi.spyOn(repository, "getVoidRequestById").mockResolvedValue(null);

      const result = await service.getVoidRequestById(
        { tenant_id: "test-tenant" } as any,
        "non-existent-id"
      );

      expect(result).toBeNull();
    });
  });

  describe("getVoidRequestsByEntity", () => {
    it("should retrieve all void requests for an entity", async () => {
      const voidRequests = [
        {
          id: "vr-1",
          tenant_id: "test-tenant",
          entity_type: "incomplete_item",
          entity_id: "test-item-123",
          status: "PENDING",
        },
        {
          id: "vr-2",
          tenant_id: "test-tenant",
          entity_type: "incomplete_item",
          entity_id: "test-item-123",
          status: "APPROVED",
        },
      ];
      vi.spyOn(repository, "getVoidRequestsByEntity").mockResolvedValue(voidRequests);

      const result = await service.getVoidRequestsByEntity(
        { tenant_id: "test-tenant" } as any,
        "incomplete_item",
        "test-item-123"
      );

      expect(result).toEqual(voidRequests);
      expect(result.length).toBe(2);
    });
  });

  describe("listVoidRequests", () => {
    it("should retrieve all void requests for the tenant", async () => {
      const voidRequests = [
        {
          id: "vr-list-1",
          tenant_id: "test-tenant",
          entity_type: "incomplete_item",
          entity_id: "item-1",
          status: "PENDING",
        },
        {
          id: "vr-list-2",
          tenant_id: "test-tenant",
          entity_type: "incomplete_item",
          entity_id: "item-2",
          status: "APPROVED",
        },
      ];
      vi.spyOn(repository, "listVoidRequests").mockResolvedValue(voidRequests);

      const result = await service.listVoidRequests(
        { tenant_id: "test-tenant" } as any
      );

      expect(result).toEqual(voidRequests);
      expect(result.length).toBe(2);
    });

    it("should filter void requests by status", async () => {
      const pendingRequests = [
        {
          id: "vr-pending-1",
          tenant_id: "test-tenant",
          entity_type: "incomplete_item",
          entity_id: "item-1",
          status: "PENDING",
        },
      ];
      vi.spyOn(repository, "listVoidRequests").mockResolvedValue(pendingRequests);

      const result = await service.listVoidRequests(
        { tenant_id: "test-tenant" } as any,
        { status: "PENDING" }
      );

      expect(result).toEqual(pendingRequests);
      expect(result.length).toBe(1);
    });

    it("should filter void requests by entity_type", async () => {
      const filteredRequests = [
        {
          id: "vr-filter-1",
          tenant_id: "test-tenant",
          entity_type: "abandoned_cycle",
          entity_id: "cycle-1",
          status: "PENDING",
        },
      ];
      vi.spyOn(repository, "listVoidRequests").mockResolvedValue(filteredRequests);

      const result = await service.listVoidRequests(
        { tenant_id: "test-tenant" } as any,
        { entity_type: "abandoned_cycle" }
      );

      expect(result).toEqual(filteredRequests);
      expect(result[0].entity_type).toBe("abandoned_cycle");
    });
  });

  describe("Approval workflow - role-based behavior", () => {
    it("should keep item in anomaly state while void request is pending", async () => {
      const ctx = {
        tenant_id: "test-tenant",
        user_id: "regular-user",
        company_id: "test-company",
        role: "MEMBER"
      };
      const item_id = "anomaly-item-pending";
      const reason = "Want to void this incomplete item";

      const result = await service.createVoidRequest(
        ctx,
        "incomplete_item",
        item_id,
        reason,
        "regular-user"
      );

      // For non-elevated role, status should be PENDING
      expect(result.status).toBe("PENDING");
      // Item should NOT be deleted (no deleteItem call)
      const deleteItemSpy = vi.spyOn(repository, "deleteItem");
      expect(deleteItemSpy).not.toHaveBeenCalled();
    });

    it("should create pending request for MANAGER role (non-elevated)", async () => {
      const ctx = {
        tenant_id: "test-tenant",
        user_id: "manager-user",
        company_id: "test-company",
        role: "MANAGER"
      };

      const result = await service.createVoidRequest(
        ctx,
        "incomplete_item",
        "item-for-manager",
        "Manager wants to void",
        "manager-user"
      );

      expect(result.status).toBe("PENDING");
    });

    it("should create pending request for ADMIN role (non-elevated)", async () => {
      const ctx = {
        tenant_id: "test-tenant",
        user_id: "admin-user",
        company_id: "test-company",
        role: "ADMIN"
      };

      const result = await service.createVoidRequest(
        ctx,
        "incomplete_item",
        "item-for-admin",
        "Admin wants to void",
        "admin-user"
      );

      expect(result.status).toBe("PENDING");
    });
  });
});
