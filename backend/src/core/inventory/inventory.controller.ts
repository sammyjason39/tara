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
import { ModuleStateGuard } from "../auth/guards/module-state.guard";
import { BranchGatingGuard } from "../auth/guards/branch-gating.guard";
import { RequiredModule } from "../../shared/decorators/required-module.decorator";
import { CreateAdjustmentDto } from "./dto/create-adjustment.dto";
import { CreateItemDto } from "./dto/create-item.dto";
import { StockIntakeDto } from "./dto/stock-intake.dto";
import { TransferStockDto } from "./dto/transfer-stock.dto";
import { ImportItemDto } from "./dto/import-item.dto";
import { InventoryService } from "./inventory.service";
import { FileProcessingService } from "../../shared/file-processing/file-processing.service";
import { AuditService } from "../../shared/audit/audit.service";
import { v4 as uuidv4 } from "uuid";

interface RequestWithTenant extends Request {
  tenantContext: TenantContext;
}

@Controller("inventory")
@UseGuards(ModuleStateGuard, BranchGatingGuard)
@RequiredModule("inventory")
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly fileProcessingService: FileProcessingService,
    private readonly auditService: AuditService,
  ) {}

  @Get("dashboard")
  async getDashboard(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      data: await this.inventoryService.getDashboard(tenantId),
    };
  }

  @Get("items")
  async getItems(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.inventoryService.getItems(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post("items")
  async createItem(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateItemDto,
  ) {
    const { tenantId, userId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Inventory item created",
      data: await this.inventoryService.createItem(tenantId, dto, userId),
    };
  }

  @Post("items/batch-delete")
  async batchDeleteItems(
    @Req() request: RequestWithTenant,
    @Body() body: { itemIds: string[] },
  ) {
    const { tenantId, userId } = request.tenantContext;
    await this.inventoryService.batchDeleteItems(
      tenantId,
      body.itemIds,
      userId,
    );
    return {
      success: true,
      tenantId,
      message: "Batch delete successful",
    };
  }

  @Delete("items/:id")
  async deleteItem(
    @Req() request: RequestWithTenant,
    @Param("id") itemId: string,
  ) {
    const { tenantId, userId } = request.tenantContext;
    await this.inventoryService.deleteItem(tenantId, itemId, userId);
    return {
      success: true,
      tenantId,
      message: "Inventory item deleted",
    };
  }

  @Post("items/import")
  @UseInterceptors(FileInterceptor("file"))
  async importItems(
    @Req() request: RequestWithTenant,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const { tenantId, userId } = request.tenantContext;
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
      tenantId,
      result.data,
      userId,
    );

    await this.auditService.log({
      tenantId,
      userId: request.tenantContext.userId || "system",
      module: "INVENTORY",
      action: "IMPORT",
      entityType: "ITEM",
      entityId: "BATCH",
      metadata: {
        filename: file.originalname,
        count: imported.length,
        traceId: uuidv4(),
      },
    });

    return {
      success: true,
      tenantId,
      message: `${imported.length} items imported successfully`,
      data: imported,
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
    const { tenantId, userId } = request.tenantContext;
    const items = await this.inventoryService.getItems(tenantId);

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
      tenantId,
      userId: request.tenantContext.userId || "system",
      module: "INVENTORY",
      action: "EXPORT",
      entityType: "ITEM",
      entityId: "BATCH",
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
      `attachment; filename=inventory_export_${tenantId}.xlsx`,
    );
    res.send(buffer);
  }

  @Get("balances")
  async getBalances(
    @Req() request: RequestWithTenant,
    @Query("locationId") locationId?: string,
    @Query("departmentId") departmentId?: string,
  ) {
    const { tenantId } = request.tenantContext;
    const data = await this.inventoryService.getBalances(
      tenantId,
      locationId,
      departmentId,
    );
    return { success: true, tenantId, count: data.length, data };
  }

  @Get("movements")
  async getMovements(
    @Req() request: RequestWithTenant,
    @Query("itemId") itemId?: string,
  ) {
    const { tenantId } = request.tenantContext;
    const data = await this.inventoryService.getMovements(tenantId, itemId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post("intake")
  async intakeStock(
    @Req() request: RequestWithTenant,
    @Body() dto: StockIntakeDto,
  ) {
    const { tenantId, locationId, userId } = request.tenantContext;
    if (locationId && !dto.locationId) dto.locationId = locationId;
    return {
      success: true,
      tenantId,
      message: "Stock intake recorded",
      data: await this.inventoryService.intakeStock(tenantId, dto, userId),
    };
  }

  @Post("batch-intake")
  async batchIntakeStock(
    @Req() request: RequestWithTenant,
    @Body() body: { items: StockIntakeDto[] },
  ) {
    const { tenantId, userId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Batch stock intake recorded",
      data: await this.inventoryService.batchIntakeStock(
        tenantId,
        body.items,
        userId,
      ),
    };
  }

  @Post("transfer")
  async transferStock(
    @Req() request: RequestWithTenant,
    @Body() dto: TransferStockDto,
  ) {
    const { tenantId, userId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Stock transfer recorded",
      data: await this.inventoryService.transferStock(tenantId, dto, userId),
    };
  }

  @Get("adjustments")
  async getAdjustments(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.inventoryService.getAdjustments(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post("adjustments")
  async createAdjustment(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateAdjustmentDto,
  ) {
    const { tenantId, locationId, userId } = request.tenantContext;
    if (locationId && !dto.locationId) dto.locationId = locationId;
    return {
      success: true,
      tenantId,
      message: "Stock adjustment request created",
      data: await this.inventoryService.createAdjustment(tenantId, dto, userId),
    };
  }

  @Put("adjustments/:id/approve")
  async approveAdjustment(
    @Req() request: RequestWithTenant,
    @Param("id") adjustmentId: string,
    @Body() body: { approvedBy: string },
  ) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Stock adjustment approved",
      data: await this.inventoryService.approveAdjustment(
        tenantId,
        adjustmentId,
        body.approvedBy || "system",
      ),
    };
  }

  @Get("alerts")
  async getAlerts(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.inventoryService.getAlerts(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Put("alerts/:id/status")
  async setAlertStatus(
    @Req() request: RequestWithTenant,
    @Param("id") alertId: string,
    @Body() body: { status: "open" | "acknowledged" | "resolved" },
  ) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Alert status updated",
      data: await this.inventoryService.setAlertStatus(
        tenantId,
        alertId,
        body.status,
      ),
    };
  }

  @Get("audit-cycles")
  async getAuditCycles(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.inventoryService.getAuditCycles(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post("audit-cycles")
  async createAuditCycle(@Req() request: RequestWithTenant, @Body() body: any) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Audit cycle started",
      data: await this.inventoryService.createAuditCycle(tenantId, body),
    };
  }

  @Put("audit-cycles/:id")
  async updateAuditCycle(
    @Req() request: RequestWithTenant,
    @Param("id") id: string,
    @Body() body: any,
  ) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Audit cycle updated",
      data: await this.inventoryService.updateAuditCycle(tenantId, id, body),
    };
  }

  @Get("integration-events")
  async getIntegrationEvents(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.inventoryService.getIntegrationEvents(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post("scans/low-stock")
  async runLowStockScan(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Low stock scan completed",
      data: await this.inventoryService.runLowStockScan(tenantId),
    };
  }

  @Post("scans/expiry")
  async runExpiryScan(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Expiry scan completed",
      data: await this.inventoryService.runExpiryScan(tenantId),
    };
  }

  @Post("consume")
  async consumeStock(@Req() request: RequestWithTenant, @Body() dto: any) {
    const { tenantId, locationId } = request.tenantContext;
    if (locationId && !dto.locationId) dto.locationId = locationId;
    return {
      success: true,
      tenantId,
      message: "Stock consumption recorded",
      data: await this.inventoryService.consumeStock(tenantId, dto),
    };
  }

  @Post("procurement-request")
  async requestProcurement(
    @Req() request: RequestWithTenant,
    @Body() body: any,
  ) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Procurement request created",
      data: await this.inventoryService.requestProcurement(tenantId, body),
    };
  }
}
