import { CashflowOutput } from './cashflow.types';

export type InsightType = 
  | 'CASHFLOW_DEFICIT'
  | 'SAFETY_BUFFER_BREACH'
  | 'CONCENTRATION_RISK'
  | 'SUDDEN_SPIKE'
  | 'CONSISTENT_DECLINE'
  | 'VOLATILE_PATTERN'
  | 'ANOMALY_DETECTED'
  | 'SYSTEM_HEALTH';

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type Confidence = 'LOW' | 'MEDIUM' | 'HIGH' | null;
export type TimeHorizon = 'IMMEDIATE' | 'SHORT_TERM' | 'MID_TERM';
export type InsightScope = 'GLOBAL' | 'ACCOUNT';

export interface Insight {
  id?: string; // sha256(type + accountId + snapshotSequence + stableSerialize(coreInputs))
  type: InsightType;
  scope: InsightScope;
  severity: Severity;
  confidence: Confidence;
  timeHorizon: TimeHorizon;
  actionPriority: number; // 1.0 - 10.0
  message: string;
  recommendation: string;
  isPrimary: boolean;
  source?: 'ACTUAL' | 'FORECAST';
  forecastDay?: number; // 0 for ACTUAL
  explanation: {
    rule: string;
    inputsUsed: string[];
    coreInputs: Record<string, string | number | boolean>;
  };
  integrityHash?: string;
  supportingData: any;
  accountId?: string;
  tenant_id: string;
  company_id: string;
  snapshotSequence: number;
}

export interface InsightContext {
  tenant_id: string;
  company_id: string;
  snapshotSequence: number;
  cashflow: CashflowOutput;
  historicalSnapshots: any[];
  systemLogs: any[];
  metrics: {
    coverage: number;
    volatility: number;
    totalCash: number;
    anomalyCount: number;
  };
  correlation_id: string;
}

export interface InsightRule {
  readonly type: InsightType;
  evaluate(context: InsightContext): Insight[];
}
