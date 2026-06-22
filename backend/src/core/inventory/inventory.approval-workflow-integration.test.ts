import { describe, expect, it, beforeEach, vi } from "vitest";
import { InventoryService } from "./inventory.service";
import { InventoryMockRepository } from "./repositories/inventory.mock.repository";

/**
 * Integration tests for the Approval Workflow (Task 7.4)
 *
 * Tests the complete end-to-end approval workflow for void requests,
 * verifying role-based behavior, state transitions, and audit trail recording.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 */

const mockAuditService = {
  log: vi.fn(),
};

describe("Approval Workflow - Integration Tests", () => {
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

  describe("Owner/Superadmin voids apply immediately (Req 8.2)", () => {
    it("Owner: void request + item deletion happen in single flow", async () => {
      const ctx = {
        tenant_id: "tenant-1",
        user_id: "owner-1",
        company_id: "company-1",
        role: "OWNER",
      };

      const deleteItemSpy = vi.spyOn(repository, "deleteItem").mockResolvedValue(undefined);

      const result = await service.createVoidRequest(
        ctx,
        "incomplete_item",
        "item-to-void",
        "Item registered in error during opname",
        "owner-1"
      );

      // Void request is immediately APPROVED
      expect(result.status).toBe("APPROVED");
      expect(result.approved_by).toBe("owner-1");
      expect(result.approved_at).toBeDefined();

      // Item is deleted in the same flow
      expect(deleteItemSpy).toHaveBeenCalledWith(ctx, "item-to-void");

      // Audit trail records immediate void
      expect(mockAuditService.log).toHaveBeenCalledTimes(1);
      const auditEntry = mockAuditService.log.mock.calls[0][0];
      expect(auditEntry.action).toBe("VOID_APPLIED_IMMEDIATELY");
      expect(auditEntry.metadata.is_elevated_role).toBe(true);
      expect(auditEntry.metadata.auto_approved).toBe(true);
      expect(auditEntry.metadata.reason).toBe("Item registered in error during opname");
    });

    it("Superadmin: void request + item deletion happen in single flow", async () => {
      const ctx = {
        tenant_id: "tenant-1",
        user_id: "superadmin-1",
        company_id: "company-1",
        role: "SUPERADMIN",
      };

      const deleteItemSpy = vi.spyOn(repository, "deleteItem").mockResolvedValue(undefined);

      const result = await service.createVoidRequest(
        ctx,
        "incomplete_item",
        "item-sa-void",
        "Superadmin cleanup of invalid stub",
        "superadmin-1"
      );

      expect(result.status).toBe("APPROVED");
      expect(result.approved_by).toBe("superadmin-1");
      expect(deleteItemSpy).toHaveBeenCalledWith(ctx, "item-sa-void");

      const auditEntry = mockAuditService.log.mock.calls[0][0];
      expect(auditEntry.action).toBe("VOID_APPLIED_IMMEDIATELY");
      expect(auditEntry.metadata.entity_id).toBe("item-sa-void");
    });

    it("Owner: abandoned cycle void applies immediately with audit trail", async () => {
      const ctx = {
        tenant_id: "tenant-1",
        user_id: "owner-1",
        company_id: "company-1",
        role: "OWNER",
      };

      vi.spyOn(repository, "getAuditCycles").mockResolvedValue([
        { id: "abandoned-cycle-1", status: "ABANDONED" },
      ]);
      vi.spyOn(repository, "updateAuditCycle").mockResolvedValue({
        id: "abandoned-cycle-1",
        status: "VOIDED",
        closed_by: "owner-1",
      });

      const result = await service.voidAbandonedCycle(
        ctx as any,
        "abandoned-cycle-1",
        "Owner resolving stale cycle",
        "owner-1"
      );

      expect(result.status).toBe("APPROVED");

      // Two audit entries: VOID_APPLIED_IMMEDIATELY + AUDIT_CYCLE_VOIDED
      expect(mockAuditService.log).toHaveBeenCalledTimes(2);
      expect(mockAuditService.log.mock.calls[0][0].action).toBe("VOID_APPLIED_IMMEDIATELY");
      expect(mockAuditService.log.mock.calls[1][0].action).toBe("AUDIT_CYCLE_VOIDED");
    });
  });

  describe("Non-Elevated_Role creates pending approval request (Req 8.3)", () => {
    it("MEMBER role creates PENDING void request without applying void", async () => {
      const ctx = {
        tenant_id: "tenant-1",
        user_id: "member-1",
        company_id: "company-1",
        role: "MEMBER",
      };

      const deleteItemSpy = vi.spyOn(repository, "deleteItem");

      const result = await service.createVoidRequest(
        ctx,
        "incomplete_item",
        "anomaly-item-1",
        "Item should not exist, please void",
        "member-1"
      );

      // Request is PENDING, not approved
      expect(result.status).toBe("PENDING");
      expect(result.approved_by).toBeNull();
      expect(result.approved_at).toBeNull();

      // Item is NOT deleted
      expect(deleteItemSpy).not.toHaveBeenCalled();

      // Audit shows request created, not applied
      const auditEntry = mockAuditService.log.mock.calls[0][0];
      expect(auditEntry.action).toBe("VOID_REQUEST_CREATED");
      expect(auditEntry.metadata.is_elevated_role).toBe(false);
      expect(auditEntry.metadata.auto_approved).toBe(false);
    });

    it("ADMIN role creates PENDING void request without applying void", async () => {
      const ctx = {
        tenant_id: "tenant-1",
        user_id: "admin-1",
        company_id: "company-1",
        role: "ADMIN",
      };

      const deleteItemSpy = vi.spyOn(repository, "deleteItem");

      const result = await service.createVoidRequest(
        ctx,
        "incomplete_item",
        "anomaly-item-2",
        "Admin requesting void for cleanup",
        "admin-1"
      );

      expect(result.status).toBe("PENDING");
      expect(deleteItemSpy).not.toHaveBeenCalled();

      const auditEntry = mockAuditService.log.mock.calls[0][0];
      expect(auditEntry.action).toBe("VOID_REQUEST_CREATED");
    });

    it("MANAGER creates PENDING void for abandoned cycle (not immediate)", async () => {
      const ctx = {
        tenant_id: "tenant-1",
        user_id: "manager-1",
        company_id: "company-1",
        role: "MANAGER",
      };

      vi.spyOn(repository, "getAuditCycles").mockResolvedValue([
        { id: "cycle-mgr-1", status: "ABANDONED" },
      ]);

      const updateCycleSpy = vi.spyOn(repository, "updateAuditCycle");

      const result = await service.voidAbandonedCycle(
        ctx as any,
        "cycle-mgr-1",
        "Cycle left open by mistake",
        "manager-1"
      );

      // MANAGER gets pending, not immediate approval
      expect(result.status).toBe("PENDING");
      expect(result.entity_type).toBe("abandoned_cycle");
      expect(result.entity_id).toBe("cycle-mgr-1");

      // Cycle is NOT voided yet
      expect(updateCycleSpy).not.toHaveBeenCalled();
    });

    it("Reason is required and recorded in the void request (Req 8.1)", async () => {
      const ctx = {
        tenant_id: "tenant-1",
        user_id: "member-1",
        company_id: "company-1",
        role: "MEMBER",
      };

      const result = await service.createVoidRequest(
        ctx,
        "incomplete_item",
        "item-reason-test",
        "Duplicate barcode scanned accidentally",
        "member-1"
      );

      expect(result.reason).toBe("Duplicate barcode scanned accidentally");

      const auditEntry = mockAuditService.log.mock.calls[0][0];
      expect(auditEntry.metadata.reason).toBe("Duplicate barcode scanned accidentally");
    });
  });

  describe("Elevated_Role approval/rejection updates state (Req 8.4, 8.5)", () => {
    it("Full flow: non-elevated creates request → elevated approves → void applied", async () => {
      // Step 1: Non-elevated user creates void request
      const memberCtx = {
        tenant_id: "tenant-1",
        user_id: "member-1",
        company_id: "company-1",
        role: "MEMBER",
      };

      const voidRequest = await service.createVoidRequest(
        memberCtx,
        "incomplete_item",
        "item-full-flow",
        "Item is a duplicate stub",
        "member-1"
      );

      expect(voidRequest.status).toBe("PENDING");

      // Step 2: Elevated user approves
      vi.spyOn(repository, "getVoidRequestById").mockResolvedValue({
        id: voidRequest.id,
        tenant_id: "tenant-1",
        entity_type: "incomplete_item",
        entity_id: "item-full-flow",
        reason: "Item is a duplicate stub",
        requested_by: "member-1",
        status: "PENDING",
      });
      vi.spyOn(repository, "approveVoidRequest").mockResolvedValue({
        id: voidRequest.id,
        status: "APPROVED",
        approved_by: "owner-1",
        approved_at: new Date(),
      });
      const deleteItemSpy = vi.spyOn(repository, "deleteItem").mockResolvedValue(undefined);

      const approved = await service.approveVoidRequest(
        { tenant_id: "tenant-1" } as any,
        voidRequest.id,
        "owner-1"
      );

      // Void is applied
      expect(approved.status).toBe("APPROVED");
      expect(approved.approved_by).toBe("owner-1");
      expect(deleteItemSpy).toHaveBeenCalledWith(
        { tenant_id: "tenant-1" },
        "item-full-flow"
      );
    });

    it("Full flow: non-elevated creates request → elevated rejects → item unchanged", async () => {
      // Step 1: Non-elevated user creates void request
      const adminCtx = {
        tenant_id: "tenant-1",
        user_id: "admin-1",
        company_id: "company-1",
        role: "ADMIN",
      };

      const voidRequest = await service.createVoidRequest(
        adminCtx,
        "incomplete_item",
        "item-reject-flow",
        "Want to remove this anomaly item",
        "admin-1"
      );

      expect(voidRequest.status).toBe("PENDING");

      // Step 2: Elevated user rejects
      vi.spyOn(repository, "getVoidRequestById").mockResolvedValue({
        id: voidRequest.id,
        tenant_id: "tenant-1",
        entity_type: "incomplete_item",
        entity_id: "item-reject-flow",
        status: "PENDING",
      });
      vi.spyOn(repository, "rejectVoidRequest").mockResolvedValue({
        id: voidRequest.id,
        status: "REJECTED",
        rejected_by: "owner-1",
        rejected_at: new Date(),
      });
      const deleteItemSpy = vi.spyOn(repository, "deleteItem");

      const rejected = await service.rejectVoidRequest(
        { tenant_id: "tenant-1" } as any,
        voidRequest.id,
        "owner-1",
        "Item is valid, should not be voided"
      );

      // Void is NOT applied
      expect(rejected.status).toBe("REJECTED");
      expect(rejected.rejected_by).toBe("owner-1");
      expect(deleteItemSpy).not.toHaveBeenCalled();
    });

    it("Full flow: abandoned cycle request → approval → cycle voided", async () => {
      // Step 1: Manager creates void request for abandoned cycle
      const managerCtx = {
        tenant_id: "tenant-1",
        user_id: "manager-1",
        company_id: "company-1",
        role: "MANAGER",
      };

      vi.spyOn(repository, "getAuditCycles").mockResolvedValue([
        { id: "cycle-approve-flow", status: "ABANDONED" },
      ]);

      const voidRequest = await service.voidAbandonedCycle(
        managerCtx as any,
        "cycle-approve-flow",
        "Cycle was abandoned during shift change",
        "manager-1"
      );

      expect(voidRequest.status).toBe("PENDING");

      // Step 2: Owner approves
      vi.spyOn(repository, "getVoidRequestById").mockResolvedValue({
        id: voidRequest.id,
        tenant_id: "tenant-1",
        entity_type: "abandoned_cycle",
        entity_id: "cycle-approve-flow",
        status: "PENDING",
      });
      vi.spyOn(repository, "approveVoidRequest").mockResolvedValue({
        id: voidRequest.id,
        status: "APPROVED",
        approved_by: "owner-1",
        approved_at: new Date(),
      });
      const updateCycleSpy = vi.spyOn(repository, "updateAuditCycle").mockResolvedValue({
        id: "cycle-approve-flow",
        status: "VOIDED",
        closed_by: "owner-1",
      });

      const approved = await service.approveVoidRequest(
        { tenant_id: "tenant-1" } as any,
        voidRequest.id,
        "owner-1"
      );

      expect(approved.status).toBe("APPROVED");
      expect(updateCycleSpy).toHaveBeenCalledWith(
        { tenant_id: "tenant-1" },
        "cycle-approve-flow",
        { status: "VOIDED", closed_by: "owner-1" }
      );
    });

    it("Full flow: abandoned cycle request → rejection → cycle stays abandoned", async () => {
      // Step 1: HOD creates void request
      const hodCtx = {
        tenant_id: "tenant-1",
        user_id: "hod-1",
        company_id: "company-1",
        role: "HOD",
      };

      vi.spyOn(repository, "getAuditCycles").mockResolvedValue([
        { id: "cycle-reject-flow", status: "ABANDONED" },
      ]);

      const voidRequest = await service.voidAbandonedCycle(
        hodCtx as any,
        "cycle-reject-flow",
        "HOD requesting cycle cleanup",
        "hod-1"
      );

      expect(voidRequest.status).toBe("PENDING");

      // Step 2: Owner rejects
      vi.spyOn(repository, "getVoidRequestById").mockResolvedValue({
        id: voidRequest.id,
        tenant_id: "tenant-1",
        entity_type: "abandoned_cycle",
        entity_id: "cycle-reject-flow",
        status: "PENDING",
      });
      vi.spyOn(repository, "rejectVoidRequest").mockResolvedValue({
        id: voidRequest.id,
        status: "REJECTED",
        rejected_by: "owner-1",
        rejected_at: new Date(),
      });
      const updateCycleSpy = vi.spyOn(repository, "updateAuditCycle");

      const rejected = await service.rejectVoidRequest(
        { tenant_id: "tenant-1" } as any,
        voidRequest.id,
        "owner-1",
        "Cycle data may still be needed"
      );

      expect(rejected.status).toBe("REJECTED");
      // Cycle is NOT modified
      expect(updateCycleSpy).not.toHaveBeenCalled();
    });

    it("Approval records approver, requester, reason, and timestamp (Req 8.4)", async () => {
      const pendingRequest = {
        id: "vr-metadata-test",
        tenant_id: "tenant-1",
        entity_type: "incomplete_item",
        entity_id: "item-metadata",
        reason: "Test metadata recording",
        requested_by: "member-1",
        status: "PENDING",
      };

      vi.spyOn(repository, "getVoidRequestById").mockResolvedValue(pendingRequest);
      vi.spyOn(repository, "approveVoidRequest").mockResolvedValue({
        ...pendingRequest,
        status: "APPROVED",
        approved_by: "owner-1",
        approved_at: new Date("2025-01-15T10:30:00Z"),
      });
      vi.spyOn(repository, "deleteItem").mockResolvedValue(undefined);

      const result = await service.approveVoidRequest(
        { tenant_id: "tenant-1" } as any,
        "vr-metadata-test",
        "owner-1"
      );

      expect(result.approved_by).toBe("owner-1");
      expect(result.approved_at).toBeDefined();

      // Audit trail records all metadata
      const auditEntry = mockAuditService.log.mock.calls[0][0];
      expect(auditEntry.metadata.approved_by).toBe("owner-1");
      expect(auditEntry.metadata.original_entity_type).toBe("incomplete_item");
      expect(auditEntry.metadata.original_entity_id).toBe("item-metadata");
      expect(auditEntry.metadata.void_applied).toBe(true);
    });

    it("Rejection records rejector and rejection reason (Req 8.5)", async () => {
      const pendingRequest = {
        id: "vr-rejection-meta",
        tenant_id: "tenant-1",
        entity_type: "incomplete_item",
        entity_id: "item-reject-meta",
        status: "PENDING",
      };

      vi.spyOn(repository, "getVoidRequestById").mockResolvedValue(pendingRequest);
      vi.spyOn(repository, "rejectVoidRequest").mockResolvedValue({
        ...pendingRequest,
        status: "REJECTED",
        rejected_by: "owner-1",
        rejected_at: new Date(),
      });

      await service.rejectVoidRequest(
        { tenant_id: "tenant-1" } as any,
        "vr-rejection-meta",
        "owner-1",
        "Item is needed, do not void"
      );

      const auditEntry = mockAuditService.log.mock.calls[0][0];
      expect(auditEntry.action).toBe("VOID_REQUEST_REJECTED");
      expect(auditEntry.metadata.rejected_by).toBe("owner-1");
      expect(auditEntry.metadata.rejection_reason).toBe("Item is needed, do not void");
      expect(auditEntry.metadata.original_entity_type).toBe("incomplete_item");
    });
  });

  describe("Audit trail records all actions (Req 8.6)", () => {
    it("Complete audit trail for create → approve flow", async () => {
      // Step 1: Create pending request
      const memberCtx = {
        tenant_id: "tenant-1",
        user_id: "member-1",
        company_id: "company-1",
        role: "MEMBER",
      };

      await service.createVoidRequest(
        memberCtx,
        "incomplete_item",
        "item-audit-full",
        "Full audit trail test",
        "member-1"
      );

      // Verify creation audit
      expect(mockAuditService.log).toHaveBeenCalledTimes(1);
      const createAudit = mockAuditService.log.mock.calls[0][0];
      expect(createAudit.action).toBe("VOID_REQUEST_CREATED");
      expect(createAudit.module).toBe("inventory");
      expect(createAudit.entity_type).toBe("VOID_REQUEST");
      expect(createAudit.user_id).toBe("member-1");
      expect(createAudit.tenant_id).toBe("tenant-1");

      // Step 2: Approve request
      vi.spyOn(repository, "getVoidRequestById").mockResolvedValue({
        id: "vr-audit-full",
        tenant_id: "tenant-1",
        entity_type: "incomplete_item",
        entity_id: "item-audit-full",
        status: "PENDING",
      });
      vi.spyOn(repository, "approveVoidRequest").mockResolvedValue({
        id: "vr-audit-full",
        status: "APPROVED",
        approved_by: "owner-1",
        approved_at: new Date(),
      });
      vi.spyOn(repository, "deleteItem").mockResolvedValue(undefined);

      await service.approveVoidRequest(
        { tenant_id: "tenant-1" } as any,
        "vr-audit-full",
        "owner-1"
      );

      // Verify approval audit (second call)
      expect(mockAuditService.log).toHaveBeenCalledTimes(2);
      const approveAudit = mockAuditService.log.mock.calls[1][0];
      expect(approveAudit.action).toBe("VOID_REQUEST_APPROVED");
      expect(approveAudit.user_id).toBe("owner-1");
      expect(approveAudit.module).toBe("inventory");
    });

    it("Complete audit trail for create → reject flow", async () => {
      // Step 1: Create pending request
      const memberCtx = {
        tenant_id: "tenant-1",
        user_id: "member-2",
        company_id: "company-1",
        role: "MEMBER",
      };

      await service.createVoidRequest(
        memberCtx,
        "incomplete_item",
        "item-audit-reject",
        "Reject trail test",
        "member-2"
      );

      expect(mockAuditService.log).toHaveBeenCalledTimes(1);
      const createAudit = mockAuditService.log.mock.calls[0][0];
      expect(createAudit.action).toBe("VOID_REQUEST_CREATED");

      // Step 2: Reject request
      vi.spyOn(repository, "getVoidRequestById").mockResolvedValue({
        id: "vr-audit-reject",
        tenant_id: "tenant-1",
        entity_type: "incomplete_item",
        entity_id: "item-audit-reject",
        status: "PENDING",
      });
      vi.spyOn(repository, "rejectVoidRequest").mockResolvedValue({
        id: "vr-audit-reject",
        status: "REJECTED",
        rejected_by: "owner-1",
        rejected_at: new Date(),
      });

      await service.rejectVoidRequest(
        { tenant_id: "tenant-1" } as any,
        "vr-audit-reject",
        "owner-1",
        "Reason invalid"
      );

      // Verify rejection audit (second call)
      expect(mockAuditService.log).toHaveBeenCalledTimes(2);
      const rejectAudit = mockAuditService.log.mock.calls[1][0];
      expect(rejectAudit.action).toBe("VOID_REQUEST_REJECTED");
      expect(rejectAudit.user_id).toBe("owner-1");
      expect(rejectAudit.metadata.rejection_reason).toBe("Reason invalid");
    });

    it("Owner immediate void records audit with all required fields", async () => {
      const ownerCtx = {
        tenant_id: "tenant-1",
        user_id: "owner-1",
        company_id: "company-1",
        role: "OWNER",
      };

      vi.spyOn(repository, "deleteItem").mockResolvedValue(undefined);

      await service.createVoidRequest(
        ownerCtx,
        "incomplete_item",
        "item-owner-audit",
        "Owner immediate void audit check",
        "owner-1"
      );

      expect(mockAuditService.log).toHaveBeenCalledTimes(1);
      const auditEntry = mockAuditService.log.mock.calls[0][0];
      expect(auditEntry.tenant_id).toBe("tenant-1");
      expect(auditEntry.user_id).toBe("owner-1");
      expect(auditEntry.module).toBe("inventory");
      expect(auditEntry.action).toBe("VOID_APPLIED_IMMEDIATELY");
      expect(auditEntry.entity_type).toBe("VOID_REQUEST");
      expect(auditEntry.entity_id).toBeDefined();
      expect(auditEntry.metadata.entity_type).toBe("incomplete_item");
      expect(auditEntry.metadata.entity_id).toBe("item-owner-audit");
      expect(auditEntry.metadata.reason).toBe("Owner immediate void audit check");
      expect(auditEntry.metadata.requested_by).toBe("owner-1");
      expect(auditEntry.metadata.is_elevated_role).toBe(true);
      expect(auditEntry.metadata.auto_approved).toBe(true);
    });
  });

  describe("Pending void keeps item in anomaly state (Req 8.7)", () => {
    it("Item remains intact while void request is PENDING", async () => {
      const memberCtx = {
        tenant_id: "tenant-1",
        user_id: "member-1",
        company_id: "company-1",
        role: "MEMBER",
      };

      const deleteItemSpy = vi.spyOn(repository, "deleteItem");

      const voidRequest = await service.createVoidRequest(
        memberCtx,
        "incomplete_item",
        "anomaly-item-preserved",
        "Requesting void of anomaly item",
        "member-1"
      );

      // Request is pending
      expect(voidRequest.status).toBe("PENDING");

      // Item data is not deleted or modified
      expect(deleteItemSpy).not.toHaveBeenCalled();
    });

    it("Abandoned cycle stays in ABANDONED state while void is PENDING", async () => {
      const managerCtx = {
        tenant_id: "tenant-1",
        user_id: "manager-1",
        company_id: "company-1",
        role: "MANAGER",
      };

      vi.spyOn(repository, "getAuditCycles").mockResolvedValue([
        { id: "cycle-preserved", status: "ABANDONED" },
      ]);
      const updateCycleSpy = vi.spyOn(repository, "updateAuditCycle");

      const voidRequest = await service.voidAbandonedCycle(
        managerCtx as any,
        "cycle-preserved",
        "Requesting resolution of abandoned cycle",
        "manager-1"
      );

      expect(voidRequest.status).toBe("PENDING");
      // Cycle state is NOT modified
      expect(updateCycleSpy).not.toHaveBeenCalled();
    });

    it("Cannot approve same request twice (idempotency guard)", async () => {
      const alreadyApproved = {
        id: "vr-already-done",
        tenant_id: "tenant-1",
        entity_type: "incomplete_item",
        entity_id: "item-already-done",
        status: "APPROVED",
        approved_by: "owner-1",
      };

      vi.spyOn(repository, "getVoidRequestById").mockResolvedValue(alreadyApproved);

      await expect(
        service.approveVoidRequest(
          { tenant_id: "tenant-1" } as any,
          "vr-already-done",
          "owner-1"
        )
      ).rejects.toThrow("Void request is already APPROVED");
    });

    it("Cannot reject same request twice (idempotency guard)", async () => {
      const alreadyRejected = {
        id: "vr-already-rejected",
        tenant_id: "tenant-1",
        entity_type: "incomplete_item",
        entity_id: "item-already-rejected",
        status: "REJECTED",
        rejected_by: "owner-1",
      };

      vi.spyOn(repository, "getVoidRequestById").mockResolvedValue(alreadyRejected);

      await expect(
        service.rejectVoidRequest(
          { tenant_id: "tenant-1" } as any,
          "vr-already-rejected",
          "owner-1"
        )
      ).rejects.toThrow("Void request is already REJECTED");
    });
  });
});
