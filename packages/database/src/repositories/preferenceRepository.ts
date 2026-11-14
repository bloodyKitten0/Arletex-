import Database from 'better-sqlite3';
import { DatabaseError } from '@arletex/core';

export class PreferenceRepository {
  private readonly db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  public get(key: string, defaultValue = ''): string {
    try {
      const stmt = this.db.prepare('SELECT value FROM app_preferences WHERE key = ?');
      const row = stmt.get(key) as { value: string } | undefined;
      return row ? row.value : defaultValue;
    } catch (err) {
      throw new DatabaseError(`Failed to get preference ${key}`, err);
    }
  }

  public set(key: string, value: string): void {
    try {
      const now = new Date().toISOString();
      const stmt = this.db.prepare(`
        INSERT INTO app_preferences (key, value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
      `);
      stmt.run(key, value, now);
    } catch (err) {
      throw new DatabaseError(`Failed to set preference ${key}`, err);
    }
  }

  public getAll(): Record<string, string> {
    try {
      const stmt = this.db.prepare('SELECT key, value FROM app_preferences');
      const rows = stmt.all() as Array<{ key: string; value: string }>;
      const result: Record<string, string> = {};
      for (const r of rows) {
        result[r.key] = r.value;
      }
      return result;
    } catch (err) {
      throw new DatabaseError('Failed to get all preferences', err);
    }
  }
}
