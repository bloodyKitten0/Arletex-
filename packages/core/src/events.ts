export type EventHandler<T = unknown> = (payload: T) => void | Promise<void>;

export class EventBus {
  private handlers = new Map<string, Set<EventHandler<any>>>();

  public on<T>(event: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    const set = this.handlers.get(event)!;
    set.add(handler);

    return () => {
      set.delete(handler);
      if (set.size === 0) {
        this.handlers.delete(event);
      }
    };
  }

  public emit<T>(event: string, payload: T): void {
    const set = this.handlers.get(event);
    if (!set) return;

    for (const handler of set) {
      try {
        void handler(payload);
      } catch (err) {
        console.error(`[EventBus] Error in event handler for "${event}":`, err);
      }
    }
  }

  public clear(): void {
    this.handlers.clear();
  }
}

export const globalEventBus = new EventBus();
