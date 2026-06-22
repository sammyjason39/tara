import { describe, expect, it, beforeEach, vi } from "vitest";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";
import { NotFoundException, ConflictException } from "@nestjs/common";

/**
 * Unit tests for Inventory PATCH, DELETE, and import job DELETE endpoints
 * Validates: Requirements 10.6, 10.7, 10.8
 */
describe("InventoryController - PATCH, DELETE, Import Job DELETE", () => {
  let controller: InventoryController;
  let mockInventoryService: any;
  let mockPrisma: any;
  let mockCacheHelper: any;
  let mockAuditService: any;

  const mockRequest: any = {
    tenantContext: {
      tenant_id: "test-tenant",
      user_id: "test-user",
      company_id: "test-company",
      branch_id: "test-branch",
      role: "OWNER",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockInventoryService = {
      updateItem: vi.fn(),
      softDeleteItem: vi.fn(),
      cancelImportJob: vi.fn(),
      deleteItem: vi.fn(),
    };

    mockPrisma = {
      item_masters: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      inventory_import_jobs: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
    };

    mockCacheHelper = {
      invalidateAll: vi.fn().mockResolvedValue(undefined),
    };

    mockAuditService = { log: vi.fn() };

    controller = new InventoryController(
      mockInventoryService as any,
      { generateSku: vi.fn() } as any,
      {} as any,
      { generateExcel: vi.fn() } as any,
      mockAuditService as any,
      mockPrisma as any,
      { listImages: vi.fn() } as any,
      mockCacheHelper as any,
    );
  });

  describe("PATCH /inventory/items/:id", () => {
    it("should persist partial updates and return updated item", async () => {
      const itemId = "item-123";
      const dto = { name: "Updated Item", sku: "UPD-001" };
      const updatedItem = { id: itemId, name: "Updated Item", sku: "UPD-001" };

      mockInventoryService.updateItem.mockResolvedValue(updatedItem);

      const result = await controller.updateItem(mockRequest, itemId, dto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedItem);
      expect(mockInventoryService.updateItem).toHaveBeenCalledWith(
        mockRequest.tenantContext,
        itemId,
        dto,
        "test-user",
      );
    });

    it("should invalidate cache after successful update", async () => {
      const itemId = "item-123";
      const dto = { name: "Updated" };
      mockInventoryService.updateItem.mockResolvedValue({ id: itemId, name: "Updated" });

      await controller.updateItem(mockRequest, itemId, dto);

      expect(mockCacheHelper.invalidateAll).toHaveBeenCalledTimes(1);
    });

    it("should support partial updates with only a subset of fields", async () => {
      const itemId = "item-456";
      const dto = { description: "New description" };
      const updatedItem = { id: itemId, description: "New description" };

      mockInventoryService.updateItem.mockResolvedValue(updatedItem);

      const result = await controller.updateItem(mockRequest, itemId, dto);

      expect(result.success).toBe(true);
      expect(result.data.description).toBe("New description");
    });
  });

  describe("DELETE /inventory/items/:id (soft-delete)", () => {
    it("should soft-delete item and return success", async () => {
      const itemId = "item-123";
      mockInventoryService.softDeleteItem.mockResolvedValue({
        id: itemId,
        status: "deleted",
      });

      const result = await controller.deleteItem(mockRequest, itemId);

      expect(result.success).toBe(true);
      expect(result.message).toBe("Inventory item deleted");
      expect(mockInventoryService.softDeleteItem).toHaveBeenCalledWith(
        mockRequest.tenantContext,
        itemId,
        "test-user",
      );
    });

    it("should invalidate cache after successful soft-delete", async () => {
      const itemId = "item-123";
      mockInventoryService.softDeleteItem.mockResolvedValue({
        id: itemId,
        status: "deleted",
      });

      await controller.deleteItem(mockRequest, itemId);

      expect(mockCacheHelper.invalidateAll).toHaveBeenCalledTimes(1);
    });

    it("should propagate NotFoundException when item does not exist", async () => {
      const itemId = "non-existent";
      mockInventoryService.softDeleteItem.mockRejectedValue(
        new NotFoundException("Inventory item not found"),
      );

      await expect(controller.deleteItem(mockRequest, itemId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("DELETE /inventory/import/jobs/:id", () => {
    it("should cancel a PENDING import job", async () => {
      const jobId = "job-123";
      mockInventoryService.cancelImportJob.mockResolvedValue({
        id: jobId,
        status: "CANCELLED",
      });

      const result = await controller.abortImportJob(jobId, mockRequest);

      expect(result.success).toBe(true);
      expect(result.message).toBe("Import job cancelled");
      expect(mockInventoryService.cancelImportJob).toHaveBeenCalledWith(
        jobId,
        mockRequest.tenantContext,
      );
    });

    it("should invalidate cache after successful cancellation", async () => {
      const jobId = "job-123";
      mockInventoryService.cancelImportJob.mockResolvedValue({
        id: jobId,
        status: "CANCELLED",
      });

      await controller.abortImportJob(jobId, mockRequest);

      expect(mockCacheHelper.invalidateAll).toHaveBeenCalledTimes(1);
    });

    it("should throw NotFoundException when job does not exist", async () => {
      const jobId = "non-existent";
      mockInventoryService.cancelImportJob.mockRejectedValue(
        new NotFoundException("Import job not found"),
      );

      await expect(
        controller.abortImportJob(jobId, mockRequest),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ConflictException for COMPLETED job", async () => {
      const jobId = "job-completed";
      mockInventoryService.cancelImportJob.mockRejectedValue(
        new ConflictException(
          "Cannot cancel import job in COMPLETED status. Only PENDING or PROCESSING jobs can be cancelled.",
        ),
      );

      await expect(
        controller.abortImportJob(jobId, mockRequest),
      ).rejects.toThrow(ConflictException);
    });

    it("should throw ConflictException for FAILED job", async () => {
      const jobId = "job-failed";
      mockInventoryService.cancelImportJob.mockRejectedValue(
        new ConflictException(
          "Cannot cancel import job in FAILED status. Only PENDING or PROCESSING jobs can be cancelled.",
        ),
      );

      await expect(
        controller.abortImportJob(jobId, mockRequest),
      ).rejects.toThrow(ConflictException);
    });
  });
});

/**
 * Unit tests for InventoryService - softDeleteItem and cancelImportJob
 * Tests the service layer logic directly
 */
describe("InventoryService - softDeleteItem and cancelImportJob", () => {
  let service: InventoryService;
  let mockPrisma: any;
  let mockRepository: any;
  let mockAuditService: any;

  const mockCtx: any = {
    tenant_id: "test-tenant",
    user_id: "test-user",
    company_id: "test-company",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma = {
      item_masters: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      inventory_import_jobs: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
    };

    mockRepository = {
      deleteItem: vi.fn(),
    };

    mockAuditService = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    service = new InventoryService(
      mockRepository as any,
      { generateSku: vi.fn() } as any,
      mockAuditService as any,
      mockPrisma as any,
      { emit: vi.fn() } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  describe("softDeleteItem", () => {
    it("should set status to 'deleted' and update timestamp", async () => {
      const itemId = "item-123";
      const existingItem = { id: itemId, tenant_id: "test-tenant", status: "active" };
      const deletedItem = { ...existingItem, status: "deleted", updated_at: new Date() };

      mockPrisma.item_masters.findFirst.mockResolvedValue(existingItem);
      mockPrisma.item_masters.update.mockResolvedValue(deletedItem);

      const result = await service.softDeleteItem(mockCtx, itemId, "test-user");

      expect(result.status).toBe("deleted");
      expect(mockPrisma.item_masters.update).toHaveBeenCalledWith({
        where: { id: itemId, tenant_id: "test-tenant" },
        data: {
          status: "deleted",
          updated_at: expect.any(Date),
        },
      });
    });

    it("should throw NotFoundException when item does not exist", async () => {
      mockPrisma.item_masters.findFirst.mockResolvedValue(null);

      await expect(
        service.softDeleteItem(mockCtx, "non-existent", "test-user"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should NOT remove the database row", async () => {
      const itemId = "item-123";
      mockPrisma.item_masters.findFirst.mockResolvedValue({ id: itemId, tenant_id: "test-tenant" });
      mockPrisma.item_masters.update.mockResolvedValue({ id: itemId, status: "deleted" });

      await service.softDeleteItem(mockCtx, itemId, "test-user");

      // Verify update was called (not delete)
      expect(mockPrisma.item_masters.update).toHaveBeenCalled();
    });

    it("should log audit event when user_id is provided", async () => {
      const itemId = "item-123";
      mockPrisma.item_masters.findFirst.mockResolvedValue({ id: itemId, tenant_id: "test-tenant" });
      mockPrisma.item_masters.update.mockResolvedValue({ id: itemId, status: "deleted" });

      await service.softDeleteItem(mockCtx, itemId, "test-user");

      expect(mockAuditService.log).toHaveBeenCalledWith({
        tenant_id: "test-tenant",
        user_id: "test-user",
        module: "inventory",
        action: "SOFT_DELETE",
        entity_type: "ITEM",
        entity_id: itemId,
      });
    });
  });

  describe("cancelImportJob", () => {
    it("should cancel a PENDING job", async () => {
      const jobId = "job-123";
      const pendingJob = { id: jobId, tenant_id: "test-tenant", status: "PENDING" };
      const cancelledJob = { ...pendingJob, status: "CANCELLED" };

      mockPrisma.inventory_import_jobs.findFirst.mockResolvedValue(pendingJob);
      mockPrisma.inventory_import_jobs.update.mockResolvedValue(cancelledJob);

      const result = await service.cancelImportJob(jobId, mockCtx);

      expect(result.status).toBe("CANCELLED");
      expect(mockPrisma.inventory_import_jobs.update).toHaveBeenCalledWith({
        where: { id: jobId, tenant_id: "test-tenant" },
        data: {
          status: "CANCELLED",
          updated_at: expect.any(Date),
        },
      });
    });

    it("should cancel a PROCESSING job", async () => {
      const jobId = "job-456";
      const processingJob = { id: jobId, tenant_id: "test-tenant", status: "PROCESSING" };
      const cancelledJob = { ...processingJob, status: "CANCELLED" };

      mockPrisma.inventory_import_jobs.findFirst.mockResolvedValue(processingJob);
      mockPrisma.inventory_import_jobs.update.mockResolvedValue(cancelledJob);

      const result = await service.cancelImportJob(jobId, mockCtx);

      expect(result.status).toBe("CANCELLED");
    });

    it("should throw NotFoundException when job does not exist", async () => {
      mockPrisma.inventory_import_jobs.findFirst.mockResolvedValue(null);

      await expect(
        service.cancelImportJob("non-existent", mockCtx),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ConflictException for COMPLETED job", async () => {
      const completedJob = { id: "job-1", tenant_id: "test-tenant", status: "COMPLETED" };
      mockPrisma.inventory_import_jobs.findFirst.mockResolvedValue(completedJob);

      await expect(
        service.cancelImportJob("job-1", mockCtx),
      ).rejects.toThrow(ConflictException);
    });

    it("should throw ConflictException for FAILED job", async () => {
      const failedJob = { id: "job-2", tenant_id: "test-tenant", status: "FAILED" };
      mockPrisma.inventory_import_jobs.findFirst.mockResolvedValue(failedJob);

      await expect(
        service.cancelImportJob("job-2", mockCtx),
      ).rejects.toThrow(ConflictException);
    });

    it("should throw ConflictException for CANCELLED job", async () => {
      const cancelledJob = { id: "job-3", tenant_id: "test-tenant", status: "CANCELLED" };
      mockPrisma.inventory_import_jobs.findFirst.mockResolvedValue(cancelledJob);

      await expect(
        service.cancelImportJob("job-3", mockCtx),
      ).rejects.toThrow(ConflictException);
    });

    it("should throw ConflictException for ABORTED job", async () => {
      const abortedJob = { id: "job-4", tenant_id: "test-tenant", status: "ABORTED" };
      mockPrisma.inventory_import_jobs.findFirst.mockResolvedValue(abortedJob);

      await expect(
        service.cancelImportJob("job-4", mockCtx),
      ).rejects.toThrow(ConflictException);
    });
  });
});
