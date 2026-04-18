import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../persistence/prisma.service';
import { Prisma } from '@prisma/client';
import { ReportingEngineService } from './reporting-engine.service';
import { FinancialSnapshotService } from './financial-snapshot.service';
import { NotificationService } from '../../../shared/comms/notification.service';
import { LoggerService } from '../../../shared/logger/logger.service';
import { createHmac, createHash } from 'crypto';

export type FinancialHealthStatus = 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
export interface FinancialHealth {
  score: number;
  status: FinancialHealthStatus;
  dominantIssueType: string;
  lastUpdatedAt: string;
}

@Injectable()
export class FinancialDashboardService {
  private readonly logger = new Logger(FinancialDashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reportingEngine: ReportingEngineService,
    private readonly snapshotService: FinancialSnapshotService,
    private readonly notificationService: NotificationService,
    private readonly systemLogger: LoggerService,
  ) {}

  async getDashboardSummary(tenant_id: string, company_id: string, filters: any) {
    // 1. Fetch Summary
    const summary = await this.reportingEngine.getSummary(tenant_id, company_id, filters);

    // 2. Anomaly Detection: Sequence Mismatch
    // We check if the returned sequence is consistent with the latest available for the period
    const latestSnapshot = await this.prisma.finance_account_balance_snapshots.findFirst({
      where: { 
        tenant_id: tenant_id, 
        fiscal_period_id: filters.periodId 
      },
      orderBy: { created_at: 'desc' },
    });

    if (latestSnapshot && summary.sequence < (latestSnapshot as any).snapshotSequence) {
      this.handleAnomaly(tenant_id, company_id, 'SEQUENCE_MISMATCH', 
        `Dashboard sequence ${summary.sequence} is behind latest ${ (latestSnapshot as any).snapshotSequence }`,
        { requestedPeriod: filters.periodId, currentSequence: summary.sequence, latestSequence: (latestSnapshot as any).snapshotSequence }
      );
    }

    // 3. Anomaly Detection: Imbalance
    // Check if total debits vs credits match in the summary or snapshots
    if (summary.kpis) {
      const lPlusE = summary.kpis.totalLiabilities.plus(summary.kpis.totalEquity);
      const diff = summary.kpis.totalAssets.minus(lPlusE).abs();
      
      if (diff.gt(0.01)) {
        this.handleAnomaly(tenant_id, company_id, 'LEDGER_IMBALANCE',
          `Balance sheet imbalance detected: Assets=${summary.kpis.totalAssets}, L+E=${lPlusE}`,
          { kpis: summary.kpis }
        );
      }
    }

    // Step 4: Snapshot Hashing (Crypto Proof)
    const snapshotHash = this.computeSnapshotHash(summary);

    return {
      ...summary,
      snapshotHash,
      healthStatus: await this.getSystemHealth(tenant_id, company_id, filters.periodId),
    };
  }

  async getHierarchicalReport(tenant_id: string, company_id: string, filters: any) {
    return this.reportingEngine.getHierarchicalReport(tenant_id, company_id, filters);
  }

  async getDrillDown(tenant_id: string, company_id: string, filters: any) {
    // Implement drill-down to ledger lines
    // This would typically involve querying finance_journal_lines
    const { accountId, periodId, snapshotSequence } = filters;
    
    return this.prisma.finance_journal_lines.findMany({
      where: {
        tenant_id: tenant_id,
        account_id: accountId,
        finance_journal_entries: {
          fiscal_period_id: periodId,
          // In a real system, we might filter by ledgerSequence <= snapshotSequence
        }
      },
      include: {
        finance_journal_entries: true,
      },
      take: 100, // Limit for performance
    });
  }

  async exportReport(tenant_id: string, company_id: string, filters: any, user_id: string) {
    const data = await this.getDashboardSummary(tenant_id, company_id, filters);
    const snapshotHash = (data as any).snapshotHash;
    
    // Add watermark metadata
    const exportId = `EXP-${Date.now()}`;
    const watermark = {
      generatedBy: user_id,
      timestamp: new Date().toISOString(),
      snapshotSequence: data.sequence,
      snapshotHash, // Step 4: Include in watermark
      tenant_id,
      company_id,
    };

    // Requirement 4: Export Integrity (HMAC-SHA256 Signature)
    const secret = process.env.FINANCE_EXPORT_SECRET || 'zenvix-finance-integrity-key-2026';
    
    // Fix 3: Export Signature Canonicalization (Stable Sort)
    const canonicalPayload = this.canonicalize({
      ...watermark,
      exportId,
      dataHash: createHmac('sha256', secret).update(this.canonicalize(data)).digest('hex'),
    });

    const signature = createHmac('sha256', secret)
      .update(canonicalPayload)
      .digest('hex');

    return {
      reportData: data,
      watermark: {
        ...watermark,
        signature,
      },
      exportId,
    };
  }

  async verifyExportSignature(data: any, signature: string, secret: string): Promise<boolean> {
    const canonicalPayload = this.canonicalize({
      ...data.watermark,
      exportId: data.exportId,
      // The hash now includes snapshotHash within watermark
      dataHash: createHmac('sha256', secret).update(this.canonicalize(data.reportData)).digest('hex'),
    });

    const recomputedSignature = createHmac('sha256', secret)
      .update(canonicalPayload)
      .digest('hex');

    return recomputedSignature === signature;
  }

  async getSystemHealth(tenant_id: string, company_id: string, periodId: string) {
    // Fix 4: Health Engine Weighted Scoring Model (Step 4: Rolling Window)
    const windowEnd = new Date();
    const windowStart = new Date(windowEnd.getTime() - 3600000); // Strictly 60 minutes
    
    const recentAnomalies = await this.prisma.system_logs.findMany({
      where: {
        tenant_id: tenant_id,
        module: 'FINANCE',
        created_at: { gte: windowStart, lte: windowEnd }, 
      },
    });

    let score = 0;
    let dominantIssueType = 'NONE';
    const issueCounts: Record<string, number> = {};

    recentAnomalies.forEach((log) => {
      let weight = 0;
      if (log.event.includes('IMBALANCE')) weight = 10;
      else if (log.event.includes('MISMATCH')) weight = 6;
      else if (log.level === 'ERROR') weight = 3;

      score += weight;
      
      const type = log.event.split('_').pop() || 'UNKNOWN';
      issueCounts[type] = (issueCounts[type] || 0) + 1;
    });

    // Determine dominant issue type
    if (Object.keys(issueCounts).length > 0) {
      dominantIssueType = Object.entries(issueCounts).reduce((a, b) => (a[1] > b[1] ? a : b))[0];
    }

    let status: FinancialHealthStatus = 'HEALTHY';
    if (score >= 20) status = 'CRITICAL';
    else if (score >= 5) status = 'DEGRADED';

    return {
      score,
      status,
      dominantIssueType: dominantIssueType === 'NONE' ? 'STABLE' : dominantIssueType,
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      lastUpdatedAt: windowEnd.toISOString(),
    };
  }

  /**
   * Step 4: Snapshot Hashing (Crypto Proof)
   */
  private computeSnapshotHash(data: any): string {
    // Focus on summary and KPI data to prove financial state
    const coreData = {
      sequence: data.sequence,
      periodId: data.periodId,
      kpis: data.kpis,
      company_id: data.company_id,
    };
    return createHash('sha256').update(this.canonicalize(coreData)).digest('hex');
  }

  /**
   * Fix 3: Export Signature Canonicalization
   * Sorts keys and stringifies in a stable manner.
   */
  private canonicalize(obj: any): string {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }

    if (Array.isArray(obj)) {
      return '[' + obj.map((item: any) => this.canonicalize(item)).join(',') + ']';
    }

    const sortedKeys = Object.keys(obj).sort();
    const result = sortedKeys
      .map((key) => {
        // Remove non-deterministic fields like 'timestamp' if needed, but for export we WANT the watermark timestamp.
        // We'll keep all for now unless explicitly non-deterministic per run.
        return `"${key}":${this.canonicalize(obj[key])}`;
      })
      .join(',');

    return '{' + result + '}';
  }

  private async handleAnomaly(tenant_id: string, company_id: string, type: string, message: string, payload: any) {
    this.logger.warn(`Anomaly Detected [${type}]: ${message}`);

    // 1. Log to SystemLog (Requirement 7)
    await this.systemLogger.log({
      tenant_id,
      module: 'FINANCE',
      level: 'WARN',
      event: `FINANCE_${type}`,
      message,
      payload,
    });

    // 2. Trigger Backend Notification (Requirement 6)
    // We notify "Finance Admin" users or similar (simplified for this pass)
    // In a real system, we'd resolve recipients based on permissions
    await this.notificationService.createNotification({
      tenant_id,
      user_id: 'FINANCE_ADMIN_GROUP', // Representing a group or system alert
      title: `Critical Finance Anomaly: ${type}`,
      message,
      type: 'FINANCE_ALERT',
      priority: 'HIGH',
      event_reference_id: `anomaly-${type}-${Date.now()}`,
    });
  }
}
