import { describe, expect, it, beforeEach, vi } from "vitest";
import { InventoryService } from "./inventory.service";
import { InventoryMockRepository } from "./repositories/inventory.mock.repository";
import { AuditService } from "../../shared/audit/audit.service";
import { PrismaService } from "../../persistence/prisma.service";
import { SkuGeneratorService } from "./sku-generator.service";
import { CreateItemDto } from "./dto/create-item.dto";

// Mock implementations for testing
const mockAuditService = {
  log: vi.fn(),
};

const mockSkuGenerator = {
  generateSku: vi.fn(() => "SKU-GEN-001"),
};

// Simple Prisma mock that extends PrismaService
class MockPrismaService {
  product_categories = {
    findFirst: vi.fn(),
    create: vi.fn(),
  };
  item_masters = {
    create: vi.fn(),
  };
  $transaction = vi.fn();
}

describe("InventoryService - batchCreateIncompleteItems", () => {
  let service: InventoryService;
  let repository: InventoryMockRepository;
  let mockPrisma: MockPrismaService;

  beforeEach(() => {
    vi.clearAllMocks();

    repository = new InventoryMockRepository();
    mockPrisma = new MockPrismaService() as any;
    service = new InventoryService(
      repository,
      mockSkuGenerator as any,
      mockAuditService as any,
      mockPrisma,
      { emit: vi.fn(), on: vi.fn(), once: vi.fn() } as any,
      { requestProcurement: vi.fn() } as any,
      { uploadImage: vi.fn(), deleteImage: vi.fn(), setPrimaryImage: vi.fn(), listImages: vi.fn(), getImagePath: vi.fn() } as any,
      { generateExcel: vi.fn() } as any,
      { find: vi.fn() } as any,
    );
  });

  describe("Batch create incomplete items", () => {
    it("should create incomplete items with is_anomaly=true and status=incomplete", async () => {
      const ctx = { tenant_id: "test-tenant", user_id: "test-user" };
      const items = [
        { barcode: "123456789", name: "Test Item 1" },
        { barcode: "987654321", name: "Test Item 2" },
      ];

      // Mock anomaly category creation
      mockPrisma.product_categories.findFirst.mockResolvedValue(null);
      mockPrisma.product_categories.create.mockResolvedValue({
        id: "cat-anomaly-123",
        tenant_id: "test-tenant",
        name: "Anomaly",
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Mock item creation in repository
      vi.spyOn(repository, "createItem").mockImplementation(async (ctx: any, data: any) => {
        return {
          id: `item-${Math.random().toString(36).substr(2, 9)}`,
          tenant_id: ctx.tenant_id,
          category_id: "cat-anomaly-123",
          ...data,
          created_at: new Date(),
        };
      });

      const result = await service.batchCreateIncompleteItems(ctx, items, "test-user");

      expect(result.success).toBe(true);
      expect(result.created.length).toBe(2);
      expect(result.created[0].is_anomaly).toBe(true);
      expect(result.created[0].status).toBe("incomplete");
      expect(result.created[0].category_id).toBe("cat-anomaly-123");
      expect(result.created[1].is_anomaly).toBe(true);
      expect(result.created[1].status).toBe("incomplete");
      expect(result.created[1].category_id).toBe("cat-anomaly-123");
    });

    it("should handle partial failures gracefully", async () => {
      const ctx = { tenant_id: "test-tenant", user_id: "test-user" };
      const items = [
        { barcode: "123456789", name: "Test Item 1" },
        { barcode: "", name: "" }, // Invalid item that will fail
        { barcode: "987654321", name: "Test Item 2" },
      ];

      // Mock anomaly category creation
      mockPrisma.product_categories.findFirst.mockResolvedValue(null);
      mockPrisma.product_categories.create.mockResolvedValue({
        id: "cat-anomaly-123",
        tenant_id: "test-tenant",
        name: "Anomaly",
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Mock item creation - throw on empty barcode
      vi.spyOn(repository, "createItem").mockImplementation(async (ctx: any, data: any) => {
        if (!data.barcode || data.barcode.trim() === "") {
          throw new Error("Invalid item data: barcode is empty");
        }
        return {
          id: `item-${Math.random().toString(36).substr(2, 9)}`,
          tenant_id: ctx.tenant_id,
          category_id: "cat-anomaly-123",
          ...data,
          created_at: new Date(),
        };
      });

      const result = await service.batchCreateIncompleteItems(ctx, items, "test-user");

      expect(result.success).toBe(true);
      // First and third items should succeed, second should fail
      expect(result.created.length).toBe(2);
      expect(result.failed.length).toBe(1);
      expect(result.failed[0].barcode).toBe("");
      expect(result.failed[0].error).toContain("Invalid");
    });

    it("should use existing anomaly category if it exists", async () => {
      const ctx = { tenant_id: "test-tenant", user_id: "test-user" };
      const items = [{ barcode: "123456789", name: "Test Item" }];

      // Mock existing anomaly category
      const existingCategory = {
        id: "cat-anomaly-existing",
        tenant_id: "test-tenant",
        name: "Anomaly",
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockPrisma.product_categories.findFirst.mockResolvedValue(existingCategory);

      // Mock item creation
      vi.spyOn(repository, "createItem").mockImplementation(async (ctx: any, data: any) => {
        return {
          id: `item-${Math.random().toString(36).substr(2, 9)}`,
          tenant_id: ctx.tenant_id,
          category_id: "cat-anomaly-existing",
          ...data,
          created_at: new Date(),
        };
      });

      const result = await service.batchCreateIncompleteItems(ctx, items, "test-user");

      expect(result.success).toBe(true);
      expect(result.created.length).toBe(1);
      expect(result.created[0].category_id).toBe("cat-anomaly-existing");

      // Should not create new category
      expect(mockPrisma.product_categories.create).not.toHaveBeenCalled();
    });

    it("should log audit trail for successful creation", async () => {
      const ctx = { tenant_id: "test-tenant", user_id: "test-user" };
      const items = [{ barcode: "123456789", name: "Test Item" }];

      mockPrisma.product_categories.findFirst.mockResolvedValue(null);
      mockPrisma.product_categories.create.mockResolvedValue({
        id: "cat-anomaly-123",
        tenant_id: "test-tenant",
        name: "Anomaly",
        created_at: new Date(),
        updated_at: new Date(),
      });

      vi.spyOn(repository, "createItem").mockImplementation(async (ctx: any, data: any) => {
        return {
          id: `item-${Math.random().toString(36).substr(2, 9)}`,
          tenant_id: ctx.tenant_id,
          category_id: "cat-anomaly-123",
          ...data,
          created_at: new Date(),
        };
      });

      const result = await service.batchCreateIncompleteItems(ctx, items, "test-user");

      expect(mockAuditService.log).toHaveBeenCalled();
      const auditLog = mockAuditService.log.mock.calls[0][0];
      expect(auditLog.module).toBe("INVENTORY");
      expect(auditLog.action).toBe("BATCH_CREATE_INCOMPLETE");
      expect(auditLog.entity_type).toBe("ITEM");
      expect(auditLog.metadata.count).toBe(1);
      expect(auditLog.metadata.anomaly_category_id).toBe("cat-anomaly-123");
    });

    it("should return correct response structure", async () => {
      const ctx = { tenant_id: "test-tenant", user_id: "test-user" };
      const items = [{ barcode: "123456789", name: "Test Item" }];

      mockPrisma.product_categories.findFirst.mockResolvedValue(null);
      mockPrisma.product_categories.create.mockResolvedValue({
        id: "cat-anomaly-123",
        tenant_id: "test-tenant",
        name: "Anomaly",
        created_at: new Date(),
        updated_at: new Date(),
      });

      vi.spyOn(repository, "createItem").mockImplementation(async (ctx: any, data: any) => {
        return {
          id: `item-${Math.random().toString(36).substr(2, 9)}`,
          tenant_id: ctx.tenant_id,
          category_id: "cat-anomaly-123",
          ...data,
          created_at: new Date(),
        };
      });

      const result = await service.batchCreateIncompleteItems(ctx, items, "test-user");

      expect(result).toEqual({
        success: true,
        created: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            sku: expect.any(String),
            name: expect.any(String),
            barcode: expect.any(String),
            category_id: expect.any(String),
            is_anomaly: true,
            status: "incomplete",
            created_at: expect.any(Date),
          }),
        ]),
        failed: expect.arrayContaining([]),
        total: 1,
      });
    });
  });
});
