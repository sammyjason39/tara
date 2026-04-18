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
    const { tenant_id } = request.tenantContext;

    // 1. Revenue (Sum of Retail Orders with status COMPLETED or PAID)
    let revenue = 0;
    const moduleContributions: any = {};
    if (await isModuleActive(this.prisma, tenant_id, "retail")) {
      const revenueAggr = await this.prisma.retail_orders.aggregate({
        where: {
          tenant_id: tenant_id,
          status: { in: ["COMPLETED", "PAID", "complete", "paid"] },
        },
        _sum: { total_amount: true },
      });
      revenue = revenueAggr._sum.total_amount?.toNumber() || 0;

      const activeStores = await this.prisma.locations.count({
        where: { tenant_id: tenant_id, type: "STORE" },
      });
      moduleContributions.retail = {
        activeStores,
      };
    }

    // 2. Active Staff
    const activeStaff = await this.prisma.employees.count({
      where: { tenant_id: tenant_id, status: "active" },
    });

    // 3. Alerts (Inventory Alerts, etc.)
    const alerts = await this.prisma.inventory_alerts.count({
      where: { tenant_id: tenant_id, status: "OPEN" },
    });

    // 4. Module Status
    const modules = await this.prisma.companies.findUnique({
      where: { id: tenant_id },
      select: {
        id: true,
      },
    }); // we'll mock the ratio for now or count actual modules using admin service
    const activeModules = await this.adminService.getModuleStatuses(tenant_id);
    const moduleCount = activeModules.filter((m) => m.enabled).length;
    const totalModules = activeModules.length || 20;

    // 5. Activities (from AuditLog)
    const activities = await this.prisma.audit_logs.findMany({
      where: { tenant_id: tenant_id },
      orderBy: { created_at: "desc" },
      take: 4,
      select: {
        id: true,
        action: true,
        metadata: true,
        created_at: true,
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
      time: a.created_at.toISOString(),
      status: "Logged",
    }));

    // Format for frontend
    return {
      success: true,
      tenant_id,
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
    const { tenant_id } = request.tenantContext;
    const data = await this.adminService.getModuleStatuses(tenant_id);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Put("modules/toggle")
  async toggleModule(
    @Req() request: RequestWithTenant,
    @Body() dto: ToggleModuleDto,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Module status updated",
      data: await this.adminService.toggleModule(tenant_id, dto, user_id),
    };
  }

  @Get("requests")
  async getRequests(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.adminService.getRequests(tenant_id);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Post("requests")
  async createRequest(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateAdminRequestDto,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Admin request created",
      data: await this.adminService.createRequest(tenant_id, dto, user_id),
    };
  }

  @Put("requests/:id/resolve")
  async resolveRequest(
    @Req() request: RequestWithTenant,
    @Param("id") request_id: string,
    @Body() body: { resolvedBy: string },
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Admin request resolved",
      data: await this.adminService.resolveRequest(
        tenant_id,
        request_id,
        user_id || body.resolvedBy || "system",
      ),
    };
  }

  @Get("audit-events")
  async getAuditEvents(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.adminService.getAuditEvents(tenant_id);
    return { success: true, tenant_id, count: data.length, data };
  }
}
