import type { TaraEvent } from '../hr/services/event-bus.service';

export type WorkflowNodeType = 'trigger' | 'condition' | 'action';

export type WorkflowConditionOperator =
  | 'eq'
  | 'neq'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'exists'
  | 'is_empty'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'not_in'
  | 'is_true'
  | 'is_false';

export interface WorkflowConditionRule {
  field: string;
  operator: WorkflowConditionOperator | string;
  value?: string;
}

export type WorkflowActionType =
  | 'send_notification'
  | 'send_public_announcement'
  | 'send_hr_team_notification'
  | 'send_whatsapp'
  | 'send_whatsapp_group'
  | 'escalate_hr'
  | 'set_variable'
  | 'notify_by_role'
  | 'log';

export interface WorkflowNodePosition {
  x: number;
  y: number;
}

export interface WorkflowNodeData {
  label: string;
  eventType?: string;
  /** Cron expression for scheduled workflows (e.g. 30 11 * * 1-5) */
  scheduleCron?: string;
  scheduleTimezone?: string;
  scheduleAction?: string;
  /** @deprecated use rules[] — kept for backward compatibility */
  field?: string;
  operator?: WorkflowConditionOperator;
  value?: string;
  /** Multi-rule condition: all = AND, any = OR */
  match?: 'all' | 'any';
  rules?: WorkflowConditionRule[];
  actionType?: WorkflowActionType;
  config?: Record<string, unknown>;
}

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  position: WorkflowNodePosition;
  data: WorkflowNodeData;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: 'true' | 'false' | 'default';
}

export interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowDefinitionRecord {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  trigger_event: string | null;
  is_active: boolean;
  is_system: boolean;
  version: number;
  graph: WorkflowGraph;
}

export interface WorkflowExecutionContext {
  event: TaraEvent;
  variables: Record<string, unknown>;
}

export interface WorkflowStepLog {
  node_id: string;
  node_type: WorkflowNodeType;
  label: string;
  status: 'completed' | 'skipped' | 'failed';
  detail?: string;
  at: string;
}

export interface WorkflowTestRunOptions {
  employee_id?: string;
  actor_employee_id?: string;
  phone?: string;
  event?: Partial<import('../hr/services/event-bus.service').TaraEvent>;
}

export interface WorkflowRunResult {
  execution_id: string;
  steps: WorkflowStepLog[];
  status: 'completed' | 'failed';
  error?: string;
}

export const WORKFLOW_CATEGORIES = [
  'leave',
  'attendance',
  'whatsapp',
  'onboarding',
  'notification',
  'employee',
] as const;

export type WorkflowCategory = (typeof WORKFLOW_CATEGORIES)[number];

export const WORKFLOW_NODE_CATALOG = {
  trigger: {
    label: 'Trigger',
    description: 'Mulai workflow saat event sistem terjadi',
  },
  condition: {
    label: 'If / Kondisi',
    description: 'Cabang berdasarkan role, departemen, payload event, dll.',
  },
  action: {
    label: 'Aksi',
    description: 'Kirim notifikasi, WhatsApp, atau eskalasi HR',
  },
} as const;

export const WORKFLOW_ACTION_CATALOG: Record<
  WorkflowActionType,
  { label: string; description: string }
> = {
  send_notification: {
    label: 'Kirim Notifikasi',
    description: 'Notifikasi in-app ke karyawan/HR/supervisor',
  },
  send_public_announcement: {
    label: 'Pengumuman Publik',
    description: 'Broadcast notifikasi ke seluruh karyawan aktif',
  },
  send_hr_team_notification: {
    label: 'Notifikasi Tim HR',
    description: 'Kirim rekap/detail ke role HR_Admin & Supervisor',
  },
  send_whatsapp: {
    label: 'Kirim WhatsApp',
    description: 'Pesan WhatsApp ke karyawan terkait event',
  },
  send_whatsapp_group: {
    label: 'Kirim WhatsApp Grup',
    description: 'Pesan teks ke grup WhatsApp (Group ID dari Kapso/Meta)',
  },
  escalate_hr: {
    label: 'Eskalasi ke HR',
    description: 'Notifikasi staff HR untuk tindak lanjut',
  },
  set_variable: {
    label: 'Set Variabel',
    description: 'Simpan nilai untuk dipakai node berikutnya',
  },
  notify_by_role: {
    label: 'Notifikasi per Role',
    description: 'Kirim notifikasi ke semua karyawan dengan role tertentu',
  },
  log: {
    label: 'Log (Debug)',
    description: 'Catat ke log eksekusi workflow',
  },
};
