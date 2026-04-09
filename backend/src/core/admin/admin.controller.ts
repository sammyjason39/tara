import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseInterceptors,
} from "@nestjs/common";
import { Request } from "express";
import { TenantContext } from "../../gateway/tenant-context.interface";
import { TenantInterceptor } from "../../gateway/tenant.interceptor";
import { CreateAdminRequestDto } from "./dto/create-admin-request.dto";
import { ToggleModuleDto } from "./dto/toggle-module.dto";
import { AdminService } from "./admin.service";
import { PrismaService } from "../../persistence/prisma.service";
import { isModuleActive } from "../../shared/helpers/module-active.helper";

interface RequestWithTenant extends Request {
  tenantContext: TenantContext;
}

@Controller("admin")
@UseInterceptors(TenantInterceptor)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly prisma: PrismaService,
  ) {}

  @Get("dashboard")
  async getDashboardMetrics(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;

    // 1. Revenue (Sum of Retail Orders with status COMPLETED or PAID)
    let revenue = 0;
    const moduleContributions: any = {};
    if (await isModuleActive(this.prisma, tenantId, "retail")) {
      const revenueAggr = await this.prisma.retailOrder.aggregate({
        where: {
          tenantId,
          status: { in: ["COMPLETED", "PAID", "complete", "paid"] },
        },
        _sum: { totalAmount: true },
      });
      revenue = revenueAggr._sum.totalAmount?.toNumber() || 0;

      const activeStores = await this.prisma.location.count({
        where: { tenantId, type: "STORE" },
      });
      moduleContributions.retail = {
        activeStores,
      };
    }

    // 2. Active Staff
    const activeStaff = await this.prisma.employee.count({
      where: { tenantId, status: "active" },
    });

    // 3. Alerts (Inventory Alerts, etc.)
    const alerts = await this.prisma.inventoryAlert.count({
      where: { tenantId, status: "OPEN" },
    });

    // 4. Module Status
    const modules = await this.prisma.company.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
      },
    }); // we'll mock the ratio for now or count actual modules using admin service
    const activeModules = await this.adminService.getModuleStatuses(tenantId);
    const moduleCount = activeModules.filter((m) => m.enabled).length;
    const totalModules = activeModules.length || 20;

    // 5. Activities (from AuditLog)
    const activities = await this.prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        action: true,
        metadata: true,
        createdAt: true,
        module: true,
      },
    });

    // Format for frontend
    const kpis = [
      {
        label: "Revenue",
        value: `$${(revenue / 1000000).toFixed(2)}M`,
        delta: "Live DB Aggregate",
        icon: "Briefcase",
      },
      {
        label: "Active Staff",
        value: activeStaff.toString(),
        delta: "Live DB Count",
        icon: "Users",
      },
      {
        label: "Alerts",
        value: alerts.toString(),
        delta: "Pending Review",
        icon: "AlertTriangle",
      },
      {
        label: "Module Status",
        value: `${moduleCount}/${totalModules}`,
        delta: "Active Services",
        icon: "ClipboardCheck",
      },
    ];

    const formattedActivities = activities.map((a: any) => ({
      title: `${a.module.toUpperCase()} ${a.action}`,
      detail: JSON.stringify(a.metadata).substring(0, 50) + "...",
      time: a.createdAt.toISOString(),
      status: "Logged",
    }));

    // Format for frontend
    return {
      success: true,
      tenantId,
      data: {
        metrics: {
          revenue,
          activeStaff,
          alerts,
          healthScore: 98,
        },
        systemStatus: {
          activeModules: moduleCount,
          totalModules: totalModules,
          uptime: "99.9%",
          lastBackup: new Date().toISOString(),
        },
        recentActivity:
          formattedActivities.length > 0
            ? formattedActivities
            : [
                {
                  title: "System Ready",
                  detail: "Awaiting incoming events",
                  time: new Date().toISOString(),
                  status: "Online",
                },
              ],
        moduleContributions,
      },
    };
  }

  @Get("modules")
  async getModules(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.adminService.getModuleStatuses(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Put("modules/toggle")
  async toggleModule(
    @Req() request: RequestWithTenant,
    @Body() dto: ToggleModuleDto,
  ) {
    const { tenantId, userId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Module status updated",
      data: await this.adminService.toggleModule(tenantId, dto, userId),
    };
  }

  @Get("requests")
  async getRequests(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.adminService.getRequests(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post("requests")
  async createRequest(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateAdminRequestDto,
  ) {
    const { tenantId, userId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Admin request created",
      data: await this.adminService.createRequest(tenantId, dto, userId),
    };
  }

  @Put("requests/:id/resolve")
  async resolveRequest(
    @Req() request: RequestWithTenant,
    @Param("id") requestId: string,
    @Body() body: { resolvedBy: string },
  ) {
    const { tenantId, userId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Admin request resolved",
      data: await this.adminService.resolveRequest(
        tenantId,
        requestId,
        userId || body.resolvedBy || "system",
      ),
    };
  }

  @Get("audit-events")
  async getAuditEvents(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.adminService.getAuditEvents(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }
}
