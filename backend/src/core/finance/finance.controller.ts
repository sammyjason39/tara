import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Request, Response } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import { FinanceService } from "./finance.service";
import { CreateTransactionDto } from "./dto/create-transaction.dto";
import { CreateJournalDto } from "./dto/create-journal.dto";
import { TenantContext } from "../../gateway/tenant-context.interface";
import { PrismaService } from "../../persistence/prisma.service";
import { ModuleStateGuard } from "../auth/guards/module-state.guard";
import { BranchGatingGuard } from "../auth/guards/branch-gating.guard";
import { TenantGuard } from "../../shared/guards/tenant.guard";
import { RequiredModule } from "../../shared/decorators/required-module.decorator";
import { isModuleActive } from "../../shared/helpers/module-active.helper";

interface RequestWithTenant extends Request {
  tenantContext: TenantContext;
}

@Controller("finance")
@UseGuards(ModuleStateGuard, BranchGatingGuard, TenantGuard)
@RequiredModule("finance")
export class FinanceController {
  constructor(
    private readonly financeService: FinanceService,
    private readonly prisma: PrismaService,
  ) {}

  @Get("overview")
  async getOverview(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;

    // 1. Revenue YTD (from RetailOrders COMPLETED/PAID/complete/paid)
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const revenueAggr = await this.prisma.retailOrder.aggregate({
      where: {
        tenantId,
        status: { in: ["COMPLETED", "PAID", "complete", "paid"] },
        createdAt: { gte: yearStart },
      },
      _sum: { totalAmount: true },
    });
    const revenueYtd = revenueAggr._sum.totalAmount?.toNumber() || 0;

    // 2. Operating Expenses (from Payables PAID)
    const expensesAggr = await this.prisma.payable.aggregate({
      where: { tenantId, status: "PAID" },
      _sum: { amount: true },
    });
    const expenses = expensesAggr._sum.amount?.toNumber() || 0;

    // 3. Billing Queue (Pending Receivables)
    const pendingReceivables = await this.prisma.receivable.findMany({
      where: { tenantId, status: { in: ["PENDING", "OVERDUE"] } },
      take: 3,
      orderBy: { dueDate: "asc" },
      select: { id: true, amount: true, status: true, dueDate: true },
    });

    // 4. Net Margin
    const margin =
      revenueYtd === 0 ? 0 : ((revenueYtd - expenses) / revenueYtd) * 100;

    // Format revenue as IDR (native currency) or USD
    const formatCurrency = (amount: number) => {
      if (amount >= 1_000_000_000)
        return `IDR ${(amount / 1_000_000_000).toFixed(2)}B`;
      if (amount >= 1_000_000) return `IDR ${(amount / 1_000_000).toFixed(2)}M`;
      if (amount >= 1_000) return `IDR ${(amount / 1_000).toFixed(0)}K`;
      return `IDR ${amount.toLocaleString()}`;
    };

    const financialSummary = [
      {
        id: "sum-1",
        label: "Revenue YTD",
        value: formatCurrency(revenueYtd),
        delta: "Live DB",
      },
      {
        id: "sum-2",
        label: "Operating expenses",
        value: formatCurrency(expenses),
        delta: "Live DB",
      },
      {
        id: "sum-3",
        label: "Net margin",
        value: `${margin.toFixed(1)}%`,
        delta: "Calculated",
      },
      {
        id: "sum-4",
        label: "Cash position",
        value: "Real-time",
        delta: "Stable",
      },
    ];

    const billingQueue = pendingReceivables.map((r: any) => ({
      id: r.id,
      title: `Invoice (INV-${r.id.substring(0, 4)})`,
      amount: formatCurrency(Number(r.amount)),
      status: r.status === "OVERDUE" ? "Overdue" : "Pending approval",
      due: r.dueDate > new Date() ? "Upcoming" : "Past due",
    }));

    if (billingQueue.length === 0) {
      billingQueue.push({
        id: "mock-1",
        title: "No pending invoices",
        amount: "IDR 0",
        status: "Complete",
        due: "-",
      });
    }

    // ================================================================
    // MODULE CONTRIBUTIONS — Retail
    // Only populated when retail module is active for this tenant
    // ================================================================
    let retailContribution: Record<string, any> | null = null;

    const retailIsActive = await isModuleActive(
      this.prisma,
      tenantId,
      "retail",
    );
    if (retailIsActive) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);

      // Weekly revenue from retail
      const weekRevAggr = await this.prisma.retailOrder.aggregate({
        where: {
          tenantId,
          status: { in: ["COMPLETED", "PAID", "complete", "paid"] },
          createdAt: { gte: weekStart },
        },
        _sum: { totalAmount: true },
        _count: { id: true },
      });
      const weekRevenue = weekRevAggr._sum.totalAmount?.toNumber() || 0;
      const orderCount = weekRevAggr._count.id || 0;
      const avgBasket = orderCount > 0 ? weekRevenue / orderCount : 0;

      // Today's order count
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayOrderCount = await this.prisma.retailOrder.count({
        where: {
          tenantId,
          createdAt: { gte: todayStart },
        },
      });

      // Top selling category this week (by total revenue via order items)
      const topCategoryRows = await this.prisma.retailOrderItem.groupBy({
        by: ["productId"],
        where: {
          order: {
            tenantId,
            status: { in: ["COMPLETED", "PAID", "complete", "paid"] },
            createdAt: { gte: weekStart },
          },
        },
        _sum: { totalPrice: true },
        orderBy: { _sum: { totalPrice: "desc" } },
        take: 1,
      });

      let topCategory = "N/A";
      if (topCategoryRows.length > 0) {
        const topProduct = await this.prisma.product.findUnique({
          where: { id: topCategoryRows[0].productId },
          select: { category: { select: { name: true } } },
        });
        topCategory = topProduct?.category?.name ?? "General";
      }

      retailContribution = {
        moduleId: "retail",
        moduleName: "Retail Operations",
        weeklyRevenue: formatCurrency(weekRevenue),
        weeklyOrderCount: orderCount,
        ordersToday: todayOrderCount,
        avgBasketValue: formatCurrency(avgBasket),
        topCategory,
      };
    }

    return {
      success: true,
      tenantId,
      data: {
        financialSummary,
        billingQueue,
        taxReports: [
          {
            id: "tax-1",
            title: "Monthly VAT Summary",
            status: "Ready",
            due: "Submit by 10th",
          },
          {
            id: "tax-2",
            title: "Quarterly GST Return",
            status: "In review",
            due: "Review by 14th",
          },
        ],
        auditReadiness: [
          {
            id: "aud-1",
            label: "Ledger reconciliation",
            status: "Complete",
            note: "Synced with DB",
          },
          {
            id: "aud-2",
            label: "Revenue recognition",
            status: "In progress",
            note: "Automated match",
          },
        ],
        // Populated only when industry modules are active:
        moduleContributions: {
          retail: retailContribution,
        },
      },
    };
  }

  // Ledger & Transactions
  @Get("ledger")
  async getLedger(
    @Req() request: RequestWithTenant,
    @Query("locationId") locationId?: string,
  ) {
    const { tenantId } = request.tenantContext;
    const ledger = await this.financeService.getLedger(tenantId, locationId);
    return { success: true, tenantId, data: ledger };
  }

  @Get("invoices")
  async listInvoices(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.financeService.listInvoices(tenantId);
    return { success: true, tenantId, data };
  }

  @Get("payroll/entries")
  async getPayrollEntries(
    @Req() request: RequestWithTenant,
    @Query("period") period?: string,
  ) {
    const { tenantId } = request.tenantContext;
    const data = await this.financeService.getPayrollEntries(tenantId, period);
    return { success: true, tenantId, data };
  }

  @Get("payroll/estimate")
  async estimatePayroll(
    @Req() request: RequestWithTenant,
    @Query("period") period: string,
  ) {
    const { tenantId } = request.tenantContext;
    const data = await this.financeService.estimatePayroll(tenantId, period);
    return { success: true, tenantId, data };
  }

  @Post("payroll/run")
  async executePayrollRun(
    @Req() request: RequestWithTenant,
    @Body("period") period: string,
  ) {
    const { tenantId, userId } = request.tenantContext;
    await this.financeService.executePayrollRun(tenantId, period, userId || "SYSTEM");
    return { success: true, tenantId };
  }

  @Post("ledger")
  async createJournal(
    @Req() request: RequestWithTenant,
    @Body() createJournalDto: CreateJournalDto,
  ) {
    const { tenantId, userId } = request.tenantContext;
    const journal = await this.financeService.createJournal(
      tenantId,
      createJournalDto,
      userId!,
    );
    return { success: true, tenantId, data: journal };
  }

  @Post("transactions")
  async createTransaction(
    @Req() request: RequestWithTenant,
    @Body() createTransactionDto: CreateTransactionDto,
  ) {
    const { tenantId, locationId, userId } = request.tenantContext;
    if (locationId && !createTransactionDto.locationId) {
      createTransactionDto.locationId = locationId;
    }
    const transaction = await this.financeService.createTransaction(
      tenantId,
      createTransactionDto,
      userId!,
    );
    return { success: true, tenantId, data: transaction };
  }

  @Get("balance")
  async getBalance(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const balance = await this.financeService.getBalance(tenantId);
    return { success: true, tenantId, data: balance };
  }

  @Post("transactions/import")
  @UseInterceptors(FileInterceptor("file"))
  async importTransactions(
    @Req() request: RequestWithTenant,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const { tenantId, userId } = request.tenantContext;
    const fileType = file.originalname.endsWith(".csv") ? "csv" : "xlsx";

    const result = await this.financeService.importTransactions(
      tenantId,
      file.buffer,
      fileType,
      userId!,
    );

    return {
      success: true,
      tenantId,
      message: `Imported ${result.imported} transactions`,
      errors: result.errors,
    };
  }

  @Get("ledger/export")
  async exportLedger(@Req() request: RequestWithTenant, @Res() res: Response) {
    const { tenantId, userId } = request.tenantContext;
    const buffer = await this.financeService.exportLedger(tenantId, userId!);

    res.set({
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="ledger_${tenantId}_${Date.now()}.xlsx"`,
      "Content-Length": buffer.length,
    });

    res.end(buffer);
  }

  // Assets
  @Get("assets")
  async listAssets(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.financeService.listAssets(tenantId);
    return { success: true, data };
  }

  @Post("assets/:id/status")
  async updateAssetStatus(
    @Req() request: RequestWithTenant,
    @Param("id") id: string,
    @Body() body: { status: string },
  ) {
    const { tenantId, userId } = request.tenantContext;
    const data = await this.financeService.updateAssetStatus(
      tenantId,
      id,
      body.status,
      userId!,
    );
    return { success: true, data };
  }

  @Post("assets/:id/capitalize")
  async capitalizeAsset(
    @Req() request: RequestWithTenant,
    @Param("id") id: string,
    @Body() body: { capitalizationDate: string },
  ) {
    const { tenantId, userId } = request.tenantContext;
    const data = await this.financeService.capitalizeAsset(
      tenantId,
      id,
      body.capitalizationDate,
      userId!,
    );
    return { success: true, data };
  }

  // Capex
  @Get("capex/requests")
  async listCapexRequests(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.financeService.listCapexRequests(tenantId);
    return { success: true, data };
  }

  @Post("capex/requests")
  async createCapexRequest(
    @Req() request: RequestWithTenant,
    @Body() body: any,
  ) {
    const { tenantId, userId } = request.tenantContext;
    const data = await this.financeService.createCapexRequest(
      tenantId,
      body,
      userId!,
    );
    return { success: true, data };
  }

  @Get("capex/budgets")
  async listCapexBudgets(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.financeService.listCapexBudgets(tenantId);
    return { success: true, data };
  }

  @Post("capex/budgets")
  async setCapexBudget(@Req() request: RequestWithTenant, @Body() body: any) {
    const { tenantId } = request.tenantContext;
    await this.financeService.setCapexBudget(tenantId, body);
    return { success: true };
  }

  @Post("capex/requests/:id/approve")
  async approveCapexRequest(
    @Req() request: RequestWithTenant,
    @Param("id") id: string,
  ) {
    const { tenantId, userId } = request.tenantContext;
    const data = await this.financeService.approveCapexRequest(
      tenantId,
      id,
      userId!,
    );
    return { success: true, data };
  }

  @Post("capex/requests/:id/reject")
  async rejectCapexRequest(
    @Req() request: RequestWithTenant,
    @Param("id") id: string,
  ) {
    const { tenantId, userId } = request.tenantContext;
    const data = await this.financeService.rejectCapexRequest(
      tenantId,
      id,
      userId!,
    );
    return { success: true, data };
  }

  // Depreciation
  @Get("assets/depreciation")
  async listAssetDepreciationEntries(
    @Req() request: RequestWithTenant,
    @Query("assetId") assetId?: string,
  ) {
    const { tenantId } = request.tenantContext;
    const data = await this.financeService.listAssetDepreciationEntries(
      tenantId,
      assetId,
    );
    return { success: true, data };
  }

  @Post("assets/depreciation/schedule-run")
  async runScheduledPeriodDepreciation(
    @Req() request: RequestWithTenant,
    @Body() body: any,
  ) {
    const { tenantId } = request.tenantContext;
    const data = await this.financeService.runScheduledPeriodDepreciation(
      tenantId,
      body.periodStart,
      body.periodEnd,
    );
    return { success: true, data };
  }

  @Post("assets/:id/depreciation")
  async postDepreciation(
    @Req() request: RequestWithTenant,
    @Param("id") id: string,
    @Body() body: any,
  ) {
    const { tenantId } = request.tenantContext;
    const data = await this.financeService.createDepreciationEntry(tenantId, {
      ...body,
      assetId: id,
    });
    return { success: true, data };
  }

  // Events
  @Get("assets/events")
  async listAssetEvents(
    @Req() request: RequestWithTenant,
    @Query("assetId") assetId?: string,
  ) {
    const { tenantId } = request.tenantContext;
    const data = await this.financeService.listAssetEvents(tenantId, assetId);
    return { success: true, data };
  }

  @Post("assets/:id/impairment")
  async recordAssetImpairment(
    @Req() request: RequestWithTenant,
    @Param("id") id: string,
    @Body() body: any,
  ) {
    const { tenantId } = request.tenantContext;
    const data = await this.financeService.createAssetEvent(tenantId, {
      ...body,
      assetId: id,
      type: "IMPAIRMENT",
    });
    return { success: true, data };
  }

  @Post("assets/:id/revaluation")
  async recordAssetRevaluation(
    @Req() request: RequestWithTenant,
    @Param("id") id: string,
    @Body() body: any,
  ) {
    const { tenantId } = request.tenantContext;
    const data = await this.financeService.createAssetEvent(tenantId, {
      ...body,
      assetId: id,
      type: "REVALUATION",
    });
    return { success: true, data };
  }

  @Post("assets/:id/disposal")
  async disposeAsset(
    @Req() request: RequestWithTenant,
    @Param("id") id: string,
    @Body() body: any,
  ) {
    const { tenantId } = request.tenantContext;
    const data = await this.financeService.createAssetEvent(tenantId, {
      ...body,
      assetId: id,
      type: "DISPOSAL",
    });
    return { success: true, data };
  }

  @Get("assets/:id/audit-pack")
  async getAssetAuditPack(
    @Req() request: RequestWithTenant,
    @Param("id") id: string,
  ) {
    const { tenantId } = request.tenantContext;
    const data = await this.financeService.getAssetAuditPack(tenantId, id);
    return { success: true, data };
  }

  // Receivables
  @Get("receivables")
  async listReceivables(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.financeService.listReceivables(tenantId);
    return { success: true, data };
  }

  @Post("receivables")
  async createReceivable(@Req() request: RequestWithTenant, @Body() body: any) {
    const { tenantId } = request.tenantContext;
    const data = await this.financeService.createReceivable(tenantId, body);
    return { success: true, data };
  }

  @Post("receivables/:id/mark-received")
  async markReceivableReceived(
    @Req() request: RequestWithTenant,
    @Param("id") id: string,
  ) {
    const { tenantId } = request.tenantContext;
    await this.financeService.markReceivableReceived(tenantId, id);
    return { success: true };
  }

  @Post("receivables/:id/remind")
  async sendReceivableReminder(
    @Req() request: RequestWithTenant,
    @Param("id") id: string,
  ) {
    const { tenantId } = request.tenantContext;
    await this.financeService.sendReceivableReminder(tenantId, id);
    return { success: true };
  }

  // Payables
  @Get("payables")
  async listPayables(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.financeService.listPayables(tenantId);
    return { success: true, data };
  }

  @Post("payables")
  async createPayable(@Req() request: RequestWithTenant, @Body() body: any) {
    const { tenantId } = request.tenantContext;
    const data = await this.financeService.createPayable(tenantId, body);
    return { success: true, data };
  }

  @Post("payables/:id/approve")
  async approvePayable(
    @Req() request: RequestWithTenant,
    @Param("id") id: string,
  ) {
    const { tenantId } = request.tenantContext;
    const data = await this.financeService.approvePayable(tenantId, id);
    return { success: true, data };
  }

  @Post("payables/:id/mark-paid")
  async markPayablePaid(
    @Req() request: RequestWithTenant,
    @Param("id") id: string,
  ) {
    const { tenantId } = request.tenantContext;
    await this.financeService.markPayablePaid(tenantId, id);
    return { success: true };
  }

  // Money Sources
  @Get("money-sources")
  async getMoneySources(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.financeService.getMoneySources(tenantId);
    return { success: true, data };
  }

  // Treasury
  @Get("treasury/sources")
  async getTreasurySources(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.financeService.getMoneySources(tenantId);
    return { success: true, data };
  }

  @Get("treasury/transfers")
  async listTreasuryTransfers(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.financeService.listTransfers(tenantId);
    return { success: true, data };
  }

  @Post("treasury/transfers")
  async createTreasuryTransfer(
    @Req() request: RequestWithTenant,
    @Body() body: any,
  ) {
    const { tenantId, userId } = request.tenantContext;
    const data = await this.financeService.createTransfer(
      tenantId,
      body,
      userId!,
    );
    return { success: true, data };
  }

  @Post("treasury/reconcile")
  async reconcileSettlement(
    @Req() request: RequestWithTenant,
    @Body() body: { sourceId: string; amount: number },
  ) {
    const { tenantId, userId } = request.tenantContext;
    await this.financeService.reconcileSettlement(
      tenantId,
      body.sourceId,
      body.amount,
      userId!,
    );
    return { success: true };
  }

  // Payments
  @Get("payments")
  async listPayments(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.financeService.listPayments(tenantId);
    return { success: true, data };
  }

  @Post("payment-requests")
  async createPaymentRequest(
    @Req() request: RequestWithTenant,
    @Body() body: any,
  ) {
    const { tenantId } = request.tenantContext;
    const userId = (request.tenantContext as any).userId || "system";
    const tenantRole = (request as any).headers?.["x-tenant-role"] || "MEMBER";
    const data = await this.financeService.createPaymentRequest(
      tenantId,
      body,
      userId,
      tenantRole,
    );
    return { success: true, data };
  }

  @Post("payments/:id/status")
  async updatePaymentStatus(
    @Req() request: RequestWithTenant,
    @Param("id") id: string,
    @Body() body: { status: string },
  ) {
    const { tenantId } = request.tenantContext;
    await this.financeService.updatePaymentStatus(tenantId, id, body.status);
    return { success: true };
  }

  // Documents
  @Get("documents")
  async listDocuments(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.financeService.listDocuments(tenantId);
    return { success: true, data };
  }

  // Policies & Periods
  @Get("policies")
  async listPolicies(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.financeService.listPolicies(tenantId);
    return { success: true, data };
  }

  @Get("periods")
  async listPeriods(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.financeService.listPeriods(tenantId);
    return { success: true, data };
  }

  // Insights
  @Get("insights")
  async getInsights(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.financeService.getInsights(tenantId);
    return { success: true, data };
  }

  @Get("alerts")
  async getAlerts(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    // Real alerts: overdue payables + pending payment requests
    const alerts: {
      id: string;
      title: string;
      description: string;
      severity: string;
      action?: string;
    }[] = [];

    try {
      const overdueBills = await this.prisma.payable.findMany({
        where: {
          tenantId,
          dueDate: { lt: new Date() },
          status: { not: "PAID" },
        },
        take: 5,
        orderBy: { dueDate: "asc" },
      });
      for (const b of overdueBills) {
        alerts.push({
          id: `overdue-${b.id}`,
          title: `Overdue Payable: ${b.vendorName}`,
          description: `Payable for ${b.currency} ${Number(b.amount).toLocaleString()} is overdue since ${new Date(b.dueDate).toLocaleDateString()}`,
          severity: "high",
          action: "Pay Now",
        });
      }
    } catch {
      /* table may not exist */
    }

    try {
      const pendingPayments = await this.prisma.paymentTransaction.findMany({
        where: { tenantId, status: { in: ["SUBMITTED", "PENDING_APPROVAL"] } },
        take: 5,
        orderBy: { createdAt: "desc" },
      });
      for (const p of pendingPayments) {
        alerts.push({
          id: `pending-${p.id}`,
          title: `Pending Approval: ${p.destination || "Payment Request"}`,
          description: `${p.currency} ${Number(p.amount).toLocaleString()} awaiting finance approval`,
          severity: "medium",
          action: "Review",
        });
      }
    } catch {
      /* table may not exist */
    }

    return { success: true, data: alerts };
  }

  @Get("inbox")
  async getInbox(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const inbox: {
      id: string;
      entityId: string;
      entityType: string;
      status: string;
      makerDept: string;
      destinationDept: string;
      requestedBy: string;
    }[] = [];

    try {
      const pendingPayments = await this.prisma.paymentTransaction.findMany({
        where: { tenantId, status: { in: ["SUBMITTED", "PENDING_APPROVAL"] } },
        take: 20,
        orderBy: { createdAt: "desc" },
      });
      for (const p of pendingPayments) {
        inbox.push({
          id: p.id,
          entityId: p.id.substring(0, 8).toUpperCase(),
          entityType: "PAYMENT_REQUEST",
          status: "PENDING",
          makerDept: "OPERATIONS",
          destinationDept: "FINANCE",
          requestedBy: p.createdBy || "Unknown",
        });
      }
    } catch {
      /* table may not exist */
    }

    try {
      const pendingCapex = await this.prisma.capexRequest.findMany({
        where: {
          tenantId,
          status: {
            in: ["PENDING", "PENDING_HOD_APPROVAL", "PENDING_CFO_APPROVAL"],
          },
        },
        take: 10,
        orderBy: { createdAt: "desc" },
      });
      for (const c of pendingCapex) {
        inbox.push({
          id: c.id,
          entityId: c.id.substring(0, 8).toUpperCase(),
          entityType: "CAPEX_REQUEST",
          status: "PENDING",
          makerDept: c.department || "OPERATIONS",
          destinationDept: "FINANCE",
          requestedBy: c.requestedBy || "Unknown",
        });
      }
    } catch {
      /* table may not exist */
    }

    return { success: true, data: inbox };
  }
}
