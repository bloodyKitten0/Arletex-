import { ILogger, rootLogger } from './logger.js';

export type EventHandler<T = unknown> = (payload: T) => void | Promise<void>;

export class EventBus {
  private handlers = new Map<string, Set<EventHandler<any>>>();
  private logger: ILogger;

  constructor(logger: ILogger = rootLogger.child('EventBus')) {
    this.logger = logger;
  }

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
        const result = handler(payload);
        if (result && typeof (result as Promise<void>).catch === 'function') {
          (result as Promise<void>).catch((asyncErr) => {
            this.logger.error(`Unhandled error in async event handler for "${event}":`, asyncErr);
          });
        }
      } catch (err) {
        this.logger.error(`Error in synchronous event handler for "${event}":`, err);
      }
    }
  }

  public clear(): void {
    this.handlers.clear();
  }
}

export const globalEventBus = new EventBus();
