import type { NotificationItem, NotificationType } from "./notificationTypes";

const STORAGE_KEY = "core.notifications";

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `notification-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const read = (): NotificationItem[] => {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as NotificationItem[]) : [];
};

const write = (items: NotificationItem[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

type NotifyInput = {
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
};

export function notify(input: NotifyInput): NotificationItem {
  const item: NotificationItem = {
    id: createId(),
    tenantId: input.tenantId,
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    read: false,
    createdAt: new Date().toISOString(),
  };
  const next = [...read(), item];
  write(next);
  return item;
}

export function listNotifications(tenantId: string, userId: string): NotificationItem[] {
  return read().filter((item) => item.tenantId === tenantId && item.userId === userId);
}

export function markNotificationRead(tenantId: string, notificationId: string): void {
  const next = read().map((item) =>
    item.tenantId === tenantId && item.id === notificationId
      ? { ...item, read: true }
      : item,
  );
  write(next);
}
