export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: unknown;
}

export interface ILogger {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, error?: unknown): void;
  child(context: string): ILogger;
}

const LEVEL_SEVERITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export class Logger implements ILogger {
  private readonly context: string;
  private minLevel: LogLevel;

  constructor(context = 'App', minLevel: LogLevel = 'info') {
    this.context = context;
    this.minLevel = minLevel;
  }

  public setLogLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_SEVERITY[level] >= LEVEL_SEVERITY[this.minLevel];
  }

  private format(level: LogLevel, message: string, data?: unknown): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      ...(data !== undefined ? { data } : {}),
    };

    const prefix = `[${entry.timestamp}] [${level.toUpperCase().padEnd(5)}] [${this.context}]`;

    if (level === 'error') {
      console.error(`${prefix} ${message}`, data !== undefined ? data : '');
    } else if (level === 'warn') {
      console.warn(`${prefix} ${message}`, data !== undefined ? data : '');
    } else if (level === 'debug') {
      console.debug(`${prefix} ${message}`, data !== undefined ? data : '');
    } else {
      console.log(`${prefix} ${message}`, data !== undefined ? data : '');
    }
  }

  public debug(message: string, data?: unknown): void {
    this.format('debug', message, data);
  }

  public info(message: string, data?: unknown): void {
    this.format('info', message, data);
  }

  public warn(message: string, data?: unknown): void {
    this.format('warn', message, data);
  }

  public error(message: string, error?: unknown): void {
    this.format('error', message, error);
  }

  public child(context: string): ILogger {
    return new Logger(`${this.context}:${context}`, this.minLevel);
  }
}

export const rootLogger = new Logger('Arletex');
