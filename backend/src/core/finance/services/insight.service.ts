import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../persistence/prisma.service';
import { CashflowService } from './cashflow.service';
import { AuditService } from '../../../shared/audit/audit.service';
import { Insight, InsightContext, InsightRule, InsightType } from '../types/insight.types';
import { InsightSnapshot } from '../types/insight-snapshot.types';
import * as crypto from 'crypto';

import { CashflowDeficitRule } from '../rules/cashflow-deficit.rule';
import { GlobalCoverageRule } from '../rules/global-coverage.rule';
import { TrendConsistencyRule } from '../rules/trend-consistency.rule';
import { ConcentrationRiskRule } from '../rules/concentration-risk.rule';

@Injectable()
export class InsightService {
  private readonly logger = new Logger(InsightService.name);
  private rules: InsightRule[] = [
    new GlobalCoverageRule(),
    new TrendConsistencyRule(),
    new ConcentrationRiskRule(),
    new CashflowDeficitRule(),
  ];



  constructor(
    private readonly prisma: PrismaService,
    private readonly cashflowService: CashflowService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Register a new diagnostic rule
   */
  registerRule(rule: InsightRule) {
    this.rules.push(rule);
  }

  /**
   * Deep Freeze Helper (A4)
   */
  private deepFreeze(obj: any) {
    Object.freeze(obj);
    Object.getOwnPropertyNames(obj).forEach((prop) => {
      if (
        obj.hasOwnProperty(prop) &&
        obj[prop] !== null &&
        (typeof obj[prop] === 'object' || typeof obj[prop] === 'function') &&
        !Object.isFrozen(obj[prop])
      ) {
        this.deepFreeze(obj[prop]);
      }
    });
    return obj;
  }

  /**
   * Deterministic Object Serialization (Key sorting)
   */
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

  /**
   * Collision-Proof Insight ID Generator (Extended Entropy Patch)
   */
  generateId(params: {
    type: string;
    accountId: string;
    sequence: number;
    source: 'ACTUAL' | 'FORECAST';
    forecastDay: number;
    coreInputs: any;
  }): string {
    const { type, accountId, sequence, source, forecastDay, coreInputs } = params;
    const envelope = [
        type,
        accountId || 'GLOBAL',
        sequence,
        source,
        forecastDay,
        this.stableSerialize(coreInputs)
    ].join(':');
    
    return crypto.createHash('sha256').update(envelope).digest('hex');
  }

  private validateCoreInputs(coreInputs: Record<string, any>) {
    for (const key in coreInputs) {
      const value = coreInputs[key];
      if (value === undefined) {
        throw new Error(`Invalid coreInputs: ${key} is undefined`);
      }
      if (value !== null && typeof value === 'object') {
        throw new Error(`Invalid coreInputs: ${key} must be primitive`);
      }
    }
  }

  private computeMetrics(cashflow: any, historicalSnapshots: any[], forecast?: any): any {
    const projection = forecast ? forecast.projection : cashflow.projectionDetails;
    const drivers = cashflow.cashflowDrivers || { inflow: [], outflow: [] };

    const trackedCount = drivers.inflow.length + drivers.outflow.length;
    // Mocked expected count for skeleton, in production this comes from GL/Sync status
    const expectedCount = trackedCount + 5; 
    const coverage = trackedCount > 0 ? trackedCount / expectedCount : 0.5;

    // Volatility: variance of previous snapshot balances
    let volatility = 0;
    if (historicalSnapshots.length >= 2) {
        const balances = historicalSnapshots.map(s => Number(s.closing_balance || 0));
        const mean = balances.reduce((a, b) => a + b, 0) / balances.length;
        const variance = balances.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / balances.length;
        volatility = Math.min(1.0, Math.sqrt(variance) / (mean || 1));
    }

    const totalCash = cashflow.currentBalance ?? (projection[0]?.openingBalance || 0);

    return {
      coverage,
      volatility,
      totalCash,
      anomalyCount: 0 // Placeholder
    };
  }

  private computeConfidenceLabel(metrics: any): 'HIGH' | 'MEDIUM' | 'LOW' {
    const coverageScore = metrics.coverage * 100;
    const anomalyScore = Math.max(0, 100 - (metrics.anomalyCount * 30));
    const volatilityScore = Math.max(0, 100 - (metrics.volatility * 100));

    let confidenceScore = (coverageScore * 0.5) + (anomalyScore * 0.3) + (volatilityScore * 0.2);
    
    // Clamp to 0-100 range (Patch Requirement)
    confidenceScore = Math.max(0, Math.min(100, confidenceScore));

    // Blueprint Thresholds (Patch Requirement)
    if (confidenceScore > 85) return 'HIGH';
    if (confidenceScore >= 65) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Main entry point for insight generation
   */
  async getInsights(params: {
    tenant_id: string;
    company_id: string;
    snapshotId?: string;
    correlation_id?: string;
    user_id?: string;
    forecast?: any;
  }): Promise<Insight[]> {
    const { tenant_id, company_id, snapshotId, correlation_id = `insight-${Date.now()}`, user_id, forecast } = params;

    const cashflow = forecast ? forecast.context?.cashflowBaseline : await this.cashflowService.getCashflow({
      tenant_id,
      company_id,
      snapshotId,
      correlation_id,
      user_id,
    });

    // STEP 1 & 2: QUERY DB FIRST (Idempotency Guard)
    const forecastHash = forecast?.forecastHash || null;
    const normalizedForecastHash = (forecastHash as string) ?? 'ACTUAL';
    const snapshotSequence = cashflow.snapshotSequence;

    const existing = await this.prisma.finance_insight_snapshots.findFirst({
      where: {
        tenant_id: tenant_id,
        company_id: company_id,
        snapshot_sequence: snapshotSequence,
        forecast_hash: normalizedForecastHash,
      },
    });

    if (existing) {
      this.logger.log(`[DB] HIT InsightSnapshot id=${existing.id} for sequence ${snapshotSequence}`, correlation_id);
      return (existing.payload as any) as Insight[];
    }



    const historicalSnapshots = await this.prisma.finance_account_balance_snapshots.findMany({
      where: { 
        tenant_id: tenant_id,
        company_id: company_id
      },
      orderBy: { created_at: 'desc' },
      take: 6,
    });

    const diagnosticsCashflow = forecast ? {
        ...cashflow,
        projectionDetails: forecast.projection 
    } : cashflow;

    const metrics = this.computeMetrics(diagnosticsCashflow, historicalSnapshots, forecast);

    const context: InsightContext = {
      tenant_id,
      company_id,
      snapshotSequence: cashflow.snapshotSequence,
      cashflow,
      historicalSnapshots,
      systemLogs: [],
      metrics,
      correlation_id,
    };
    this.deepFreeze(context);

    // 1. Rule Evaluation
    let validatedInsights: Insight[] = [];
    for (const rule of this.rules) {
      try {
        const results = rule.evaluate(context);
        
        for (const insight of results) {
          try {
            // 2. Validate coreInputs (Patch 2)
            this.validateCoreInputs(insight.explanation.coreInputs);

            // 3. Stage 1 — Partial Freeze (Patch 1/2)
            // We freeze the explanation and coreInputs to ensure logic grounding
            // Object.freeze(insight.explanation.coreInputs); // Removed, deepFreeze on snapshot handles this
            // Object.freeze(insight.explanation); // Removed, deepFreeze on snapshot handles this
            // if (insight.supportingData) Object.freeze(insight.supportingData); // Removed, deepFreeze on snapshot handles this

            validatedInsights.push(insight);
          } catch (valErr) {
            this.logger.error(`Rule ${rule.type} validation failed: ${valErr.message}`, correlation_id);
          }
        }
      } catch (err) {
        this.logger.error(`Rule ${rule.type} execution failed: ${err.message}`, correlation_id);
      }
    }

    if (validatedInsights.length === 0) {
      validatedInsights.push(this.createSystemHealthInsight(context.snapshotSequence));
    }

    // 4. Generate ID & Post-Processing (Source, Horizon, Confidence, Hash Binding)
    const insightsWithIds = validatedInsights.map(insight => {
        const source = forecast ? 'FORECAST' : 'ACTUAL';
        let timeHorizon = insight.timeHorizon;
        let forecastDay = 0; // Default for ACTUAL

        if (forecast && insight.explanation.coreInputs.date) {
            const baseDate = new Date(forecast.generatedAt || new Date());
            const targetDate = new Date(String(insight.explanation.coreInputs.date));
            forecastDay = Math.ceil((targetDate.getTime() - baseDate.getTime()) / (1000 * 3600 * 24));
            
            if (forecastDay <= 7) timeHorizon = 'IMMEDIATE';
            else if (forecastDay <= 30) timeHorizon = 'SHORT_TERM';
            else timeHorizon = 'MID_TERM';
        } else if (forecast) {
            // Fallback for forecast-driven insights without specific date (e.g. global coverage)
            forecastDay = 1; 
            timeHorizon = 'SHORT_TERM';
        }
     // Patch 2: Bind to Forecast Hash (Clone coreInputs to avoid mutate early)
        if (forecast) {
            insight.explanation.coreInputs = {
                ...insight.explanation.coreInputs,
                forecastHash: forecast.forecastHash
            };
        }

        const id = this.generateId({
            type: insight.type,
            accountId: insight.accountId || 'GLOBAL',
            sequence: context.snapshotSequence,
            source,
            forecastDay,
            coreInputs: insight.explanation.coreInputs
        });

        return { 
            ...insight, 
            id,
            source: source as "ACTUAL" | "FORECAST",
            forecastDay,
            timeHorizon,
            confidence: this.computeConfidenceLabel(context.metrics) 
        };
    });

    // 5. Final Pipeline (Normalization -> Sorting -> Hash -> Final Freeze)
    const processed = this.processPipeline(insightsWithIds);

    // STEP 4: Compute Hash (SHA-256 of FULL normalized insight array)
    const insightHash = crypto
      .createHash('sha256')
      .update(this.stableSerialize(processed))
      .digest('hex');

    // STEP 5: SAVE using TRANSACTION (Atomic write)
    try {
      await this.prisma.$transaction(async (tx) => {
        const created = await tx.finance_insight_snapshots.create({
          data: {
            id: crypto.randomUUID(),
            tenant_id,
            company_id,
            snapshot_sequence: snapshotSequence,
            forecast_hash: normalizedForecastHash,
            insight_hash: insightHash,
            payload: processed as any,
            created_at: new Date(),
          },
        });
        this.logger.log(`[DB] INSERT InsightSnapshot id=${created.id}`, correlation_id);
      });
    } catch (err) {
      // Concurrency Patch: If record was created by a parallel request, return the existing one gracefully
      if (err.code === 'P2002') {
        this.logger.warn(`[CONCURRENCY] InsightSnapshot unique constraint caught. Falling back to fetch.`, correlation_id);
        const lateExisting = await this.prisma.finance_insight_snapshots.findFirst({
          where: {
            tenant_id: tenant_id,
            company_id: company_id,
            snapshot_sequence: snapshotSequence,
            forecast_hash: normalizedForecastHash,
          },
        });
        if (lateExisting) {
          return (lateExisting.payload as any) as Insight[];
        }
      }
      throw err;
    }




    // A5. Audit Extension
    await this.auditService.log({
      tenant_id,
      user_id: user_id || 'SYSTEM',
      module: 'FINANCE_INSIGHTS',
      action: 'FINANCE_INSIGHT_SNAPSHOT_CREATED',
      entity_type: 'FINANCE_INTELLIGENCE',
      entity_id: company_id,
      before_state: { 
        snapshotSequence: cashflow.snapshotSequence, 
        insightCount: processed.length,
        forecastHash,
        insightHash,
        correlation_id 
      },
      correlation_id,
    });

    return processed;
  }

  /**
   * Cryptographic Integrity Verification for Insight Snapshots
   */
  async verifyInsightSnapshot(id: string): Promise<{ valid: boolean; reason?: string; expectedHash: string; actualHash: string }> {
    const snapshot = await this.prisma.finance_insight_snapshots.findUnique({ where: { id } });
    if (!snapshot) throw new Error('Insight snapshot not found');

    const actualHash = crypto
      .createHash('sha256')
      .update(this.stableSerialize(snapshot.payload))
      .digest('hex');

    const valid = actualHash === snapshot.insight_hash;
    if (!valid) {
      this.logger.error(`[INTEGRITY_FAILURE] InsightSnapshot ${id} hash mismatch! Expected: ${snapshot.insight_hash}, Actual: ${actualHash}`);
    }

    return {
      valid,
      reason: valid ? undefined : 'HASH_MISMATCH',
      expectedHash: snapshot.insight_hash,
      actualHash,
    };
  }


  async getSnapshotById(id: string): Promise<any> {
    return this.prisma.finance_insight_snapshots.findUnique({ where: { id } });
  }


  private processPipeline(insights: Insight[]): Insight[] {
    // A. Deduplication & Initial Normalization
    const groups = new Map<string, Insight[]>();
    for (const insight of insights) {
      const groupKey = insight.scope === 'ACCOUNT' 
        ? `${insight.accountId}` 
        : `${insight.type}`;
      
      const group = groups.get(groupKey) || [];
      group.push(this.normalizeInsight(insight));
      groups.set(groupKey, group);
    }

    let finalInsights: Insight[] = [];
    for (const [_, group] of groups) {
      // B. Sort group to determine isPrimary
      group.sort((a, b) => b.actionPriority - a.actionPriority);
      group.forEach((insight, idx) => {
        (insight as any).isPrimary = idx === 0;
        finalInsights.push(insight);
      });
    }

    // C. Deterministic Sorting (Tie-breaker system)
    finalInsights.sort((a, b) => {
      const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      const confOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };

      return (
        severityOrder[b.severity as keyof typeof severityOrder] - severityOrder[a.severity as keyof typeof severityOrder] ||
        confOrder[b.confidence as keyof typeof confOrder] - confOrder[a.confidence as keyof typeof confOrder] ||
        b.actionPriority - a.actionPriority ||
        a.type.localeCompare(b.type) ||
        (a.id || '').localeCompare(b.id || '')
      );
    });

    // D. Generate integrityHash AFTER sorting (Patch 1 Fix)
    for (const insight of finalInsights) {
        (insight as any).integrityHash = crypto
            .createHash('sha256')
            .update(this.stableSerialize(insight))
            .digest('hex');
        
        // Final Stage 2 Freeze on individual insight
        this.deepFreeze(insight);
    }

    return finalInsights;
  }

  private normalizeInsight(insight: Insight): Insight {
    return Object.freeze({
      ...insight,
      message: insight.message.trim(),
      recommendation: insight.recommendation.trim(),
      actionPriority: Number(insight.actionPriority.toFixed(2)),
    });
  }

  private createSystemHealthInsight(snapshotSequence: number): Insight {
    const coreInputs = { type: 'SYSTEM_HEALTH', snapshotSequence };
    return {
      id: '', // Will be generated in pipeline
      type: 'SYSTEM_HEALTH',
      scope: 'GLOBAL',
      severity: 'LOW',
      confidence: 'HIGH',
      timeHorizon: 'MID_TERM',
      actionPriority: 1.0,
      message: 'No liquidity risks detected. Operational patterns are stable.',
      recommendation: 'Maintain current financial oversight strategy.',
      isPrimary: true,
      explanation: {
        rule: 'SYSTEM_HEALTH_CHECK',
        inputsUsed: [],
        coreInputs
      },
      supportingData: {},
      tenant_id: 'N/A',
      company_id: 'N/A',
      snapshotSequence
    };
  }
}
