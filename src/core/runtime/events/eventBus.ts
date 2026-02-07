type EventPayload = Record<string, unknown>;

export type EventHandler = (payload: EventPayload) => void;

type EventMap = {
  "notification:new": EventPayload;
  "workflow:updated": EventPayload;
  "activity:new": EventPayload;
};

class EventBus {
  private handlers: Record<string, Set<EventHandler>> = {};

  on<T extends keyof EventMap>(event: T, handler: EventHandler) {
    if (!this.handlers[event]) this.handlers[event] = new Set();
    this.handlers[event].add(handler);
    return () => this.off(event, handler);
  }

  off<T extends keyof EventMap>(event: T, handler: EventHandler) {
    this.handlers[event]?.delete(handler);
  }

  emit<T extends keyof EventMap>(event: T, payload: EventMap[T]) {
    this.handlers[event]?.forEach((handler) => handler(payload));
  }
}

export const eventBus = new EventBus();
