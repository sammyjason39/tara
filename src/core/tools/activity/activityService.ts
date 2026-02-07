import type { ActivityEntry, ActivityType } from "./activityTypes";
import { eventBus } from "@/core/runtime/events/eventBus";

const KEY = "core.activity.stream";

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `activity-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const read = (): ActivityEntry[] => {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as ActivityEntry[]) : [];
};

const write = (items: ActivityEntry[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
};

export const activityService = {
  list(tenantId: string, entityType: string, entityId: string): ActivityEntry[] {
    return read().filter(
      (entry) => entry.tenantId === tenantId && entry.entityType === entityType && entry.entityId === entityId,
    );
  },

  add(
    tenantId: string,
    input: {
      entityType: string;
      entityId: string;
      actorId: string;
      message: string;
      type?: ActivityType;
    },
  ): ActivityEntry {
    const entry: ActivityEntry = {
      id: createId(),
      tenantId,
      entityType: input.entityType,
      entityId: input.entityId,
      actorId: input.actorId,
      message: input.message,
      type: input.type ?? "comment",
      createdAt: new Date().toISOString(),
    };
    const items = [...read(), entry];
    write(items);
    eventBus.emit("activity:new", entry);
    return entry;
  },
};
