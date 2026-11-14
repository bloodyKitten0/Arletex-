import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import { Conversation, CreateConversationInput, UpdateConversationInput } from '@arletex/contracts';
import { DatabaseError } from '@arletex/core';

export class ConversationRepository {
  private readonly db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  public list(limit = 100, offset = 0): Conversation[] {
    try {
      const stmt = this.db.prepare(`
        SELECT id, title, is_pinned, created_at, updated_at, metadata
        FROM conversations
        ORDER BY is_pinned DESC, updated_at DESC
        LIMIT ? OFFSET ?
      `);
      const rows = stmt.all(limit, offset) as Array<{
        id: string;
        title: string;
        is_pinned: number;
        created_at: string;
        updated_at: string;
        metadata: string;
      }>;

      return rows.map((r) => ({
        id: r.id,
        title: r.title,
        isPinned: Boolean(r.is_pinned),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        metadata: JSON.parse(r.metadata || '{}'),
      }));
    } catch (err) {
      throw new DatabaseError('Failed to list conversations', err);
    }
  }

  public getById(id: string): Conversation | null {
    try {
      const stmt = this.db.prepare(`
        SELECT id, title, is_pinned, created_at, updated_at, metadata
        FROM conversations
        WHERE id = ?
      `);
      const row = stmt.get(id) as
        | {
            id: string;
            title: string;
            is_pinned: number;
            created_at: string;
            updated_at: string;
            metadata: string;
          }
        | undefined;

      if (!row) return null;

      return {
        id: row.id,
        title: row.title,
        isPinned: Boolean(row.is_pinned),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        metadata: JSON.parse(row.metadata || '{}'),
      };
    } catch (err) {
      throw new DatabaseError(`Failed to get conversation ${id}`, err);
    }
  }

  public create(input: CreateConversationInput): Conversation {
    try {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const metadataStr = JSON.stringify(input.metadata || {});
      const title = input.title || 'New Conversation';
      const isPinned = input.isPinned ? 1 : 0;

      const stmt = this.db.prepare(`
        INSERT INTO conversations (id, title, is_pinned, created_at, updated_at, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmt.run(id, title, isPinned, now, now, metadataStr);

      return {
        id,
        title,
        isPinned: Boolean(isPinned),
        createdAt: now,
        updatedAt: now,
        metadata: input.metadata || {},
      };
    } catch (err) {
      throw new DatabaseError('Failed to create conversation', err);
    }
  }

  public update(input: UpdateConversationInput): Conversation {
    try {
      const existing = this.getById(input.id);
      if (!existing) {
        throw new DatabaseError(`Conversation ${input.id} not found`);
      }

      const title = input.title ?? existing.title;
      const isPinned = input.isPinned !== undefined ? (input.isPinned ? 1 : 0) : (existing.isPinned ? 1 : 0);
      const metadata = input.metadata ? { ...existing.metadata, ...input.metadata } : existing.metadata;
      const now = new Date().toISOString();

      const stmt = this.db.prepare(`
        UPDATE conversations
        SET title = ?, is_pinned = ?, metadata = ?, updated_at = ?
        WHERE id = ?
      `);

      stmt.run(title, isPinned, JSON.stringify(metadata), now, input.id);

      return {
        id: input.id,
        title,
        isPinned: Boolean(isPinned),
        createdAt: existing.createdAt,
        updatedAt: now,
        metadata,
      };
    } catch (err) {
      throw new DatabaseError(`Failed to update conversation ${input.id}`, err);
    }
  }

  public delete(id: string): boolean {
    try {
      const stmt = this.db.prepare('DELETE FROM conversations WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (err) {
      throw new DatabaseError(`Failed to delete conversation ${id}`, err);
    }
  }
}
