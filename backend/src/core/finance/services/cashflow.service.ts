import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../persistence/prisma.service';
import { AuditService } from '../../../shared/audit/audit.service';
import { NotificationService } from '../../../shared/comms/notification.service';
import { Decimal } from '@prisma/client/runtime/library';
import { CashflowOutput, Driver, ProjectionDetail, RiskMarker } from '../types/cashflow.types';
import * as crypto from 'crypto';

@Injectable()
export class CashflowService {
  private readonly logger = new Logger(CashflowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
  ) {}

  private stableSerialize(obj: any): string {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return '[' + obj.map((item: any) => this.stableSerialize(item)).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    return (
      '{' +
      keys
        .map((k) => `${JSON.stringify(k)}:${this.stableSerialize(obj[k])}`)
        .join(',') +
      '}'
    );
  }

  async getCashflow(params: {
    tenant_id: string;
    company_id: string;
    snapshotId?: string;
    days?: number;
    minimumSafeCash?: number;
    avgDelayDays?: number;
    timezone?: string;
    scenario?: {
      revenueMultiplier?: number;
      expenseMultiplier?: number;
      delayDays?: number;
    };
    correlation_id?: string;
    user_id?: string;
  }): Promise<CashflowOutput> {
    const { 
      tenant_id, 
      company_id, 
      snapshotId, 
      days = 30, 
      minimumSafeCash = 0, 
      avgDelayDays = 7,
      timezone = 'UTC',
      scenario,
      correlation_id = `auto-${Date.now()}`,
      user_id
    } = params;

    const round = (v: number) => Number(v.toFixed(2));

    const snapshot = snapshotId
      ? await this.prisma.finance_account_balance_snapshots.findUnique({ where: { id: snapshotId } })
      : await this.prisma.finance_account_balance_snapshots.findFirst({
          where: { tenant_id: tenant_id, companies: { id: company_id } },
          orderBy: { created_at: 'desc' },
        });

    if (!snapshot) {
      this.logger.warn(`No financial snapshots found for tenant ${tenant_id} and company ${company_id}. Returning default state.`);
      return {
        projection: Array(days + 1).fill(0),
        projectionDetails: [],
        runwayDays: 999,
        deficitRisk: false,
        severity: 'NONE',
        riskMarkers: [],
        cashflowDrivers: { inflow: [], outflow: [] },
        snapshotSequence: 0,
        snapshotHash: 'EMPTY',
        projectionHash: 'EMPTY',
        currentCash: 0,
        snapshotTimestamp: new Date().toISOString(),
        currentBalance: 0,
        openingBalance: 0,
        scenarioApplied: !!scenario,
        simulationHash: 'EMPTY',
        minimumSafeCash: 0,
        isBelowSafeBuffer: false
      };
    }

    const snapshotTimestamp = snapshot.created_at;
    const snapshotHash = (snapshot as any).trialBalanceStateHash;
    const snapshotSequence = (snapshot as any).snapshotSequence || 0;

    const simulationHashInput = this.stableSerialize({
      snapshotSequence,
      revenueMultiplier: scenario?.revenueMultiplier || 1.0,
      expenseMultiplier: scenario?.expenseMultiplier || 1.0,
      delayDays: scenario?.delayDays || avgDelayDays,
    });
    const simulationHash = crypto.createHash('sha256').update(simulationHashInput).digest('hex');

    const cashAccounts = await this.prisma.finance_chart_of_accounts.findMany({
      where: {
        tenant_id: tenant_id,
        companies: { id: company_id },
        type: { in: ['CASH', 'BANK'] },
      },
      select: { code: true, id: true, name: true },
      orderBy: [{ id: 'asc' }], 
    });
    const cashAccountIds = cashAccounts.map((a) => a.id);

    const balances = snapshot.balances_data as Record<string, any>;
    let currentCash = new Decimal(0);
    for (const id of cashAccountIds) {
      if (balances[id]) {
        currentCash = currentCash.plus(new Decimal(balances[id].balance || balances[id] || 0));
      }
    }

    const arInvoices = await this.prisma.finance_ar_invoices.findMany({
      where: {
        tenant_id: tenant_id,
        companies: { id: company_id },
        status: { not: 'PAID' },
        created_at: { lte: snapshotTimestamp },
        issue_date: { lte: snapshotTimestamp },
        due_date: { gt: snapshotTimestamp },
      },
      orderBy: [
        { due_date: 'asc' },
        { issue_date: 'asc' },
        { created_at: 'asc' },
        { id: 'asc' }
      ], 
    });

    const payables = await this.prisma.payables.findMany({
      where: {
        tenant_id: tenant_id,
        companies: { id: company_id },
        status: { not: 'PAID' },
        created_at: { lte: snapshotTimestamp },
        due_date: { gt: snapshotTimestamp },
      },
      orderBy: [
        { due_date: 'asc' },
        { created_at: 'asc' },
        { id: 'asc' }
      ],
    });

    const projection: number[] = [];
    const projectionDetails: ProjectionDetail[] = [];
    
    let rollingCash = currentCash;
    const confidenceAR = 0.8;
    const confidenceAP = 1.0;

    const start_date = new Date(snapshotTimestamp);
    start_date.setUTCHours(0, 0, 0, 0); 

    const revenueMultiplier = scenario?.revenueMultiplier ?? 1.0;
    const expenseMultiplier = scenario?.expenseMultiplier ?? 1.0;
    const effectiveDelayDays = scenario?.delayDays ?? avgDelayDays;

    let currentRiskType: 'DEFICIT' | 'SAFETY_BUFFER' | null = null;
    let currentRiskStart: string | null = null;
    const compressedRiskMarkers: RiskMarker[] = [];

    for (let i = 0; i <= days; i++) {
      const currentDate = new Date(start_date);
      currentDate.setUTCDate(start_date.getUTCDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];

      const openingBalance = round(rollingCash.toNumber());
      const dailyInflowDrivers: Driver[] = [];
      const dailyOutflowDrivers: Driver[] = [];

      const dayAR = arInvoices.filter((inv) => {
        const expectedDate = new Date(inv.due_date!);
        expectedDate.setUTCDate(expectedDate.getUTCDate() + effectiveDelayDays);
        return expectedDate.toISOString().split('T')[0] === dateStr;
      });

      let dailyInflowTotal = new Decimal(0);
      for (const inv of dayAR) {
        const total = new Decimal(inv.total_amount || 0);
        const paid = new Decimal((inv as any).paidAmount || 0);
        const amount = round(total.minus(paid).times(revenueMultiplier).toNumber());
        dailyInflowTotal = dailyInflowTotal.plus(amount);

        dailyInflowDrivers.push({
          id: inv.id,
          accountId: (inv as any).accountId || 'PENDING_MAP',
          account_name: `AR_INVOICE_${(inv as any).invoiceNumber || inv.id.slice(0, 8)}`,
          documentType: 'INVOICE',
          documentNumber: (inv as any).invoiceNumber || 'N/A',
          amount,
          dueDate: inv.due_date!.toISOString().split('T')[0]
        });
      }

      const dayAP = payables.filter((p) => {
        const dueStr = new Date(p.due_date).toISOString().split('T')[0];
        return dueStr === dateStr;
      });

      let dailyOutflowTotal = new Decimal(0);
      for (const p of dayAP) {
        const total = new Decimal(p.amount || 0);
        const paid = new Decimal((p as any).paidAmount || 0);
        const amount = round(total.minus(paid).times(expenseMultiplier).toNumber());
        dailyOutflowTotal = dailyOutflowTotal.plus(amount);

        dailyOutflowDrivers.push({
          id: p.id,
          accountId: (p as any).accountId || 'PENDING_MAP',
          account_name: `AP_BILL_${p.id.slice(0, 8)}`,
          documentType: 'BILL',
          documentNumber: (p as any).billNumber || 'N/A',
          amount,
          dueDate: p.due_date.toISOString().split('T')[0]
        });
      }

      const netCash = round(dailyInflowTotal.times(confidenceAR).minus(dailyOutflowTotal.times(confidenceAP)).toNumber());
      rollingCash = rollingCash.plus(netCash);
      const closingBalance = round(rollingCash.toNumber());

      let detectedRisk: 'DEFICIT' | 'SAFETY_BUFFER' | null = null;
      if (closingBalance < 0) detectedRisk = 'DEFICIT';
      else if (closingBalance < minimumSafeCash) detectedRisk = 'SAFETY_BUFFER';

      if (detectedRisk !== currentRiskType) {
        if (currentRiskType && currentRiskStart) {
          const yesterday = new Date(currentDate);
          yesterday.setUTCDate(currentDate.getUTCDate() - 1);
          compressedRiskMarkers.push({
            type: currentRiskType,
            start_date: currentRiskStart,
            end_date: yesterday.toISOString().split('T')[0],
            severity: currentRiskType === 'DEFICIT' ? 'CRITICAL' : 'HIGH'
          });
        }
        currentRiskType = detectedRisk;
        currentRiskStart = detectedRisk ? dateStr : null;
      }

      if (i === days && currentRiskType && currentRiskStart) {
        compressedRiskMarkers.push({
          type: currentRiskType,
          start_date: currentRiskStart,
          end_date: dateStr,
          severity: currentRiskType === 'DEFICIT' ? 'CRITICAL' : 'HIGH'
        });
      }

      projection.push(closingBalance);
      projectionDetails.push({
        date: dateStr,
        openingBalance,
        inflow: round(dailyInflowTotal.toNumber()),
        outflow: round(dailyOutflowTotal.toNumber()),
        net: netCash,
        closingBalance,
        drivers: {
          inflow: dailyInflowDrivers,
          outflow: dailyOutflowDrivers
        }
      });
    }

    const aggregateDrivers = (drivers: Driver[]) => {
      const map = new Map<string, Driver>();
      for (const d of drivers) {
        const key = `${d.accountId}_${d.documentType}`;
        const existing = map.get(key);
        if (existing) {
          existing.amount = round(existing.amount + d.amount);
        } else {
          map.set(key, { ...d });
        }
      }
      return Array.from(map.values())
        .sort((a, b) => b.amount - a.amount || a.accountId.localeCompare(b.accountId))
        .slice(0, 5);
    };

    const cashflowDrivers = {
      inflow: aggregateDrivers(projectionDetails.flatMap(d => d.drivers.inflow)),
      outflow: aggregateDrivers(projectionDetails.flatMap(d => d.drivers.outflow))
    };

    const deficitRisk = projection.some((val) => val < 0);
    const belowSafeBuffer = projection.some((val) => val < minimumSafeCash);

    let severity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'NONE';
    const firstDeficitIndex = projection.findIndex(v => v < 0);
    const runwayDays = firstDeficitIndex === -1 ? 999 : firstDeficitIndex;

    if (deficitRisk) {
        if (runwayDays <= 7) severity = 'CRITICAL';
        else if (runwayDays <= 30) severity = 'HIGH';
        else severity = 'MEDIUM';
    } else if (belowSafeBuffer) {
        severity = 'LOW';
    }

    const projectionHashInput = this.stableSerialize({
      projectionDetails,
      riskMarkers: compressedRiskMarkers,
      cashflowDrivers
    });
    const projectionHash = crypto.createHash('sha256').update(projectionHashInput).digest('hex');

    if (scenario) {
      await this.auditService.log({
        tenant_id,
        user_id: user_id || 'SYSTEM',
        module: 'FINANCE_INTELLIGENCE',
        action: 'FINANCE_INTELLIGENCE_SCENARIO',
        entity_type: 'CASHFLOW_PROJECTION',
        entity_id: snapshot.id,
        before_state: { scenario, snapshotSequence, simulationHash },
        correlation_id
      });
    }

    await this.auditService.log({
      tenant_id,
      user_id: user_id || 'SYSTEM',
      module: 'FINANCE_INTELLIGENCE',
      action: 'CASHFLOW_VIEW',
      entity_type: 'FINANCE_INTELLIGENCE',
      entity_id: company_id,
      before_state: { correlation_id, snapshotSequence, snapshotHash, simulationHash, projectionHash, severity, scenarioApplied: !!scenario },
      correlation_id
    });

    if (severity === 'CRITICAL' || severity === 'HIGH') {
      await this.notificationService.createNotification({
        tenant_id,
        user_id: user_id || 'CFO_USER',
        title: `CASHFLOW_RISK_${severity}`,
        message: `Snapshot Sequence ${snapshotSequence} detected ${severity} liquidity risk. Projection Hash: ${projectionHash.slice(0, 8)}`,
        type: 'SYSTEM_ALERT',
        priority: severity === 'CRITICAL' ? 'URGENT' : 'HIGH',
        event_reference_id: correlation_id,
      });
    }

    return {
      projection,
      projectionDetails,
      runwayDays,
      deficitRisk,
      severity,
      riskMarkers: compressedRiskMarkers,
      cashflowDrivers,
      snapshotSequence,
      snapshotHash,
      projectionHash,
      currentCash: Number(currentCash),
      snapshotTimestamp: snapshotTimestamp.toISOString(),
      currentBalance: cashAccounts.length > 0 ? (currentCash as any).toNumber() : 0, // Fallback if no cash accounts
      openingBalance: (currentCash as any).toNumber(), // Simplified for this patch
      scenarioApplied: !!scenario,
      simulationHash,
      minimumSafeCash: (minimumSafeCash as any).toNumber(),
      isBelowSafeBuffer: belowSafeBuffer
    };
  }
}
