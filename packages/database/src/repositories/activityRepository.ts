import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import {
  Activity,
  ActivityOrigin,
  ActivityStatus,
  CreateActivityInput,
  UpdateActivityInput,
} from '@arletex/contracts';
import { DatabaseError } from '@arletex/core';

export class ActivityRepository {
  private readonly db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  public create(input: CreateActivityInput): Activity {
    try {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const origin = input.origin || 'user_assigned';
      const status = input.status || 'planned';
      const progress = input.progress ?? 0.0;
      const memoriesStr = JSON.stringify(input.associatedMemories || []);
      const actionsStr = JSON.stringify(input.relevantActions || []);
      const metadataStr = JSON.stringify(input.metadata || {});

      const stmt = this.db.prepare(`
        INSERT INTO activities (
          id, title, objective, origin, status, progress,
          associated_memories, relevant_actions, metadata,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?
        )
      `);

      stmt.run(
        id,
        input.title,
        input.objective,
        origin,
        status,
        progress,
        memoriesStr,
        actionsStr,
        metadataStr,
        now,
        now,
      );

      return {
        id,
        title: input.title,
        objective: input.objective,
        origin,
        status,
        progress,
        associatedMemories: input.associatedMemories || [],
        relevantActions: input.relevantActions || [],
        metadata: input.metadata || {},
        createdAt: now,
        updatedAt: now,
      };
    } catch (err) {
      throw new DatabaseError('Failed to create activity', err);
    }
  }

  public getById(id: string): Activity | null {
    try {
      const stmt = this.db.prepare('SELECT * FROM activities WHERE id = ?');
      const row = stmt.get(id) as any;
      if (!row) return null;
      return this.mapRow(row);
    } catch (err) {
      throw new DatabaseError(`Failed to get activity ${id}`, err);
    }
  }

  public list(status?: ActivityStatus, origin?: ActivityOrigin): Activity[] {
    try {
      let sql = 'SELECT * FROM activities';
      const conditions: string[] = [];
      const params: any[] = [];

      if (status) {
        conditions.push('status = ?');
        params.push(status);
      }

      if (origin) {
        conditions.push('origin = ?');
        params.push(origin);
      }

      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }

      sql += ' ORDER BY updated_at DESC';

      const stmt = this.db.prepare(sql);
      const rows = stmt.all(...params) as any[];

      return rows.map((r) => this.mapRow(r));
    } catch (err) {
      throw new DatabaseError('Failed to list activities', err);
    }
  }

  public update(input: UpdateActivityInput): Activity {
    try {
      const existing = this.getById(input.id);
      if (!existing) {
        throw new DatabaseError(`Activity ${input.id} not found`);
      }

      const now = new Date().toISOString();
      const title = input.title ?? existing.title;
      const objective = input.objective ?? existing.objective;
      const status = input.status ?? existing.status;
      const progress = input.progress ?? existing.progress;
      const associatedMemories = input.associatedMemories ?? existing.associatedMemories;
      const relevantActions = input.relevantActions ?? existing.relevantActions;
      const metadata = input.metadata ? { ...existing.metadata, ...input.metadata } : existing.metadata;

      const stmt = this.db.prepare(`
        UPDATE activities
        SET title = ?,
            objective = ?,
            status = ?,
            progress = ?,
            associated_memories = ?,
            relevant_actions = ?,
            metadata = ?,
            updated_at = ?
        WHERE id = ?
      `);

      stmt.run(
        title,
        objective,
        status,
        progress,
        JSON.stringify(associatedMemories),
        JSON.stringify(relevantActions),
        JSON.stringify(metadata),
        now,
        input.id,
      );

      return {
        id: input.id,
        title,
        objective,
        origin: existing.origin,
        status,
        progress,
        associatedMemories,
        relevantActions,
        metadata,
        createdAt: existing.createdAt,
        updatedAt: now,
      };
    } catch (err) {
      throw new DatabaseError(`Failed to update activity ${input.id}`, err);
    }
  }

  public delete(id: string): boolean {
    try {
      const stmt = this.db.prepare('DELETE FROM activities WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (err) {
      throw new DatabaseError(`Failed to delete activity ${id}`, err);
    }
  }

  private mapRow(row: any): Activity {
    return {
      id: row.id,
      title: row.title,
      objective: row.objective,
      origin: row.origin,
      status: row.status,
      progress: row.progress,
      associatedMemories: JSON.parse(row.associated_memories || '[]'),
      relevantActions: JSON.parse(row.relevant_actions || '[]'),
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
