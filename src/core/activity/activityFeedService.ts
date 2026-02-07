import type { ActivityEvent, ActivityType } from "./activityTypes";

const STORAGE_KEY = "core.activity.feed";

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `activity-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const read = (): ActivityEvent[] => {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as ActivityEvent[]) : [];
};

const write = (items: ActivityEvent[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

type EmitInput = {
  tenantId: string;
  type: ActivityType;
  actorId: string;
  actorRole: string;
  entityId?: string;
  entityType?: string;
  metadata?: Record<string, string>;
};

export function emitActivity(input: EmitInput): ActivityEvent {
  const entry: ActivityEvent = {
    id: createId(),
    tenantId: input.tenantId,
    type: input.type,
    actorId: input.actorId,
    actorRole: input.actorRole,
    entityId: input.entityId,
    entityType: input.entityType,
    metadata: input.metadata,
    createdAt: new Date().toISOString(),
  };
  const next = [...read(), entry];
  write(next);
  return entry;
}

export function listActivity(tenantId: string): ActivityEvent[] {
  return read().filter((entry) => entry.tenantId === tenantId);
}
