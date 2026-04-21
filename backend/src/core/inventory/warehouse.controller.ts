import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import { Request } from "express";
import { WarehouseService } from "./warehouse.service";
import { TenantContext } from "../../gateway/tenant-context.interface";
import { ModuleStateGuard } from "../auth/guards/module-state.guard";
import { RolesGuard } from "../../shared/guards/roles.guard";
import { RequiredModule } from "../../shared/decorators/required-module.decorator";

interface RequestWithTenant extends Request {
  tenantContext: TenantContext;
}

@Controller("v1/warehouse")
@UseGuards(ModuleStateGuard, RolesGuard)
@RequiredModule("inventory")
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Get("bins")
  async getBins(
    @Req() request: RequestWithTenant,
    @Query("locationId") locationId: string,
  ) {
    const { tenant_id } = request.tenantContext;
    const bins = await this.warehouseService.getBins(tenant_id, locationId);
    return { success: true, data: bins };
  }

  @Post("bins")
  async createBin(
    @Req() request: RequestWithTenant,
    @Query("locationId") locationId: string,
    @Body() data: any,
  ) {
    const { tenant_id } = request.tenantContext;
    const bin = await this.warehouseService.createBin(tenant_id, locationId, data);
    return { success: true, data: bin };
  }

  @Get("bins/:binId/stock")
  async getBinStock(
    @Req() request: RequestWithTenant,
    @Param("binId") binId: string,
  ) {
    const { tenant_id } = request.tenantContext;
    const stock = await this.warehouseService.getBinStock(tenant_id, binId);
    return { success: true, data: stock };
  }

  @Post("bins/:binId/assign")
  async assignStock(
    @Req() request: RequestWithTenant,
    @Param("binId") binId: string,
    @Body() data: { product_id: string; quantity: number },
  ) {
    const { tenant_id } = request.tenantContext;
    const assignment = await this.warehouseService.assignStock(
      tenant_id,
      binId,
      data,
    );
    return { success: true, data: assignment };
  }
}

