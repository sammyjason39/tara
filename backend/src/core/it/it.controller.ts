import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseInterceptors,
  UseGuards,
  Query,
} from "@nestjs/common";
import { Request } from "express";
import { TenantContext } from "../../gateway/tenant-context.interface";
import { TenantInterceptor } from "../../gateway/tenant.interceptor";
import { ModuleStateGuard } from "../auth/guards/module-state.guard";
import { BranchGatingGuard } from "../auth/guards/branch-gating.guard";
import { TenantGuard } from "../../shared/guards/tenant.guard";
import { RequiredModule } from "../../shared/decorators/required-module.decorator";
import { isModuleActive } from "../../shared/helpers/module-active.helper";
import { PrismaService } from "../../persistence/prisma.service";
import { CreateProvisioningRequestDto } from "./dto/create-provisioning-request.dto";
import { CreateDeviceDto, CreateDeviceEventDto } from "./dto/device.dto";
import { ITService } from "./it.service";

interface RequestWithTenant extends Request {
  tenantContext: TenantContext;
}

@Controller("v1/it")
@UseInterceptors(TenantInterceptor)
@UseGuards(ModuleStateGuard, BranchGatingGuard, TenantGuard)
@RequiredModule("it")
export class ITController {
  constructor(
    private readonly itService: ITService,
    private readonly prisma: PrismaService,
  ) {}

  // ==================== Overview (Module-Aware) ====================

  /**
   * GET /it/overview
   * IT workspace overview — enriched with retail device data when retail is active.
   */
  @Get("overview")
  async getOverview(@Req() request: RequestWithTenant) {
    const { tenant_id, location_id } = request.tenantContext;

    // Core IT metrics
    const pendingProvisioningCount = await this.itService
      .getProvisioningRequests(tenant_id)
      .then((r) => r.filter((p: any) => p.status === "PENDING").length);
    const systemHealth = await this.itService.getSystemHealth(tenant_id);

    const coreIT = {
      pendingProvisioningRequests: pendingProvisioningCount,
      systemHealthNodes: systemHealth.length,
      healthyNodes: systemHealth.filter(
        (n: any) => n.status === "HEALTHY" || n.status === "healthy",
      ).length,
    };

    // ================================================================
    // MODULE CONTRIBUTIONS — Retail
    // ================================================================
    let retailContribution: Record<string, any> | null = null;

    const retailIsActive = await isModuleActive(
      this.prisma,
      tenant_id,
      "retail",
    );
    if (retailIsActive) {
      // POS Device stats - Now queried from the unified Device model
      const posDeviceWhere = location_id
        ? { tenant_id, location_id, type: "POS_TERMINAL" }
        : { tenant_id, type: "POS_TERMINAL" };

      const [totalPosDevices, onlinePosDevices, offlinePosDevices] =
        await Promise.all([
          this.prisma.it_devices.count({ where: posDeviceWhere }),
          this.prisma.it_devices.count({
            where: { ...posDeviceWhere, status: "ONLINE" },
          }),
          this.prisma.it_devices.count({
            where: { ...posDeviceWhere, status: "OFFLINE" },
          }),
        ]);

      // Ecommerce channel connectors
      const ecomChannels = await this.prisma.ecommerce_connectors.findMany({
        where: { tenant_id: tenant_id },
        select: {
          id: true,
          name: true,
          platform: true,
          status: true,
          updated_at: true,
        },
        take: 10,
      });

      const activeChannels = ecomChannels.filter(
        (c: { status: string }) =>
          c.status === "ACTIVE" || c.status === "active",
      ).length;

      retailContribution = {
        moduleId: "retail",
        moduleName: "Retail Operations",
        posDevices: {
          total: totalPosDevices,
          online: onlinePosDevices,
          offline: offlinePosDevices,
        },
        storeDevices: {
          posTerminals: totalPosDevices,
          total: totalPosDevices,
        },
        ecommerceChannels: {
          total: ecomChannels.length,
          active: activeChannels,
          list: ecomChannels
            .slice(0, 5)
            .map(
              (c: {
                name: string;
                platform: string;
                status: string;
                updated_at: Date | null;
              }) => ({
                name: c.name,
                type: c.platform,
                status: c.status,
                lastSynced: c.updated_at,
              }),
            ),
        },
      };
    }

    return {
      success: true,
      tenant_id,
      data: {
        coreIT,
        moduleContributions: {
          retail: retailContribution,
        },
      },
    };
  }

  // ==================== Devices (NEW) ====================

  @Get("devices")
  async getDevices(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.itService.getDevices(tenant_id);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Post("devices")
  async createDevice(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateDeviceDto,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return {
      success: true,
      data: await this.itService.createDevice(tenant_id, dto, user_id),
    };
  }

  @Put("devices/:id")
  async updateDevice(
    @Req() request: RequestWithTenant,
    @Param("id") device_id: string,
    @Body() dto: Partial<CreateDeviceDto>,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return {
      success: true,
      data: await this.itService.updateDevice(tenant_id, device_id, dto, user_id),
    };
  }

  // ==================== Device Events (NEW) ====================

  @Get("device-events")
  async getDeviceEvents(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.itService.getDeviceEvents(tenant_id);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Post("device-events")
  async createDeviceEvent(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateDeviceEventDto,
  ) {
    const { tenant_id } = request.tenantContext;
    return {
      success: true,
      data: await this.itService.createDeviceEvent(tenant_id, dto),
    };
  }

  // ==================== Provisioning ====================

  @Get("provisioning")
  async getProvisioningRequests(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.itService.getProvisioningRequests(tenant_id);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Post("provisioning")
  async createProvisioningRequest(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateProvisioningRequestDto,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Provisioning request created",
      data: await this.itService.createProvisioningRequest(
        tenant_id,
        dto,
        user_id,
      ),
    };
  }

  @Put("provisioning/:id/provision")
  async markProvisioned(
    @Req() request: RequestWithTenant,
    @Param("id") request_id: string,
    @Body() body: { provisionedBy: string },
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Provisioning request marked as provisioned",
      data: await this.itService.markProvisioned(
        tenant_id,
        request_id,
        body.provisionedBy || "system",
        user_id,
      ),
    };
  }

  @Put("provisioning/:id")
  async updateProvisioningRequest(
    @Req() request: RequestWithTenant,
    @Param("id") request_id: string,
    @Body() dto: Partial<CreateProvisioningRequestDto>,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Provisioning request updated",
      data: await this.itService.updateProvisioningRequest(
        tenant_id,
        request_id,
        dto,
        user_id,
      ),
    };
  }

  @Delete("provisioning/:id")
  async deleteProvisioningRequest(
    @Req() request: RequestWithTenant,
    @Param("id") request_id: string,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    await this.itService.deleteProvisioningRequest(tenant_id, request_id, user_id);
    return {
      success: true,
      tenant_id,
      message: "Provisioning request deleted",
    };
  }

  @Get("system-health")
  async getSystemHealth(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.itService.getSystemHealth(tenant_id);
    return { success: true, tenant_id, count: data.length, data };
  }

  // ==================== Monitoring ====================

  @Get("monitoring/stats")
  async getMonitoringStats(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.itService.getMonitoringStats(tenant_id);
    return { success: true, data };
  }

  @Get("monitoring/logs")
  async getAuditLogs(
    @Req() request: RequestWithTenant,
    @Query("request_id") request_id?: string
  ) {
    const { tenant_id } = request.tenantContext;
    const data = await this.itService.getAuditLogs(tenant_id, request_id);
    return { success: true, count: data.length, data };
  }
}

