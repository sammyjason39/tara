import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../persistence/prisma.service';
import { CashflowService } from './cashflow.service';
import { ForecastContext, ForecastDay, ForecastOutput, ForecastModel } from '../types/forecast.types';
import * as crypto from 'crypto';
import { RevenueModel } from '../models/forecast/revenue.model';
import { ExpenseModel } from '../models/forecast/expense.model';
import { SeasonalityModel } from '../models/forecast/seasonality.model';

@Injectable()
export class ForecastService {
  private readonly logger = new Logger(ForecastService.name);
  private models: ForecastModel[] = [
    new RevenueModel(),
    new ExpenseModel(),
    new SeasonalityModel(),
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly cashflowService: CashflowService,
  ) {}

  /**
   * Deterministic Simple Moving Average (SMA)
   */
  calculateSMA(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return Number((sum / values.length).toFixed(2));
  }

  /**
   * Deterministic Weighted Moving Average (WMA)
   */
  calculateWMA(values: number[], weights: number[]): number {
    if (values.length !== weights.length || values.length === 0) {
      return this.calculateSMA(values);
    }
    const weightedSum = values.reduce((sum, val, i) => sum + (val * weights[i]), 0);
    const weightTotal = weights.reduce((a, b) => a + b, 0);
    return Number((weightedSum / weightTotal).toFixed(2));
  }

  /**
   * Deterministic Variance Calculation
   */
  calculateVariance(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Number(variance.toFixed(4));
  }

  /**
   * Generate SHA-256 Hash for Forecast Integrity (Expanded Scope)
   */
  generateForecastHash(params: {
    projection: ForecastDay[];
    seasonalityFactor: number;
    snapshotSequence: number;
    scenario?: any;
  }): string {
    const data = this.stableSerialize({
      projection: params.projection.map(d => ({
        d: d.date,
        i: Number(d.inflow.toFixed(2)),
        o: Number(d.outflow.toFixed(2)),
        c: Number(d.closingBalance.toFixed(2))
      })),
      confidenceCurve: 'LINEAR_DEGRADATION_0.4_MIN',
      seasonalityFactor: Number(params.seasonalityFactor.toFixed(2)),
      revenueModelParams: { model: 'WMA_6_PERIOD', weights: [0.3, 0.2, 0.15, 0.15, 0.1, 0.1] },
      expenseModelParams: { model: 'RECURRING_PATTERN_3_PERIOD_BASE' },
      simulationParams: params.scenario || {},
      snapshotSequence: params.snapshotSequence
    });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Deterministic Object Serialization
   */
  private stableSerialize(obj: any): string {
    if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
    if (Array.isArray(obj)) return '[' + obj.map((item: any) => this.stableSerialize(item)).join(',') + ']';
    const keys = Object.keys(obj).sort();
    return '{' + keys.map(k => `${JSON.stringify(k)}:${this.stableSerialize(obj[k])}`).join(',') + '}';
  }

  /**
   * Orchestrate 90-day Forecast
   */
  async getForecast(params: {
    tenant_id: string;
    company_id: string;
    snapshotId?: string;
    horizonDays?: number;
    scenario?: {
        revenueMultiplier?: number;
        expenseMultiplier?: number;
    };
  }): Promise<ForecastOutput> {
    const { tenant_id, company_id, snapshotId, horizonDays = 90, scenario } = params;

    const cashflow = await this.cashflowService.getCashflow({
      tenant_id,
      company_id,
      snapshotId,
      scenario: scenario ? {
          revenueMultiplier: scenario.revenueMultiplier,
          expenseMultiplier: scenario.expenseMultiplier,
          delayDays: 0
      } : undefined
    });

    const historicalSnapshots = await this.prisma.finance_account_balance_snapshots.findMany({
      where: { tenant_id: tenant_id, companies: { id: company_id } },
      orderBy: { created_at: 'desc' },
      take: 6,
    });

    const context: ForecastContext = {
      tenant_id,
      company_id,
      snapshotSequence: cashflow.snapshotSequence,
      historicalSnapshots,
      cashflowBaseline: cashflow,
      scenarioInputs: scenario
    };

    // 1. Initialize projection with known actuals (first 30 days)
    let projection: ForecastDay[] = cashflow.projectionDetails.map(d => ({
        date: d.date,
        inflow: d.inflow,
        outflow: d.outflow,
        closingBalance: d.closingBalance,
        isForecasted: false,
        confidence: 1.0
    }));

    // 2. Execute Predictive Models
    const modelResults = this.models.map(m => m.predict(context, horizonDays));

    // 3. Merge Forecasted Days (31-90)
    const seasonalityFactor = (modelResults[2][0] as any)?.supportingData?.seasonalityFactor ?? 1.0;
    
    for (let i = 30; i < horizonDays; i++) {
        const revenueDay = modelResults[0][i];
        const expenseDay = modelResults[1][i];

        const dayInflow = (revenueDay?.inflow || 0) * seasonalityFactor;
        const dayOutflow = expenseDay?.outflow || 0;

        projection.push({
            date: revenueDay.date,
            inflow: Number(dayInflow.toFixed(2)),
            outflow: Number(dayOutflow.toFixed(2)),
            closingBalance: 0, // Computed in next step
            isForecasted: true,
            confidence: revenueDay.confidence
        });
    }

    // 4. Compute Continuous Closing Balance
    let lastBalance = cashflow.projectionDetails[cashflow.projectionDetails.length - 1].closingBalance;
    for (let i = 30; i < projection.length; i++) {
        projection[i].closingBalance = Number((lastBalance + projection[i].inflow - projection[i].outflow).toFixed(2));
        lastBalance = projection[i].closingBalance;
    }

    return {
      projection,
      horizonDays,
      confidence: 'MEDIUM',
      trend: lastBalance > cashflow.openingBalance ? 'UP' : 'DOWN',
      seasonalityDetected: seasonalityFactor !== 1.0,
      forecastHash: this.generateForecastHash({
        projection,
        seasonalityFactor,
        snapshotSequence: cashflow.snapshotSequence,
        scenario
      }),
      snapshotSequence: cashflow.snapshotSequence,
      generatedAt: new Date().toISOString()
    };
  }
}
