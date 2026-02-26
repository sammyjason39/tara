import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Put,
  Delete,
  UseInterceptors,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { Request } from "express";
import { RetailService } from "./retail.service";
import {
  CreateStoreDto,
  UpdateStoreDto,
  CreateOrderDto,
  OpenShiftDto,
  CloseShiftDto,
  CreateEcommerceStoreDto,
  UpdateEcommerceStoreDto,
  CreateInventoryPoolDto,
  LinkBranchDto,
} from "./dto/retail.dto";
import { TenantContext } from "../../gateway/tenant-context.interface";
import { ModuleStateGuard } from "../auth/guards/module-state.guard";
import {
  BranchGatingGuard,
  SkipBranchCheck,
} from "../auth/guards/branch-gating.guard";
import { LocationGuard } from "../../shared/guards/location.guard";
import { RequiredModule } from "../../shared/decorators/required-module.decorator";

interface RequestWithTenant extends Request {
  tenantContext: TenantContext;
}

@Controller("retail")
@UseGuards(ModuleStateGuard, LocationGuard, BranchGatingGuard)
@RequiredModule("retail")
export class RetailController {
  constructor(private readonly retailService: RetailService) {}

  private respond<T>(tenantId: string, payload: T) {
    return {
      success: true,
      tenantId,
      data: payload,
    };
  }

  private toIso(value?: Date | string | null) {
    if (!value) return undefined;
    return value instanceof Date ? value.toISOString() : value;
  }

  private mapChannel(channel: any) {
    return {
      id: channel.id,
      tenantId: channel.tenantId ?? channel.tenant_id ?? channel.tenantId,
      branchId: channel.branchId ?? channel.branch_id,
      name: channel.name,
      type: channel.type,
      status: channel.status,
      syncFrequency: channel.syncFrequency ?? channel.sync_frequency,
      lastSync: this.toIso(channel.lastSync ?? channel.last_sync_at),
      channelId: channel.channelId ?? channel.clientId,
      clientId: channel.clientId ?? channel.channelId,
      clientSecret: channel.clientSecret,
      gatewayUrl: channel.gatewayUrl,
      connector: channel.connector,
      createdAt: this.toIso(channel.createdAt ?? channel.created_at),
      updatedAt: this.toIso(channel.updatedAt ?? channel.updated_at),
    };
  }

  @Get("stores")
  async listStores(@Req() request: RequestWithTenant) {
    const { tenantId, locationId } = request.tenantContext;
    const stores = await this.retailService.listStores(tenantId, locationId!);
    return this.respond(tenantId, stores);
  }

  @Post("stores")
  @SkipBranchCheck()
  async createStore(
    @Req() request: RequestWithTenant,
    @Body() data: CreateStoreDto,
  ) {
    const { tenantId, userId } = request.tenantContext;
    const store = await this.retailService.createStore(tenantId, data, userId!);
    return this.respond(tenantId, store);
  }

  @Put("stores/:id")
  async updateStore(
    @Req() request: RequestWithTenant,
    @Param("id") storeId: string,
    @Body() data: UpdateStoreDto,
  ) {
    const { tenantId, userId } = request.tenantContext;
    const store = await this.retailService.updateStore(
      tenantId,
      storeId,
      data,
      userId!,
    );
    return this.respond(tenantId, store);
  }

  @Delete("stores/:id")
  @HttpCode(HttpStatus.OK)
  async deleteStore(
    @Req() request: RequestWithTenant,
    @Param("id") storeId: string,
  ) {
    const { tenantId, userId } = request.tenantContext;
    await this.retailService.deleteStore(tenantId, storeId, userId!);
    return this.respond(tenantId, {
      message: "Store decommissioned successfully",
    });
  }

  // ============================================================
  // INVENTORY POOLS
  // ============================================================

  @Get("inventory-pools")
  async listInventoryPools(@Req() request: RequestWithTenant) {
    const { tenantId, role, locationId } = request.tenantContext;

    // In a multi-site retail setup, we might want to restrict pools.
    // Usually pools are shared, but if we need isolation:
    const pools = await this.retailService.listInventoryPools(tenantId);
    return this.respond(tenantId, pools);
  }

  @Post("inventory-pools")
  async createInventoryPool(
    @Req() request: RequestWithTenant,
    @Body() data: CreateInventoryPoolDto,
  ) {
    const { tenantId } = request.tenantContext;
    const pool = await this.retailService.createInventoryPool(tenantId, data);
    return this.respond(tenantId, pool);
  }

  @Get("inventory-pools/:id")
  async getInventoryPool(
    @Req() request: RequestWithTenant,
    @Param("id") poolId: string,
  ) {
    const { tenantId } = request.tenantContext;
    const pool = await this.retailService.getInventoryPool(tenantId, poolId);
    return this.respond(tenantId, pool);
  }

  @Delete("inventory-pools/:id")
  @HttpCode(HttpStatus.OK)
  async deleteInventoryPool(
    @Req() request: RequestWithTenant,
    @Param("id") poolId: string,
  ) {
    const { tenantId } = request.tenantContext;
    await this.retailService.deleteInventoryPool(tenantId, poolId);
    return this.respond(tenantId, { message: "Pool deleted" });
  }

  // ============================================================
  // E-COMMERCE STORES
  // ============================================================

  @Get("ecommerce-stores")
  async listEcommerceStores(@Req() request: RequestWithTenant) {
    const { tenantId, locationId } = request.tenantContext;
    const stores = await this.retailService.listEcommerceStores(
      tenantId,
      locationId!,
    );
    return this.respond(tenantId, stores);
  }

  @Post("ecommerce-stores")
  async createEcommerceStore(
    @Req() request: RequestWithTenant,
    @Body() data: CreateEcommerceStoreDto,
  ) {
    const { tenantId } = request.tenantContext;
    const store = await this.retailService.createEcommerceStore(tenantId, data);
    return this.respond(tenantId, store);
  }

  @Get("ecommerce-stores/:id")
  async getEcommerceStore(
    @Req() request: RequestWithTenant,
    @Param("id") storeId: string,
  ) {
    const { tenantId } = request.tenantContext;
    const store = await this.retailService.getEcommerceStore(tenantId, storeId);
    return this.respond(tenantId, store);
  }

  @Put("ecommerce-stores/:id")
  async updateEcommerceStore(
    @Req() request: RequestWithTenant,
    @Param("id") storeId: string,
    @Body() data: UpdateEcommerceStoreDto,
  ) {
    const { tenantId } = request.tenantContext;
    const store = await this.retailService.updateEcommerceStore(
      tenantId,
      storeId,
      data,
    );
    return this.respond(tenantId, store);
  }

  @Delete("ecommerce-stores/:id")
  @HttpCode(HttpStatus.OK)
  async deleteEcommerceStore(
    @Req() request: RequestWithTenant,
    @Param("id") storeId: string,
  ) {
    const { tenantId } = request.tenantContext;
    await this.retailService.deleteEcommerceStore(tenantId, storeId);
    return this.respond(tenantId, { message: "E-commerce store removed" });
  }

  @Post("ecommerce-stores/:id/link-branch")
  async linkEcommerceToBranch(
    @Req() request: RequestWithTenant,
    @Param("id") ecommerceId: string,
    @Body() data: LinkBranchDto,
  ) {
    const { tenantId } = request.tenantContext;
    await this.retailService.linkEcommerceToBranch(
      tenantId,
      ecommerceId,
      data.branchId,
    );
    return this.respond(tenantId, { message: "Branch linked successfully" });
  }

  @Delete("ecommerce-stores/:id/unlink-branch/:branchId")
  @HttpCode(HttpStatus.OK)
  async unlinkEcommerceFromBranch(
    @Req() request: RequestWithTenant,
    @Param("id") ecommerceId: string,
    @Param("branchId") branchId: string,
  ) {
    const { tenantId } = request.tenantContext;
    await this.retailService.unlinkEcommerceFromBranch(
      tenantId,
      ecommerceId,
      branchId,
    );
    return this.respond(tenantId, { message: "Branch unlinked successfully" });
  }

  @Get("products")
  async listProducts(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const products = await this.retailService.listProducts(tenantId);
    return this.respond(tenantId, products);
  }

  @Get("orders")
  async listOrders(
    @Req() request: RequestWithTenant,
    @Query("store_id") storeId?: string,
  ) {
    const { tenantId, role, locationId } = request.tenantContext;

    const effectiveStoreId =
      role === "SUPERADMIN" || role === "OWNER" || role === "ADMIN"
        ? storeId
        : locationId;

    const orders = await this.retailService.listOrders(
      tenantId,
      effectiveStoreId,
    );
    return this.respond(tenantId, orders);
  }

  @Post("orders")
  async createOrder(
    @Req() request: RequestWithTenant,
    @Body() data: CreateOrderDto,
  ) {
    const { tenantId, locationId, userId } = request.tenantContext;
    const order = await this.retailService.createOrder(
      tenantId,
      locationId!,
      data,
      userId!,
    );
    return this.respond(tenantId, order);
  }

  @Get("shifts/active")
  async getActiveShift(
    @Req() request: RequestWithTenant,
    @Query("store_id") storeId: string,
  ) {
    const { tenantId, role, locationId, userId } = request.tenantContext;

    const effectiveStoreId =
      role === "SUPERADMIN" || role === "OWNER" || role === "ADMIN"
        ? storeId
        : locationId;

    const shift = await this.retailService.getActiveShift(
      tenantId,
      effectiveStoreId!,
      userId!,
    );
    return this.respond(tenantId, shift);
  }

  @Post("shifts/open")
  async openShift(
    @Req() request: RequestWithTenant,
    @Body() data: OpenShiftDto,
  ) {
    const { tenantId, locationId, userId } = request.tenantContext;

    const shift = await this.retailService.openShift(
      tenantId,
      locationId!,
      userId!,
      data,
    );
    return this.respond(tenantId, shift);
  }

  @Put("shifts/:id/close")
  async closeShift(
    @Req() request: RequestWithTenant,
    @Param("id") shiftId: string,
    @Body() data: CloseShiftDto,
  ) {
    const { tenantId } = request.tenantContext;
    const shift = await this.retailService.closeShift(tenantId, shiftId, data);
    return this.respond(tenantId, shift);
  }

  @Get("shifts")
  async listShifts(@Req() request: RequestWithTenant) {
    const { tenantId, locationId } = request.tenantContext;
    const shifts = await this.retailService.listShifts(tenantId, locationId!);
    return this.respond(tenantId, shifts);
  }

  @Get("promotions")
  async listPromotions(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const promos = await this.retailService.listPromotions(tenantId);
    return this.respond(tenantId, promos);
  }

  @Put("promotions/:id")
  async updatePromotion(
    @Req() request: RequestWithTenant,
    @Param("id") promotionId: string,
    @Body() data: any,
  ) {
    const { tenantId } = request.tenantContext;
    const promo = await this.retailService.updatePromotion(
      tenantId,
      promotionId,
      data,
    );
    return this.respond(tenantId, promo);
  }

  @Get("channels")
  async listChannels(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const channels = await this.retailService.listChannels(tenantId);
    return this.respond(
      tenantId,
      channels.map((channel) => this.mapChannel(channel)),
    );
  }

  @Post("channels")
  async createChannel(@Req() request: RequestWithTenant, @Body() data: any) {
    const { tenantId } = request.tenantContext;
    const channel = await this.retailService.createChannel(tenantId, data);
    return this.respond(tenantId, this.mapChannel(channel));
  }

  @Put("channels/:id")
  async updateChannel(
    @Req() request: RequestWithTenant,
    @Param("id") channelId: string,
    @Body() data: any,
  ) {
    const { tenantId } = request.tenantContext;
    const channel = await this.retailService.updateChannel(
      tenantId,
      channelId,
      data,
    );
    return this.respond(tenantId, this.mapChannel(channel));
  }

  @Delete("channels/:id")
  async deleteChannel(
    @Req() request: RequestWithTenant,
    @Param("id") channelId: string,
  ) {
    const { tenantId } = request.tenantContext;
    const result = await this.retailService.deleteChannel(tenantId, channelId);
    return this.respond(tenantId, result);
  }

  @Post("channels/:id/sync")
  async syncChannel(
    @Req() request: RequestWithTenant,
    @Param("id") channelId: string,
  ) {
    const { tenantId } = request.tenantContext;
    const result = await this.retailService.syncChannel(tenantId, channelId);
    return this.respond(tenantId, result);
  }

  @Post("channels/:id/rotate-credentials")
  async rotateChannelCredentials(
    @Req() request: RequestWithTenant,
    @Param("id") channelId: string,
  ) {
    const { tenantId } = request.tenantContext;
    const creds = await this.retailService.rotateChannelCredentials(
      tenantId,
      channelId,
    );
    return this.respond(tenantId, creds);
  }

  @Post("channels/:id/revoke-credentials")
  async revokeChannelCredentials(
    @Req() request: RequestWithTenant,
    @Param("id") channelId: string,
  ) {
    const { tenantId } = request.tenantContext;
    const result = await this.retailService.revokeChannelCredentials(
      tenantId,
      channelId,
    );
    return this.respond(tenantId, result);
  }

  @Get("devices")
  async listDevices(
    @Req() request: RequestWithTenant,
    @Query("store_id") storeId?: string,
  ) {
    const { tenantId, role, locationId } = request.tenantContext;

    const effectiveStoreId =
      role === "SUPERADMIN" || role === "OWNER" || role === "ADMIN"
        ? storeId
        : locationId;

    const devices = await this.retailService.listDevices(
      tenantId,
      effectiveStoreId,
    );
    return this.respond(tenantId, devices);
  }

  @Post("devices/:id/ping")
  async pingDevice(
    @Req() request: RequestWithTenant,
    @Param("id") deviceId: string,
  ) {
    const { tenantId } = request.tenantContext;
    const result = await this.retailService.pingDevice(tenantId, deviceId);
    return this.respond(tenantId, result);
  }

  @Post("orders/:id/payment")
  async processPayment(
    @Req() request: RequestWithTenant,
    @Param("id") orderId: string,
    @Body() data: { amount: number; method: string; shiftId?: string },
  ) {
    const { tenantId } = request.tenantContext;
    const payment = await this.retailService.processPayment(
      tenantId,
      orderId,
      data,
    );
    return this.respond(tenantId, payment);
  }

  @Post("orders/:id/return")
  async processReturn(
    @Req() request: RequestWithTenant,
    @Param("id") orderId: string,
    @Body() data: { itemIds: string[]; shiftId?: string },
  ) {
    const { tenantId } = request.tenantContext;
    const result = await this.retailService.processReturn(
      tenantId,
      orderId,
      data,
    );
    return this.respond(tenantId, result);
  }

  @Post("inventory/opname")
  async submitOpname(
    @Req() request: RequestWithTenant,
    @Body() data: { storeId: string; adjustments: any[]; shiftId?: string },
  ) {
    const { tenantId, role, locationId } = request.tenantContext;

    // Enforce locationId for non-admins
    if (role !== "SUPERADMIN" && role !== "OWNER" && role !== "ADMIN") {
      data.storeId = locationId!;
    }

    const result = await this.retailService.submitOpname(tenantId, data);
    return this.respond(tenantId, result);
  }

  @Post("inventory/receive")
  async receiveGoods(
    @Req() request: RequestWithTenant,
    @Body()
    data: {
      storeId: string;
      shipmentId: string;
      items: any[];
      shiftId?: string;
    },
  ) {
    const { tenantId, role, locationId } = request.tenantContext;

    // Enforce locationId for non-admins
    if (role !== "SUPERADMIN" && role !== "OWNER" && role !== "ADMIN") {
      data.storeId = locationId!;
    }

    const result = await this.retailService.receiveGoods(tenantId, data);
    return this.respond(tenantId, result);
  }
}
