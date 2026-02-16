import { Controller, Get, Post, Body, Headers, Query, Param, Put, UseInterceptors, Req } from '@nestjs/common';
import { Request } from 'express';
import { RetailService } from './retail.service';
import { CreateStoreDto, CreateOrderDto, OpenShiftDto, CloseShiftDto } from './dto/retail.dto';
import { TenantInterceptor } from '../../gateway/tenant.interceptor';
import { TenantContext } from '../../gateway/tenant-context.interface';

interface RequestWithTenant extends Request {
  tenantContext: TenantContext;
}

@Controller('retail')
@UseInterceptors(TenantInterceptor)
export class RetailController {
  constructor(private readonly retailService: RetailService) {}

  @Get('stores')
  async listStores(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    return this.retailService.listStores(tenantId);
  }

  @Post('stores')
  async createStore(
    @Req() request: RequestWithTenant,
    @Body() data: CreateStoreDto,
  ) {
    const { tenantId, locationId } = request.tenantContext;
    return this.retailService.createStore(tenantId, locationId!, data);
  }

  @Get('products')
  async listProducts(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    return this.retailService.listProducts(tenantId);
  }

  @Get('orders')
  async listOrders(
    @Req() request: RequestWithTenant,
    @Query('store_id') storeId?: string,
  ) {
    const { tenantId } = request.tenantContext;
    return this.retailService.listOrders(tenantId, storeId);
  }

  @Post('orders')
  async createOrder(
    @Req() request: RequestWithTenant,
    @Body() data: CreateOrderDto,
  ) {
    const { tenantId, locationId } = request.tenantContext;
    return this.retailService.createOrder(tenantId, locationId!, data);
  }

  @Get('shifts/active')
  async getActiveShift(
    @Req() request: RequestWithTenant,
    @Query('store_id') storeId: string,
  ) {
    const { tenantId } = request.tenantContext;
    const employeeId = 'user-1'; // Mock or get from context if available
    return this.retailService.getActiveShift(tenantId, storeId, employeeId);
  }

  @Post('shifts/open')
  async openShift(
    @Req() request: RequestWithTenant,
    @Body() data: OpenShiftDto,
  ) {
    const { tenantId, locationId } = request.tenantContext;
    const employeeId = 'user-1'; // Mock
    return this.retailService.openShift(tenantId, locationId!, employeeId, data);
  }

  @Put('shifts/:id/close')
  async closeShift(
    @Req() request: RequestWithTenant,
    @Param('id') shiftId: string,
    @Body() data: CloseShiftDto,
  ) {
    const { tenantId } = request.tenantContext;
    return this.retailService.closeShift(tenantId, shiftId, data);
  }
}
