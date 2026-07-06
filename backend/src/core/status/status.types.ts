export type ComponentStatus =
  | 'operational'
  | 'degraded'
  | 'partial_outage'
  | 'major_outage'
  | 'maintenance';

export interface StatusComponentProbe {
  id: string;
  name: string;
  status: ComponentStatus;
  latency_ms?: number | null;
  message?: string | null;
  metrics?: Record<string, number | string | boolean | null>;
}

export interface StatusSnapshotComponents {
  api: StatusComponentProbe;
  database: StatusComponentProbe;
  redis: StatusComponentProbe;
  ai_assistant: StatusComponentProbe;
  whatsapp: StatusComponentProbe;
}

export interface StatusIncident {
  id: string;
  title: string;
  impact: ComponentStatus;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  started_at: string;
  resolved_at: string | null;
  duration_minutes: number | null;
  components: string[];
}

export interface DailyUptime {
  date: string;
  uptime_pct: number;
  status: ComponentStatus;
}

export interface PublicStatusPayload {
  page_title: string;
  overall: {
    status: ComponentStatus;
    label: string;
    updated_at: string;
  };
  components: StatusComponentProbe[];
  uptime: {
    '90d': number;
    '30d': number;
    '7d': number;
  };
  daily_uptime: DailyUptime[];
  incidents: StatusIncident[];
  version: string;
}

export const STATUS_LABELS: Record<ComponentStatus, string> = {
  operational: 'Operational',
  degraded: 'Degraded performance',
  partial_outage: 'Partial outage',
  major_outage: 'Major outage',
  maintenance: 'Maintenance',
};

export const OVERALL_BANNER: Record<ComponentStatus, string> = {
  operational: 'All systems operational',
  degraded: 'Some systems are experiencing degraded performance',
  partial_outage: 'Partial system outage',
  major_outage: 'Major system outage',
  maintenance: 'Scheduled maintenance in progress',
};

export function worstStatus(statuses: ComponentStatus[]): ComponentStatus {
  const rank: Record<ComponentStatus, number> = {
    operational: 0,
    maintenance: 1,
    degraded: 2,
    partial_outage: 3,
    major_outage: 4,
  };
  return statuses.reduce(
    (worst, s) => (rank[s] > rank[worst] ? s : worst),
    'operational' as ComponentStatus,
  );
}

/** Uptime & incidents — only infrastructure that blocks the app */
export function coreOverall(components: StatusSnapshotComponents): ComponentStatus {
  return worstStatus([
    components.api.status,
    components.database.status,
    components.redis.status,
  ]);
}

/** Banner — core plus optional services when they are actively monitored */
export function displayOverall(components: StatusSnapshotComponents): ComponentStatus {
  const statuses: ComponentStatus[] = [
    components.api.status,
    components.database.status,
    components.redis.status,
  ];

  const aiRequests = Number(components.ai_assistant.metrics?.requests_24h ?? 0);
  if (components.ai_assistant.metrics?.enabled && aiRequests > 0) {
    statuses.push(components.ai_assistant.status);
  }

  const wa = components.whatsapp;
  if (wa.message?.includes('configured') && wa.status !== 'operational') {
    statuses.push(wa.status);
  }

  return worstStatus(statuses);
}
