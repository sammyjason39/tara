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

@Controller("it")
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
    const { tenantId, locationId } = request.tenantContext;

    // Core IT metrics
    const pendingProvisioningCount = await this.itService
      .getProvisioningRequests(tenantId)
      .then((r) => r.filter((p: any) => p.status === "PENDING").length);
    const systemHealth = await this.itService.getSystemHealth(tenantId);

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
      tenantId,
      "retail",
    );
    if (retailIsActive) {
      // POS Device stats - Now queried from the unified Device model
      const posDeviceWhere = locationId
        ? { tenantId, locationId, type: "POS_TERMINAL" }
        : { tenantId, type: "POS_TERMINAL" };

      const [totalPosDevices, onlinePosDevices, offlinePosDevices] =
        await Promise.all([
          this.prisma.itDevice.count({ where: posDeviceWhere }),
          this.prisma.itDevice.count({
            where: { ...posDeviceWhere, status: "ONLINE" },
          }),
          this.prisma.itDevice.count({
            where: { ...posDeviceWhere, status: "OFFLINE" },
          }),
        ]);

      // Ecommerce channel connectors
      const ecomChannels = await this.prisma.ecommerceConnector.findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
          platform: true,
          status: true,
          updatedAt: true,
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
                updatedAt: Date | null;
              }) => ({
                name: c.name,
                type: c.platform,
                status: c.status,
                lastSynced: c.updatedAt,
              }),
            ),
        },
      };
    }

    return {
      success: true,
      tenantId,
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
    const { tenantId } = request.tenantContext;
    const data = await this.itService.getDevices(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post("devices")
  async createDevice(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateDeviceDto,
  ) {
    const { tenantId, userId } = request.tenantContext;
    return {
      success: true,
      data: await this.itService.createDevice(tenantId, dto, userId),
    };
  }

  @Put("devices/:id")
  async updateDevice(
    @Req() request: RequestWithTenant,
    @Param("id") deviceId: string,
    @Body() dto: Partial<CreateDeviceDto>,
  ) {
    const { tenantId, userId } = request.tenantContext;
    return {
      success: true,
      data: await this.itService.updateDevice(tenantId, deviceId, dto, userId),
    };
  }

  // ==================== Device Events (NEW) ====================

  @Get("device-events")
  async getDeviceEvents(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.itService.getDeviceEvents(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post("device-events")
  async createDeviceEvent(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateDeviceEventDto,
  ) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      data: await this.itService.createDeviceEvent(tenantId, dto),
    };
  }

  // ==================== Provisioning ====================

  @Get("provisioning")
  async getProvisioningRequests(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.itService.getProvisioningRequests(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post("provisioning")
  async createProvisioningRequest(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateProvisioningRequestDto,
  ) {
    const { tenantId, userId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Provisioning request created",
      data: await this.itService.createProvisioningRequest(
        tenantId,
        dto,
        userId,
      ),
    };
  }

  @Put("provisioning/:id/provision")
  async markProvisioned(
    @Req() request: RequestWithTenant,
    @Param("id") requestId: string,
    @Body() body: { provisionedBy: string },
  ) {
    const { tenantId, userId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Provisioning request marked as provisioned",
      data: await this.itService.markProvisioned(
        tenantId,
        requestId,
        body.provisionedBy || "system",
        userId,
      ),
    };
  }

  @Put("provisioning/:id")
  async updateProvisioningRequest(
    @Req() request: RequestWithTenant,
    @Param("id") requestId: string,
    @Body() dto: Partial<CreateProvisioningRequestDto>,
  ) {
    const { tenantId, userId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Provisioning request updated",
      data: await this.itService.updateProvisioningRequest(
        tenantId,
        requestId,
        dto,
        userId,
      ),
    };
  }

  @Delete("provisioning/:id")
  async deleteProvisioningRequest(
    @Req() request: RequestWithTenant,
    @Param("id") requestId: string,
  ) {
    const { tenantId, userId } = request.tenantContext;
    await this.itService.deleteProvisioningRequest(tenantId, requestId, userId);
    return {
      success: true,
      tenantId,
      message: "Provisioning request deleted",
    };
  }

  @Get("system-health")
  async getSystemHealth(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.itService.getSystemHealth(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  // ==================== Monitoring ====================

  @Get("monitoring/stats")
  async getMonitoringStats(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.itService.getMonitoringStats(tenantId);
    return { success: true, data };
  }

  @Get("monitoring/logs")
  async getAuditLogs(
    @Req() request: RequestWithTenant,
    @Query("requestId") requestId?: string
  ) {
    const { tenantId } = request.tenantContext;
    const data = await this.itService.getAuditLogs(tenantId, requestId);
    return { success: true, count: data.length, data };
  }
}
