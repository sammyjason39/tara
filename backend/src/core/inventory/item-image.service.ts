import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../persistence/prisma.service";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs/promises";
import * as path from "path";
import { AuditService } from "../../shared/audit/audit.service";

@Injectable()
export class ItemImageService {
  private readonly storagePath = path.join(process.cwd(), "uploads", "inventory", "images");

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {
    this.ensureBaseDirectory();
  }

  private async ensureBaseDirectory() {
    try {
      await fs.mkdir(this.storagePath, { recursive: true });
    } catch (err) {
      console.error("Failed to create base storage directory:", err);
    }
  }

  private getStructuredPath(tenantId: string, companyId?: string | null, branchId?: string | null) {
    return path.join(
      tenantId,
      companyId || "default_co",
      branchId || "default_br"
    );
  }

  /**
   * Ensures the Explorer folder hierarchy exists for the given item scope.
   * Returns the ID of the leaf folder (Branch/Ecommerce folder).
   */
  private async ensureExplorerHierarchy(
    tx: any,
    tenantId: string,
    companyId: string | null,
    departmentId: string | null,
  ): Promise<string> {
    // 1. Root "Inventory Management" Folder
    let rootFolder = await tx.explorer_folders.findFirst({
      where: { tenant_id: tenantId, name: "Inventory Management", parent_id: null },
    });
    if (!rootFolder) {
      rootFolder = await tx.explorer_folders.create({
        data: { tenant_id: tenantId, name: "Inventory Management", access_level: "shared" },
      });
    }

    // 2. Company Folder
    let companyName = "General Items";
    if (companyId) {
      const co = await tx.companies.findUnique({ where: { id: companyId }, select: { name: true } });
      if (co) companyName = co.name;
    }

    let companyFolder = await tx.explorer_folders.findFirst({
      where: { tenant_id: tenantId, name: companyName, parent_id: rootFolder.id },
    });
    if (!companyFolder) {
      companyFolder = await tx.explorer_folders.create({
        data: { 
          tenant_id: tenantId, 
          company_id: companyId, 
          name: companyName, 
          parent_id: rootFolder.id,
          access_level: "shared"
        },
      });
    }

    // 3. Branch/Department Folder
    let branchName = "Main Stock";
    if (departmentId) {
      const dept = await tx.departments.findUnique({ where: { id: departmentId }, select: { name: true } });
      if (dept) branchName = dept.name;
    }

    let branchFolder = await tx.explorer_folders.findFirst({
      where: { tenant_id: tenantId, name: branchName, parent_id: companyFolder.id },
    });
    if (!branchFolder) {
      branchFolder = await tx.explorer_folders.create({
        data: { 
          tenant_id: tenantId, 
          company_id: companyId, 
          department_id: departmentId,
          name: branchName, 
          parent_id: companyFolder.id,
          access_level: "department"
        },
      });
    }

    return branchFolder.id;
  }

  async uploadImage(
    tenantId: string,
    itemId: string,
    file: Express.Multer.File,
    userId: string,
    customFileName?: string,
  ) {
    // 1. Validate item existence and get scope
    const item = await this.prisma.item_masters.findFirst({
      where: { id: itemId, tenant_id: tenantId },
    });
    if (!item) throw new NotFoundException(`Item ${itemId} not found`);

    // 2. Prepare structured directory
    const relativeDir = this.getStructuredPath(tenantId, item.company_id, item.department_id);
    const absoluteDir = path.join(this.storagePath, relativeDir);
    await fs.mkdir(absoluteDir, { recursive: true });

    // 3. Save file
    const fileExt = path.extname(file.originalname);
    const fileName = customFileName || `${uuidv4()}${fileExt}`;
    const filePath = path.join(absoluteDir, fileName);

    await fs.writeFile(filePath, file.buffer);

    // 4. Save to database (Relative URL for the API to serve)
    const relativeUrl = path.join(relativeDir, fileName).replace(/\\/g, "/");
    const imageUrl = `/v1/inventory/images/${relativeUrl}`;

    return await this.prisma.$transaction(async (tx) => {
      // --- Explorer Sync ---
      const explorerFolderId = await this.ensureExplorerHierarchy(tx, tenantId, item.company_id, item.department_id);
      
      await tx.explorer_files.create({
        data: {
          tenant_id: tenantId,
          company_id: item.company_id,
          department_id: item.department_id,
          owner_id: userId,
          folder_id: explorerFolderId,
          name: customFileName || file.originalname,
          type: fileExt.replace(".", "") || "jpg",
          size: file.size,
          mime_type: file.mimetype,
          storage_path: relativeUrl,
          access_level: "department",
        }
      });

      // --- Item Image Entry ---
      const existingImages = await tx.item_images.count({
        where: { item_id: itemId, tenant_id: tenantId },
      });

      const isPrimary = existingImages === 0;

      const image = await tx.item_images.create({
        data: {
          id: uuidv4(),
          tenant_id: tenantId,
          item_id: itemId,
          url: imageUrl,
          is_primary: isPrimary,
          order: existingImages,
        },
      });

      if (isPrimary) {
        await tx.item_masters.update({
          where: { id: itemId },
          data: { image_url: imageUrl },
        });
      }

      await this.auditService.log({
        tenant_id: tenantId,
        user_id: userId,
        module: "inventory",
        action: "UPLOAD_IMAGE",
        entity_type: "ITEM_IMAGE",
        entity_id: image.id,
        metadata: { item_id: itemId, url: imageUrl, originalName: file.originalname },
      }, tx);

      return image;
    });
  }

  async deleteImage(tenantId: string, itemId: string, imageId: string, userId: string) {
    const image = await this.prisma.item_images.findFirst({
      where: { id: imageId, item_id: itemId, tenant_id: tenantId },
    });

    if (!image) throw new NotFoundException(`Image ${imageId} not found for item ${itemId}`);

    await this.prisma.$transaction(async (tx) => {
      await tx.item_images.delete({ where: { id: imageId } });

      if (image.is_primary) {
        const nextImage = await tx.item_images.findFirst({
          where: { item_id: itemId, tenant_id: tenantId },
          orderBy: { order: "asc" },
        });

        if (nextImage) {
          await tx.item_images.update({
            where: { id: nextImage.id },
            data: { is_primary: true },
          });
          await tx.item_masters.update({
            where: { id: itemId },
            data: { image_url: nextImage.url },
          });
        } else {
          await tx.item_masters.update({
            where: { id: itemId },
            data: { image_url: null },
          });
        }
      }

      const remainingImages = await tx.item_images.findMany({
        where: { item_id: itemId, tenant_id: tenantId },
        orderBy: { order: "asc" },
      });

      for (let i = 0; i < remainingImages.length; i++) {
        await tx.item_images.update({
          where: { id: remainingImages[i].id },
          data: { order: i },
        });
      }

      // --- Explorer Sync ---
      const urlParts = image.url.split("/v1/inventory/images/");
      const relativePath = urlParts[1];
      if (relativePath) {
        await tx.explorer_files.deleteMany({
          where: { tenant_id: tenantId, storage_path: relativePath },
        });
      }
    });

    // Delete physical file
    const urlParts = image.url.split("/v1/inventory/images/");
    const relativePath = urlParts[1];
    if (relativePath) {
      const filePath = path.join(this.storagePath, relativePath);
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.warn(`Failed to delete file ${filePath}:`, err);
      }
    }

    await this.auditService.log({
      tenant_id: tenantId,
      user_id: userId,
      module: "inventory",
      action: "DELETE_IMAGE",
      entity_type: "ITEM_IMAGE",
      entity_id: imageId,
      metadata: { item_id: itemId },
    });
  }

  async setPrimaryImage(tenantId: string, itemId: string, imageId: string, userId: string) {
    const image = await this.prisma.item_images.findFirst({
      where: { id: imageId, item_id: itemId, tenant_id: tenantId },
    });

    if (!image) throw new NotFoundException(`Image ${imageId} not found for item ${itemId}`);

    return await this.prisma.$transaction(async (tx) => {
      await tx.item_images.updateMany({
        where: { item_id: itemId, tenant_id: tenantId, is_primary: true },
        data: { is_primary: false },
      });

      const updated = await tx.item_images.update({
        where: { id: imageId },
        data: { is_primary: true },
      });

      await tx.item_masters.update({
        where: { id: itemId },
        data: { image_url: image.url },
      });

      await this.auditService.log({
        tenant_id: tenantId,
        user_id: userId,
        module: "inventory",
        action: "SET_PRIMARY_IMAGE",
        entity_type: "ITEM_IMAGE",
        entity_id: imageId,
        metadata: { item_id: itemId },
      }, tx);

      return updated;
    });
  }

  async listImages(tenantId: string, itemId: string) {
    return this.prisma.item_images.findMany({
      where: { item_id: itemId, tenant_id: tenantId },
      orderBy: { order: "asc" },
    });
  }

  async getImagePath(fullPath: string): Promise<string> {
    if (!fullPath) {
      throw new BadRequestException("Image path is required");
    }

    const relativePath = decodeURIComponent(fullPath).replace(/\\/g, "/");
    const normalizedPath = path.normalize(relativePath);
    if (path.isAbsolute(normalizedPath) || normalizedPath.startsWith("..")) {
      throw new BadRequestException("Invalid image path");
    }

    const storageRoot = path.resolve(this.storagePath);
    const filePath = path.resolve(storageRoot, normalizedPath);
    if (!filePath.startsWith(`${storageRoot}${path.sep}`)) {
      throw new BadRequestException("Invalid image path");
    }

    try {
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) {
        throw new NotFoundException("Image not found");
      }
      return filePath;
    } catch {
      throw new NotFoundException("Image not found");
    }
  }
}
