import { describe, expect, it, beforeEach, vi } from "vitest";
import { InventoryController } from "./inventory.controller";
import { NotFoundException, PayloadTooLargeException, BadRequestException } from "@nestjs/common";

/**
 * Unit tests for Inventory Item Images endpoints
 * Validates: Requirements 10.3, 10.4, 10.5, 10.10
 */
describe("InventoryController - Item Images Endpoints", () => {
  let controller: InventoryController;
  let mockItemImageService: any;
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

    mockItemImageService = {
      uploadImage: vi.fn(),
      deleteImage: vi.fn(),
      setPrimaryImage: vi.fn(),
      listImages: vi.fn(),
      getImagePath: vi.fn(),
    };

    mockPrisma = {
      item_masters: {
        findFirst: vi.fn(),
      },
    };

    mockCacheHelper = {
      invalidate: vi.fn(),
    };

    mockInventoryService = {};
    mockAuditService = { log: vi.fn() };

    controller = new InventoryController(
      mockInventoryService as any,
      { generateSku: vi.fn() } as any,
      {} as any,
      { generateExcel: vi.fn() } as any,
      mockAuditService as any,
      mockPrisma as any,
      mockItemImageService as any,
      mockCacheHelper as any,
    );
  });

  describe("GET /inventory/items/:id/images", () => {
    it("should return image array with url, imageId, and primary flag", async () => {
      const itemId = "item-123";
      mockPrisma.item_masters.findFirst.mockResolvedValue({ id: itemId, tenant_id: "test-tenant" });
      mockItemImageService.listImages.mockResolvedValue([
        { id: "img-1", url: "/v1/inventory/images/tenant/co/br/pic1.jpg", is_primary: true, order: 0 },
        { id: "img-2", url: "/v1/inventory/images/tenant/co/br/pic2.jpg", is_primary: false, order: 1 },
      ]);

      const result = await controller.listImages(mockRequest, itemId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        imageId: "img-1",
        url: "/v1/inventory/images/tenant/co/br/pic1.jpg",
        primary: true,
      });
      expect(result.data[1]).toEqual({
        imageId: "img-2",
        url: "/v1/inventory/images/tenant/co/br/pic2.jpg",
        primary: false,
      });
    });

    it("should return 404 when item does not exist", async () => {
      mockPrisma.item_masters.findFirst.mockResolvedValue(null);

      await expect(controller.listImages(mockRequest, "non-existent-id"))
        .rejects.toThrow(NotFoundException);
    });

    it("should return empty array for item with no images", async () => {
      const itemId = "item-no-images";
      mockPrisma.item_masters.findFirst.mockResolvedValue({ id: itemId, tenant_id: "test-tenant" });
      mockItemImageService.listImages.mockResolvedValue([]);

      const result = await controller.listImages(mockRequest, itemId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });

  describe("PUT /inventory/items/:id/images/:imageId/primary", () => {
    it("should set primary image and return updated data", async () => {
      const itemId = "item-123";
      const imageId = "img-2";
      mockItemImageService.setPrimaryImage.mockResolvedValue({
        id: imageId,
        url: "/v1/inventory/images/tenant/co/br/pic2.jpg",
        is_primary: true,
      });

      const result = await controller.setPrimaryImage(mockRequest, itemId, imageId);

      expect(result.success).toBe(true);
      expect(result.message).toBe("Primary image updated");
      expect(result.data).toEqual({
        imageId: "img-2",
        url: "/v1/inventory/images/tenant/co/br/pic2.jpg",
        primary: true,
      });
      expect(mockItemImageService.setPrimaryImage).toHaveBeenCalledWith(
        "test-tenant", itemId, imageId, "test-user"
      );
      expect(mockCacheHelper.invalidate).toHaveBeenCalled();
    });

    it("should throw 404 when image not found", async () => {
      mockItemImageService.setPrimaryImage.mockRejectedValue(
        new NotFoundException("Image img-999 not found for item item-123")
      );

      await expect(controller.setPrimaryImage(mockRequest, "item-123", "img-999"))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe("POST /inventory/items/:id/images (upload)", () => {
    it("should upload image and return metadata", async () => {
      const itemId = "item-123";
      const mockFile: any = {
        originalname: "photo.jpg",
        mimetype: "image/jpeg",
        size: 2 * 1024 * 1024, // 2MB
        buffer: Buffer.alloc(100),
      };
      mockItemImageService.uploadImage.mockResolvedValue({
        id: "new-img-1",
        url: "/v1/inventory/images/tenant/co/br/new-img.jpg",
        is_primary: true,
      });

      const result = await controller.uploadImage(mockRequest, itemId, mockFile);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        imageId: "new-img-1",
        url: "/v1/inventory/images/tenant/co/br/new-img.jpg",
        primary: true,
      });
      expect(mockCacheHelper.invalidate).toHaveBeenCalled();
    });

    it("should reject files exceeding 10MB with 413 error", async () => {
      const itemId = "item-123";
      const mockFile: any = {
        originalname: "huge-photo.jpg",
        mimetype: "image/jpeg",
        size: 11 * 1024 * 1024, // 11MB - exceeds 10MB limit
        buffer: Buffer.alloc(100),
      };

      await expect(controller.uploadImage(mockRequest, itemId, mockFile))
        .rejects.toThrow(PayloadTooLargeException);
    });

    it("should reject when no file is uploaded", async () => {
      const itemId = "item-123";

      await expect(controller.uploadImage(mockRequest, itemId, undefined as any))
        .rejects.toThrow(BadRequestException);
    });

    it("should throw 404 when item not found during upload", async () => {
      const itemId = "non-existent";
      const mockFile: any = {
        originalname: "photo.jpg",
        mimetype: "image/jpeg",
        size: 1 * 1024 * 1024,
        buffer: Buffer.alloc(100),
      };
      mockItemImageService.uploadImage.mockRejectedValue(
        new NotFoundException(`Item ${itemId} not found`)
      );

      await expect(controller.uploadImage(mockRequest, itemId, mockFile))
        .rejects.toThrow(NotFoundException);
    });
  });
});
