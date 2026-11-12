import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import { AuditEvent } from '@arletex/contracts';
import { DatabaseError } from '@arletex/core';

export class AuditRepository {
  private readonly db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  public log(event: Omit<AuditEvent, 'id' | 'timestamp'> & { timestamp?: string }): AuditEvent {
    try {
      const id = crypto.randomUUID();
      const timestamp = event.timestamp ?? new Date().toISOString();

      const stmt = this.db.prepare(`
        INSERT INTO audit_logs (id, timestamp, actor, action, details, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmt.run(id, timestamp, event.actor, event.action, event.details, event.status);

      return {
        id,
        timestamp,
        actor: event.actor,
        action: event.action,
        details: event.details,
        status: event.status,
      };
    } catch (err) {
      throw new DatabaseError('Failed to record audit event', err);
    }
  }

  public list(limit = 100, offset = 0): AuditEvent[] {
    try {
      const stmt = this.db.prepare(`
        SELECT id, timestamp, actor, action, details, status
        FROM audit_logs
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
      `);
      return stmt.all(limit, offset) as AuditEvent[];
    } catch (err) {
      throw new DatabaseError('Failed to list audit logs', err);
    }
  }
}
