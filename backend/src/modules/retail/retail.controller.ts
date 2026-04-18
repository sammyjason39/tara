import { RetailExportService } from './retail-export.service';
import { Prisma } from "@prisma/client";
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
  Patch,
} from "@nestjs/common";
import { Request } from "express";
import { RetailService } from "./retail.service";
import { RetailSeeder } from "./seeders/retail.seeder";
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
  UpdateProductDto,
  RegisterBranchDeviceDto,
  RegisterCCTVCameraDto,
  RegisterBranchSensorDto,
} from "./dto/retail.dto";
import { TenantContext } from "../../gateway/tenant-context.interface";
import { ModuleStateGuard } from "../../core/auth/guards/module-state.guard";
import {
  BranchGatingGuard,
  SkipBranchCheck,
} from "../../core/auth/guards/branch-gating.guard";
import { LocationGuard } from "../../shared/guards/location.guard";
import { RequiredModule } from "../../shared/decorators/required-module.decorator";

interface RequestWithTenant extends Request {
  tenantContext: TenantContext;
}

@Controller("v1/retail")
@UseGuards(ModuleStateGuard, LocationGuard, BranchGatingGuard)
@RequiredModule("retail")
export class RetailController {
  constructor(
    private readonly retailService: RetailService,
    private readonly retailExport: RetailExportService,
    private readonly retailSeeder: RetailSeeder,
  ) {}

  /** DEV ONLY: Trigger full retail seed (products + showcase orders) */
  @Post("dev/seed")
  @SkipBranchCheck()
  @HttpCode(HttpStatus.OK)
  async triggerSeed() {
    await this.retailSeeder.seed();
    return { success: true, message: "Retail seed completed" };
  }

  @Get("inventory/stats")
  async getInventoryStats(
    @Req() request: RequestWithTenant,
    @Query("category_id") category_id?: string,
    @Query("q") q?: string,
  ) {
    const { tenant_id } = request.tenantContext;
    const stats = await this.retailService.getInventoryStats(tenant_id, {
      category_id,
      q,
    });
    return this.respond(tenant_id, stats);
  }

  private respond<T>(tenant_id: string, payload: T) {
    return {
      success: true,
      tenant_id,
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
      tenant_id: channel.tenant_id ?? channel.tenant_id ?? channel.tenant_id,
      branch_id: channel.branch_id ?? channel.branch_id,
      name: channel.name,
      type: channel.type,
      status: channel.status,
      syncFrequency: channel.syncFrequency ?? channel.sync_frequency,
      lastSync: this.toIso(channel.lastSync ?? channel.last_sync_at),
      channel_id: channel.channel_id ?? channel.clientId,
      clientId: channel.clientId ?? channel.channel_id,
      clientSecret: channel.clientSecret,
      gatewayUrl: channel.gatewayUrl,
      connector: channel.connector,
      created_at: this.toIso(channel.created_at ?? channel.created_at),
      updated_at: this.toIso(channel.updated_at ?? channel.updated_at),
    };
  }

  @Get("stores")
  async listStores(@Req() request: RequestWithTenant) {
    const { tenant_id, location_id, role } = request.tenantContext;

    // For Global Fleet View / Management, privileged roles should see all stores.
    // Managers/Staff remain scoped to their assigned location.
    const isPrivileged = ["SUPERADMIN", "OWNER", "ADMIN"].includes(role || "");
    const effectivelocation_id = isPrivileged ? undefined : location_id;

    const stores = await this.retailService.listStores(
      tenant_id,
      effectivelocation_id,
    );
    return this.respond(tenant_id, stores);
  }

  @Get("categories")
  async listCategories(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const categories = await this.retailService.listCategories(tenant_id);
    return this.respond(tenant_id, categories);
  }

  @Post("stores")
  @SkipBranchCheck()
  async createStore(
    @Req() request: RequestWithTenant,
    @Body() data: CreateStoreDto,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    const store = await this.retailService.createStore(tenant_id, data, user_id!);
    return this.respond(tenant_id, store);
  }

  @Put("stores/:id")
  async updateStore(
    @Req() request: RequestWithTenant,
    @Param("id") store_id: string,
    @Body() data: UpdateStoreDto,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    console.log(
      `[RetailController] Updating store ${store_id} for tenant ${tenant_id}. Data:`,
      JSON.stringify(data, null, 2),
    );
    const store = await this.retailService.updateStore(
      tenant_id,
      store_id,
      data,
      user_id!,
    );
    return this.respond(tenant_id, store);
  }

  @Delete("stores/:id")
  @HttpCode(HttpStatus.OK)
  async deleteStore(
    @Req() request: RequestWithTenant,
    @Param("id") store_id: string,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    await this.retailService.deleteStore(tenant_id, store_id, user_id!);
    return this.respond(tenant_id, {
      message: "Store decommissioned successfully",
    });
  }

  // ============================================================
  // INVENTORY POOLS
  // ============================================================

  @Get("inventory-pools")
  async listInventoryPools(@Req() request: RequestWithTenant) {
    const { tenant_id, role, location_id } = request.tenantContext;

    // In a multi-site retail setup, we might want to restrict pools.
    // Usually pools are shared, but if we need isolation:
    const pools = await this.retailService.listInventoryPools(tenant_id);
    return this.respond(tenant_id, pools);
  }

  @Post("inventory-pools")
  async createInventoryPool(
    @Req() request: RequestWithTenant,
    @Body() data: CreateInventoryPoolDto,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    const pool = await this.retailService.createInventoryPool(
      tenant_id,
      data,
      user_id!,
    );
    return this.respond(tenant_id, pool);
  }

  @Get("inventory-pools/:id")
  async getInventoryPool(
    @Req() request: RequestWithTenant,
    @Param("id") poolId: string,
  ) {
    const { tenant_id } = request.tenantContext;
    const pool = await this.retailService.getInventoryPool(tenant_id, poolId);
    return this.respond(tenant_id, pool);
  }

  @Delete("inventory-pools/:id")
  @HttpCode(HttpStatus.OK)
  async deleteInventoryPool(
    @Req() request: RequestWithTenant,
    @Param("id") poolId: string,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    await this.retailService.deleteInventoryPool(tenant_id, poolId, user_id!);
    return this.respond(tenant_id, { message: "Pool deleted" });
  }

  // ============================================================
  // E-COMMERCE STORES
  // ============================================================

  @Get("ecommerce-stores")
  async listEcommerceStores(@Req() request: RequestWithTenant) {
    const { tenant_id, location_id } = request.tenantContext;
    const stores = await this.retailService.listEcommerceStores(
      tenant_id,
      location_id!,
    );
    return this.respond(tenant_id, stores);
  }

  @Post("ecommerce-stores")
  async createEcommerceStore(
    @Req() request: RequestWithTenant,
    @Body() data: CreateEcommerceStoreDto,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    const store = await this.retailService.createEcommerceStore(
      tenant_id,
      data,
      user_id!,
    );
    return this.respond(tenant_id, store);
  }

  @Get("ecommerce-stores/:id")
  async getEcommerceStore(
    @Req() request: RequestWithTenant,
    @Param("id") store_id: string,
  ) {
    const { tenant_id } = request.tenantContext;
    const store = await this.retailService.getEcommerceStore(tenant_id, store_id);
    return this.respond(tenant_id, store);
  }

  @Put("ecommerce-stores/:id")
  async updateEcommerceStore(
    @Req() request: RequestWithTenant,
    @Param("id") store_id: string,
    @Body() data: UpdateEcommerceStoreDto,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    const store = await this.retailService.updateEcommerceStore(
      tenant_id,
      store_id,
      data,
      user_id!,
    );
    return this.respond(tenant_id, store);
  }

  @Delete("ecommerce-stores/:id")
  @HttpCode(HttpStatus.OK)
  async deleteEcommerceStore(
    @Req() request: RequestWithTenant,
    @Param("id") store_id: string,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    await this.retailService.deleteEcommerceStore(tenant_id, store_id, user_id!);
    return this.respond(tenant_id, { message: "E-commerce store removed" });
  }

  @Post("ecommerce-stores/:id/link-branch")
  async linkEcommerceToBranch(
    @Req() request: RequestWithTenant,
    @Param("id") ecommerceId: string,
    @Body() data: LinkBranchDto,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    await this.retailService.linkEcommerceToBranch(
      tenant_id,
      ecommerceId,
      data.branch_id,
      user_id!,
    );
    return this.respond(tenant_id, { message: "Branch linked successfully" });
  }

  @Delete("ecommerce-stores/:id/unlink-branch/:branch_id")
  @HttpCode(HttpStatus.OK)
  async unlinkEcommerceFromBranch(
    @Req() request: RequestWithTenant,
    @Param("id") ecommerceId: string,
    @Param("branch_id") branch_id: string,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    await this.retailService.unlinkEcommerceFromBranch(
      tenant_id,
      ecommerceId,
      branch_id,
      user_id!,
    );
    return this.respond(tenant_id, { message: "Branch unlinked successfully" });
  }

  @Get("products/next-sku")
  @SkipBranchCheck()
  async getNextSku(
    @Req() request: RequestWithTenant,
    @Query("category_id") category_id: string,
  ) {
    const { tenant_id } = request.tenantContext;
    const result = await this.retailService.generateNextSku(
      tenant_id,
      category_id,
    );
    return this.respond(tenant_id, result);
  }

  @Get("products")
  async listProducts(
    @Req() request: RequestWithTenant,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("category_id") category_id?: string,
    @Query("type") type?: string,
    @Query("minPrice") minPrice?: string,
    @Query("maxPrice") maxPrice?: string,
    @Query("q") q?: string,
    @Query("sortBy") sortBy?: "name" | "price" | "created_at",
    @Query("sortDir") sortDir?: "asc" | "desc",
    @Query("location_id") querylocation_id?: string,
  ) {
    const { tenant_id, location_id: sessionlocation_id } = request.tenantContext;
    const effectivelocation_id = querylocation_id || sessionlocation_id;
    const products = await this.retailService.listProducts(tenant_id, {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      category_id: category_id || undefined,
      type: type || undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      q: q || undefined,
      sortBy,
      sortDir,
      location_id: effectivelocation_id || undefined,
    });
    return this.respond(tenant_id, products);
  }

  @Patch("products/:id")
  async updateProduct(
    @Req() request: RequestWithTenant,
    @Param("id") product_id: string,
    @Body() data: UpdateProductDto,
  ) {
    const {
      tenant_id,
      user_id,
      location_id: sessionlocation_id,
    } = request.tenantContext;
    const effectivelocation_id = data.location_id || sessionlocation_id;

    const updated = await this.retailService.updateProduct(
      tenant_id,
      product_id,
      data,
      user_id!,
      effectivelocation_id,
    );
    return this.respond(tenant_id, updated);
  }

  @Get("orders")
  async listOrders(
    @Req() request: RequestWithTenant,
    @Query("store_id") store_id?: string,
  ) {
    const { tenant_id, role, location_id } = request.tenantContext;

    const effectivestore_id =
      role === "SUPERADMIN" || role === "OWNER" || role === "ADMIN"
        ? store_id
        : location_id;

    const orders = await this.retailService.listOrders(
      tenant_id,
      effectivestore_id,
    );
    return this.respond(tenant_id, orders);
  }

  @Post("orders")
  async createOrder(
    @Req() request: RequestWithTenant,
    @Body() data: CreateOrderDto,
  ) {
    const { tenant_id, location_id, user_id } = request.tenantContext;
    const order = await this.retailService.createOrder(
      tenant_id,
      location_id!,
      data,
      user_id!,
    );
    return this.respond(tenant_id, order);
  }

  @Get("shifts/active")
  async getActiveShift(
    @Req() request: RequestWithTenant,
    @Query("store_id") store_id: string,
  ) {
    const { tenant_id, role, location_id, user_id } = request.tenantContext;

    const effectivestore_id =
      role === "SUPERADMIN" || role === "OWNER" || role === "ADMIN"
        ? store_id
        : location_id;

    const shift = await this.retailService.getActiveShift(
      tenant_id,
      effectivestore_id!,
      user_id!,
    );
    return this.respond(tenant_id, shift);
  }

  @Post("shifts/open")
  async openShift(
    @Req() request: RequestWithTenant,
    @Body() data: OpenShiftDto,
  ) {
    const { tenant_id, location_id, user_id } = request.tenantContext;

    const shift = await this.retailService.openShift(
      tenant_id,
      location_id!,
      user_id!,
      data,
      user_id!,
    );
    return this.respond(tenant_id, shift);
  }

  @Put("shifts/:id/close")
  async closeShift(
    @Req() request: RequestWithTenant,
    @Param("id") shift_id: string,
    @Body() data: CloseShiftDto,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    const shift = await this.retailService.closeShift(
      tenant_id,
      shift_id,
      data,
      user_id!,
    );
    return this.respond(tenant_id, shift);
  }

  @Get("shifts")
  async listShifts(@Req() request: RequestWithTenant) {
    const { tenant_id, location_id } = request.tenantContext;
    const shifts = await this.retailService.listShifts(tenant_id, location_id!);
    return this.respond(tenant_id, shifts);
  }

  @Get("promotions")
  async listPromotions(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const promos = await this.retailService.listPromotions(tenant_id);
    return this.respond(tenant_id, promos);
  }

  @Put("promotions/:id")
  async updatePromotion(
    @Req() request: RequestWithTenant,
    @Param("id") promotionId: string,
    @Body() data: any,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    const promo = await this.retailService.updatePromotion(
      tenant_id,
      promotionId,
      data,
      user_id!,
    );
    return this.respond(tenant_id, promo);
  }

  @Get("channels")
  async listChannels(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const channels = await this.retailService.listChannels(tenant_id);
    return this.respond(
      tenant_id,
      channels.map((channel) => this.mapChannel(channel)),
    );
  }

  @Post("channels")
  async createChannel(@Req() request: RequestWithTenant, @Body() data: any) {
    const { tenant_id, user_id } = request.tenantContext;
    const channel = await this.retailService.createChannel(
      tenant_id,
      data,
      user_id!,
    );
    return this.respond(tenant_id, this.mapChannel(channel));
  }

  @Put("channels/:id")
  async updateChannel(
    @Req() request: RequestWithTenant,
    @Param("id") channelId: string,
    @Body() data: any,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    const channel = await this.retailService.updateChannel(
      tenant_id,
      channelId,
      data,
      user_id!,
    );
    return this.respond(tenant_id, this.mapChannel(channel));
  }

  @Delete("channels/:id")
  async deleteChannel(
    @Req() request: RequestWithTenant,
    @Param("id") channelId: string,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    const result = await this.retailService.deleteChannel(
      tenant_id,
      channelId,
      user_id!,
    );
    return this.respond(tenant_id, result);
  }

  @Post("channels/:id/sync")
  async syncChannel(
    @Req() request: RequestWithTenant,
    @Param("id") channelId: string,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    const result = await this.retailService.syncChannel(
      tenant_id,
      channelId,
      user_id!,
    );
    return this.respond(tenant_id, result);
  }

  @Post("channels/:id/rotate-credentials")
  async rotateChannelCredentials(
    @Req() request: RequestWithTenant,
    @Param("id") channelId: string,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    const creds = await this.retailService.rotateChannelCredentials(
      tenant_id,
      channelId,
      user_id!,
    );
    return this.respond(tenant_id, creds);
  }

  @Post("channels/:id/revoke-credentials")
  async revokeChannelCredentials(
    @Req() request: RequestWithTenant,
    @Param("id") channelId: string,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    const result = await this.retailService.revokeChannelCredentials(
      tenant_id,
      channelId,
      user_id!,
    );
    return this.respond(tenant_id, result);
  }
  @Get("devices")
  async listDevices(
    @Req() request: RequestWithTenant,
    @Query("store_id") store_id?: string,
  ) {
    const { tenant_id, role, location_id } = request.tenantContext;
    const effectivestore_id =
      role === "SUPERADMIN" || role === "OWNER" || role === "ADMIN"
        ? store_id
        : location_id;
    const devices = await this.retailService.listDevices(
      tenant_id,
      effectivestore_id,
    );
    return this.respond(tenant_id, devices);
  }

  @Post("devices")
  async registerDevice(
    @Req() request: RequestWithTenant,
    @Body() data: RegisterBranchDeviceDto,
  ) {
    const { tenant_id, user_id, location_id } = request.tenantContext;
    const device = await this.retailService.registerDevice(
      tenant_id,
      location_id!,
      data,
      user_id!,
    );
    return this.respond(tenant_id, device);
  }

  @Get("cctvs")
  async listCCTVs(
    @Req() request: RequestWithTenant,
    @Query("store_id") store_id?: string,
  ) {
    const { tenant_id, role, location_id } = request.tenantContext;
    const effectivestore_id =
      role === "SUPERADMIN" || role === "OWNER" || role === "ADMIN"
        ? store_id
        : location_id;
    const cctvs = await this.retailService.listCCTVs(
      tenant_id,
      effectivestore_id,
    );
    return this.respond(tenant_id, cctvs);
  }

  @Post("cctvs")
  async registerCCTV(
    @Req() request: RequestWithTenant,
    @Body() data: RegisterCCTVCameraDto,
  ) {
    const { tenant_id, user_id, location_id } = request.tenantContext;
    const camera = await this.retailService.registerCCTV(
      tenant_id,
      location_id!,
      data,
      user_id!,
    );
    return this.respond(tenant_id, camera);
  }

  @Post("cctvs/validate")
  async validateCCTVConnection(
    @Req() request: RequestWithTenant,
    @Body() data: RegisterCCTVCameraDto,
  ) {
    const { tenant_id, location_id } = request.tenantContext;
    const result = await this.retailService.validateCCTVConnection(
      tenant_id,
      location_id!,
      data,
    );
    return this.respond(tenant_id, result);
  }

  @Get("sensors")
  async listSensors(
    @Req() request: RequestWithTenant,
    @Query("store_id") store_id?: string,
  ) {
    const { tenant_id, role, location_id } = request.tenantContext;
    const effectivestore_id =
      role === "SUPERADMIN" || role === "OWNER" || role === "ADMIN"
        ? store_id
        : location_id;
    const sensors = await this.retailService.listSensors(
      tenant_id,
      effectivestore_id,
    );
    return this.respond(tenant_id, sensors);
  }

  @Post("sensors")
  async registerSensor(
    @Req() request: RequestWithTenant,
    @Body() data: RegisterBranchSensorDto,
  ) {
    const { tenant_id, user_id, location_id } = request.tenantContext;
    const sensor = await this.retailService.registerSensor(
      tenant_id,
      location_id!,
      data,
      user_id!,
    );
    return this.respond(tenant_id, sensor);
  }

  @Post("devices/:id/ping")
  async pingDevice(
    @Req() request: RequestWithTenant,
    @Param("id") device_id: string,
  ) {
    const { tenant_id } = request.tenantContext;
    const result = await this.retailService.pingDevice(tenant_id, device_id);
    return this.respond(tenant_id, result);
  }

  @Post("devices/scan")
  async scanDevices(@Req() request: RequestWithTenant) {
    const { tenant_id, location_id } = request.tenantContext;
    const discovered = await this.retailService.scanDevices(
      tenant_id,
      location_id!,
    );
    return this.respond(tenant_id, discovered);
  }

  @Post("devices/commit-scan/:discoveryId")
  async commitScannedDevice(
    @Req() request: RequestWithTenant,
    @Param("discoveryId") discoveryId: string,
  ) {
    const { tenant_id, location_id, user_id } = request.tenantContext;
    const device = await this.retailService.commitScannedDevice(
      tenant_id,
      location_id!,
      discoveryId,
      user_id!,
    );
    return this.respond(tenant_id, device);
  }

  @Post("orders/:id/payment")
  async processPayment(
    @Req() request: RequestWithTenant,
    @Param("id") order_id: string,
    @Body() data: { amount: number; method: string; shift_id?: string },
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    const payment = await this.retailService.processPayment(
      tenant_id,
      order_id,
      { ...data, amount: new Prisma.Decimal(String(data.amount)) },
      user_id!,
    );
    return this.respond(tenant_id, payment);
  }

  @Post("orders/:id/return")
  async processReturn(
    @Req() request: RequestWithTenant,
    @Param("id") order_id: string,
    @Body() data: { itemIds: string[]; shift_id?: string },
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    const result = await this.retailService.processReturn(
      tenant_id,
      order_id,
      data,
      user_id!,
    );
    return this.respond(tenant_id, result);
  }

  @Post("inventory/opname")
  async submitOpname(
    @Req() request: RequestWithTenant,
    @Body() data: { store_id: string; adjustments: any[]; shift_id?: string },
  ) {
    const { tenant_id, user_id, role, location_id } = request.tenantContext;

    // Enforce location_id for non-admins
    if (role !== "SUPERADMIN" && role !== "OWNER" && role !== "ADMIN") {
      data.store_id = location_id!;
    }

    const result = await this.retailService.submitOpname(
      tenant_id,
      data,
      user_id!,
    );
    return this.respond(tenant_id, result);
  }

  @Post("inventory/receive")
  async receiveGoods(
    @Req() request: RequestWithTenant,
    @Body()
    data: {
      store_id: string;
      shipment_id: string;
      items: any[];
      shift_id?: string;
    },
  ) {
    const { tenant_id, user_id, role, location_id } = request.tenantContext;

    // Enforce location_id for non-admins
    if (role !== "SUPERADMIN" && role !== "OWNER" && role !== "ADMIN") {
      data.store_id = location_id!;
    }

    const result = await this.retailService.receiveGoods(
      tenant_id,
      data,
      user_id!,
    );
    return this.respond(tenant_id, result);
  }
  @Get("returns/export")
  @HttpCode(HttpStatus.OK)
  async exportReturns(@Req() request: RequestWithTenant) {
     const { tenant_id } = request.tenantContext;
     if (!tenant_id || tenant_id === 'mock') throw new Error("Invalid tenant context for export");
     const csv = await this.retailExport.generateReturnCsv(tenant_id);
     return csv; // We will handle response types from NestJS interceptors
  }

}
