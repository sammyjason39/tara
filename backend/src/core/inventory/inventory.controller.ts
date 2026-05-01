import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from "@nestjs/common";
import { Request, Response } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import { TenantContext } from "../../gateway/tenant-context.interface";
import { TenantInterceptor } from "../../gateway/tenant.interceptor";
import { TenantGuard } from "../../shared/guards/tenant.guard";
import { ModuleStateGuard } from "../auth/guards/module-state.guard";
import { BranchGatingGuard } from "../auth/guards/branch-gating.guard";
import { InventoryRolesGuard } from "./guards/inventory-roles.guard";
import {
  InventoryRole,
  RequireInventoryRole,
} from "./guards/inventory-role.decorator";
import { RequiredModule } from "../../shared/decorators/required-module.decorator";
import { CreateAdjustmentDto } from "./dto/create-adjustment.dto";
import { CreateItemDto } from "./dto/create-item.dto";
import { StockIntakeDto } from "./dto/stock-intake.dto";
import { TransferStockDto } from "./dto/transfer-stock.dto";
import { ImportItemDto } from "./dto/import-item.dto";
import { CreateMovementRequestDto } from "./dto/create-movement-request.dto";
import { CreateAgenticEventDto } from "./dto/create-agentic-event.dto";
import { InventoryService } from "./inventory.service";
import { FileProcessingService } from "../../shared/file-processing/file-processing.service";
import { AuditService } from "../../shared/audit/audit.service";
import { SkuGeneratorService } from "./sku-generator.service";
import { LabelTemplateService } from "./label-template.service";
import { ItemImageService } from "./item-image.service";
import { v4 as uuidv4 } from "uuid";
import { PrismaService } from "../../persistence/prisma.service";
import { isModuleActive } from "../../shared/helpers/module-active.helper";

interface RequestWithTenant extends Request {
  tenantContext: TenantContext;
}

@Controller('inventory')
@UseInterceptors(TenantInterceptor)
@UseGuards(
  ModuleStateGuard,
  BranchGatingGuard,
  TenantGuard,
  InventoryRolesGuard,
)
@RequiredModule("inventory")
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly skuGenerator: SkuGeneratorService,
    private readonly labelTemplateService: LabelTemplateService,
    private readonly fileProcessingService: FileProcessingService,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
    private readonly itemImageService: ItemImageService,
  ) {}

  @Get("dashboard")
  async getDashboard(@Req() request: RequestWithTenant) {
    const { tenant_id: tenant_id } = request.tenantContext;
    const dashboardData = await this.inventoryService.getDashboard(request.tenantContext);

    const moduleContributions: any = {};
    if (await isModuleActive(this.prisma, tenant_id, "retail")) {
      const activeStores = await this.prisma.locations.findMany({
        where: { tenant_id: tenant_id, type: "STORE" },
        select: { id: true },
      });
      const storeIds = activeStores.map((s: any) => s.id);

      const storeInventoryAgg = await this.prisma.stock_levels.aggregate({
        where: { tenant_id: tenant_id, location_id: { in: storeIds } },
        _sum: { on_hand: true },
      });

      const pendingStockTransfers =
        await this.prisma.procurement_requisitions.count({
          where: {
            tenant_id: tenant_id,
            status: "SUBMITTED",
            department_id: { in: storeIds }, // Using departmentId as store reference since stores are departments or we can just return 0 to fix it simply
          },
        });

      moduleContributions.retail = {
        storeInventoryCount: storeInventoryAgg._sum.on_hand || 0,
        pendingStoreTransfers: pendingStockTransfers,
      };
    }

    return {
      success: true,
      tenant_id,
      data: {
        ...dashboardData,
        moduleContributions,
      },
    };
  }

  @Get("items")
  async getItems(@Req() request: RequestWithTenant) {
    const { tenant_id: tenant_id } = request.tenantContext;
    const data = await this.inventoryService.getItems(request.tenantContext);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Post("items/:id/images")
  @RequireInventoryRole(InventoryRole.MANAGER)
  @UseInterceptors(FileInterceptor("file"))
  async uploadImage(
    @Req() request: RequestWithTenant,
    @Param("id") itemId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.itemImageService.uploadImage(
      request.tenantContext.tenant_id,
      itemId,
      file,
      request.tenantContext.user_id || "system",
    );
  }

  @Delete("items/:id/images/:imageId")
  @RequireInventoryRole(InventoryRole.MANAGER)
  async deleteImage(
    @Req() request: RequestWithTenant,
    @Param("id") itemId: string,
    @Param("imageId") imageId: string,
  ) {
    return this.itemImageService.deleteImage(
      request.tenantContext.tenant_id,
      itemId,
      imageId,
      request.tenantContext.user_id || "system",
    );
  }

  @Put("items/:id/images/:imageId/primary")
  @RequireInventoryRole(InventoryRole.MANAGER)
  async setPrimaryImage(
    @Req() request: RequestWithTenant,
    @Param("id") itemId: string,
    @Param("imageId") imageId: string,
  ) {
    return this.itemImageService.setPrimaryImage(
      request.tenantContext.tenant_id,
      itemId,
      imageId,
      request.tenantContext.user_id || "system",
    );
  }

  @Get("items/:id/images")
  async listImages(
    @Req() request: RequestWithTenant,
    @Param("id") itemId: string,
  ) {
    return this.itemImageService.listImages(
      request.tenantContext.tenant_id,
      itemId,
    );
  }

  @Get("images/:fileName")
  async serveImage(
    @Param("fileName") fileName: string,
    @Res() res: Response,
  ) {
    const path = await this.itemImageService.getImagePath(fileName);
    return res.sendFile(path);
  }

  @Post("items")
  @RequireInventoryRole(InventoryRole.MANAGER)
  async createItem(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateItemDto,
  ) {
    const { tenant_id: tenant_id, user_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Inventory item created",
      data: await this.inventoryService.createItem(request.tenantContext, dto, user_id),
    };
  }

  @Post("items/batch-delete")
  @RequireInventoryRole(InventoryRole.MANAGER)
  async batchDeleteItems(
    @Req() request: RequestWithTenant,
    @Body() body: { itemIds: string[] },
  ) {
    const { tenant_id: tenant_id, user_id } = request.tenantContext;
    await this.inventoryService.batchDeleteItems(
      request.tenantContext,
      body.itemIds,
      user_id,
    );
    return {
      success: true,
      tenant_id,
      message: "Batch delete successful",
    };
  }

  @Delete("items/:id")
  @RequireInventoryRole(InventoryRole.MANAGER)
  async deleteItem(
    @Req() request: RequestWithTenant,
    @Param("id") item_id: string,
  ) {
    const { tenant_id: tenant_id, user_id } = request.tenantContext;
    await this.inventoryService.deleteItem(request.tenantContext, item_id, user_id);
    return {
      success: true,
      tenant_id,
      message: "Inventory item deleted",
    };
  }

  @Post("items/import")
  @UseInterceptors(FileInterceptor("file"))
  @RequireInventoryRole(InventoryRole.MANAGER)
  async importItems(
    @Req() request: RequestWithTenant,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const { tenant_id: tenant_id, user_id } = request.tenantContext;
    if (!file) {
      return { success: false, message: "No file uploaded" };
    }

    let result;
    if (file.originalname.endsWith(".csv")) {
      result = await this.fileProcessingService.parseCsv(
        file.buffer,
        ImportItemDto,
      );
    } else {
      result = await this.fileProcessingService.parseExcel(
        file.buffer,
        ImportItemDto,
      );
    }

    if (result.errors.length > 0) {
      return {
        success: false,
        message: "Validation failed",
        errors: result.errors,
      };
    }

    const imported = await this.inventoryService.batchCreateItems(
      request.tenantContext,
      result.data,
      user_id,
    );

    await this.auditService.log({
      tenant_id: tenant_id,
      user_id: request.tenantContext.user_id || "system",
      module: "INVENTORY",
      action: "IMPORT",
      entity_type: "ITEM",
      entity_id: "BATCH",
      metadata: {
        filename: file.originalname,
        count: imported.length,
        traceId: uuidv4(),
      },
    });

    return {
      success: true,
      tenant_id,
      message: `${imported.length} items imported successfully`,
      data: imported,
    };
  }

  @Post("items/batch-json")
  @RequireInventoryRole(InventoryRole.MANAGER)
  async batchCreateItemsJson(
    @Req() request: RequestWithTenant,
    @Body() body: { items: any[] },
  ) {
    const { tenant_id: tenant_id, user_id } = request.tenantContext;
    // Map UI fields to DTO fields if necessary, but batchCreateItems handles CreateItemDto[]
    // The UI sends: sku, name, category, barcode, base_price, uom, description, active
    const data = body.items.map((item) => ({
      ...item,
      // Ensure category is passed as string for SKU generation logic
      category: item.category,
      uom: item.uom || "pcs",
    }));

    const items = await this.inventoryService.batchCreateItems(
      request.tenantContext,
      data as CreateItemDto[],
      user_id,
    );

    return {
      success: true,
      tenant_id,
      message: `${items.length} items created successfully`,
      data: items,
    };
  }

  @Get("items/export")
  async exportItems(
    @Req() request: RequestWithTenant,
    @Res() res: Response,
    @Query("watermarkText") watermarkText?: string,
    @Query("wmX") wmX?: string,
    @Query("wmY") wmY?: string,
  ) {
    const { tenant_id: tenant_id, user_id } = request.tenantContext;
    const items = await this.inventoryService.getItems(request.tenantContext);

    const traceId = uuidv4();
    const buffer = await this.fileProcessingService.generateExcel(
      items,
      [
        { header: "SKU", key: "sku", width: 20 },
        { header: "Name", key: "name", width: 40 },
        { header: "Category", key: "category", width: 20 },
        { header: "UOM", key: "uom", width: 10 },
        { header: "Active", key: "active", width: 10 },
      ],
      {
        traceId,
        watermark: watermarkText
          ? {
              text: watermarkText,
              position: { x: parseInt(wmX || "1"), y: parseInt(wmY || "1") },
            }
          : undefined,
      },
    );

    await this.auditService.log({
      tenant_id: tenant_id,
      user_id: request.tenantContext.user_id || "system",
      module: "INVENTORY",
      action: "EXPORT",
      entity_type: "ITEM",
      entity_id: "BATCH",
      metadata: {
        traceId,
        watermark: watermarkText,
      },
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=inventory_export_${tenant_id}.xlsx`,
    );
    res.send(buffer);
  }

  @Get("balances")
  async getBalances(
    @Req() request: RequestWithTenant,
    @Query("location_id") location_id?: string,
    @Query("departmentId") departmentId?: string,
  ) {
    const { tenant_id: tenant_id } = request.tenantContext;
    const data = await this.inventoryService.getBalances(
      request.tenantContext,
      location_id,
      departmentId,
    );
    return { success: true, tenant_id, count: data.length, data };
  }

  @Get("movements")
  async getMovements(
    @Req() request: RequestWithTenant,
    @Query("item_id") item_id?: string,
  ) {
    const { tenant_id: tenant_id } = request.tenantContext;
    const data = await this.inventoryService.getMovements(request.tenantContext, item_id);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Post("intake")
  @RequireInventoryRole(InventoryRole.SUPERVISOR)
  async intakeStock(
    @Req() request: RequestWithTenant,
    @Body() dto: StockIntakeDto,
  ) {
    const { tenant_id: tenant_id, location_id, user_id } = request.tenantContext;
    if (location_id && !dto.location_id) dto.location_id = location_id;
    return {
      success: true,
      tenant_id,
      message: "Stock intake recorded",
      data: await this.inventoryService.intakeStock(request.tenantContext, dto, user_id),
    };
  }


  @Post("transfer")
  @RequireInventoryRole(InventoryRole.SUPERVISOR)
  async transferStock(
    @Req() request: RequestWithTenant,
    @Body() dto: TransferStockDto,
  ) {
    const { tenant_id: tenant_id, user_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Stock transfer recorded",
      data: await this.inventoryService.transferStock(request.tenantContext, dto, user_id),
    };
  }


  @Post("consume")
  @RequireInventoryRole(InventoryRole.SUPERVISOR)
  async consumeStock(
    @Req() request: RequestWithTenant,
    @Body() dto: any,
    @Query("correlation_id") correlation_id?: string,
  ) {
    const { tenant_id: tenant_id, location_id, user_id } = request.tenantContext;
    if (location_id && !dto.location_id) dto.location_id = location_id;
    return {
      success: true,
      tenant_id,
      message: "Stock consumption recorded",
      data: await this.inventoryService.consumeStock(
        request.tenantContext,
        dto,
        user_id,
        null,
        correlation_id,
      ),
    };
  }

  // --- Financial-Grade Reservation ---

  @Post("reserve")
  @RequireInventoryRole(InventoryRole.SUPERVISOR)
  async reserveStock(
    @Req() request: RequestWithTenant,
    @Body() dto: { product_id: string; location_id: string; quantity: number; referenceId: string; referenceType: string },
    @Query("correlation_id") correlation_id?: string,
  ) {
    const { tenant_id: tenant_id, user_id } = request.tenantContext;
    await this.inventoryService.reserveStock(request.tenantContext, dto, user_id || "system", correlation_id);
    return { success: true, message: "Stock reserved" };
  }

  @Post("release")
  @RequireInventoryRole(InventoryRole.SUPERVISOR)
  async releaseStock(
    @Req() request: RequestWithTenant,
    @Body() dto: { product_id: string; location_id: string; quantity: number; referenceId: string; referenceType: string },
    @Query("correlation_id") correlation_id?: string,
  ) {
    const { tenant_id: tenant_id, user_id } = request.tenantContext;
    await this.inventoryService.releaseStock(request.tenantContext, dto, user_id || "system", correlation_id);
    return { success: true, message: "Stock released" };
  }

  @Post("confirm-reservation")
  @RequireInventoryRole(InventoryRole.SUPERVISOR)
  async confirmReservation(
    @Req() request: RequestWithTenant,
    @Body() dto: { product_id: string; location_id: string; quantity: number; referenceId: string; referenceType: string },
    @Query("correlation_id") correlation_id?: string,
  ) {
    const { tenant_id: tenant_id, user_id } = request.tenantContext;
    await this.inventoryService.confirmReservation(request.tenantContext, dto, user_id || "system", correlation_id);
    return { success: true, message: "Reservation confirmed and stock consumed" };
  }

  // --- Multi-Step Transfer ---

  @Post("transfer/initiate")
  @RequireInventoryRole(InventoryRole.SUPERVISOR)
  async initiateTransfer(
    @Req() request: RequestWithTenant,
    @Body() dto: any,
    @Query("correlation_id") correlation_id?: string,
  ) {
    const { tenant_id: tenant_id, user_id } = request.tenantContext;
    const result = await this.inventoryService.initiateTransfer(request.tenantContext, dto, user_id || "system", correlation_id);
    return { success: true, message: "Transfer initiated (In-Transit)", ...result };
  }

  @Post("transfer/complete")
  @RequireInventoryRole(InventoryRole.SUPERVISOR)
  async completeTransfer(
    @Req() request: RequestWithTenant,
    @Body() dto: any,
    @Query("correlation_id") correlation_id?: string,
  ) {
    const { tenant_id: tenant_id, user_id } = request.tenantContext;
    const data = await this.inventoryService.completeTransfer(request.tenantContext, dto, user_id || "system", correlation_id);
    return { success: true, message: "Transfer completed (Received)", data };
  }

  // --- Stock Transfer Lifecycle (Grading to Production) ---

  @Get("stock-transfers")
  async getTransfers(@Req() request: RequestWithTenant) {
    const { tenant_id: tenant_id } = request.tenantContext;
    const data = await this.inventoryService.getAllTransfers(request.tenantContext);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Post("stock-transfers")
  @RequireInventoryRole(InventoryRole.SUPERVISOR)
  async createStockTransfer(
    @Req() request: RequestWithTenant,
    @Body() dto: any,
  ) {
    const { tenant_id: tenant_id, user_id } = request.tenantContext;
    const data = await this.inventoryService.createTransfer(request.tenantContext, dto, user_id || "system");
    return { success: true, tenant_id, message: "Stock transfer requested", data };
  }

  @Put("stock-transfers/:id/pick")
  @RequireInventoryRole(InventoryRole.SUPERVISOR)
  async pickStockTransfer(
    @Req() request: RequestWithTenant,
    @Param("id") id: string,
  ) {
    const { tenant_id: tenant_id, user_id } = request.tenantContext;
    const data = await this.inventoryService.pickTransfer(request.tenantContext, id, user_id || "system");
    return { success: true, tenant_id, message: "Transfer picked", data };
  }

  @Put("stock-transfers/:id/ship")
  @RequireInventoryRole(InventoryRole.SUPERVISOR)
  async shipStockTransfer(
    @Req() request: RequestWithTenant,
    @Param("id") id: string,
    @Body() body: { tracking_number: string },
  ) {
    const { tenant_id: tenant_id, user_id } = request.tenantContext;
    const data = await this.inventoryService.shipTransfer(request.tenantContext, id, body.tracking_number, user_id || "system");
    return { success: true, tenant_id, message: "Transfer shipped (In-Transit)", data };
  }

  @Put("stock-transfers/:id/receive")
  @RequireInventoryRole(InventoryRole.SUPERVISOR)
  async receiveStockTransfer(
    @Req() request: RequestWithTenant,
    @Param("id") id: string,
  ) {
    const { tenant_id: tenant_id, user_id } = request.tenantContext;
    const data = await this.inventoryService.receiveTransfer(request.tenantContext, id, user_id || "system");
    return { success: true, tenant_id, message: "Transfer received", data };
  }

  @Post("snapshots")
  @RequireInventoryRole(InventoryRole.MANAGER)
  async runSnapshot(
    @Req() request: RequestWithTenant,
    @Query("location_id") location_id?: string,
  ) {
    const { tenant_id: tenant_id } = request.tenantContext;
    await this.inventoryService.runStockSnapshot(request.tenantContext, location_id || "ALL");
    return { success: true, message: "Stock snapshot taken" };
  }


  @Get("generate-sku")
  async generateSku(
    @Req() request: RequestWithTenant,
    @Query("category") category: string,
  ) {
    const { tenant_id: tenant_id } = request.tenantContext;
    const sku = await this.skuGenerator.generateSku(request.tenantContext, category);
    return { success: true, tenant_id, sku };
  }

  @Get("generate-barcode")
  async generateBarcode(
    @Req() request: RequestWithTenant,
    @Query("sku") sku: string,
  ) {
    const { tenant_id: tenant_id } = request.tenantContext;
    const barcode = this.skuGenerator.generateBarcode(request.tenantContext, sku);
    return { success: true, tenant_id, barcode };
  }

  @Get("label/:sku")
  async getLabel(
    @Req() request: RequestWithTenant,
    @Param("sku") sku: string,
    @Query("format") format: "html" | "zpl" = "html",
  ) {
    const { tenant_id: tenant_id } = request.tenantContext;

    // In a real scenario, we'd fetch the actual product data to populate the label
    // For this implementation, we'll derive it from the SKU or use defaults
    const labelData = {
      name: `Product ${sku}`,
      sku: sku,
      barcode: sku, // Usually barcode is the SKU or a separate field
      price: 29.99,
      unit: "pcs",
    };

    if (format === "zpl") {
      return {
        success: true,
        tenant_id,
        zpl: this.labelTemplateService.generateZPL(labelData),
      };
    }

    return {
      success: true,
      tenant_id,
      html: this.labelTemplateService.generateLabelHtml(labelData),
    };
  }

  @Get("items/pending")
  async getPendingItems(@Req() request: RequestWithTenant) {
    const { tenant_id: tenant_id } = request.tenantContext;
    const data = await this.inventoryService.getPendingItems(request.tenantContext);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Put("items/:id/approve")
  async approveItem(
    @Req() request: RequestWithTenant,
    @Param("id") item_id: string,
  ) {
    const { tenant_id: tenant_id, user_id } = request.tenantContext;
    const item = await this.inventoryService.approveItem(
      request.tenantContext,
      item_id,
      user_id || "system",
    );
    return {
      success: true,
      tenant_id,
      message: "Item approved and activated",
      data: item,
    };
  }

  @Put("items/:id/reject")
  async rejectItem(
    @Req() request: RequestWithTenant,
    @Param("id") item_id: string,
  ) {
    const { tenant_id: tenant_id, user_id } = request.tenantContext;
    const item = await this.inventoryService.rejectItem(
      request.tenantContext,
      item_id,
      user_id || "system",
    );
    return {
      success: true,
      tenant_id,
      message: "Item rejected",
      data: item,
    };
  }

  @Post("movements/request")
  async createMovementRequest(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateMovementRequestDto,
  ) {
    const { tenant_id: tenant_id, user_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Movement request created",
      data: await this.inventoryService.createMovementRequest(
        request.tenantContext,
        dto,
        user_id,
      ),
    };
  }

  // ─── Adjustments ────────────────────────────────────────────────

  @Get("adjustments")
  async getAdjustments(@Req() request: RequestWithTenant) {
    const { tenant_id: tenant_id } = request.tenantContext;
    const data = await this.inventoryService.getAdjustments(request.tenantContext);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Post("adjustments")
  async createAdjustment(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateAdjustmentDto,
  ) {
    const { tenant_id: tenant_id, user_id } = request.tenantContext;
    const data = await this.inventoryService.createAdjustment(
      request.tenantContext,
      dto,
      user_id,
    );
    await this.auditService.log({
      tenant_id: tenant_id,
      user_id: user_id || "system",
      module: "INVENTORY",
      action: "CREATE_ADJUSTMENT",
      entity_type: "ADJUSTMENT",
      entity_id: (data as any).id || "new",
      metadata: { delta: dto.requestedDelta, reason: dto.reason },
    });
    return { success: true, tenant_id, message: "Adjustment request submitted", data };
  }

  @Put("adjustments/:id/approve")
  @RequireInventoryRole(InventoryRole.MANAGER)
  async approveAdjustment(
    @Req() request: RequestWithTenant,
    @Param("id") adjustmentId: string,
    @Body() body: { approvedBy?: string },
  ) {
    const { tenant_id: tenant_id, user_id } = request.tenantContext;
    const data = await this.inventoryService.approveAdjustment(
      request.tenantContext,
      adjustmentId,
      body.approvedBy || user_id || "system",
    );
    await this.auditService.log({
      tenant_id: tenant_id,
      user_id: user_id || "system",
      module: "INVENTORY",
      action: "APPROVE_ADJUSTMENT",
      entity_type: "ADJUSTMENT",
      entity_id: adjustmentId,
    });
    return { success: true, tenant_id, message: "Adjustment approved", data };
  }

  // ─── Alerts ─────────────────────────────────────────────────────

  @Get("alerts")
  async getAlerts(@Req() request: RequestWithTenant) {
    const { tenant_id: tenant_id } = request.tenantContext;
    const data = await this.inventoryService.getAlerts(request.tenantContext);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Put("alerts/:id/status")
  async setAlertStatus(
    @Req() request: RequestWithTenant,
    @Param("id") alertId: string,
    @Body() body: { status: "open" | "acknowledged" | "resolved" },
  ) {
    const { tenant_id: tenant_id, user_id } = request.tenantContext;
    const data = await this.inventoryService.setAlertStatus(
      request.tenantContext,
      alertId,
      body.status,
    );
    await this.auditService.log({
      tenant_id: tenant_id,
      user_id: user_id || "system",
      module: "INVENTORY",
      action: "SET_ALERT_STATUS",
      entity_type: "ALERT",
      entity_id: alertId,
      metadata: { status: body.status },
    });
    return { success: true, tenant_id, data };
  }

  // ─── Audit Cycles ────────────────────────────────────────────────

  @Get("audit-cycles")
  async getAuditCycles(@Req() request: RequestWithTenant) {
    const { tenant_id: tenant_id } = request.tenantContext;
    const data = await this.inventoryService.getAuditCycles(request.tenantContext);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Post("audit-cycles")
  @RequireInventoryRole(InventoryRole.MANAGER)
  async createAuditCycle(
    @Req() request: RequestWithTenant,
    @Body() body: { locationCode: string; departmentCode?: string; scope: string },
  ) {
    const { tenant_id: tenant_id, user_id } = request.tenantContext;
    const data = await this.inventoryService.createAuditCycle(request.tenantContext, {
      ...body,
      createdBy: user_id || "system",
    });
    await this.auditService.log({
      tenant_id: tenant_id,
      user_id: user_id || "system",
      module: "INVENTORY",
      action: "START_AUDIT_CYCLE",
      entity_type: "AUDIT_CYCLE",
      entity_id: (data as any).id || "new",
      metadata: { locationCode: body.locationCode, scope: body.scope },
    });
    return {
      success: true,
      tenant_id,
      message: "Audit cycle started",
      data,
    };
  }

  @Post("audit/initiate")
  @RequireInventoryRole(InventoryRole.MANAGER)
  async initiateAudit(
    @Req() request: RequestWithTenant,
    @Body() body: { locationCode: string; departmentCode?: string; scope: string },
  ) {
    return this.createAuditCycle(request, body);
  }

  @Put("audit-cycles/:id")
  @RequireInventoryRole(InventoryRole.SUPERVISOR)
  async updateAuditCycle(
    @Req() request: RequestWithTenant,
    @Param("id") cycleId: string,
    @Body() body: { countedValue?: number; varianceValue?: number; status?: string; closedBy?: string },
  ) {
    const { tenant_id: tenant_id, user_id } = request.tenantContext;
    const data = await this.inventoryService.updateAuditCycle(request.tenantContext, cycleId, {
      ...body,
      closedBy: body.closedBy || user_id || "system",
    });
    await this.auditService.log({
      tenant_id: tenant_id,
      user_id: user_id || "system",
      module: "INVENTORY",
      action: "CLOSE_AUDIT_CYCLE",
      entity_type: "AUDIT_CYCLE",
      entity_id: cycleId,
      metadata: { status: body.status, variance: body.varianceValue },
    });
    return { success: true, tenant_id, message: "Audit cycle updated", data };
  }

  // ─── Integration Events ─────────────────────────────────────────

  @Get("integration-events")
  async getIntegrationEvents(@Req() request: RequestWithTenant) {
    const { tenant_id: tenant_id } = request.tenantContext;
    const data = await this.inventoryService.getIntegrationEvents(request.tenantContext);
    return { success: true, tenant_id, count: data.length, data };
  }

  // ─── Stock Scans ─────────────────────────────────────────────────

  @Post("scans/low-stock")
  @RequireInventoryRole(InventoryRole.SUPERVISOR)
  async runLowStockScan(@Req() request: RequestWithTenant) {
    const { tenant_id: tenant_id, user_id } = request.tenantContext;
    const result = await this.inventoryService.runLowStockScan(request.tenantContext);
    await this.auditService.log({
      tenant_id: tenant_id,
      user_id: user_id || "system",
      module: "INVENTORY",
      action: "LOW_STOCK_SCAN",
      entity_type: "SCAN",
      entity_id: "system",
      metadata: result,
    });
    return { success: true, tenant_id, data: result };
  }

  @Post("scans/expiry")
  @RequireInventoryRole(InventoryRole.SUPERVISOR)
  async runExpiryScan(@Req() request: RequestWithTenant) {
    const { tenant_id: tenant_id, user_id } = request.tenantContext;
    const result = await this.inventoryService.runExpiryScan(request.tenantContext);
    await this.auditService.log({
      tenant_id: tenant_id,
      user_id: user_id || "system",
      module: "INVENTORY",
      action: "EXPIRY_SCAN",
      entity_type: "SCAN",
      entity_id: "system",
      metadata: result,
    });
    return { success: true, tenant_id, data: result };
  }

  // ─── Batch Intake ────────────────────────────────────────────────

  @Post("batch-intake")
  async batchIntake(
    @Req() request: RequestWithTenant,
    @Body() body: { items: StockIntakeDto[] },
  ) {
    const { tenant_id: tenant_id, user_id } = request.tenantContext;
    const data = await this.inventoryService.batchIntakeStock(
      request.tenantContext,
      body.items || [],
      user_id,
    );
    return {
      success: true,
      tenant_id,
      message: `${data.length} items processed`,
      data,
    };
  }

  // ─── Procurement Request ────────────────────────────────────────

  @Post("procurement-request")
  async createProcurementRequest(
    @Req() request: RequestWithTenant,
    @Body() body: any,
  ) {
    const { tenant_id: tenant_id, user_id } = request.tenantContext;
    const data = await this.inventoryService.requestProcurement(request.tenantContext, {
      ...body,
      requesterId: user_id || body.requesterId,
    });
    await this.auditService.log({
      tenant_id: tenant_id,
      user_id: user_id || "system",
      module: "INVENTORY",
      action: "PROCUREMENT_REQUEST",
      entity_type: "REQUISITION",
      entity_id: (data as any)?.id || "new",
      metadata: { title: body.title, amount: body.amount },
    });
    return {
      success: true,
      tenant_id,
      message: "Procurement request submitted",
      data,
    };
  }
  // --- Agentic Layer ---

  @Get("agentic/events")
  async getAgenticEvents(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.inventoryService.getAgenticEvents(request.tenantContext);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Post("agentic/events")
  async createAgenticEvent(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateAgenticEventDto,
  ) {
    const { tenant_id } = request.tenantContext;
    const data = await this.inventoryService.createAgenticEvent(request.tenantContext, dto);
    return { success: true, tenant_id, data };
  }
}

