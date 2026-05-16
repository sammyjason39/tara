import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  UseInterceptors,
} from "@nestjs/common";
import { Request } from "express";
import { WarehouseService } from "./warehouse.service";
import { TenantContext } from "../../gateway/tenant-context.interface";
import { TenantInterceptor } from "../../gateway/tenant.interceptor";
import { ModuleStateGuard } from "../../core/auth/guards/module-state.guard";
import { RolesGuard } from "../../shared/guards/roles.guard";
import { RequiredModule } from "../../shared/decorators/required-module.decorator";

interface RequestWithTenant extends Request {
  tenantContext: TenantContext;
}

@Controller('warehouse')
@UseGuards(ModuleStateGuard, RolesGuard)
@UseInterceptors(TenantInterceptor)
@RequiredModule("inventory")
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Get("bins")
  async getBins(
    @Req() request: RequestWithTenant,
    @Query("locationId") locationId: string,
  ) {
    const ctx = request.tenantContext;
    const bins = await this.warehouseService.getBins(ctx, locationId);
    return { success: true, data: bins };
  }

  @Post("bins")
  async createBin(
    @Req() request: RequestWithTenant,
    @Query("locationId") locationId: string,
    @Body() data: any,
  ) {
    const ctx = request.tenantContext;
    const bin = await this.warehouseService.createBin(ctx, locationId, data);
    return { success: true, data: bin };
  }

  @Get("bins/:binId/stock")
  async getBinStock(
    @Req() request: RequestWithTenant,
    @Param("binId") binId: string,
  ) {
    const ctx = request.tenantContext;
    const stock = await this.warehouseService.getBinStock(ctx, binId);
    return { success: true, data: stock };
  }

  @Post("bins/:binId/assign")
  async assignStock(
    @Req() request: RequestWithTenant,
    @Param("binId") binId: string,
    @Body() data: { product_id: string; quantity: number },
  ) {
    const ctx = request.tenantContext;
    const assignment = await this.warehouseService.assignStock(
      ctx,
      binId,
      data,
    );
    return { success: true, data: assignment };
  }
}
