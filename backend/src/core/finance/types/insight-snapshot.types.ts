import { Insight } from './insight.types';

export type InsightSnapshot = {
  id: string; // sha256(snapshotSequence + forecastHash + insightHash)
  tenant_id: string;
  company_id: string;
  snapshotSequence: number;
  source: 'ACTUAL' | 'FORECAST';
  forecastHash?: string;
  insights: Insight[];
  insightHash: string; // sha256(stableSerialize(insights))
  created_at: Date;
};
