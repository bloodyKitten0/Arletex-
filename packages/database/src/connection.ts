import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseError, ILogger, rootLogger } from '@arletex/core';

export class DatabaseService {
  private db: Database.Database | null = null;
  private readonly logger: ILogger;
  private readonly dbPath: string;

  constructor(dbPath: string, logger: ILogger = rootLogger) {
    this.dbPath = dbPath;
    this.logger = logger.child('Database');
  }

  public connect(): Database.Database {
    if (this.db) {
      return this.db;
    }

    try {
      if (this.dbPath !== ':memory:') {
        const dir = path.dirname(this.dbPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }

      this.logger.info(`Opening database connection: ${this.dbPath}`);
      this.db = new Database(this.dbPath);

      // Robust Pragmas for high performance and durability
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');
      this.db.pragma('busy_timeout = 5000');
      this.db.pragma('synchronous = NORMAL');

      return this.db;
    } catch (error) {
      this.logger.error('Failed to open database', error);
      throw new DatabaseError(`Failed to connect to database at ${this.dbPath}`, error);
    }
  }

  public getClient(): Database.Database {
    if (!this.db) {
      return this.connect();
    }
    return this.db;
  }

  public close(): void {
    if (this.db) {
      this.logger.info('Closing database connection');
      try {
        this.db.close();
      } catch (err) {
        this.logger.error('Error closing database', err);
      } finally {
        this.db = null;
      }
    }
  }
}
