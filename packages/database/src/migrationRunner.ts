import Database from 'better-sqlite3';
import { DatabaseError, ILogger, rootLogger } from '@arletex/core';
import { MIGRATIONS, Migration } from './migrations/index.js';

export class MigrationRunner {
  private readonly db: Database.Database;
  private readonly logger: ILogger;

  constructor(db: Database.Database, logger: ILogger = rootLogger) {
    this.db = db;
    this.logger = logger.child('Migrations');
  }

  public run(): void {
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS _migrations (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          applied_at INTEGER NOT NULL
        );
      `);

      const appliedStmt = this.db.prepare('SELECT name FROM _migrations');
      const appliedRows = appliedStmt.all() as Array<{ name: string }>;
      const appliedSet = new Set(appliedRows.map((r) => r.name));

      const pending = MIGRATIONS.filter((m) => !appliedSet.has(m.name)).sort(
        (a, b) => a.id - b.id,
      );

      if (pending.length === 0) {
        this.logger.debug('Database is up to date. No pending migrations.');
        return;
      }

      this.logger.info(`Applying ${pending.length} pending migration(s)...`);

      const insertMigrationStmt = this.db.prepare(
        'INSERT INTO _migrations (id, name, applied_at) VALUES (?, ?, ?)',
      );

      const runInTransaction = this.db.transaction((migration: Migration) => {
        this.logger.info(`Applying migration: ${migration.name}`);
        this.db.exec(migration.up);
        insertMigrationStmt.run(migration.id, migration.name, Date.now());
      });

      for (const migration of pending) {
        runInTransaction(migration);
      }

      this.logger.info('All migrations applied successfully.');
    } catch (error) {
      this.logger.error('Failed to run migrations', error);
      throw new DatabaseError('Database migration execution failed', error);
    }
  }
}
