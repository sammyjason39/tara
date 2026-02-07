import { eventBus } from "./eventBus";

export type NotificationEvent = {
  id: string;
  tenantId: string;
  title: string;
  message: string;
  createdAt: string;
  type: "info" | "warning" | "success";
};

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `notif-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const notifications = {
  emit(tenantId: string, input: Omit<NotificationEvent, "id" | "tenantId" | "createdAt">) {
    const event: NotificationEvent = {
      id: createId(),
      tenantId,
      createdAt: new Date().toISOString(),
      ...input,
    };
    eventBus.emit("notification:new", event);
    return event;
  },
};
