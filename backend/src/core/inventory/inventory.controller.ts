import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { TenantContext } from '../../gateway/tenant-context.interface';
import { TenantInterceptor } from '../../gateway/tenant.interceptor';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { StockIntakeDto } from './dto/stock-intake.dto';
import { TransferStockDto } from './dto/transfer-stock.dto';
import { InventoryService } from './inventory.service';

interface RequestWithTenant extends Request {
  tenantContext: TenantContext;
}

@Controller('inventory')
@UseInterceptors(TenantInterceptor)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('dashboard')
  async getDashboard(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      data: await this.inventoryService.getDashboard(tenantId),
    };
  }

  @Get('items')
  async getItems(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.inventoryService.getItems(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post('items')
  async createItem(@Req() request: RequestWithTenant, @Body() dto: CreateItemDto) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: 'Inventory item created',
      data: await this.inventoryService.createItem(tenantId, dto),
    };
  }

  @Get('balances')
  async getBalances(
    @Req() request: RequestWithTenant,
    @Query('locationId') locationId?: string,
  ) {
    const { tenantId } = request.tenantContext;
    const data = await this.inventoryService.getBalances(tenantId, locationId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Get('movements')
  async getMovements(@Req() request: RequestWithTenant, @Query('itemId') itemId?: string) {
    const { tenantId } = request.tenantContext;
    const data = await this.inventoryService.getMovements(tenantId, itemId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post('intake')
  async intakeStock(@Req() request: RequestWithTenant, @Body() dto: StockIntakeDto) {
    const { tenantId, locationId } = request.tenantContext;
    if (locationId && !dto.locationId) dto.locationId = locationId;
    return {
      success: true,
      tenantId,
      message: 'Stock intake recorded',
      data: await this.inventoryService.intakeStock(tenantId, dto),
    };
  }

  @Post('transfer')
  async transferStock(@Req() request: RequestWithTenant, @Body() dto: TransferStockDto) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: 'Stock transfer recorded',
      data: await this.inventoryService.transferStock(tenantId, dto),
    };
  }

  @Get('adjustments')
  async getAdjustments(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.inventoryService.getAdjustments(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post('adjustments')
  async createAdjustment(@Req() request: RequestWithTenant, @Body() dto: CreateAdjustmentDto) {
    const { tenantId, locationId } = request.tenantContext;
    if (locationId && !dto.locationId) dto.locationId = locationId;
    return {
      success: true,
      tenantId,
      message: 'Stock adjustment request created',
      data: await this.inventoryService.createAdjustment(tenantId, dto),
    };
  }

  @Put('adjustments/:id/approve')
  async approveAdjustment(
    @Req() request: RequestWithTenant,
    @Param('id') adjustmentId: string,
    @Body() body: { approvedBy: string },
  ) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: 'Stock adjustment approved',
      data: await this.inventoryService.approveAdjustment(
        tenantId,
        adjustmentId,
        body.approvedBy || 'system',
      ),
    };
  }

  @Get('alerts')
  async getAlerts(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.inventoryService.getAlerts(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Put('alerts/:id/status')
  async setAlertStatus(
    @Req() request: RequestWithTenant,
    @Param('id') alertId: string,
    @Body() body: { status: 'open' | 'acknowledged' | 'resolved' },
  ) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: 'Alert status updated',
      data: await this.inventoryService.setAlertStatus(tenantId, alertId, body.status),
    };
  }
}

