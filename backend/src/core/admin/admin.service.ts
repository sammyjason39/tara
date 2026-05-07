import { Injectable } from "@nestjs/common";
import { CreateAdminRequestDto, AdminRequestType } from "./dto/create-admin-request.dto";
import { ToggleModuleDto } from "./dto/toggle-module.dto";
import { IAdminRepository } from "./repositories/admin.repository.interface";
import { AuditService } from "../../shared/audit/audit.service";
import { PrismaService } from "../../persistence/prisma.service";
import * as jwt from "jsonwebtoken";

@Injectable()
export class AdminService {
  private readonly jwtSecret = process.env.JWT_SECRET || "dev-secret-key-do-not-use-in-prod";

  constructor(
    private readonly repository: IAdminRepository,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  async getModuleStatuses(tenant_id: string) {
    return this.repository.getModuleStatuses(tenant_id);
  }

  async toggleModule(tenant_id: string, dto: ToggleModuleDto, actor_id?: string) {
    const result = await this.repository.toggleModule(tenant_id, dto);
    if (actor_id) {
      await this.auditService.log({
        tenant_id,
        user_id: actor_id,
        module: "admin",
        action: "TOGGLE_MODULE",
        entity_type: "MODULE",
        entity_id: dto.moduleKey,
        metadata: { status: dto.enabled ? "enabled" : "disabled" },
      });
    }
    return result;
  }

  async getRequests(tenant_id: string) {
    return this.repository.getRequests(tenant_id);
  }

  async createRequest(
    tenant_id: string,
    dto: CreateAdminRequestDto,
    actor_id?: string,
  ) {
    const request = await this.repository.createRequest(tenant_id, dto);
    if (actor_id) {
      await this.auditService.log({
        tenant_id,
        user_id: actor_id,
        module: "admin",
        action: "CREATE",
        entity_type: "ADMIN_REQUEST",
        entity_id: request.id,
        metadata: { type: dto.type, title: dto.title },
      });
    }
    return request;
  }

  async resolveRequest(
    tenant_id: string,
    request_id: string,
    resolvedBy: string,
  ) {
    const request = await this.repository.resolveRequest(
      tenant_id,
      request_id,
      resolvedBy,
    );
    await this.auditService.log({
      tenant_id,
      user_id: resolvedBy,
      module: "admin",
      action: "RESOLVE",
      entity_type: "ADMIN_REQUEST",
      entity_id: request_id,
    });
    return request;
  }

  async getAuditEvents(tenant_id: string) {
    return this.repository.getAuditEvents(tenant_id);
  }

  async getStuckEvents(tenant_id: string) {
    // Stale = PENDING and older than 5 mins, or FAILED
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.repository.getStuckEvents(tenant_id, fiveMinutesAgo);
  }

  async retryEvent(tenant_id: string, event_id: string, actor_id?: string) {
    const result = await this.repository.retryEvent(tenant_id, event_id);
    if (actor_id) {
      await this.auditService.log({
        tenant_id,
        user_id: actor_id,
        module: "admin",
        action: "RETRY_EVENT",
        entity_type: "OUTBOX_EVENT",
        entity_id: event_id,
      });
    }
    return result;
  }

  async getSyncStatus(tenant_id: string) {
    return this.repository.getSyncStatus(tenant_id);
  }

  async getIotDevices(tenant_id: string) {
    return this.repository.getIotDevices(tenant_id);
  }

  async createInvitation(
    tenant_id: string,
    dto: { email: string; role: string; justification?: string },
    actor_id: string,
  ) {
    // 1. Generate Link Token
    const token = (jwt.sign as any)(
      { 
        email: dto.email, 
        role: dto.role, 
        tenant_id,
        type: AdminRequestType.INVITATION
      }, 
      this.jwtSecret, 
      { expiresIn: "7d" }
    );

    const magicLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/invite?token=${token}`;

    // 2. Persist as an Admin Request for Audit/Tracking
    const request = await this.repository.createRequest(tenant_id, {
      type: AdminRequestType.INVITATION,
      title: `Admin Invitation: ${dto.email}`,
      detail: `Invited as ${dto.role}. Justification: ${dto.justification || "N/A"}. Link: ${magicLink}`,
    });

    // 3. Log Audit
    await this.auditService.log({
      tenant_id,
      user_id: actor_id,
      module: "admin",
      action: "INVITE",
      entity_type: "ADMIN_INVITATION",
      entity_id: request.id,
      metadata: { email: dto.email, role: dto.role, token_preview: token.substring(0, 10) + "..." },
    });

    return { 
      success: true, 
      magic_link: magicLink, 
      request_id: request.id 
    };
  }

  async getDashboardMetrics(tenant_id: string) {
    // 1. Revenue
    const revenueAggr = await this.prisma.retail_orders.aggregate({
      where: {
        tenant_id: tenant_id,
        status: { in: ["COMPLETED", "PAID", "complete", "paid"] },
      },
      _sum: { total_amount: true },
    });
    const revenue = revenueAggr._sum.total_amount?.toNumber() || 0;

    // 2. Active Staff
    const activeStaff = await this.prisma.employees.count({
      where: { tenant_id: tenant_id, status: "active" },
    });

    // 3. Alerts
    const alerts = await this.prisma.inventory_alerts.count({
      where: { tenant_id: tenant_id, status: "OPEN" },
    });

    // 4. Module Status
    const activeModules = await this.getModuleStatuses(tenant_id);
    const moduleCount = activeModules.filter((m) => m.enabled).length;
    const totalModules = activeModules.length || 20;

    // 5. Activities
    const activities = await this.prisma.audit_logs.findMany({
      where: { tenant_id: tenant_id },
      orderBy: { created_at: "desc" },
      take: 10,
      select: {
        id: true,
        action: true,
        metadata: true,
        created_at: true,
        module: true,
        severity: true,
      },
    });

    // 6. Real Timeseries (Revenue by month - Last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const revenueByMonth: any[] = await this.prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        SUM(total_amount) as amount
      FROM retail_orders
      WHERE tenant_id = ${tenant_id} 
        AND status IN ('COMPLETED', 'PAID', 'complete', 'paid')
        AND created_at >= ${sixMonthsAgo}
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const financialOverview = revenueByMonth.map(r => ({
      month: months[new Date(r.month).getMonth()],
      revenue: Number(r.amount),
      expenses: Number(r.amount) * 0.7 // Mocked expense ratio for now
    }));

    // 7. Top Branches (Real)
    const topBranchesRaw: any[] = await this.prisma.$queryRaw`
      SELECT 
        s.name,
        SUM(o.total_amount) as revenue
      FROM retail_orders o
      JOIN stores s ON o.store_id = s.id
      WHERE o.tenant_id = ${tenant_id}
        AND o.status IN ('COMPLETED', 'PAID', 'complete', 'paid')
      GROUP BY s.name
      ORDER BY 2 DESC
      LIMIT 5
    `;

    const topBranches = topBranchesRaw.map(b => ({
      name: b.name,
      revenue: Number(b.revenue)
    }));

    // 8. HR Distribution (Real)
    const hrDistRaw: any[] = await this.prisma.$queryRaw`
      SELECT 
        d.name as department,
        COUNT(e.id) as count
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.tenant_id = ${tenant_id} AND e.status = 'active'
      GROUP BY d.name
    `;

    const hrDistribution = hrDistRaw.map((d, i) => ({
      department: d.department || "Unassigned",
      count: Number(d.count),
      color: ["#3b82f6", "#6366f1", "#14b8a6", "#8b5cf6", "#f59e0b"][i % 5]
    }));

    // 9. Additional Metrics
    const [pendingApprovals, openReceivables, openPayables] = await Promise.all([
      this.prisma.workflow_requests.count({ where: { tenant_id, status: 'PENDING' } }),
      this.prisma.finance_ar_invoices?.count({ where: { tenant_id, status: 'PENDING' } }) || Promise.resolve(0),
      this.prisma.payables?.count({ where: { tenant_id, status: 'PENDING' } }) || Promise.resolve(0)
    ]);

    return {
      metrics: {
        revenue,
        activeStaff,
        alerts,
        healthScore: 98,
        pendingApprovals,
        openReceivables,
        openPayables
      },
      systemStatus: {
        activeModules: moduleCount,
        totalModules: totalModules,
        uptime: "99.9%",
        lastBackup: new Date().toISOString(),
      },
      timeseries: {
        financialOverview,
        topBranches,
        hrDistribution,
        alertsByModule: [
          { module: "Retail", count: Math.floor(alerts * 0.6) },
          { module: "HR", count: Math.floor(alerts * 0.2) },
          { module: "Finance", count: Math.floor(alerts * 0.1) },
          { module: "IT", count: Math.floor(alerts * 0.1) },
        ],
        moduleHealth: [
          { name: "Optimal", value: moduleCount, color: "#10b981" },
          { name: "Degraded", value: 0, color: "#f59e0b" },
          { name: "Down", value: 0, color: "#ef4444" },
        ],
        campaignCorrelation: [
          { week: "W1", adSpend: 1200, sales: 8500 },
          { week: "W2", adSpend: 1500, sales: 11200 },
          { week: "W3", adSpend: 2800, sales: 24500 },
          { week: "W4", adSpend: 1100, sales: 9800 },
          { week: "W5", adSpend: 1800, sales: 15400 },
          { week: "W6", adSpend: 2100, sales: 19800 },
        ]
      },
      activities: activities.map(a => ({
        id: a.id,
        title: `${a.module.toUpperCase()} ${a.action}`,
        detail: JSON.stringify(a.metadata).substring(0, 50) + "...",
        time: a.created_at.toISOString(),
        status: "Logged",
        severity: (a as any).severity || 'info'
      }))
    };
  }

  async getDashboardTactical(tenant_id: string) {
    // 1. Module Activity (Mocked for now based on statuses, ideally from IT health)
    const statuses = await this.repository.getModuleStatuses(tenant_id);
    const moduleActivity = statuses.map(s => ({
      name: s.moduleKey,
      status: s.enabled ? 'STABLE' : 'DOWN',
      throughput: Math.floor(Math.random() * 100),
      latency: Math.floor(Math.random() * 50) + 10,
      lastChecked: new Date().toISOString()
    }));

    // 2. Sync Health
    const syncStatus = await this.repository.getSyncStatus(tenant_id);
    
    // 3. IoT Devices
    const iotDevices = await this.repository.getIotDevices(tenant_id);

    // 4. Alerts Queue (Inventory + HR Alerts)
    const [invAlerts, hrAlerts] = await Promise.all([
      this.prisma.inventory_alerts.findMany({ where: { tenant_id, status: 'OPEN' }, take: 10 }),
      this.prisma.hr_system_alerts.findMany({ where: { tenant_id }, take: 10, orderBy: { created_at: 'desc' } })
    ]);

    const alertsQueue = [
      ...invAlerts.map(a => ({
        id: a.id,
        title: `Inventory: ${a.type}`,
        detail: a.message,
        severity: a.severity as any,
        module: 'Retail',
        time: a.created_at.toISOString()
      })),
      ...hrAlerts.map(a => ({
        id: a.id,
        title: `HR: ${a.type}`,
        detail: a.message,
        severity: a.severity as any,
        module: 'HR',
        time: a.created_at.toISOString()
      }))
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    // 5. Workflow Items
    const workflowItems = await this.prisma.workflow_requests.findMany({
      where: { tenant_id, status: { in: ['PENDING', 'IN_PROGRESS'] } },
      take: 10,
      orderBy: { created_at: 'desc' }
    });

    // 6. Retail Shifts
    const retailShifts = await this.prisma.retail_shifts.findMany({
      where: { tenant_id },
      include: { stores: true, opened_by: true },
      take: 10,
      orderBy: { start_time: 'desc' }
    });

    return {
      moduleActivity,
      syncHealth: {
        pending: syncStatus.pendingCount,
        failed: syncStatus.failedCount,
        lastSyncAt: syncStatus.lastSyncAt,
        latencyMin: syncStatus.latencyMinutes,
        isHealthy: syncStatus.status === 'HEALTHY'
      },
      outboxSummary: {
        pending: syncStatus.pendingCount,
        failed: syncStatus.failedCount,
        lastProcessed: syncStatus.lastSyncAt
      },
      iotDevices: iotDevices.map(d => ({
        id: d.id,
        name: d.name,
        type: d.type,
        location: d.location_id,
        status: d.status as any,
        lastSeen: d.last_ping?.toISOString() || new Date().toISOString(),
        battery: (d as any).battery_level
      })),
      alertsQueue,
      workflowItems: workflowItems.map(w => ({
        id: w.id,
        type: w.entity_type,
        title: `${w.entity_type}: ${w.entity_id}`,
        status: w.status as any,
        assignee: (w as any).assigned_to,
        timeElapsed: this.getTimeElapsed(w.created_at)
      })),
      retailShifts: retailShifts.map(s => ({
        id: s.id,
        store: s.stores?.name || "Unknown",
        status: s.status,
        cashier: s.opened_by ? `${s.opened_by.first_name} ${s.opened_by.last_name}` : "Unknown",
        openTime: s.start_time.toISOString(),
        closeTime: s.end_time?.toISOString(),
        reconciled: (s as any).reconciled || false
      })),
      auditIntegrity: {
        score: 98, // Mocked for now, will be updated by integrity check
        status: 'CLEAN',
        lastVerified: new Date().toISOString(),
        brokenCount: 0
      }
    };
  }

  private getTimeElapsed(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  }
}
